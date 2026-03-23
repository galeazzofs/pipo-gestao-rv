# ApuracaoTrimestral Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate three data-fetching hooks to react-query and break `ApuracaoTrimestral.tsx` (1,546 lines) into focused components.

**Architecture:** Phase 1 migrates `useColaboradores`, `useContracts`, and `useApuracoesFechadas` reads to `useQuery` and writes to `useMutation`, keeping write operations used by other pages untouched. Phase 2 extracts the three accordion sections and footer bar into `src/components/apuracao-trimestral/`, reducing the orchestrator to shared state management only.

**Tech Stack:** React 18, TypeScript, @tanstack/react-query v5, Supabase, shadcn/ui, Vite

**Spec:** `docs/superpowers/specs/2026-03-16-apuracao-trimestral-refactor-design.md`

**Note:** This project has no tests. Skip all TDD steps. Verify each task by running the dev server and checking the page works.

---

## Chunk 1: Phase 1 — React-Query Migration

### Task 1: Configure global staleTime in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add staleTime default to QueryClient**

Open `src/App.tsx`. The existing `QueryClient` is defined as:
```ts
const queryClient = new QueryClient();
```
Replace it with:
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});
```

- [ ] **Step 2: Verify app starts**

Run: `npm run dev`
Expected: Dev server starts with no errors. Visit the app in browser — nothing should look different yet.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "config: set default staleTime to 5min in QueryClient"
```

---

### Task 2: Migrate useColaboradores reads to useQuery

**Files:**
- Modify: `src/hooks/useColaboradores.ts`

The hook currently has two manual fetches (`fetchColaboradores` and `fetchMetasMensais`) each using `useState + useEffect`. Replace both with `useQuery`. The write operations (`addColaborador`, `updateColaborador`, `deleteColaborador`, `saveMetaMensal`) remain as manual async functions — they still manually call `fetchColaboradores()`/`fetchMetasMensais()` after each write (this is fine; they are only used by `GestaoTime`, not affected by this refactor).

- [ ] **Step 1: Add react-query imports**

At the top of `src/hooks/useColaboradores.ts`, change:
```ts
import { useState, useEffect, useCallback } from 'react';
```
to:
```ts
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
```

- [ ] **Step 2: Replace the two fetches and loading state with useQuery**

Inside `useColaboradores()`, remove the following blocks entirely:
- `const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);`
- `const [metasMensais, setMetasMensais] = useState<MetaMensal[]>([]);`
- `const [isLoading, setIsLoading] = useState(true);`
- The `fetchColaboradores` useCallback
- The `fetchMetasMensais` useCallback
- The unified `refetch` function
- The `useEffect(() => { refetch(); }, []);`

Replace them with:
```ts
const queryClient = useQueryClient();

const { data: colaboradores = [], isLoading: isLoadingColaboradores } = useQuery({
  queryKey: ['colaboradores'],
  queryFn: async () => {
    const { data, error } = await supabase.from('colaboradores').select('*').order('nome');
    if (error) throw error;
    return data as unknown as Colaborador[];
  },
});

const { data: metasMensais = [] } = useQuery({
  queryKey: ['metasMensais'],
  queryFn: async () => {
    const { data, error } = await supabase.from('metas_sao_mensais').select('*');
    if (error) throw error;
    return data as MetaMensal[];
  },
});

const isLoading = isLoadingColaboradores;

const fetchColaboradores = useCallback(async () => {
  await queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
}, [queryClient]);

const refetch = useCallback(async () => {
  await queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
  await queryClient.invalidateQueries({ queryKey: ['metasMensais'] });
}, [queryClient]);
```

- [ ] **Step 3: Update the write operations to use queryClient.invalidateQueries**

The write operations (`addColaborador`, `updateColaborador`, `deleteColaborador`) currently call `fetchColaboradores()` directly — this still works because `fetchColaboradores` now calls `invalidateQueries`. No further changes needed.

`saveMetaMensal` currently calls `fetchMetasMensais()` — but `fetchMetasMensais` no longer exists as a standalone function. Replace the call inside `saveMetaMensal`:

Find:
```ts
await fetchMetasMensais(); // Recarrega apenas as metas
```
Replace with:
```ts
await queryClient.invalidateQueries({ queryKey: ['metasMensais'] });
```

- [ ] **Step 4: Verify return value is unchanged**

The return statement should still expose:
```ts
return {
  colaboradores,
  metasMensais,
  isLoading,
  fetchColaboradores,
  refetch,
  getCNs,
  getEVs,
  getLideres,
  addColaborador,
  updateColaborador,
  deleteColaborador,
  saveMetaMensal
};
```
(Same shape as before — GestaoTime and other consumers don't need changes.)

- [ ] **Step 5: Verify**

Run: `npm run dev`
Expected: App starts. Navigate to the Hub → GestaoTime page — team list should still load. Navigate to ApuracaoTrimestral — CNs section should still show consultores.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useColaboradores.ts
git commit -m "refactor: migrate useColaboradores reads to useQuery"
```

---

### Task 3: Migrate useContracts read to useQuery

**Files:**
- Modify: `src/hooks/useContracts.ts`

Same pattern as Task 2. The write operations (`addContract`, `addContracts`, `updateContract`, `deleteContract`) remain manual — they currently call `fetchContracts()` after each write. Replace `fetchContracts` with a `queryClient.invalidateQueries` wrapper.

- [ ] **Step 1: Replace imports**

Change:
```ts
import { useState, useEffect, useCallback } from 'react';
```
to:
```ts
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
```

- [ ] **Step 2: Replace the fetch/state with useQuery**

Remove:
- `const [contracts, setContracts] = useState<Contract[]>([]);`
- `const [isLoading, setIsLoading] = useState(true);`
- The entire `fetchContracts` useCallback
- The `useEffect(() => { fetchContracts(); }, [fetchContracts]);`

Replace with:
```ts
const queryClient = useQueryClient();

const { data: contracts = [], isLoading } = useQuery({
  queryKey: ['ev_contracts'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('ev_contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar contratos');
      throw error;
    }
    return (data || []).map(row => ({
      id: row.id,
      nomeEV: row.nome_ev,
      cliente: row.cliente,
      produto: row.produto,
      operadora: row.operadora,
      porte: row.porte as Porte,
      atingimento: Number(row.atingimento),
      dataInicio: row.data_inicio,
      mesesPagosManual: row.meses_pagos_manual || 0
    }));
  },
});

