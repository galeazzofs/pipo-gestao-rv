# Design: ApuracaoTrimestral Refactor

**Date:** 2026-03-16
**Scope:** `ApuracaoTrimestral.tsx` and its direct data dependencies
**Goals:** Performance (react-query caching/deduplication) + code organization (break up 1,546-line monolith)

---

## Problem

- `ApuracaoTrimestral.tsx` is 1,546 lines, with 31 hook calls, mixing data fetching, business logic, and rendering in a single file.
- Three hooks (`useColaboradores`, `useContracts`, `useApuracoesFechadas`) use manual `useState + useEffect + supabase` patterns despite `@tanstack/react-query` being installed and available.
- Manual fetch patterns mean no caching, no deduplication, and verbose loading/error state boilerplate repeated across hooks.

---

## Approach

Two sequential phases:

1. **Hooks first** — migrate data layer to react-query reads and mutations
2. **Components second** — extract sections into focused files

---

## Phase 1: Migrate Hooks to React-Query

### Scope of changes per hook

Each hook has both read and write operations. Only the reads and the specific write operations called by `ApuracaoTrimestral` are migrated. Write operations used exclusively by other pages are left untouched.

| Hook | Reads to migrate | Writes to migrate | Writes left as-is |
|------|------------------|-------------------|-------------------|
| `useColaboradores.ts` | `colaboradores` list, `metasMensais` list (two separate `useQuery` calls) | — | `addColaborador`, `updateColaborador`, `deleteColaborador`, `saveMetaMensal` |
| `useContracts.ts` | `contracts` list | — | `addContract`, `addContracts`, `updateContract`, `deleteContract` |
| `useApuracoesFechadas.ts` | `apuracoes` list, `loadDraft` (parameterized — see below) | `saveDraft`, `saveApuracao` | `deleteApuracao`, `finalizarApuracao`, `getApuracaoItens`, `getMeusResultados` |

No other files in the project use `useQuery` or `useMutation`, so changing the global `QueryClient` config affects only newly migrated queries.

### Read pattern change (list queries)

**Before:**
```ts
const [data, setData] = useState([]);
const [isLoading, setIsLoading] = useState(true);
useEffect(() => {
  setIsLoading(true);
  supabase.from('table').select('*').then(({ data }) => {
    setData(data);
    setIsLoading(false);
  });
}, []);
```

**After:**
```ts
const { data = [], isLoading } = useQuery({
  queryKey: ['table'],
  queryFn: () => supabase.from('table').select('*').then(({ data }) => data ?? []),
});
```

### `loadDraft` — parameterized on-demand read

`loadDraft('trimestral', mesReferencia)` is currently an imperative async function. In `ApuracaoTrimestral`, `tipo` is always the string `'trimestral'` (hardcoded — not user-selected). `mesReferencia` is derived from the user's trimestre/ano selection: `const mesReferencia = \`${trimestre}/${ano}\`` (e.g., `"Q1/2025"`).

`loadDraft` returns `{ apuracao: ApuracaoFechada; itens: ApuracaoFechadaItem[] } | null` — these types are already exported from `useApuracoesFechadas.ts`.

It becomes a `useQuery` with a parameterized query key, enabled only when `mesReferencia` is defined (which it always is after mount, since trimestre/ano have defaults):

```ts
const { data: draft, isLoading: isDraftLoading } = useQuery({
  queryKey: ['draft', 'trimestral', mesReferencia],
  queryFn: () => fetchDraftFromSupabase('trimestral', mesReferencia),
  enabled: !!mesReferencia,
});
```

The hook returns `draft` (`{ apuracao, itens } | null`) and `isDraftLoading` instead of the imperative `loadDraft` function. `ApuracaoTrimestral` hydrates its form state in a `useEffect` triggered when `draft` changes.

`draftId` is currently a `useState` in `ApuracaoTrimestral` used in the draft status banner and initialization guards. After the refactor it is derived: `const draftId = draft?.apuracao.id ?? null`. No separate `useState` is needed.


### Draft hydration guard

The `useEffect` that hydrates form state from `draft` must not overwrite user edits on every background refetch. Use a `useRef` to track the last hydrated draft ID:

```ts
const lastHydratedDraftId = useRef<string | null>(undefined);

useEffect(() => {
  const incomingId = draft?.apuracao.id ?? null;
  if (incomingId === lastHydratedDraftId.current) return; // same draft, skip
  lastHydratedDraftId.current = incomingId;
  // hydrate cnInputs, evResults, leadershipInputs from draft
}, [draft]);
```

When the user changes trimestre/ano, the query key changes and `draft` becomes a new object with a different ID (or null), triggering hydration. Background refetches that return the same draft object return the same ID, so hydration is skipped and user edits are preserved.

### Write operations — useMutation

`saveDraft` and `saveApuracao` both currently return `Promise<string | null>` (the new apuração ID). Both move to `useMutation`. Callers use `mutateAsync` (not `mutate`) so the returned ID and call-site side effects remain sequential. **All `mutateAsync` call sites must be wrapped in try/catch** — in React Query v5, `mutateAsync` throws on error even when `onError` is defined in the mutation config:

