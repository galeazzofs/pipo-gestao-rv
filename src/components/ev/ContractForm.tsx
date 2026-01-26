import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Contract, Porte, PRODUTOS_DISPONIVEIS } from '@/lib/evCalculations';
import { Plus, Loader2, Trash2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface ContractFormProps {
  onSubmit: (contracts: Omit<Contract, 'id'>[]) => Promise<unknown> | void;
  existingEVNames: string[];
}

const PORTES: Porte[] = ['PP/P', 'Inside Sales', 'M', 'G+', 'Enterprise'];

interface ContractItem {
  id: string;
  produto: string;
  operadora: string;
  porte: Porte;
  atingimento: string;
  dataInicio: string;
  mesesPagosManual: string; // Novo campo
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

export function ContractForm({ onSubmit, existingEVNames }: ContractFormProps) {
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
        mesesPagosManual: parseInt(item.mesesPagosManual) || 0 // Mapeando o novo campo
      }));

      await onSubmit(contracts);

      // Reset form
      setNomeEV('');
      setCustomEV('');
      setCliente('');
      setItems([createEmptyItem()]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-premium p-6 space-y-6">
      <h3 className="text-lg font-semibold text-foreground">Novo Cliente e Contratos</h3>
      
      {/* Dados do Cliente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nomeEV">Executivo de Vendas (EV)</Label>
          <Select value={nomeEV} onValueChange={setNomeEV}>
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Selecione ou adicione" />
            </SelectTrigger>
            <SelectContent>
              {existingEVNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
              <SelectItem value="__custom__">+ Novo EV</SelectItem>
            </SelectContent>
          </Select>
          {nomeEV === '__custom__' && (
            <Input
              placeholder="Nome do novo EV"
              value={customEV}
              onChange={(e) => setCustomEV(e.target.value)}
              className="input-field mt-2"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente</Label>
          <Input
            id="cliente"
            placeholder="Nome do cliente"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="input-field"
            required
          />
        </div>
      </div>

      {/* Lista de Contratos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Contratos para {cliente || 'este cliente'}</Label>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className="p-4 border border-border rounded-lg bg-muted/30 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Contrato {index + 1}
                </span>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <Select 
                    value={item.produto} 
                    onValueChange={(v) => handleItemChange(item.id, 'produto', v)}
                  >
                    <SelectTrigger className="input-field">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUTOS_DISPONIVEIS.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Operadora</Label>
                  <Input
                    placeholder="Ex: Amil"
                    value={item.operadora}
                    onChange={(e) => handleItemChange(item.id, 'operadora', e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Porte</Label>
                  <Select 
                    value={item.porte} 
                    onValueChange={(v) => handleItemChange(item.id, 'porte', v as Porte)}
                  >
                    <SelectTrigger className="input-field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PORTES.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>% Atingimento</Label>
                  <Input
                    type="number"
                    min="0"
                    max="200"
                    value={item.atingimento}
                    onChange={(e) => handleItemChange(item.id, 'atingimento', e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Início Vigência</Label>
                  <Input
                    type="month"
                    value={item.dataInicio}
                    onChange={(e) => handleItemChange(item.id, 'dataInicio', e.target.value)}
                    className="input-field"
                  />
                </div>

                {/* Novo Campo: Meses Pagos (Legado) */}
                <div className="space-y-2">
                  <TooltipProvider>
                    <div className="flex items-center gap-2">
                      <Label>Meses já pagos (Legado)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-64">
                            Quantidade de parcelas já pagas ANTES de usar este sistema. 
                            Ex: Se o contrato começou há 4 meses, coloque 4 aqui.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                  <Input
                    type="number"
                    min="0"
                    max="12"
                    value={item.mesesPagosManual}
                    onChange={(e) => handleItemChange(item.id, 'mesesPagosManual', e.target.value)}
                    className="input-field bg-amber-50 dark:bg-amber-950/10 border-amber-200"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleAddItem}
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Outro Contrato para {cliente || 'este Cliente'}
        </Button>
      </div>

      <Button 
        type="submit" 
        className="btn-primary w-full md:w-auto" 
        disabled={isSubmitting || !isFormValid()}
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 mr-2" />
        )}
        {isSubmitting ? 'Salvando...' : `Salvar ${items.length} Contrato(s)`}
      </Button>
    </form>
  );
}