const fetchContracts = useCallback(async () => {
  await queryClient.invalidateQueries({ queryKey: ['ev_contracts'] });
}, [queryClient]);
```

- [ ] **Step 3: Update return value**

The return statement must still expose `refetch: fetchContracts` — this is unchanged since `fetchContracts` now wraps `invalidateQueries`.

- [ ] **Step 4: Verify**

Run: `npm run dev`
Expected: App starts. Navigate to EVContratos — contract list should load. ApuracaoTrimestral EVs section should still work.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useContracts.ts
git commit -m "refactor: migrate useContracts read to useQuery"
```

---

### Task 4: Migrate useApuracoesFechadas reads to useQuery

**Files:**
- Modify: `src/hooks/useApuracoesFechadas.ts`

This task migrates only the **read** operations: `fetchApuracoes` (list) and `loadDraft` (parameterized). Writes (`saveDraft`, `saveApuracao`) are handled in Task 5. The hook gains an optional `mesReferencia` parameter to power the draft query — when called without it (e.g. from `HistoricoApuracoes`), the draft query is disabled.

- [ ] **Step 1: Update hook signature and imports**

Change:
```ts
import { useState, useEffect, useCallback } from 'react';
```
to:
```ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
```

Change the function signature from:
```ts
export function useApuracoesFechadas() {
```
to:
```ts
export function useApuracoesFechadas(mesReferencia?: string) {
```

- [ ] **Step 2: Replace apuracoes list fetch with useQuery**

Remove:
- `const [apuracoes, setApuracoes] = useState<ApuracaoFechada[]>([]);`
- `const [isLoading, setIsLoading] = useState(true);`
- The `fetchApuracoes` useCallback
- The `useEffect(() => { fetchApuracoes(); }, [fetchApuracoes]);`

Replace with:
```ts
const queryClient = useQueryClient();

const { data: apuracoes = [], isLoading } = useQuery({
  queryKey: ['apuracoes'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('apuracoes_fechadas')
      .select('*')
      .order('data_fechamento', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar apurações');
      throw error;
    }
    return (data || []) as ApuracaoFechada[];
  },
});
```

- [ ] **Step 3: Replace loadDraft with useQuery**

Remove the existing `loadDraft` async function entirely (lines 138–169 in original).

Add the draft query after the apuracoes query:
```ts
const { data: draft = null, isLoading: isDraftLoading } = useQuery({
  queryKey: ['draft', 'trimestral', mesReferencia],
  queryFn: async (): Promise<{ apuracao: ApuracaoFechada; itens: ApuracaoFechadaItem[] } | null> => {
    const { data: apuracaoData, error: apuracaoError } = await supabase
      .from('apuracoes_fechadas')
      .select('*')
      .eq('tipo', 'trimestral')
      .eq('mes_referencia', mesReferencia!)
      .eq('status', 'rascunho')
      .maybeSingle();

    if (apuracaoError) throw apuracaoError;
    if (!apuracaoData) return null;

    const { data: itensData, error: itensError } = await supabase
      .from('apuracoes_fechadas_itens')
      .select(`
        *,
        colaborador:colaboradores(id, nome, cargo, nivel, salario_base, lider_id)
      `)
      .eq('apuracao_id', apuracaoData.id);

    if (itensError) throw itensError;

    return {
      apuracao: apuracaoData as ApuracaoFechada,
      itens: (itensData || []) as ApuracaoFechadaItem[],
    };
  },
  enabled: !!mesReferencia,
});
```

- [ ] **Step 4: Replace refetch in write operations**

The write operations that previously called `await fetchApuracoes()` must now call `queryClient.invalidateQueries`. Find all occurrences of `await fetchApuracoes();` in `saveDraft`, `saveApuracao`, `deleteApuracao`, `finalizarApuracao` and replace each one with:
```ts
await queryClient.invalidateQueries({ queryKey: ['apuracoes'] });
```

- [ ] **Step 5: Update return value**

Update the return statement to remove `loadDraft` and add `draft`, `isDraftLoading`, and `refetch`:
```ts
return {
  apuracoes,
  isLoading,
  draft,
  isDraftLoading,
  saveApuracao,
  saveDraft,
  finalizarApuracao,
  getApuracaoItens,
  deleteApuracao,
  getMensais,
  getTrimestrais,
  getRascunhos,
  getFinalizados,
  getMeusResultados,
  refetch: () => queryClient.invalidateQueries({ queryKey: ['apuracoes'] }),
};
```

- [ ] **Step 6: Fix HistoricoApuracoes call site**

Open `src/pages/hub/HistoricoApuracoes.tsx`. Find the call to `useApuracoesFechadas()` — it takes no arguments, so it continues to work as-is (the draft query is disabled when `mesReferencia` is undefined). Confirm there are no TypeScript errors.

- [ ] **Step 7: Verify**

