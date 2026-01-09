import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminRoute } from '@/components/AdminRoute';
import { useColaboradores, CargoType, ColaboradorInput } from '@/hooks/useColaboradores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Search,
  Loader2 
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const CARGOS: { value: CargoType; label: string }[] = [
  { value: 'CN', label: 'CN (Consultor de Negócios)' },
  { value: 'EV', label: 'EV (Executivo de Vendas)' },
  { value: 'Lideranca', label: 'Liderança' },
];

const NIVEIS = ['CN1', 'CN2', 'CN3'];

interface FormData {
  nome: string;
  email: string;
  cargo: CargoType;
  nivel: string;
  lider_id: string;
  salario_base: string;
}

const emptyForm: FormData = {
  nome: '',
  email: '',
  cargo: 'CN',
  nivel: 'CN1',
  lider_id: '',
  salario_base: '0',
};

export default function GestaoTime() {
  const { colaboradores, isLoading, addColaborador, updateColaborador, deleteColaborador, getLideres } = useColaboradores();
  const [search, setSearch] = useState('');
  const [filterCargo, setFilterCargo] = useState<CargoType | 'all'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const lideres = getLideres();

  const filteredColaboradores = colaboradores.filter(c => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) ||
                       c.email.toLowerCase().includes(search.toLowerCase());
    const matchCargo = filterCargo === 'all' || c.cargo === filterCargo;
    return matchSearch && matchCargo;
  });

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (colaborador: typeof colaboradores[0]) => {
    setEditingId(colaborador.id);
    setFormData({
      nome: colaborador.nome,
      email: colaborador.email,
      cargo: colaborador.cargo,
      nivel: colaborador.nivel || 'CN1',
      lider_id: colaborador.lider_id || '',
      salario_base: String(colaborador.salario_base || 0),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const input: ColaboradorInput = {
      nome: formData.nome,
      email: formData.email,
      cargo: formData.cargo,
      nivel: formData.cargo === 'CN' ? formData.nivel : null,
      lider_id: formData.lider_id || null,
      salario_base: parseFloat(formData.salario_base) || 0,
    };

    let success = false;
    if (editingId) {
      success = await updateColaborador(editingId, input);
    } else {
      success = await addColaborador(input);
    }

    setIsSaving(false);
    if (success) {
      setIsDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteColaborador(id);
  };

  const getCargoColor = (cargo: CargoType) => {
    switch (cargo) {
      case 'CN': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'EV': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'Lideranca': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestão de Time</h1>
                <p className="text-sm text-muted-foreground">
                  {colaboradores.length} colaboradores cadastrados
                </p>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenNew} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Colaborador
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome completo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@empresa.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo</Label>
                    <Select
                      value={formData.cargo}
                      onValueChange={(value: CargoType) => setFormData({ ...formData, cargo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        {CARGOS.map((cargo) => (
                          <SelectItem key={cargo.value} value={cargo.value}>
                            {cargo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.cargo === 'CN' && (
                    <div className="space-y-2">
                      <Label htmlFor="nivel">Nível</Label>
                      <Select
                        value={formData.nivel}
                        onValueChange={(value) => setFormData({ ...formData, nivel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o nível" />
                        </SelectTrigger>
                        <SelectContent>
                          {NIVEIS.map((nivel) => (
                            <SelectItem key={nivel} value={nivel}>
                              {nivel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="lider">Líder Imediato</Label>
                    <Select
                      value={formData.lider_id || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, lider_id: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o líder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem líder direto</SelectItem>
                        {lideres.map((lider) => (
                          <SelectItem key={lider.id} value={lider.id}>
                            {lider.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salario">Salário Base (R$)</Label>
                    <Input
                      id="salario"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.salario_base}
                      onChange={(e) => setFormData({ ...formData, salario_base: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingId ? 'Salvar Alterações' : 'Adicionar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <div className="card-premium p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterCargo}
                onValueChange={(value) => setFilterCargo(value as CargoType | 'all')}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cargos</SelectItem>
                  {CARGOS.map((cargo) => (
                    <SelectItem key={cargo.value} value={cargo.value}>
                      {cargo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="card-premium overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredColaboradores.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {colaboradores.length === 0 
                  ? 'Nenhum colaborador cadastrado ainda.'
                  : 'Nenhum colaborador encontrado com os filtros aplicados.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead className="text-right">Salário Base</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredColaboradores.map((colaborador) => (
                    <TableRow key={colaborador.id}>
                      <TableCell className="font-medium">{colaborador.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{colaborador.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCargoColor(colaborador.cargo)}>
                          {colaborador.cargo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {colaborador.nivel || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(colaborador.salario_base)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={colaborador.ativo ? 'default' : 'secondary'}>
                          {colaborador.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(colaborador)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover colaborador?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O colaborador {colaborador.nome} será removido permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(colaborador.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}
