import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Porte, PRODUTOS_DISPONIVEIS, ContractLine } from '@/lib/evCalculations';
import { Loader2, Plus, X } from 'lucide-react';

interface ContractFormProps {
  onSubmit: (
    baseContract: { nomeEV: string; cliente: string; porte: Porte; atingimento: number },
    lines: ContractLine[]
  ) => Promise<boolean>;
  existingEVNames: string[];
}

const PORTES: Porte[] = ['PP/P', 'M', 'G+', 'Enterprise', 'Inside Sales'];

export function ContractForm({ onSubmit, existingEVNames }: ContractFormProps) {
  const [nomeEV, setNomeEV] = useState('');
  const [customEV, setCustomEV] = useState('');
  const [cliente, setCliente] = useState('');
  const [porte, setPorte] = useState<Porte>('PP/P');
  const [atingimento, setAtingimento] = useState('100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [lines, setLines] = useState<ContractLine[]>([
    { id: '1', produto: '', operadora: '', dataInicio: '' }
  ]);

  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), produto: '', operadora: '', dataInicio: '' }]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof ContractLine, value: string) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalEV = nomeEV === '__custom__' ? customEV.trim() : nomeEV;
    if (!finalEV || !cliente.trim()) return;
    
    const validLines = lines.filter(l => l.produto && l.operadora.trim() && l.dataInicio);
    if (validLines.length === 0) return;

    setIsSubmitting(true);
    const success = await onSubmit({ nomeEV: finalEV, cliente: cliente.trim(), porte, atingimento: Number(atingimento) }, validLines);
    
    if (success) {
      setNomeEV(''); setCustomEV(''); setCliente(''); setPorte('PP/P'); setAtingimento('100');
      setLines([{ id: '1', produto: '', operadora: '', dataInicio: '' }]);
    }
    setIsSubmitting(false);
  };

  const validLinesCount = lines.filter(l => l.produto && l.operadora.trim() && l.dataInicio).length;

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Cadastrar Contratos</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Nome do EV</Label>
              <Select value={nomeEV} onValueChange={setNomeEV}>
                <SelectTrigger><SelectValue placeholder="Selecione ou crie" /></SelectTrigger>
                <SelectContent>
                  {existingEVNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                  <SelectItem value="__custom__">+ Novo EV</SelectItem>
                </SelectContent>
              </Select>
              {nomeEV === '__custom__' && <Input value={customEV} onChange={e => setCustomEV(e.target.value)} placeholder="Nome do novo EV" className="mt-2" />}
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nome do cliente" required />
            </div>
            <div className="space-y-2">
              <Label>Porte</Label>
              <Select value={porte} onValueChange={(v) => setPorte(v as Porte)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PORTES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>% Atingimento</Label>
              <Input type="number" min="0" max="200" value={atingimento} onChange={e => setAtingimento(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Contratos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="w-4 h-4 mr-1" />Adicionar Linha</Button>
            </div>
            <div className="border rounded-lg divide-y">
              <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-3 p-3 bg-muted/50 text-sm font-medium">
                <div>Produto</div><div>Operadora</div><div>Início Vigência</div><div></div>
              </div>
              {lines.map(line => (
                <div key={line.id} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-3 p-3 items-center">
                  <Select value={line.produto} onValueChange={(v) => updateLine(line.id, 'produto', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{PRODUTOS_DISPONIVEIS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={line.operadora} onChange={e => updateLine(line.id, 'operadora', e.target.value)} placeholder="Operadora" />
                  <Input type="month" value={line.dataInicio} onChange={e => updateLine(line.id, 'dataInicio', e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.id)} disabled={lines.length === 1} className="h-9 w-9"><X className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || validLinesCount === 0}>
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : `Criar ${validLinesCount} Contrato${validLinesCount !== 1 ? 's' : ''}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
