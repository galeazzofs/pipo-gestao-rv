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

1. **Hooks first** — migrate data layer to react-query
2. **Components second** — extract sections into focused files

---

## Phase 1: Migrate Hooks to React-Query

### Hooks in scope

| Hook | Lines | Operations |
|------|-------|------------|
| `useColaboradores.ts` | 210 | read colaboradores |
| `useContracts.ts` | 207 | read contracts |
| `useApuracoesFechadas.ts` | 567 | read apurações, save draft, finalize |

### Pattern change

**Before:**
```ts
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
useEffect(() => {
  setLoading(true);
  supabase.from('table').select('*').then(({ data }) => {
    setData(data);
    setLoading(false);
  });
}, [deps]);
```

**After:**
```ts
const { data = [], isLoading } = useQuery({
  queryKey: ['table', deps],
  queryFn: () => supabase.from('table').select('*').then(({ data }) => data),
});
```

### Write operations

Save draft and finalize in `useApuracoesFechadas` become `useMutation` calls, replacing manual async functions with `isPending` state and `onSuccess`/`onError` callbacks wired to toast notifications.

### Public API

Each hook's return shape stays the same (same field names, same types) so `ApuracaoTrimestral.tsx` and any other consumers require no changes in Phase 1.

### Benefits

- **Caching:** repeated navigations don't re-fetch already-loaded data
- **Deduplication:** multiple components using the same hook don't trigger duplicate requests
- **Automatic refetch:** data stays fresh after mutations
- **Less boilerplate:** removes ~30–40 lines of manual loading/error state per hook

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

`ApuracaoTrimestral.tsx` becomes a thin orchestrator (~150–200 lines):
- Holds shared state: selected trimestre/ano, draft status, CN inputs, EV results, leadership inputs
- Computes totals passed to `FooterBar`
- Passes state slices and callbacks as props to each section component

### Utility extraction

Business logic helpers currently defined at the top of `ApuracaoTrimestral.tsx` (`calcularMultiplicadorMRR`, `getQuarterMonths`, `TRIMESTRES`, `ANOS`, etc.) move to `src/lib/apuracaoTrimestralUtils.ts`.

### Data flow

```
ApuracaoTrimestral (orchestrator)
  ├── useColaboradores()       ← react-query
  ├── useContracts()           ← react-query
  ├── useApuracoesFechadas()   ← react-query
  │
  ├── <CNSection cnInputs={...} onChange={...} colaboradores={...} />
  ├── <EVSection evResults={...} onUpload={...} contracts={...} />
  ├── <LeadershipSection inputs={...} onChange={...} colaboradores={...} />
  └── <FooterBar totals={...} onSaveDraft={...} onFinalize={...} isPending={...} />
```

---

## Out of Scope

- Other pages and hooks are not touched in this refactor
- No new features are added
- No tests (project has none)
