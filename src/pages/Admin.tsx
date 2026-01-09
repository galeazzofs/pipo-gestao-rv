import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Plus, Users, Trash2, Edit2, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  email: string;
  nome: string;
  nivel: 'CN1' | 'CN2' | 'CN3';
  created_at: string;
}

const Admin = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [nivel, setNivel] = useState<'CN1' | 'CN2' | 'CN3'>('CN1');
  const [editNivel, setEditNivel] = useState<'CN1' | 'CN2' | 'CN3'>('CN1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os perfis.',
        variant: 'destructive',
      });
      return;
    }

    setProfiles(data as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleAddCN = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await supabase.functions.invoke('create-profile', {
        body: { email, nome, nivel },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar perfil');
      }

      toast({
        title: 'CN cadastrado!',
        description: `${nome} foi adicionado com sucesso.`,
      });

      setShowAddForm(false);
      setNome('');
      setEmail('');
      setNivel('CN1');
      fetchProfiles();
      
    } catch (error: any) {
      console.error('Error adding CN:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível adicionar o CN.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNivel = async (profileId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ nivel: editNivel })
      .eq('id', profileId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o nível.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Sucesso',
      description: 'Nível atualizado com sucesso.',
    });

    setEditingId(null);
    fetchProfiles();
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Tem certeza que deseja remover este CN?')) return;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o perfil.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Sucesso',
      description: 'CN removido com sucesso.',
    });

    fetchProfiles();
  };

  const niveis: ('CN1' | 'CN2' | 'CN3')[] = ['CN1', 'CN2', 'CN3'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              Painel Administrativo
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os Consultores de Negócios
            </p>
          </header>

          {/* Stats */}
          <div className="card-premium p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-foreground/5 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{profiles.length}</p>
                <p className="text-sm text-muted-foreground">CNs cadastrados</p>
              </div>
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary mb-6 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar CN
          </button>

          {/* Add Form Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
              <div className="card-premium p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Adicionar Novo CN
                  </h2>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddCN}>
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Nome completo"
                      required
                      className="input-field"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      required
                      className="input-field"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Nível
                    </label>
                    <div className="flex gap-2">
                      {niveis.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setNivel(n)}
                          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
                            nivel === n
                              ? 'bg-foreground text-background'
                              : 'bg-card border border-border text-muted-foreground hover:border-foreground/30'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 rounded-xl py-3 text-sm font-medium border border-border text-muted-foreground hover:bg-card transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !nome || !email}
                      className="btn-primary flex-1"
                    >
                      {isSubmitting ? 'Criando...' : 'Criar CN'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Profiles List */}
          <div className="card-premium overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : profiles.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum CN cadastrado ainda.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">{profile.nome}</p>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {editingId === profile.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editNivel}
                            onChange={(e) => setEditNivel(e.target.value as 'CN1' | 'CN2' | 'CN3')}
                            className="input-field py-1.5 text-sm"
                          >
                            {niveis.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUpdateNivel(profile.id)}
                            className="p-1.5 text-success hover:bg-success/10 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="px-3 py-1 text-xs font-medium bg-foreground/5 text-foreground rounded-full">
                            {profile.nivel}
                          </span>
                          <button
                            onClick={() => {
                              setEditingId(profile.id);
                              setEditNivel(profile.nivel);
                            }}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(profile.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
