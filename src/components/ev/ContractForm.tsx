import { useState } from 'react';
import { Contract, Porte, PRODUTOS_DISPONIVEIS } from '@/lib/evCalculations';
import { Plus, Loader2, Trash2, Info, Calendar } from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ContractFormProps {
  onSubmit: (contracts: Omit<Contract, 'id'>[]) => Promise<unknown> | void;
  existingEVNames: string[];
  onCancel?: () => void;
}

const PORTES: Porte[] = ['PP/P', 'Inside Sales', 'M', 'G+', 'Enterprise'];

interface ContractItem {
  id: string;
  produto: string;
  operadora: string;
  porte: Porte;
  atingimento: string;
  dataInicio: string;
  mesesPagosManual: string;
}

const createEmptyItem = (): ContractItem => ({
  id: crypto.randomUUID(),
  produto: '',
  operadora: '',
  porte: 'PP/P',
  atingimento: '100',
  dataInicio: '',
  mesesPagosManual: '0'
});

export function ContractForm({ onSubmit, existingEVNames, onCancel }: ContractFormProps) {
  const [nomeEV, setNomeEV] = useState('');
  const [customEV, setCustomEV] = useState('');
  const [cliente, setCliente] = useState('');
  const [items, setItems] = useState<ContractItem[]>([createEmptyItem()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleItemChange = (id: string, field: keyof ContractItem, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const isFormValid = () => {
    const evName = nomeEV === '__custom__' ? customEV : nomeEV;
    if (!evName || !cliente) return false;
    
    return items.every(item => 
      item.produto && 
      item.operadora.trim() && 
      item.dataInicio
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    const evName = nomeEV === '__custom__' ? customEV : nomeEV;
    setIsSubmitting(true);

    try {
      const contracts: Omit<Contract, 'id'>[] = items.map(item => ({
        nomeEV: evName,
        cliente,
        produto: item.produto,
        operadora: item.operadora.trim(),
        porte: item.porte,
        atingimento: parseFloat(item.atingimento) || 100,
        dataInicio: `${item.dataInicio}-01`,
        mesesPagosManual: parseInt(item.mesesPagosManual) || 0
      }));

      await onSubmit(contracts);
      setNomeEV('');
      setCustomEV('');
      setCliente('');
      setItems([createEmptyItem()]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F6F3] dark:bg-[#0A0A0A]">
      {/* Linha cinza superior (Separando o Header do conteúdo) */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 w-full"></div>

      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          
          {/* Seção 1: Cliente e EV */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              Novo Cliente e Contratos
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Executivo de Vendas (EV)
                </label>
                <Select value={nomeEV} onValueChange={setNomeEV}>
                  <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 shadow-sm h-11">
                    <SelectValue placeholder="Selecione ou adicione" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingEVNames.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                    <SelectItem value="__custom__" className="text-primary font-medium">+ Novo EV</SelectItem>
                  </SelectContent>
                </Select>
                {nomeEV === '__custom__' && (
                  <input
                    placeholder="Nome do novo EV"
                    value={customEV}
                    onChange={(e) => setCustomEV(e.target.value)}
                    className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 shadow-sm"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Cliente
                </label>
                <input
                  placeholder="Nome do cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 shadow-sm placeholder:text-zinc-400"
                  required
                />
              </div>
            </div>
          </section>

          {/* Seção 2: Contratos */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Contratos para este cliente
            </h3>

            <div className="space-y-6">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-6 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      Contrato {index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
                    {/* Produto */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">Produto</label>
                      <Select 
                        value={item.produto} 
                        onValueChange={(v) => handleItemChange(item.id, 'produto', v)}
                      >
                        <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black/5 h-10">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUTOS_DISPONIVEIS.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operadora */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">Operadora</label>
                      <input
                        placeholder="Ex: Amil"
                        value={item.operadora}
                        onChange={(e) => handleItemChange(item.id, 'operadora', e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 h-10"
                      />
                    </div>

                    {/* Porte */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">Porte</label>
                      <Select 
                        value={item.porte} 
                        onValueChange={(v) => handleItemChange(item.id, 'porte', v as Porte)}
                      >
                        <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black/5 h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PORTES.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Atingimento */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">% Atingimento</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="200"
                          value={item.atingimento}
                          onChange={(e) => handleItemChange(item.id, 'atingimento', e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 h-10 pr-8"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-zinc-400">%</span>
                      </div>
                    </div>

                    {/* Início Vigência */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">Início Vigência</label>
                      <div className="relative">
                        <input
                          type="month"
                          value={item.dataInicio}
                          onChange={(e) => handleItemChange(item.id, 'dataInicio', e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 h-10 appearance-none"
                          style={{ colorScheme: 'light' }}
                        />
                      </div>
                    </div>

                    {/* Meses já pagos (Legado) - Estrutura Ajustada */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        Meses já pagos (Legado)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-zinc-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="w-64 text-xs">
                                Quantidade de parcelas já pagas ANTES de usar este sistema. 
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        value={item.mesesPagosManual}
                        onChange={(e) => handleItemChange(item.id, 'mesesPagosManual', e.target.value)}
                        className="w-full bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 text-zinc-700 dark:text-zinc-300 h-10"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-4 px-6 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-all flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium text-sm group"
            >
              <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Adicionar Outro Contrato para este Cliente
            </button>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 bg-[#F7F6F3] dark:bg-[#0A0A0A] border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <button 
            type="submit" 
            disabled={isSubmitting || !isFormValid()}
            className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {isSubmitting ? 'Salvando...' : `Salvar ${items.length} Contrato(s)`}
          </button>
          
          {onCancel && (
            <button 
              type="button"
              onClick={onCancel}
              className="text-zinc-500 dark:text-zinc-400 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}