```ts
// In hook
const saveDraftMutation = useMutation({
  mutationFn: (args: SaveDraftArgs) => saveDraftFn(args),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['apuracoes'] });
    queryClient.invalidateQueries({ queryKey: ['draft', 'trimestral'] });
    toast.success('Rascunho salvo com sucesso!'); // stays in hook (was already here)
  },
  onError: (error) => toast.error(error.message || 'Erro ao salvar rascunho'),
});

// Hook return
return {
  saveDraft: saveDraftMutation.mutateAsync,
  isSavingDraft: saveDraftMutation.isPending,
  saveApuracao: saveApuracaoMutation.mutateAsync,
  isSaving: saveApuracaoMutation.isPending,
};

// In orchestrator — wrapped in try/catch; setLastSaved for both save and finalize flows
try {
  const newId = await saveDraft(args);
  if (newId) setLastSaved(new Date());
} catch (_) { /* onError in hook handles toast */ }
```

`setLastSaved(new Date())` is called at the call site after both `saveDraft` and `saveApuracao` succeed (i.e., in `handleSaveDraft` and `handleFinalize` in the orchestrator).

`isSaving` and `isSavingDraft`, which are currently local `useState` in `ApuracaoTrimestral`, are removed from the page and sourced from the hook's mutation `isPending` values.

`onFinalize` in `FooterBar` maps to `saveApuracao` (the handler in `ApuracaoTrimestral` calls `saveApuracao('trimestral', ...)`, not the separate `finalizarApuracao` operation, which is only used by `HistoricoApuracoes`).

### Cross-hook cache invalidation

`saveApuracao` writes to both `apuracoes_fechadas` and `ev_contracts` (contract auto-deactivation). After `saveApuracao` completes, invalidate all affected query keys including the draft:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['apuracoes'] });
  queryClient.invalidateQueries({ queryKey: ['ev_contracts'] });
  queryClient.invalidateQueries({ queryKey: ['draft', 'trimestral'] });
}
```

**Known limitation:** The writes inside `saveApuracao` are not a single Supabase transaction. If the `ev_contracts` update fails after `apuracoes_fechadas` is already written, the apuração is saved but contracts remain active. This is a pre-existing issue, not introduced by this refactor.

### staleTime configuration

Set a 5-minute default globally in `App.tsx` (no existing `useQuery` calls are affected):

```ts
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } }
});
```

---

## Phase 2: Break Up ApuracaoTrimestral.tsx

### New folder

`src/components/apuracao-trimestral/` (new folder, does not currently exist)

### Files

| File | Responsibility |
|------|----------------|
| `CNSection.tsx` | Renders a complete `<AccordionItem value="cns">` with trigger and content (CN input table) |
| `EVSection.tsx` | Renders a complete `<AccordionItem value="evs">` with trigger and content (excel upload, dashboard, results table) |
| `LeadershipSection.tsx` | Renders a complete `<AccordionItem value="leadership">` with trigger and content (matrix reference, input table) |
| `FooterBar.tsx` | Fixed bottom bar: real-time totals + save/finalize action buttons |

The parent renders `<Accordion type="multiple" ...>` and places the three section components inside it. Each section component is responsible for its own `AccordionItem`, `AccordionTrigger`, and `AccordionContent`.

### Orchestrator

`ApuracaoTrimestral.tsx` becomes a thinner orchestrator:
- Holds shared state: selected trimestre/ano, `lastSaved`, CN inputs (rows), EV results, leadership inputs, `expandedSections`
- Derives `draftId` from `draft?.apuracao.id`
- Hydrates CN/EV/leadership state from `draft` via `useEffect` when `draft` changes (reactive replacement for the current `loadExistingDraft` callback)
- Computes per-section subtotals and grand total passed to `FooterBar`
- Renders `<Accordion>` wrapper and passes state slices + callbacks as props to each section

`src/lib/apuracaoTrimestralUtils.ts` is a **new file** (does not exist) that receives the business logic helpers currently at the top of `ApuracaoTrimestral.tsx`: `calcularMultiplicadorMRR`, `getQuarterMonths`, `TRIMESTRES`, `ANOS`. These are trimestral-specific and not shared with `ApuracaoMensal.tsx`.

### Data flow

```
ApuracaoTrimestral (orchestrator)
  ├── useColaboradores()       ← react-query (reads only)
  ├── useContracts()           ← react-query (reads only)
  ├── useApuracoesFechadas()   ← react-query
  │     ├── draft (reactive) ──→ useEffect hydrates cnInputs, evResults, leadershipInputs
  │     ├── saveDraft / isSavingDraft
  │     └── saveApuracao / isSaving
  │
  ├── <Accordion>
  │     ├── <CNSection cnInputs={...} onChange={...} colaboradores={...} subtotal={...} />
  │     ├── <EVSection evResults={...} onUpload={...} contracts={...} subtotal={...} />
  │     └── <LeadershipSection inputs={...} onChange={...} colaboradores={...} subtotal={...} />
  └── <FooterBar totals={...} onSaveDraft={...} onFinalize={...} isSaving={...} isSavingDraft={...} />
```

---

## Out of Scope

- Write operations in `useColaboradores` and `useContracts` used by other pages are not changed
- `ApuracaoMensal.tsx` and its hooks are not touched
- No new features are added
- No tests (project has none)