Run: `npm run dev`
Expected: App starts. HistoricoApuracoes loads apuracoes list. ApuracaoTrimestral still loads (draft loading is currently broken in the orchestrator — that's expected and will be fixed in Task 6).

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useApuracoesFechadas.ts
git commit -m "refactor: migrate useApuracoesFechadas reads to useQuery"
```

---

### Task 5: Migrate useApuracoesFechadas writes to useMutation

**Files:**
- Modify: `src/hooks/useApuracoesFechadas.ts`

Migrate `saveDraft` and `saveApuracao` from plain async functions to `useMutation`. Both must return the apuração ID on success (throw on failure, never return null) so `mutateAsync` callers receive the ID.

- [ ] **Step 1: Add useMutation import**

Change:
```ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
```
to:
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

- [ ] **Step 2: Extract saveDraft logic to a pure async function**

The existing `saveDraft` body (lines 171–288 in original) becomes a standalone function outside the hook. Create a new internal function `saveDraftFn` that **throws on error** instead of returning `null`:

```ts
async function saveDraftFn(
  tipo: TipoApuracao,
  mesReferencia: string,
  itens: ApuracaoItemInput[]
): Promise<string> {
  // --- (paste the entire existing saveDraft body here) ---
  // Replace every "return null;" with "throw error;" or "throw new Error('...');"
  // Replace "toast.success('Rascunho salvo com sucesso!');" — remove it (hook's onSuccess handles it)
  // Replace "toast.error(...);" at the catch — remove it (hook's onError handles it)
  // At the end, "return apuracaoId;" (already exists, keep it)
}
```

Key changes inside `saveDraftFn`:
- In the `catch` block: remove the `toast.error(...)` line and change `return null;` to `throw error;`
- Remove the `toast.success('Rascunho salvo com sucesso!');` line (moved to `onSuccess`)
- Remove the `await fetchApuracoes();` call (replaced by `onSuccess` invalidation)
- Return type is `Promise<string>` (always returns the ID string on success)

- [ ] **Step 3: Replace the saveDraft function in the hook with useMutation**

Inside `useApuracoesFechadas()`, remove the old `saveDraft` async function. Add:

```ts
const saveDraftMutation = useMutation<string, Error, { tipo: TipoApuracao; mesReferencia: string; itens: ApuracaoItemInput[] }>({
  mutationFn: ({ tipo, mesReferencia, itens }) => saveDraftFn(tipo, mesReferencia, itens),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['apuracoes'] });
    queryClient.invalidateQueries({ queryKey: ['draft', 'trimestral'] });
    toast.success('Rascunho salvo com sucesso!');
  },
  onError: (error) => toast.error(error.message || 'Erro ao salvar rascunho'),
});
```

- [ ] **Step 4: Extract saveApuracao logic to a pure async function**

Same approach as `saveDraftFn`. Create `saveApuracaoFn` outside the hook:

```ts
async function saveApuracaoFn(
  tipo: TipoApuracao,
  mesReferencia: string,
  itens: ApuracaoItemInput[],
  contractPayments?: ContractPaymentInput[]
): Promise<string> {
  // --- paste existing saveApuracao body ---
  // Remove toast.success and toast.error lines
  // Remove await fetchApuracoes();
  // Change "return null;" in catch to "throw error;"
  // Keep "return apuracaoData.id;" at the end
}
```

- [ ] **Step 5: Replace saveApuracao in the hook with useMutation**

```ts
const saveApuracaoMutation = useMutation<string, Error, { tipo: TipoApuracao; mesReferencia: string; itens: ApuracaoItemInput[]; contractPayments?: ContractPaymentInput[] }>({
  mutationFn: ({ tipo, mesReferencia, itens, contractPayments }) =>
    saveApuracaoFn(tipo, mesReferencia, itens, contractPayments),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['apuracoes'] });
    queryClient.invalidateQueries({ queryKey: ['ev_contracts'] });
    queryClient.invalidateQueries({ queryKey: ['draft', 'trimestral'] });
    toast.success('Apuração trimestral finalizada com sucesso!');
  },
  onError: (error) => toast.error(error.message || 'Erro ao salvar apuração'),
});
```

- [ ] **Step 6: Update return value to expose mutation wrappers**

Add to the return object:
```ts
return {
  // ... existing fields ...
  saveDraft: (tipo: TipoApuracao, mesReferencia: string, itens: ApuracaoItemInput[]) =>
    saveDraftMutation.mutateAsync({ tipo, mesReferencia, itens }),
  isSavingDraft: saveDraftMutation.isPending,
  saveApuracao: (tipo: TipoApuracao, mesReferencia: string, itens: ApuracaoItemInput[], contractPayments?: ContractPaymentInput[]) =>
    saveApuracaoMutation.mutateAsync({ tipo, mesReferencia, itens, contractPayments }),
  isSaving: saveApuracaoMutation.isPending,
  // ... rest of existing fields ...
};
```

The `saveDraft` and `saveApuracao` wrappers still return `Promise<string>` — callers that do `const id = await saveDraft(...)` continue to work.

- [ ] **Step 7: Verify TypeScript**

Run: `npx tsc --noEmit`
Fix any type errors before proceeding.

- [ ] **Step 8: Verify**

Run: `npm run dev`
Expected: App starts without errors. ApuracaoTrimestral page will be partially broken (draft hydration still uses old API) — that's expected and fixed in Task 6.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useApuracoesFechadas.ts
git commit -m "refactor: migrate saveDraft and saveApuracao to useMutation"
```

---

### Task 6: Update ApuracaoTrimestral to consume new hook API

**Files:**
- Modify: `src/pages/hub/ApuracaoTrimestral.tsx`

The hook API has changed: `loadDraft` is gone, `draft`/`isDraftLoading`/`isSaving`/`isSavingDraft` are now from the hook. Replace the manual draft-loading logic with reactive draft hydration.

- [ ] **Step 1: Update hook destructuring**

