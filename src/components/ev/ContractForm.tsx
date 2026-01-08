import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Contract, Porte } from '@/lib/evCalculations';
import { Plus } from 'lucide-react';

interface ContractFormProps {
  onSubmit: (contract: Omit<Contract, 'id'>) => void;
  existingEVNames: string[];
}

const PORTES: Porte[] = ['PP/P', 'M', 'G+', 'Enterprise'];

export function ContractForm({ onSubmit, existingEVNames }: ContractFormProps) {
  const [nomeEV, setNomeEV] = useState('');
  const [customEV, setCustomEV] = useState('');
  const [cliente, setCliente] = useState('');
  const [produto, setProduto] = useState('');
  const [operadora, setOperadora] = useState('');
  const [porte, setPorte] = useState<Porte>('PP/P');
  const [atingimento, setAtingimento] = useState('100');
  const [dataInicio, setDataInicio] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const evName = nomeEV === '__custom__' ? customEV : nomeEV;
    
    if (!evName || !cliente || !produto || !operadora || !dataInicio) {
      return;
    }

    onSubmit({
      nomeEV: evName,
      cliente,
      produto,
      operadora,
      porte,
      atingimento: parseFloat(atingimento) || 100,
      dataInicio: `${dataInicio}-01` // Converte "2025-01" para "2025-01-01"
    });

    // Reset form
    setNomeEV('');
    setCustomEV('');
    setCliente('');
    setProduto('');
    setOperadora('');
    setPorte('PP/P');
    setAtingimento('100');
    setDataInicio('');
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

        {/* Produto */}
        <div className="space-y-2">
          <Label htmlFor="produto">Produto</Label>
          <Input
            id="produto"
            placeholder="Nome do produto"
            value={produto}
            onChange={(e) => setProduto(e.target.value)}
            className="input-field"
            required
          />
        </div>

        {/* Operadora */}
        <div className="space-y-2">
          <Label htmlFor="operadora">Operadora</Label>
          <Input
            id="operadora"
            placeholder="Nome da operadora"
            value={operadora}
            onChange={(e) => setOperadora(e.target.value)}
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

      <Button type="submit" className="btn-primary w-full md:w-auto">
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Contrato
      </Button>
    </form>
  );
}
