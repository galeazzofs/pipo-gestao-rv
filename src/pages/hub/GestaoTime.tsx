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
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Search,
  Loader2,
  Download,
  Store,
  Gem,
  UserCog,
  TrendingUp,
  LayoutGrid,
  List as ListIcon,
  MoreVertical
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';

const CARGOS: { value: CargoType; label: string }[] = [
  { value: 'CN', label: 'CN (Consultor)' },
  { value: 'EV', label: 'EV (Executivo)' },
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
  meta_mrr: string;
  meta_sao: string;
  meta_vidas: string;
}

const emptyForm: FormData = {
  nome: '',
  email: '',
  cargo: 'CN',
  nivel: 'CN1',
  lider_id: '',
  salario_base: '0',
  meta_mrr: '0',
  meta_sao: '0',
  meta_vidas: '0',
};

export default function GestaoTime() {
  const { colaboradores, isLoading, addColaborador, updateColaborador, deleteColaborador, getLideres } = useColaboradores();
  const [search, setSearch] = useState('');
  const [filterCargo, setFilterCargo] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const lideres = getLideres();

  const filteredColaboradores = colaboradores.filter(c => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) ||
                       c.email.toLowerCase().includes(search.toLowerCase());
    const matchCargo = filterCargo === 'all' || c.cargo === filterCargo;
    return matchSearch && matchCargo;
  });

  // Stats calculation
  const stats = {
    total: colaboradores.length,
    cns: colaboradores.filter(c => c.cargo === 'CN').length,
    evs: colaboradores.filter(c => c.cargo === 'EV').length,
    lideres: colaboradores.filter(c => c.cargo === 'Lideranca').length,
  };

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
      meta_mrr: String(colaborador.meta_mrr || 0),
      meta_sao: String(colaborador.meta_sao || 0),
      meta_vidas: String(colaborador.meta_vidas || 0),
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
      meta_mrr: formData.cargo === 'EV' ? parseFloat(formData.meta_mrr) || 0 : 0,
      meta_sao: formData.cargo === 'CN' ? parseFloat(formData.meta_sao) || 0 : 0,
      meta_vidas: formData.cargo === 'CN' ? parseFloat(formData.meta_vidas) || 0 : 0,
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleBadgeColor = (cargo: CargoType) => {
    switch (cargo) {
      case 'CN': return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800';
      case 'EV': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
      case 'Lideranca': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getAvatarColor = (cargo: CargoType) => {
    switch (cargo) {
      case 'CN': return 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400';
      case 'EV': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400';
      case 'Lideranca': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="max-w-[1600px] mx-auto px-6 py-8 flex flex-col gap-8">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Gestão de Colaboradores</h1>
              <p className="text-muted-foreground text-base max-w-2xl">
                Gerencie a estrutura do seu time, acompanhe performance e atribuições.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="hidden md:flex gap-2">
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleOpenNew} className="gap-2 shadow-lg shadow-primary/20">
                    <Plus className="w-5 h-5" />
                    Novo Colaborador
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
                    </DialogTitle>
                  </DialogHeader>
                  {/* Form inside Dialog */}
                  <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cargo">Cargo</Label>
                        <Select
                          value={formData.cargo}
                          onValueChange={(value: CargoType) => setFormData({ ...formData, cargo: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Cargo" />
                          </SelectTrigger>
                          <SelectContent>
                            {CARGOS.map((cargo) => (
                              <SelectItem key={cargo.value} value={cargo.value}>{cargo.label}</SelectItem>
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
                              <SelectValue placeholder="Nível" />
                            </SelectTrigger>
                            <SelectContent>
                              {NIVEIS.map((nivel) => (
                                <SelectItem key={nivel} value={nivel}>{nivel}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

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
                            <SelectItem key={lider.id} value={lider.id}>{lider.nome}</SelectItem>
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

                    {/* Metas Específicas */}
                    {formData.cargo === 'CN' && (
                      <div className="grid grid-cols-2 gap-4 bg-muted/50 p-3 rounded-md">
                        <div className="space-y-2">
                          <Label htmlFor="meta_sao">Meta SAO</Label>
                          <Input
                            id="meta_sao"
                            type="number"
                            value={formData.meta_sao}
                            onChange={(e) => setFormData({ ...formData, meta_sao: e.target.value })}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="meta_vidas">Meta Vidas</Label>
                          <Input
                            id="meta_vidas"
                            type="number"
                            value={formData.meta_vidas}
                            onChange={(e) => setFormData({ ...formData, meta_vidas: e.target.value })}
                            className="bg-background"
                          />
                        </div>
                      </div>
                    )}
                    {formData.cargo === 'EV' && (
                      <div className="space-y-2 bg-muted/50 p-3 rounded-md">
                        <Label htmlFor="meta_mrr">Meta MRR (R$)</Label>
                        <Input
                          id="meta_mrr"
                          type="number"
                          step="0.01"
                          value={formData.meta_mrr}
                          onChange={(e) => setFormData({ ...formData, meta_mrr: e.target.value })}
                          className="bg-background"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                      <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {editingId ? 'Salvar Alterações' : 'Adicionar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card className="p-6 flex items-center gap-4 hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total de Colaboradores</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
              </div>
            </Card>
            
            <Card className="p-6 flex items-center gap-4 hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Consultores (CN)</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.cns}</p>
              </div>
            </Card>

            <Card className="p-6 flex items-center gap-4 hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Gem className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Executivos (EV)</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.evs}</p>
              </div>
            </Card>

            <Card className="p-6 flex items-center gap-4 hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <UserCog className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Líderes</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.lideres}</p>
              </div>
            </Card>
          </div>

          {/* Filters & Actions Bar */}
          <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col lg:flex-row items-center gap-4">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                className="w-full h-12 pl-12 pr-4 rounded-lg bg-background border-input focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground" 
                placeholder="Buscar por nome ou e-mail..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="w-full lg:w-72">
              <Select value={filterCargo} onValueChange={setFilterCargo}>
                <SelectTrigger className="h-12 rounded-lg bg-background border-input">
                  <SelectValue placeholder="Todos os Cargos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cargos</SelectItem>
                  {CARGOS.map(cargo => (
                    <SelectItem key={cargo.value} value={cargo.value}>{cargo.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden lg:block w-[1px] h-8 bg-border mx-2"></div>

            <div className="flex items-center gap-2 self-end lg:self-auto">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">Visualizar:</span>
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="icon" 
                onClick={() => setViewMode('grid')}
                className="h-10 w-10"
              >
                <LayoutGrid className="w-5 h-5" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="icon" 
                onClick={() => setViewMode('list')}
                className="h-10 w-10"
              >
                <ListIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredColaboradores.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              Nenhum colaborador encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredColaboradores.map((colaborador) => {
                const lider = colaboradores.find(c => c.id === colaborador.lider_id);
                
                return (
                  <Card key={colaborador.id} className="group flex flex-col h-full hover:shadow-md transition-all duration-200 border-border">
                    <div className="p-6 flex flex-col gap-4 flex-1">
                      {/* Top Row */}
                      <div className="flex justify-between items-start">
                        <Avatar className={`h-14 w-14 border ${getAvatarColor(colaborador.cargo)} border-transparent`}>
                          <AvatarFallback className="text-lg font-bold bg-transparent">
                            {getInitials(colaborador.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(colaborador.cargo)}`}>
                          {colaborador.cargo === 'CN' ? colaborador.nivel : colaborador.cargo}
                        </span>
                      </div>

                      {/* Info */}
                      <div>
                        <h3 className="font-bold text-foreground text-lg truncate">{colaborador.nome}</h3>
                        <p className="text-sm text-muted-foreground truncate">{colaborador.email}</p>
                      </div>

                      {/* Leader Info */}
                      <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarFallback className="text-[10px] bg-background">
                            {lider ? getInitials(lider.nome) : '--'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Líder</span>
                          <span className="text-xs font-semibold text-foreground">
                            {lider ? lider.nome.split(' ').slice(0, 2).join(' ') : 'Sem líder'}
                          </span>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 gap-4 pt-2 mt-auto">
                        <div>
                          <span className="text-xs text-muted-foreground block mb-0.5">Meta Principal</span>
                          <span className="text-sm font-bold text-foreground">
                            {colaborador.cargo === 'EV' && `MRR: R$ ${colaborador.meta_mrr}`}
                            {colaborador.cargo === 'CN' && `SAO: ${colaborador.meta_sao}`}
                            {colaborador.cargo === 'Lideranca' && 'Gestão'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block mb-0.5">Performance</span>
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                            <TrendingUp className="w-4 h-4" />
                            <span>--%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/30 rounded-b-xl">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colaborador.ativo ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${colaborador.ativo ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        {colaborador.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-background shadow-none"
                          onClick={() => handleOpenEdit(colaborador)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-background shadow-none"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover colaborador?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O colaborador {colaborador.nome} será removido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(colaborador.id)} className="bg-destructive hover:bg-destructive/90">
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminRoute>
  );
}