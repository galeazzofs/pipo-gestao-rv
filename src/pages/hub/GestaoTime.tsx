import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminRoute } from '@/components/AdminRoute';
import { useColaboradores, Cargo, Colaborador, Porte } from '@/hooks/useColaboradores';
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
  DialogFooter,
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
  Loader2,
  Download,
  Store,
  Gem,
  UserCog,
  TrendingUp,
  LayoutGrid,
  List as ListIcon,
  Target // Ícone para o botão de Metas
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
// Importe o supabase client se estiver usando diretamente, ou confie no hook se ele já expõe add/update
import { supabase } from '@/integrations/supabase/client';

const CARGOS: { value: Cargo; label: string }[] = [
  { value: 'CN', label: 'CN (Consultor)' },
  { value: 'EV', label: 'EV (Executivo)' },
  { value: 'Lideranca', label: 'Liderança' },
];

const NIVEIS = ['CN1', 'CN2', 'CN3'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface FormData {
  nome: string;
  email: string;
  cargo: Cargo;
  nivel: string;
  porte: Porte | '';
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
  porte: '', 
  lider_id: '',
  salario_base: '0',
  meta_mrr: '0',
  meta_sao: '0',
  meta_vidas: '0',
};

export default function GestaoTime() {
  const { colaboradores, isLoading, fetchColaboradores, saveMetaMensal, metasMensais, getLideres } = useColaboradores();
  const [search, setSearch] = useState('');
  const [filterCargo, setFilterCargo] = useState<string>('all');
  
  // Estados do formulário principal (Criar/Editar Colaborador)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Estados do Diálogo de Metas Mensais
  const [isMetasDialogOpen, setIsMetasDialogOpen] = useState(false);
  const [selectedCNForMetas, setSelectedCNForMetas] = useState<Colaborador | null>(null);
  const [metaMensalData, setMetaMensalData] = useState({
    mes: new Date().getMonth().toString(),
    ano: new Date().getFullYear().toString(),
    meta_sao: ''
  });

  const lideres = getLideres();

  const filteredColaboradores = colaboradores.filter(c => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) ||
                       c.email?.toLowerCase().includes(search.toLowerCase());
    const matchCargo = filterCargo === 'all' || c.cargo === filterCargo;
    return matchSearch && matchCargo;
  });

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

  const handleOpenEdit = (colaborador: Colaborador) => {
    setEditingId(colaborador.id);
    setFormData({
      nome: colaborador.nome,
      email: colaborador.email || '',
      cargo: colaborador.cargo,
      nivel: colaborador.nivel || 'CN1',
      porte: colaborador.porte || '',
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

    const payload: any = {
      nome: formData.nome,
      email: formData.email,
      cargo: formData.cargo,
      nivel: formData.cargo === 'CN' ? formData.nivel : null,
      porte: formData.cargo === 'CN' ? (formData.porte || null) : null,
      lider_id: formData.lider_id || null,
      salario_base: parseFloat(formData.salario_base) || 0,
      meta_mrr: formData.cargo === 'EV' ? parseFloat(formData.meta_mrr) || 0 : 0,
      meta_sao: formData.cargo === 'CN' ? parseFloat(formData.meta_sao) || 0 : 0,
      meta_vidas: formData.cargo === 'CN' ? parseFloat(formData.meta_vidas) || 0 : 0,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('colaboradores').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Colaborador atualizado');
      } else {
        const { error } = await supabase.from('colaboradores').insert([payload]);
        if (error) throw error;
        toast.success('Colaborador criado');
      }
      setIsDialogOpen(false);
      fetchColaboradores();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('colaboradores').delete().eq('id', id);
      if (error) throw error;
      toast.success('Colaborador removido');
      fetchColaboradores();
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  // Lógica para salvar a meta mensal específica
  const handleSaveMetaMensal = async () => {
    if (!selectedCNForMetas || !metaMensalData.meta_sao) {
        toast.error('Preencha a meta de SAO');
        return;
    }
    
    const success = await saveMetaMensal(
      selectedCNForMetas.id,
      parseInt(metaMensalData.mes),
      parseInt(metaMensalData.ano),
      parseFloat(metaMensalData.meta_sao)
    );
    
    if(success) {
        setMetaMensalData(prev => ({ ...prev, meta_sao: '' })); // Limpa o campo após salvar
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getRoleBadgeColor = (cargo: Cargo) => {
    switch (cargo) {
      case 'CN': return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800';
      case 'EV': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
      case 'Lideranca': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getAvatarColor = (cargo: Cargo) => {
    switch (cargo) {
      case 'CN': return 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400';
      case 'EV': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400';
      case 'Lideranca': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Filtra as metas mensais para exibir apenas as do CN selecionado no diálogo
  const metasDoCN = selectedCNForMetas 
  ? metasMensais.filter(m => m.colaborador_id === selectedCNForMetas.id).sort((a,b) => (b.ano * 100 + b.mes) - (a.ano * 100 + a.mes))
  : [];

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
                          onValueChange={(value: Cargo) => setFormData({ ...formData, cargo: value })}
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
                        <>
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
                            {/* Seletor de Porte */}
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="porte">Porte</Label>
                                <Select 
                                    value={formData.porte} 
                                    onValueChange={(value: Porte) => setFormData({ ...formData, porte: value })}
                                >
                                    <SelectTrigger>
                                    <SelectValue placeholder="Selecione o Porte (M ou G+)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="M">Porte M</SelectItem>
                                    <SelectItem value="G+">Porte G+</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
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

                    {formData.cargo === 'CN' && (
                      <div className="grid grid-cols-2 gap-4 bg-muted/50 p-3 rounded-md">
                        <div className="col-span-2 text-xs text-muted-foreground mb-1">
                            Metas Padrão (Fallback)
                        </div>
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
                          <Label htmlFor="meta_vidas">Meta Vidas (Ref.)</Label>
                          <Input
                            id="meta_vidas"
                            type="number"
                            value={formData.meta_vidas}
                            onChange={(e) => setFormData({ ...formData, meta_vidas: e.target.value })}
                            className="bg-background"
                            placeholder="Calculado auto."
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

          {/* Dialog de Gerenciamento de Metas Mensais */}
          <Dialog open={isMetasDialogOpen} onOpenChange={setIsMetasDialogOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Metas Mensais: {selectedCNForMetas?.nome}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <p className="text-sm text-muted-foreground">
                        Defina metas de SAO específicas para cada mês. A meta de Vidas será calculada automaticamente baseada no Porte ({selectedCNForMetas?.porte || 'Indefinido'}).
                    </p>
                    
                    {/* Formulário de Adição de Meta */}
                    <div className="flex gap-2 items-end p-3 bg-muted/30 rounded-lg border">
                        <div className="flex-1">
                            <Label className="text-xs mb-1.5 block">Mês</Label>
                            <Select value={metaMensalData.mes} onValueChange={v => setMetaMensalData({...metaMensalData, mes: v})}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {MESES.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-20">
                            <Label className="text-xs mb-1.5 block">Ano</Label>
                            <Input className="h-9" type="number" value={metaMensalData.ano} onChange={e => setMetaMensalData({...metaMensalData, ano: e.target.value})} />
                        </div>
                        <div className="w-24">
                            <Label className="text-xs mb-1.5 block">Meta SAO</Label>
                            <Input className="h-9" type="number" placeholder="0" value={metaMensalData.meta_sao} onChange={e => setMetaMensalData({...metaMensalData, meta_sao: e.target.value})} />
                        </div>
                        <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSaveMetaMensal}>
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
                                        // Exibe uma estimativa visual da meta de vidas
                                        const multiplicador = selectedCNForMetas?.porte === 'G+' ? 1500 : 350;
                                        return (
                                            <TableRow key={meta.id}>
                                                <TableCell className="py-2">{MESES[meta.mes]}/{meta.ano}</TableCell>
                                                <TableCell className="py-2 font-medium">{meta.meta_sao}</TableCell>
                                                <TableCell className="py-2 text-right text-muted-foreground">
                                                    {(meta.meta_sao * multiplicador).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
          </Dialog>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card className="p-6 flex items-center gap-4 hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
              </div>
            </Card>
            <Card className="p-6 flex items-center gap-4 hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">CNs</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.cns}</p>
              </div>
            </Card>
            <Card className="p-6 flex items-center gap-4 hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Gem className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">EVs</p>
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

          {/* Barra de Filtros */}
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

          {/* Grid de Colaboradores */}
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
                        <div className="flex flex-col items-end gap-1">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(colaborador.cargo)}`}>
                              {colaborador.cargo === 'CN' ? colaborador.nivel : colaborador.cargo}
                            </span>
                            {/* Exibe o Porte no card se for CN */}
                            {colaborador.cargo === 'CN' && colaborador.porte && (
                                <span className="text-[10px] font-semibold text-muted-foreground border px-1.5 rounded bg-muted/30">
                                    Porte {colaborador.porte}
                                </span>
                            )}
                        </div>
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
                        
                        {/* Botão para abrir o diálogo de Metas Mensais (Apenas para CN) */}
                        {colaborador.cargo === 'CN' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-background shadow-none"
                                onClick={() => {
                                    setSelectedCNForMetas(colaborador);
                                    setIsMetasDialogOpen(true);
                                }}
                                title="Gerenciar Metas Mensais"
                            >
                                <Target className="w-4 h-4" />
                            </Button>
                        )}

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