Find:
```ts
const { saveDraft, loadDraft, saveApuracao } = useApuracoesFechadas();
```
Replace with:
```ts
const {
  draft,
  isDraftLoading,
  saveDraft,
  isSavingDraft,
  saveApuracao,
  isSaving,
} = useApuracoesFechadas(mesReferencia);
```

Note: `mesReferencia` is computed on line 184 as `` `${trimestre}/${ano}` ``, but it's used in the hook call. Move the `mesReferencia` declaration **above** the hook calls:

```ts
const mesReferencia = `${trimestre}/${ano}`;

const { getCNs, getEVs, getLideres, colaboradores, isLoading: loadingColaboradores } = useColaboradores();
const {
  draft,
  isDraftLoading,
  saveDraft,
  isSavingDraft,
  saveApuracao,
  isSaving,
} = useApuracoesFechadas(mesReferencia);
const { contracts, isLoading: loadingContracts } = useContracts();
```

- [ ] **Step 2: Remove obsolete useState**

Remove these lines:
```ts
const [isSaving, setIsSaving] = useState(false);
const [isSavingDraft, setIsSavingDraft] = useState(false);
const [isLoadingDraft, setIsLoadingDraft] = useState(false);
const [draftId, setDraftId] = useState<string | null>(null);
```

- [ ] **Step 3: Derive draftId**

Add after the hook destructurings:
```ts
const draftId = draft?.apuracao.id ?? null;
```

- [ ] **Step 4: Replace loadExistingDraft with reactive useEffect**

Remove the entire `loadExistingDraft` useCallback (lines 218–289) and the `useEffect` that calls it (lines 291–295).

Replace with a hydration `useEffect` using the guard pattern from the spec:

```ts
const lastHydratedKey = useRef<{ mesReferencia: string; draftId: string | null } | undefined>(undefined);

useEffect(() => {
  if (isDraftLoading) return; // wait until query resolves
  const incomingKey = { mesReferencia, draftId: draft?.apuracao.id ?? null };
  const prev = lastHydratedKey.current;
  if (
    prev &&
    prev.mesReferencia === incomingKey.mesReferencia &&
    prev.draftId === incomingKey.draftId
  ) return;
  lastHydratedKey.current = incomingKey;

  if (draft) {
    setLastSaved(draft.apuracao.updated_at ? new Date(draft.apuracao.updated_at) : null);
    const newCnRows: Record<string, CNRow> = {};
    const newEvRows: Record<string, EVRow> = {};
    const newLiderRows: Record<string, LiderRow> = {};

    draft.itens.forEach((item: ApuracaoFechadaItem) => {
      if (item.colaborador?.cargo === 'CN') {
        newCnRows[item.colaborador_id] = {
          saoMeta: item.sao_meta?.toString() || '',
          saoRealizado: item.sao_realizado?.toString() || '',
          vidasMeta: item.vidas_meta?.toString() || '',
          vidasRealizado: item.vidas_realizado?.toString() || '',
          comissao: item.comissao_base || 0,
          pctSAO: item.pct_sao || 0,
          pctVidas: item.pct_vidas || 0,
          scoreFinal: item.score_final || 0,
          multiplicador: item.multiplicador || 0,
          bonus: item.bonus_trimestral?.toString() || '0',
          total: item.total_pagar,
        };
      } else if (item.colaborador?.cargo === 'EV') {
        newEvRows[item.colaborador_id] = {
          comissaoSafra: item.comissao_safra || 0,
          metaMRR: '',
          mrrRealizado: '',
          pctAtingimento: 0,
          multiplicador: item.multiplicador_meta || 1,
          bonusEV: item.bonus_ev || 0,
          total: item.total_pagar,
        };
      } else if (item.colaborador?.cargo === 'Lideranca') {
        newLiderRows[item.colaborador_id] = {
          metaMRRCalculada: item.meta_mrr_lider || 0,
          evsDoTime: [],
          metaSQL: item.meta_sql_lider?.toString() || '',
          realizadoMRR: item.realizado_mrr_lider?.toString() || '',
          realizadoSQL: item.realizado_sql_lider?.toString() || '',
          pctMRR: item.pct_mrr_lider || 0,
          pctSQL: item.pct_sql_lider || 0,
          multiplicador: item.multiplicador_lider || 0,
          bonus: item.bonus_lideranca || 0,
          total: item.total_pagar,
        };
      }
    });

    setCnRows(newCnRows);
    setEvRows(newEvRows);
    setLiderRows(newLiderRows);
    toast.info('Rascunho carregado');
  } else {
    // No draft for this quarter — reset all rows
    setLastSaved(null);
    setCnRows({});
    setEvRows({});
    setLiderRows({});
    setEvResults([]);
    setHasProcessedExcel(false);
  }
}, [draft, isDraftLoading, mesReferencia]);
```

Add `useRef` to the React import: `import { useState, useMemo, useEffect, useCallback, useRef } from 'react';`

- [ ] **Step 5: Update the draft-guard useEffect**

Find the "Pre-fill goals from colaboradores" useEffect:
```ts
useEffect(() => {
  if (loadingColaboradores || hasInitializedMetas || draftId) return;
  ...
}, [cns, evs, loadingColaboradores, hasInitializedMetas, draftId, cnRows, evRows]);
```

This still references `draftId` — that's fine since it's now derived. Also add `isDraftLoading` to the guard so metas aren't pre-filled while draft is loading:
```ts
useEffect(() => {
  if (loadingColaboradores || hasInitializedMetas || draftId || isDraftLoading) return;
  ...
}, [cns, evs, loadingColaboradores, hasInitializedMetas, draftId, isDraftLoading, cnRows, evRows]);
```

- [ ] **Step 6: Update handleSaveDraft**

