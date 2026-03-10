import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MESES } from '@/lib/constants';
import type { Colaborador, MetaMensal } from '@/hooks/useColaboradores';

interface MetasMensaisDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCN: Colaborador | null;
  metasMensais: MetaMensal[];
  onSave: (colaboradorId: string, mes: number, ano: number, metaSao: number) => Promise<boolean>;
}

export function MetasMensaisDialog({
  isOpen,
  onOpenChange,
  selectedCN,
  metasMensais,
  onSave,
}: MetasMensaisDialogProps) {
  const [metaData, setMetaData] = useState({
    mes: new Date().getMonth().toString(),
    ano: new Date().getFullYear().toString(),
    meta_sao: '',
  });

  const metasDoCN = selectedCN
    ? metasMensais
        .filter(m => m.colaborador_id === selectedCN.id)
        .sort((a, b) => b.ano * 100 + b.mes - (a.ano * 100 + a.mes))
    : [];

  const handleSave = async () => {
    if (!selectedCN || !metaData.meta_sao) return;
    const success = await onSave(
      selectedCN.id,
      parseInt(metaData.mes),
      parseInt(metaData.ano),
      parseFloat(metaData.meta_sao),
    );
    if (success) {
      setMetaData(prev => ({ ...prev, meta_sao: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Metas Mensais: {selectedCN?.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Defina metas de SAO específicas para cada mês. A meta de Vidas será calculada
            automaticamente baseada no Porte ({selectedCN?.porte || 'Indefinido'}).
          </p>

          {/* Formulário de Adição de Meta */}
          <div className="flex gap-2 items-end p-3 bg-muted/30 rounded-lg border">
            <div className="flex-1">
              <Label className="text-xs mb-1.5 block">Mês</Label>
              <Select value={metaData.mes} onValueChange={v => setMetaData({ ...metaData, mes: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-20">
              <Label className="text-xs mb-1.5 block">Ano</Label>
              <Input
                className="h-9"
                type="number"
                value={metaData.ano}
                onChange={e => setMetaData({ ...metaData, ano: e.target.value })}
              />
            </div>
            <div className="w-24">
              <Label className="text-xs mb-1.5 block">Meta SAO</Label>
              <Input
                className="h-9"
                type="number"
                placeholder="0"
                value={metaData.meta_sao}
                onChange={e => setMetaData({ ...metaData, meta_sao: e.target.value })}
              />
            </div>
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSave}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Lista de Metas Cadastradas */}
          <div className="border rounded-md max-h-60 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9">Mês/Ano</TableHead>
                  <TableHead className="h-9">Meta SAO</TableHead>
                  <TableHead className="h-9 text-right">Meta Vidas (Est.)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metasDoCN.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4 text-sm">
                      Nenhuma meta específica cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  metasDoCN.map(meta => {
                    const multiplicador = selectedCN?.porte === 'G+' ? 1500 : 350;
                    return (
                      <TableRow key={meta.id}>
                        <TableCell className="py-2">{MESES[meta.mes]}/{meta.ano}</TableCell>
                        <TableCell className="py-2 font-medium">{meta.meta_sao}</TableCell>
                        <TableCell className="py-2 text-right text-muted-foreground">
                          {(meta.meta_sao * multiplicador).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
