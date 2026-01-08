import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Contract, Porte, PRODUTOS_DISPONIVEIS } from '@/lib/evCalculations';
import { Plus, Loader2, X } from 'lucide-react';

interface ContractFormProps {
  onSubmit: (contract: Omit<Contract, 'id'>) => Promise<unknown> | void;
  existingEVNames: string[];
}

const PORTES: Porte[] = ['PP/P', 'Inside Sales', 'M', 'G+', 'Enterprise'];

export function ContractForm({ onSubmit, existingEVNames }: ContractFormProps) {
  const [nomeEV, setNomeEV] = useState('');
  const [customEV, setCustomEV] = useState('');
  const [cliente, setCliente] = useState('');
  const [produtos, setProdutos] = useState<string[]>([]);
  const [operadoras, setOperadoras] = useState<string[]>([]);
  const [novaOperadora, setNovaOperadora] = useState('');
  const [porte, setPorte] = useState<Porte>('PP/P');
  const [atingimento, setAtingimento] = useState('100');
  const [dataInicio, setDataInicio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProdutoToggle = (produto: string) => {
    setProdutos(prev => 
      prev.includes(produto) 
        ? prev.filter(p => p !== produto)
        : [...prev, produto]
    );
  };

  const handleAddOperadora = () => {
    if (novaOperadora.trim() && !operadoras.includes(novaOperadora.trim())) {
      setOperadoras(prev => [...prev, novaOperadora.trim()]);
      setNovaOperadora('');
    }
  };

  const handleRemoveOperadora = (operadora: string) => {
    setOperadoras(prev => prev.filter(o => o !== operadora));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const evName = nomeEV === '__custom__' ? customEV : nomeEV;
    
    if (!evName || !cliente || produtos.length === 0 || operadoras.length === 0 || !dataInicio) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        nomeEV: evName,
        cliente,
        produtos,
        operadoras,
        porte,
        atingimento: parseFloat(atingimento) || 100,
        dataInicio: `${dataInicio}-01`
      });

      // Reset form
      setNomeEV('');
      setCustomEV('');
      setCliente('');
      setProdutos([]);
      setOperadoras([]);
      setNovaOperadora('');
      setPorte('PP/P');
      setAtingimento('100');
      setDataInicio('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-premium p-6 space-y-6">
      <h3 className="text-lg font-semibold text-foreground">Novo Contrato</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Nome do EV */}
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

        {/* Cliente */}
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

        {/* Porte */}
        <div className="space-y-2">
          <Label htmlFor="porte">Porte</Label>
          <Select value={porte} onValueChange={(v) => setPorte(v as Porte)}>
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

        {/* % Atingimento */}
        <div className="space-y-2">
          <Label htmlFor="atingimento">% Atingimento na Venda</Label>
          <Input
            id="atingimento"
            type="number"
            min="0"
            max="200"
            placeholder="100"
            value={atingimento}
            onChange={(e) => setAtingimento(e.target.value)}
            className="input-field"
            required
          />
        </div>

        {/* Data do Primeiro Pagamento */}
        <div className="space-y-2">
          <Label htmlFor="dataInicio">Mês do Primeiro Pagamento</Label>
          <Input
            id="dataInicio"
            type="month"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="input-field"
            required
          />
        </div>
      </div>

      {/* Produtos - Checkboxes */}
      <div className="space-y-3">
        <Label>Produtos (selecione um ou mais)</Label>
        <div className="flex flex-wrap gap-4">
          {PRODUTOS_DISPONIVEIS.map(produto => (
            <div key={produto} className="flex items-center space-x-2">
              <Checkbox
                id={`produto-${produto}`}
                checked={produtos.includes(produto)}
                onCheckedChange={() => handleProdutoToggle(produto)}
              />
              <Label 
                htmlFor={`produto-${produto}`} 
                className="text-sm font-normal cursor-pointer"
              >
                {produto}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Operadoras - Tags */}
      <div className="space-y-3">
        <Label>Operadoras</Label>
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {operadoras.map(operadora => (
            <Badge key={operadora} variant="secondary" className="px-3 py-1 text-sm">
              {operadora}
              <button
                type="button"
                onClick={() => handleRemoveOperadora(operadora)}
                className="ml-2 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Nome da operadora"
            value={novaOperadora}
            onChange={(e) => setNovaOperadora(e.target.value)}
            className="input-field max-w-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddOperadora();
              }
            }}
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleAddOperadora}
            disabled={!novaOperadora.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Button type="submit" className="btn-primary w-full md:w-auto" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 mr-2" />
        )}
        {isSubmitting ? 'Salvando...' : 'Adicionar Contrato'}
      </Button>
    </form>
  );
}