Replace:
```ts
const handleSaveDraft = async () => {
  const itens = buildItensArray();
  if (itens.length === 0) {
    toast.error('Nenhum dado para salvar');
    return;
  }

  setIsSavingDraft(true);
  const result = await saveDraft('trimestral', mesReferencia, itens);
  if (result) {
    setDraftId(result);
    setLastSaved(new Date());
  }
  setIsSavingDraft(false);
};
```
With:
```ts
const handleSaveDraft = async () => {
  const itens = buildItensArray();
  if (itens.length === 0) {
    toast.error('Nenhum dado para salvar');
    return;
  }
  try {
    await saveDraft('trimestral', mesReferencia, itens);
    setLastSaved(new Date());
  } catch (_) {
    // onError in hook handles toast
  }
};
```

- [ ] **Step 7: Update handleFinalize**

Replace:
```ts
const handleFinalize = async () => {
  ...
  setIsSaving(true);
  ...
  const result = await saveApuracao('trimestral', mesReferencia, itens, contractPayments);
  setIsSaving(false);

  if (result) {
    setCnRows({});
    setEvRows({});
    setLiderRows({});
    setEvResults([]);
    setHasProcessedExcel(false);
    setDraftId(null);
    setLastSaved(null);
  }
};
```
With (remove `setIsSaving` calls; `setDraftId(null)` is not needed since draftId is derived):
```ts
const handleFinalize = async () => {
  const errors = validateBeforeFinalize();
  if (errors.length > 0) {
    errors.forEach(err => toast.error(err));
    return;
  }

  const itens = buildItensArray();
  const contractPayments = evResults
    .filter(result => result.status === 'valido' && result.contract)
    .map(result => ({
      contract_id: result.contract!.id,
      data_parcela: result.excelRow.dataRecebimento.toISOString(),
      valor_pago: result.comissao || 0
    }));

  try {
    await saveApuracao('trimestral', mesReferencia, itens, contractPayments);
    setCnRows({});
    setEvRows({});
    setLiderRows({});
    setEvResults([]);
    setHasProcessedExcel(false);
    setLastSaved(null);
  } catch (_) {
    // onError in hook handles toast
  }
};
```

- [ ] **Step 8: Update JSX references**

In the JSX, replace `isLoadingDraft` with `isDraftLoading` (line 809):
```tsx
{isDraftLoading ? (
```

The `isSaving` and `isSavingDraft` in JSX already reference the correct names (now from hook).

- [ ] **Step 9: TypeScript check**

Run: `npx tsc --noEmit`
Fix any type errors.

- [ ] **Step 10: Verify end-to-end**

Run: `npm run dev`
Expected:
1. Navigate to ApuracaoTrimestral — page loads, CNs list appears
2. Select a different quarter — rows reset
3. Save a draft — "Rascunho salvo" toast appears
4. Re-navigate to the same quarter — draft is loaded from cache (fast, no spinner)

- [ ] **Step 11: Commit**

```bash
git add src/pages/hub/ApuracaoTrimestral.tsx
git commit -m "refactor: consume new react-query hook API in ApuracaoTrimestral"
```

---

## Chunk 2: Phase 2 — Component Extraction

### Task 7: Create apuracaoTrimestralUtils.ts

**Files:**
- Create: `src/lib/apuracaoTrimestralUtils.ts`
- Modify: `src/pages/hub/ApuracaoTrimestral.tsx` (remove moved code, add import)

- [ ] **Step 1: Create the utils file**

Create `src/lib/apuracaoTrimestralUtils.ts` with the following content (moved verbatim from `ApuracaoTrimestral.tsx` lines 74–142):

```ts
export const TRIMESTRES = [
  { value: 'Q1', label: 'Q1 (Jan-Mar)' },
  { value: 'Q2', label: 'Q2 (Abr-Jun)' },
  { value: 'Q3', label: 'Q3 (Jul-Set)' },
  { value: 'Q4', label: 'Q4 (Out-Dez)' },
];

export const ANOS = ['2024', '2025', '2026', '2027'];

export const calcularMultiplicadorMRR = (pctAtingimento: number): number => {
  if (pctAtingimento < 80) return 0;
  if (pctAtingimento < 95) return 0.5;
  if (pctAtingimento < 125) return 1.0;
  return 1.5;
};

export const getQuarterMonths = (quarter: string): number[] => {
  switch (quarter) {
    case 'Q1': return [0, 1, 2];
    case 'Q2': return [3, 4, 5];
    case 'Q3': return [6, 7, 8];
    case 'Q4': return [9, 10, 11];
    default: return [];
  }
};

export interface CNRow {
  saoMeta: string;
  saoRealizado: string;
  vidasMeta: string;
  vidasRealizado: string;
  comissao: number;
  pctSAO: number;
  pctVidas: number;
  scoreFinal: number;
  multiplicador: number;
  bonus: string;
  total: number;
}

export interface EVRow {
  comissaoSafra: number;
  metaMRR: string;
  mrrRealizado: string;
  pctAtingimento: number;
  multiplicador: number;
  bonusEV: number;
  total: number;
}

export interface LiderRow {
  metaMRRCalculada: number;
  evsDoTime: string[];
  metaSQL: string;
  realizadoMRR: string;
  realizadoSQL: string;
  pctMRR: number;
  pctSQL: number;
  multiplicador: number;
  bonus: number;
  total: number;
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
```

Note: `formatCurrency` and `formatPercentage` are moved here too since they're needed by multiple section components.

- [ ] **Step 2: Update ApuracaoTrimestral.tsx imports**

Remove the local definitions of `TRIMESTRES`, `ANOS`, `calcularMultiplicadorMRR`, `getQuarterMonths`, `CNRow`, `EVRow`, `LiderRow`, `formatCurrency`, `formatPercentage` from `ApuracaoTrimestral.tsx`.

