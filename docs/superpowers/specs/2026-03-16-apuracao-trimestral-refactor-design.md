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
| `useApuracoesFechadas.ts` | `apuracoes` list, `loadDraft` (parameterized) | `saveDraft`, `saveApuracao` | `deleteApuracao`, `finalizarApuracao`, `getApuracaoItens`, `getMeusResultados` |

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

`loadDraft(tipo, mesReferencia)` is currently an imperative async function called inside a `useCallback` when the user selects a trimestre/ano. It becomes a `useQuery` with a parameterized query key:

```ts
const { data: draft, isLoading: isDraftLoading } = useQuery({
  queryKey: ['draft', tipo, mesReferencia],
  queryFn: () => fetchDraftFromSupabase(tipo, mesReferencia),
  enabled: !!tipo && !!mesReferencia,
});
```

The hook returns `draft` and `isDraftLoading` instead of the imperative `loadDraft` function. `ApuracaoTrimestral` receives the draft data reactively and hydrates its form state in a `useEffect` when `draft` changes.

`draftId` is currently a `useState` in `ApuracaoTrimestral` used to track the ID of an in-progress draft for display (draft status banner) and initialization guards. After the refactor, `draftId` becomes derived state: `const draftId = draft?.apuracao.id ?? null`. No separate `useState` is needed for it. The `lastSaved` timestamp (also in the current status banner) continues to live as a `useState` updated in the `saveDraft` mutation's `onSuccess`.

### Write operations — useMutation

`saveDraft` and `saveApuracao` become `useMutation` calls. Both currently return `Promise<string | null>` (the new apuração ID). To preserve this return value, callers use `mutateAsync`:

```ts
// In hook
const saveDraftMutation = useMutation({
  mutationFn: (args: SaveDraftArgs) => saveDraftFn(args),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apuracoes'] }),
  onError: (error) => toast.error(error.message || 'Erro ao salvar rascunho'),
});

// Hook return
return { saveDraft: saveDraftMutation.mutateAsync, isSavingDraft: saveDraftMutation.isPending };

// In orchestrator
const newId = await saveDraft(args); // still returns the ID via mutateAsync
if (newId) setLastSaved(new Date());
```

Toast messages for `saveDraft` stay in the hook (centralized). `saveApuracao` is only called from `ApuracaoTrimestral`, so centralizing its toast in the hook is safe. The write operations left as-is (`deleteApuracao`, `finalizarApuracao`) continue to handle their own toasts as before.

`isSaving` and `isSavingDraft`, which are currently local `useState` in `ApuracaoTrimestral`, are removed from the page and replaced by `isPending` from the mutations exposed in the hook return value.

### Cross-hook cache invalidation

`saveApuracao` writes to both `apuracoes_fechadas` and `ev_contracts` (contract auto-deactivation logic). After `saveApuracao` completes, invalidate both query keys:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['apuracoes'] });
  queryClient.invalidateQueries({ queryKey: ['ev_contracts'] });
}
```

**Known limitation:** The writes inside `saveApuracao` are not a single Supabase transaction. If the `ev_contracts` update fails after `apuracoes_fechadas` is already written, the apuração is saved but contracts remain active. This is a pre-existing issue in the current code and is not changed by this refactor.

### staleTime configuration

The existing `new QueryClient()` in `App.tsx` uses default `staleTime: 0`, meaning every component mount triggers a background refetch. Set a 5-minute default globally in `App.tsx`:

```ts
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } }
});
```

This affects all queries in the app (currently zero, since no hooks use react-query yet), so there are no existing queries to break. Individual queries that need different stale behavior can override this at the query level.

### Public API stability

The hook return shapes stay compatible with existing consumers: same field names, same types. Changes:
- `useApuracoesFechadas`: adds `isSavingDraft`, `isSaving`, `isDraftLoading`, `draft`; removes imperative `loadDraft`; `draftId` is derived in the orchestrator from `draft?.apuracao.id`
- `useColaboradores` and `useContracts`: no changes to return shape

Pages that use write operations not being migrated (`EVContratos`, `GestaoTime`, `HistoricoApuracoes`) are not affected.

---

## Phase 2: Break Up ApuracaoTrimestral.tsx

### New folder

`src/components/apuracao-trimestral/`

### Files

| File | Responsibility |
|------|----------------|
| `CNSection.tsx` | Renders a complete `<AccordionItem value="cns">` with trigger and content (CN input table) |
| `EVSection.tsx` | Renders a complete `<AccordionItem value="evs">` with trigger and content (excel upload, dashboard, results table) |
| `LeadershipSection.tsx` | Renders a complete `<AccordionItem value="leadership">` with trigger and content (matrix reference, input table) |
| `FooterBar.tsx` | Fixed bottom bar: real-time totals + save/finalize action buttons |

The parent `ApuracaoTrimestral.tsx` renders the `<Accordion type="multiple" ...>` wrapper and places the three section components inside it. Each section component is responsible for its own `AccordionItem`, `AccordionTrigger`, and `AccordionContent`.

### Orchestrator

`ApuracaoTrimestral.tsx` becomes a thinner orchestrator:
- Holds shared state: selected trimestre/ano, `lastSaved`, CN inputs, EV results, leadership inputs, `expandedSections`
- Derives `draftId` from `draft?.apuracao.id`
- Hydrates form state from `draft` via `useEffect`
- Computes totals passed to `FooterBar`
- Renders the `<Accordion>` wrapper and passes state slices and callbacks as props to each section

### Utility extraction

Business logic helpers currently defined at the top of `ApuracaoTrimestral.tsx` (`calcularMultiplicadorMRR`, `getQuarterMonths`, `TRIMESTRES`, `ANOS`, etc.) move to `src/lib/apuracaoTrimestralUtils.ts`. These are trimestral-specific and not shared with `ApuracaoMensal.tsx`.

### Data flow

```
ApuracaoTrimestral (orchestrator)
  ├── useColaboradores()       ← react-query (reads only)
  ├── useContracts()           ← react-query (reads only)
  ├── useApuracoesFechadas()   ← react-query (reads + saveDraft/saveApuracao mutations)
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
