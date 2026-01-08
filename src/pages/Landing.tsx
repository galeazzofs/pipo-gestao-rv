import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { 
  Calculator, 
  FileSpreadsheet, 
  History, 
  Shield, 
  ArrowRight,
  Zap,
  BarChart3,
  Users
} from 'lucide-react';

const Landing = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      title: 'Calculadora CN',
      description: 'Calcule comissões mensais baseadas em SAOs e Vidas para consultores de nível CN1, CN2 e CN3.',
      icon: Calculator,
      href: '/calculadora-cn',
      color: 'bg-blue-500/10 text-blue-600',
      borderColor: 'hover:border-blue-500/30',
    },
    {
      title: 'Calculadora EV',
      description: 'Gerencie contratos de vendas, importe dados via Excel e apure comissões mensais dos EVs.',
      icon: FileSpreadsheet,
      href: '/ev-calculator',
      color: 'bg-emerald-500/10 text-emerald-600',
      borderColor: 'hover:border-emerald-500/30',
    },
    {
      title: 'Histórico',
      description: 'Consulte apurações anteriores, filtre por mês, EV ou cliente e acompanhe a evolução.',
      icon: History,
      href: '/historico',
      color: 'bg-amber-500/10 text-amber-600',
      borderColor: 'hover:border-amber-500/30',
    },
    {
      title: 'Administração',
      description: 'Gerencie usuários, permissões e configurações do sistema. Acesso restrito a administradores.',
      icon: Shield,
      href: '/admin',
      color: 'bg-purple-500/10 text-purple-600',
      borderColor: 'hover:border-purple-500/30',
      adminOnly: true,
    },
  ];

  const stats = [
    { icon: Zap, label: 'Processamento Rápido', value: 'Instantâneo' },
    { icon: BarChart3, label: 'Precisão', value: '100%' },
    { icon: Users, label: 'Multi-usuário', value: 'Colaborativo' },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">ComissõesPro</h1>
                  <p className="text-xs text-muted-foreground">Sistema de Comissões</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground hidden md:block">
                  Olá, <span className="font-medium text-foreground">{profile?.nome || 'Usuário'}</span>
                </span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Sistema Integrado de Comissões
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Calcule e gerencie suas
              <br />
              <span className="text-primary">comissões</span> com precisão
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              Automatize o cálculo de comissões, importe dados de planilhas, 
              acompanhe históricos e tenha controle total sobre seus resultados.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-16">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="pb-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <button
                  key={feature.title}
                  onClick={() => navigate(feature.href)}
                  className={`group card-premium p-8 text-left transition-all duration-300 hover:shadow-xl ${feature.borderColor}`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center`}>
                      <feature.icon className="w-7 h-7" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {feature.adminOnly && (
                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                      <Shield className="w-3 h-3" />
                      Apenas administradores
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-8">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ComissõesPro. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
};

export default Landing;