Add import:
```ts
import {
  TRIMESTRES, ANOS,
  calcularMultiplicadorMRR, getQuarterMonths,
  formatCurrency, formatPercentage,
  CNRow, EVRow, LiderRow
} from '@/lib/apuracaoTrimestralUtils';
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Verify**

Run: `npm run dev` — page should look and behave identically.

- [ ] **Step 5: Commit**

```bash
git add src/lib/apuracaoTrimestralUtils.ts src/pages/hub/ApuracaoTrimestral.tsx
git commit -m "refactor: extract ApuracaoTrimestral utilities to lib"
```

---

### Task 8: Extract CNSection component

**Files:**
- Create: `src/components/apuracao-trimestral/CNSection.tsx`
- Modify: `src/pages/hub/ApuracaoTrimestral.tsx`

- [ ] **Step 1: Create CNSection.tsx**

Create `src/components/apuracao-trimestral/CNSection.tsx`:

```tsx
import { Colaborador } from '@/hooks/useColaboradores';
import { CNRow, formatCurrency, formatPercentage } from '@/lib/apuracaoTrimestralUtils';
import { calcularComissaoCN, CNLevel, CN_TARGETS } from '@/lib/cnCalculations';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Users, Loader2 } from 'lucide-react';

interface CNSectionProps {
  cns: Colaborador[];
  cnRows: Record<string, CNRow>;
  isLoading: boolean;
  subtotal: number;
  onUpdateRow: (id: string, field: keyof CNRow, value: string) => void;
}

