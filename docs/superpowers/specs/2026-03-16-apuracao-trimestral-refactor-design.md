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

Each hook has both read and write operations. Only the reads used by `ApuracaoTrimestral` are migrated in this refactor. Write operations used exclusively by other pages (`GestaoTime`, `EVContratos`, `HistoricoApuracoes`) are left untouched to avoid unintended side effects.

| Hook | Lines | Reads to migrate | Writes to migrate | Writes left as-is |
|------|-------|------------------|-------------------|-------------------|
| `useColaboradores.ts` | 210 | `colaboradores` list, `metasMensais` list (two separate queries) | — | `addColaborador`, `updateColaborador`, `deleteColaborador`, `saveMetaMensal` |
| `useContracts.ts` | 207 | `contracts` list | — | `addContract`, `addContracts`, `updateContract`, `deleteContract` |
| `useApuracoesFechadas.ts` | 567 | `apuracoes` list, `loadDraft` (parameterized) | `saveDraft`, `saveApuracao` | `deleteApuracao`, `finalizarApuracao`, `getApuracaoItens`, `getMeusResultados` |

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
  staleTime: 5 * 60 * 1000,
});
```

### `loadDraft` — parameterized on-demand read

`loadDraft(tipo, mesReferencia)` is currently an imperative async function called inside a `useCallback` when the user selects a trimestre/ano. It does not fit a simple list query pattern.

It becomes a `useQuery` with a parameterized query key and `enabled` guard:

```ts
const { data: draft, isLoading: isDraftLoading } = useQuery({
  queryKey: ['draft', tipo, mesReferencia],
  queryFn: () => fetchDraftFromSupabase(tipo, mesReferencia),
  enabled: !!mesReferencia,
  staleTime: 5 * 60 * 1000,
});
```

The hook returns `draft` and `isDraftLoading` instead of the imperative `loadDraft` function. `ApuracaoTrimestral` receives the draft data reactively and hydrates its form state via `useEffect` when `draft` changes.

### Write operations — useMutation

`saveDraft` and `saveApuracao` in `useApuracoesFechadas` become `useMutation` calls. Both currently return `Promise<string | null>` (the new apuração ID), which callers use to update local `draftId` state.

To preserve this return value, callers use `mutateAsync` instead of `mutate`:

```ts
// In hook
const saveDraftMutation = useMutation({
  mutationFn: (args: SaveDraftArgs) => saveDraftFn(args),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['apuracoes'] });
    toast.success('Rascunho salvo com sucesso!');
  },
  onError: (error) => toast.error(error.message || 'Erro ao salvar rascunho'),
});

// Hook return
return { saveDraft: saveDraftMutation.mutateAsync, isSavingDraft: saveDraftMutation.isPending };

// In orchestrator
const newId = await saveDraft(args); // still returns the ID via mutateAsync
```

`isSaving` and `isSavingDraft`, which are currently local `useState` in `ApuracaoTrimestral`, are removed from the page and replaced by `isPending` from the mutations exposed in the hook return value.

### Cross-hook cache invalidation

`saveApuracao` writes to both `apuracoes_fechadas` and `ev_contracts` (contract auto-deactivation). After `saveApuracao` completes, invalidate both query keys:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['apuracoes'] });
  queryClient.invalidateQueries({ queryKey: ['ev_contracts'] });
}
```

### staleTime configuration

The existing `new QueryClient()` in `App.tsx` uses default `staleTime: 0`, meaning every component mount triggers a background refetch. To realize the caching benefit, set a default `staleTime` of 5 minutes either globally in `QueryClient` or at the query level:

```ts
// App.tsx
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } }
});
```

### Public API stability

The hook return shapes stay compatible with existing consumers: same field names, same types. The only additions are `isSavingDraft` and `isSaving` (replacing local `useState` in the orchestrator), and the removal of the imperative `loadDraft` function (replaced by reactive `draft` + `isDraftLoading` fields).

Pages that use `useContracts` or `useColaboradores` write operations (`EVContratos`, `GestaoTime`, `HistoricoApuracoes`) are not affected because those write operations are not changed.

---

## Phase 2: Break Up ApuracaoTrimestral.tsx

### New folder

`src/components/apuracao-trimestral/`

### Files

| File | Responsibility |
|------|----------------|
| `CNSection.tsx` | CNs accordion section with input table |
| `EVSection.tsx` | EVs accordion section with excel upload, dashboard, results table |
| `LeadershipSection.tsx` | Leadership accordion section with matrix reference and input table |
| `FooterBar.tsx` | Fixed bottom bar: real-time totals + save/finalize action buttons |

### Orchestrator

`ApuracaoTrimestral.tsx` becomes a thinner orchestrator (estimated ~300–400 lines after extraction, reduced from 1,546):
- Holds shared state: selected trimestre/ano, draft status, CN inputs, EV results, leadership inputs
- Computes totals passed to `FooterBar`
- Passes state slices and callbacks as props to each section component

### Utility extraction

Business logic helpers currently defined at the top of `ApuracaoTrimestral.tsx` (`calcularMultiplicadorMRR`, `getQuarterMonths`, `TRIMESTRES`, `ANOS`, etc.) move to `src/lib/apuracaoTrimestralUtils.ts`. These helpers are trimestral-specific and are not shared with `ApuracaoMensal.tsx`, which has its own monthly calculation logic.

### Data flow

```
ApuracaoTrimestral (orchestrator)
  ├── useColaboradores()       ← react-query (reads only)
  ├── useContracts()           ← react-query (reads only)
  ├── useApuracoesFechadas()   ← react-query (reads + saveDraft/saveApuracao mutations)
  │
  ├── <CNSection cnInputs={...} onChange={...} colaboradores={...} />
  ├── <EVSection evResults={...} onUpload={...} contracts={...} />
  ├── <LeadershipSection inputs={...} onChange={...} colaboradores={...} />
  └── <FooterBar totals={...} onSaveDraft={...} onFinalize={...} isSaving={...} isSavingDraft={...} />
```

---

## Out of Scope

- Write operations in `useColaboradores` and `useContracts` used by other pages are not changed
- `ApuracaoMensal.tsx` and its hooks are not touched
- No new features are added
- No tests (project has none)