export function CNSection({ cns, cnRows, isLoading, subtotal, onUpdateRow }: CNSectionProps) {
  return (
    <AccordionItem value="cns" className="border rounded-lg bg-card">
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
        <div className="flex items-center gap-3 w-full">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold">Seção 1: CNs (Mês 3 + Bônus)</h3>
            <p className="text-sm text-muted-foreground">
              {cns.length} consultores • Subtotal: {formatCurrency(subtotal)}
            </p>
          </div>
          {subtotal > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {formatCurrency(subtotal)}
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="p-4 mb-4 flex items-start gap-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-300">Regra de Cálculo (Regra de Ouro)</p>
            <p className="text-blue-700 dark:text-blue-400">
              Score = (SAO × 70%) + (Vidas × 30%, trava em 150%). O bônus trimestral é um valor manual adicional.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : cns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum CN cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Consultor</TableHead>
                  <TableHead className="text-center">Nível</TableHead>
                  <TableHead className="text-center">Target</TableHead>
                  <TableHead className="text-center w-20">M SAO</TableHead>
                  <TableHead className="text-center w-20">R SAO</TableHead>
                  <TableHead className="text-center w-20">M Vidas</TableHead>
                  <TableHead className="text-center w-20">R Vidas</TableHead>
                  <TableHead className="text-center">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 justify-center">
                        Score <Info className="w-3 h-3" />
                      </TooltipTrigger>
                      <TooltipContent><p>(SAO × 70%) + (Vidas × 30%)</p></TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-center">Mult.</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-center w-24">Bônus Tri</TableHead>
                  <TableHead className="text-right">TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cns.map((cn) => {
                  const row: CNRow = cnRows[cn.id] || {
                    saoMeta: '', saoRealizado: '', vidasMeta: '', vidasRealizado: '',
                    comissao: 0, pctSAO: 0, pctVidas: 0, scoreFinal: 0, multiplicador: 0,
                    bonus: '0', total: 0
                  };
                  const nivel = (cn.nivel || 'CN1') as CNLevel;
                  const target = CN_TARGETS[nivel];
                  const isComplete = row.saoMeta !== '' && row.saoRealizado !== '' &&
                    row.vidasMeta !== '' && row.vidasRealizado !== '';

                  return (
                    <TableRow key={cn.id}>
                      <TableCell className="font-medium">{cn.nome}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{nivel}</Badge></TableCell>
                      <TableCell className="text-center text-muted-foreground">{formatCurrency(target)}</TableCell>
                      <TableCell>
                        <Input type="number" min="0" placeholder="0" value={row.saoMeta}
                          onChange={(e) => onUpdateRow(cn.id, 'saoMeta', e.target.value)}
                          className="w-16 text-center" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" placeholder="0" value={row.saoRealizado}
                          onChange={(e) => onUpdateRow(cn.id, 'saoRealizado', e.target.value)}
                          className="w-16 text-center" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" placeholder="0" value={row.vidasMeta}
                          onChange={(e) => onUpdateRow(cn.id, 'vidasMeta', e.target.value)}
                          className="w-16 text-center" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" placeholder="0" value={row.vidasRealizado}
                          onChange={(e) => onUpdateRow(cn.id, 'vidasRealizado', e.target.value)}
                          className="w-16 text-center" />
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {isComplete ? formatPercentage(row.scoreFinal) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {isComplete ? formatPercentage(row.multiplicador) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {isComplete ? formatCurrency(row.comissao) : '-'}
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" value={row.bonus}
                          onChange={(e) => onUpdateRow(cn.id, 'bonus', e.target.value)}
                          className="w-20" placeholder="R$ 0" />
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {(isComplete || row.total > 0) ? formatCurrency(row.total) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
```

- [ ] **Step 2: Use CNSection in ApuracaoTrimestral**

In `ApuracaoTrimestral.tsx`, add import:
```ts
import { CNSection } from '@/components/apuracao-trimestral/CNSection';
```

In the JSX, replace the entire `{/* Section 1: CNs */}` `<AccordionItem>` block (lines 822–981) with:
```tsx
<CNSection
  cns={cns}
  cnRows={cnRows}
  isLoading={loadingColaboradores}
  subtotal={totalCNs}
  onUpdateRow={updateCNRow}
/>
```

- [ ] **Step 3: Verify**

Run: `npm run dev`
Expected: CNs section looks and behaves identically.

- [ ] **Step 4: Commit**

```bash
git add src/components/apuracao-trimestral/CNSection.tsx src/pages/hub/ApuracaoTrimestral.tsx
git commit -m "refactor: extract CNSection component"
```

---

### Task 9: Extract EVSection component

**Files:**
- Create: `src/components/apuracao-trimestral/EVSection.tsx`
- Modify: `src/pages/hub/ApuracaoTrimestral.tsx`

- [ ] **Step 1: Create EVSection.tsx**

Create `src/components/apuracao-trimestral/EVSection.tsx`. Copy the entire `{/* Section 2: EVs */}` `<AccordionItem>` block (lines 983–1179 of the original file) into the component. The props it needs:

```tsx
import { Colaborador } from '@/hooks/useColaboradores';
import { Contract } from '@/lib/evCalculations';
import { ProcessedResult, ExcelRow } from '@/lib/evCalculations';
import { EVRow, formatCurrency } from '@/lib/apuracaoTrimestralUtils';
import { ResultsDashboard } from '@/components/ev/ResultsDashboard';
import { ResultsTable } from '@/components/ev/ResultsTable';
import { ExcelDropzone } from '@/components/ev/ExcelDropzone';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Info, Briefcase, Loader2 } from 'lucide-react';

interface EVSectionProps {
  evs: Colaborador[];
  evRows: Record<string, EVRow>;
  evResults: ProcessedResult[];
  contracts: Contract[];
  hasProcessedExcel: boolean;
  isProcessingExcel: boolean;
  selectedMonth: string;
  selectedEV: string;
  subtotal: number;
  onUpdateRow: (id: string, field: keyof EVRow, value: string | number) => void;
  onExcelData: (data: ExcelRow[]) => void;
  onMonthChange: (month: string) => void;
  onEVChange: (ev: string) => void;
}

export function EVSection({
  evs, evRows, evResults, contracts, hasProcessedExcel,
  isProcessingExcel, selectedMonth, selectedEV, subtotal,
  onUpdateRow, onExcelData, onMonthChange, onEVChange
}: EVSectionProps) {
  return (
    <AccordionItem value="evs" className="border rounded-lg bg-card">
      {/* paste AccordionTrigger + AccordionContent from the original JSX block */}
      {/* Replace all references to handler functions with the prop callbacks */}
      {/* Replace handleExcelData with onExcelData */}
      {/* Replace setSelectedMonth with onMonthChange, setSelectedEV with onEVChange */}
    </AccordionItem>
  );
}
```

Full instructions: copy lines 984–1179 of the original `ApuracaoTrimestral.tsx` into the component body, then:
- Replace `handleExcelData` with `onExcelData`
- Replace `setSelectedMonth` with `onMonthChange`
- Replace `setSelectedEV` with `onEVChange`
- All other references use props directly

- [ ] **Step 2: Use EVSection in ApuracaoTrimestral**

Add import:
```ts
import { EVSection } from '@/components/apuracao-trimestral/EVSection';
```

Replace the `{/* Section 2: EVs */}` block with:
```tsx
<EVSection
  evs={evs}
  evRows={evRows}
  evResults={evResults}
  contracts={contracts}
  hasProcessedExcel={hasProcessedExcel}
  isProcessingExcel={isProcessingExcel}
  selectedMonth={selectedMonth}
  selectedEV={selectedEV}
  subtotal={totalEVs}
  onUpdateRow={updateEVRow}
  onExcelData={handleExcelData}
  onMonthChange={setSelectedMonth}
  onEVChange={setSelectedEV}
/>
```

- [ ] **Step 3: TypeScript check and verify**

Run: `npx tsc --noEmit` then `npm run dev`
Expected: EVs section looks identical, Excel upload still works.

- [ ] **Step 4: Commit**

```bash
git add src/components/apuracao-trimestral/EVSection.tsx src/pages/hub/ApuracaoTrimestral.tsx
git commit -m "refactor: extract EVSection component"
```

---

### Task 10: Extract LeadershipSection component

**Files:**
- Create: `src/components/apuracao-trimestral/LeadershipSection.tsx`
- Modify: `src/pages/hub/ApuracaoTrimestral.tsx`

- [ ] **Step 1: Create LeadershipSection.tsx**

Create `src/components/apuracao-trimestral/LeadershipSection.tsx`. Props:

```tsx
import { Colaborador } from '@/hooks/useColaboradores';
import { LiderRow, formatCurrency } from '@/lib/apuracaoTrimestralUtils';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
// ... rest of shadcn imports needed by the leadership JSX

interface LeadershipSectionProps {
  lideres: Colaborador[];
  liderRows: Record<string, LiderRow>;
  subtotal: number;
  getEVsDoLider: (liderId: string) => Colaborador[];
  calcularMetaMRRParaLider: (liderId: string) => { metaMRR: number; evIds: string[] };
  onUpdateRow: (id: string, field: 'metaSQL' | 'realizadoMRR' | 'realizadoSQL', value: string) => void;
}
```

Copy lines 1182–1444 (the `{/* Section 3: Leadership */}` `<AccordionItem>`) verbatim into the component. All references to `lideres`, `liderRows`, `updateLiderRow`, `calcularMetaMRRParaLider`, `getEVsDoLider`, `formatCurrency`, `totalLideranca` use the props directly.

- [ ] **Step 2: Use LeadershipSection in ApuracaoTrimestral**

Add import:
```ts
import { LeadershipSection } from '@/components/apuracao-trimestral/LeadershipSection';
```

Replace the `{/* Section 3: Leadership */}` block with:
```tsx
<LeadershipSection
  lideres={lideres}
  liderRows={liderRows}
  subtotal={totalLideranca}
  getEVsDoLider={getEVsDoLider}
  calcularMetaMRRParaLider={calcularMetaMRRParaLider}
  onUpdateRow={updateLiderRow}
/>
```

- [ ] **Step 3: TypeScript check and verify**

Run: `npx tsc --noEmit` then `npm run dev`
Expected: Leadership section looks identical.

- [ ] **Step 4: Commit**

```bash
git add src/components/apuracao-trimestral/LeadershipSection.tsx src/pages/hub/ApuracaoTrimestral.tsx
git commit -m "refactor: extract LeadershipSection component"
```

---

### Task 11: Extract FooterBar component

**Files:**
- Create: `src/components/apuracao-trimestral/FooterBar.tsx`
- Modify: `src/pages/hub/ApuracaoTrimestral.tsx`

- [ ] **Step 1: Create FooterBar.tsx**

Create `src/components/apuracao-trimestral/FooterBar.tsx`:

```tsx
import { formatCurrency } from '@/lib/apuracaoTrimestralUtils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Users, Briefcase, Crown, Save, FileCheck, Loader2 } from 'lucide-react';

interface FooterBarProps {
  totalCNs: number;
  totalEVs: number;
  totalLideranca: number;
  totalGeral: number;
  mesReferencia: string;
  isSavingDraft: boolean;
  isSaving: boolean;
  hasAnyData: boolean;
  onSaveDraft: () => void;
  onFinalize: () => void;
}

export function FooterBar({
  totalCNs, totalEVs, totalLideranca, totalGeral,
  mesReferencia, isSavingDraft, isSaving, hasAnyData,
  onSaveDraft, onFinalize
}: FooterBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-muted-foreground">CNs:</span>
              <span className="font-semibold">{formatCurrency(totalCNs)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span className="text-muted-foreground">EVs:</span>
              <span className="font-semibold">{formatCurrency(totalEVs)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-600" />
              <span className="text-muted-foreground">Liderança:</span>
              <span className="font-semibold">{formatCurrency(totalLideranca)}</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">TOTAL:</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totalGeral)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onSaveDraft}
              disabled={isSavingDraft || !hasAnyData} className="gap-2">
              {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Rascunho
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isSaving || totalGeral === 0} className="gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                  Finalizar Fechamento
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalizar Apuração Trimestral?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá fechar a apuração de {mesReferencia} com os seguintes totais:
                    <div className="mt-4 space-y-2 p-4 bg-muted rounded-lg">
                      <div className="flex justify-between"><span>CNs:</span><span className="font-medium">{formatCurrency(totalCNs)}</span></div>
                      <div className="flex justify-between"><span>EVs:</span><span className="font-medium">{formatCurrency(totalEVs)}</span></div>
                      <div className="flex justify-between"><span>Liderança:</span><span className="font-medium">{formatCurrency(totalLideranca)}</span></div>
                      <div className="flex justify-between border-t pt-2 font-bold">
                        <span>TOTAL:</span><span className="text-primary">{formatCurrency(totalGeral)}</span>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onFinalize}>Confirmar Fechamento</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Use FooterBar in ApuracaoTrimestral**

Add import:
```ts
import { FooterBar } from '@/components/apuracao-trimestral/FooterBar';
```

Replace the `{/* Fixed Footer Action Bar */}` block (lines 1449–1543) with:
```tsx
<FooterBar
  totalCNs={totalCNs}
  totalEVs={totalEVs}
  totalLideranca={totalLideranca}
  totalGeral={totalGeral}
  mesReferencia={mesReferencia}
  isSavingDraft={isSavingDraft}
  isSaving={isSaving}
  hasAnyData={hasAnyData}
  onSaveDraft={handleSaveDraft}
  onFinalize={handleFinalize}
/>
```

- [ ] **Step 3: Remove unused imports from ApuracaoTrimestral.tsx**

After extraction, many icon and UI component imports in `ApuracaoTrimestral.tsx` will no longer be used directly. Remove any that TypeScript flags as unused (e.g. `Save`, `FileCheck`, `AlertDialog*`, `Users`, `Briefcase`, `Crown` if not used elsewhere in the page).

Run: `npx tsc --noEmit` to see which imports can be removed.

- [ ] **Step 4: Verify**

Run: `npm run dev`
Expected: Footer bar looks and behaves identically. Save draft and finalize still work.

- [ ] **Step 5: Commit**

```bash
git add src/components/apuracao-trimestral/FooterBar.tsx src/pages/hub/ApuracaoTrimestral.tsx
git commit -m "refactor: extract FooterBar component"
```

---

### Task 12: Final cleanup and verification

**Files:**
- Modify: `src/pages/hub/ApuracaoTrimestral.tsx`

- [ ] **Step 1: Count remaining lines**

Run:
```bash
wc -l src/pages/hub/ApuracaoTrimestral.tsx
```
Expected: significantly under 600 lines (down from 1,546).

- [ ] **Step 2: Remove any remaining unused imports**

Run `npx tsc --noEmit` and remove all flagged unused imports. Common ones to check: icon imports, shadcn UI components that were moved to section components.

- [ ] **Step 3: End-to-end smoke test**

Run `npm run dev` and manually verify:
1. Page loads with correct CNs, EVs, and leaders list
2. Change quarter — rows reset
3. Enter values in CNs table — totals update in footer
4. Upload Excel in EVs section — commissions computed correctly
5. Enter leadership values — totals update
6. Save draft — toast appears, badge shows saved time
7. Navigate away and back to same quarter — draft reloads (fast, from cache)
8. Finalize — confirmation dialog appears, on confirm data saves and form resets
9. Navigate to HistoricoApuracoes — list still loads correctly

- [ ] **Step 4: Final commit**

```bash
git add src/pages/hub/ApuracaoTrimestral.tsx
git commit -m "refactor: final cleanup of ApuracaoTrimestral orchestrator"
```
