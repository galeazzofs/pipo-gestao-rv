import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { Calculator, FileSpreadsheet, History, Shield, ArrowRight, Zap, BarChart3, Users, TrendingUp, Receipt, CalendarCheck } from 'lucide-react';
const Landing = () => {
  const {
    isAdmin
  } = useAuth();
  const navigate = useNavigate();

  // Área "Minha Comissão" - todos usuários
  const userFeatures = [{
    title: 'Simulador de Comissão',
    description: 'Calcule e simule suas comissões mensais baseadas em SAOs e Vidas.',
    icon: Calculator,
    href: '/minha-comissao/simulador',
    color: 'bg-blue-500/10 text-blue-600',
    borderColor: 'hover:border-blue-500/30'
  }, {
    title: 'Previsibilidade',
    description: 'Veja quanto ainda tem a receber dos contratos ativos.',
    icon: TrendingUp,
    href: '/minha-comissao/previsao',
    color: 'bg-cyan-500/10 text-cyan-600',
    borderColor: 'hover:border-cyan-500/30'
  }, {
    title: 'Meus Resultados',
    description: 'Consulte seu histórico de comissões fechadas.',
    icon: History,
    href: '/minha-comissao/historico',
    color: 'bg-amber-500/10 text-amber-600',
    borderColor: 'hover:border-amber-500/30'
  }];

  // Área "Hub de Apuração" - apenas admins
  const adminFeatures = [{
    title: 'Gestão de Time',
    description: 'Cadastre e gerencie colaboradores: CNs, EVs e Liderança.',
    icon: Users,
    href: '/hub/time',
    color: 'bg-purple-500/10 text-purple-600',
    borderColor: 'hover:border-purple-500/30'
  }, {
    title: 'Apuração Mensal',
    description: 'Fechamento mensal de comissões dos CNs.',
    icon: Receipt,
    href: '/hub/apuracao-mensal',
    color: 'bg-orange-500/10 text-orange-600',
    borderColor: 'hover:border-orange-500/30'
  }, {
    title: 'Apuração Trimestral',
    description: 'Fechamento completo: CNs + EVs + Liderança.',
    icon: CalendarCheck,
    href: '/hub/apuracao-trimestral',
    color: 'bg-emerald-500/10 text-emerald-600',
    borderColor: 'hover:border-emerald-500/30'
  }, {
    title: 'Contratos EV',
    description: 'Gerencie contratos, importe dados e acompanhe vigências.',
    icon: FileSpreadsheet,
    href: '/hub/contratos',
    color: 'bg-indigo-500/10 text-indigo-600',
    borderColor: 'hover:border-indigo-500/30'
  }, {
    title: 'Administração',
    description: 'Gerencie usuários e configurações do sistema.',
    icon: Shield,
    href: '/admin',
    color: 'bg-rose-500/10 text-rose-600',
    borderColor: 'hover:border-rose-500/30'
  }];
  const features = isAdmin ? [...userFeatures, ...adminFeatures] : userFeatures;
  const stats = [{
    icon: Zap,
    label: 'Processamento Rápido',
    value: 'Instantâneo'
  }, {
    icon: BarChart3,
    label: 'Precisão',
    value: '100%'
  }, {
    icon: Users,
    label: 'Multi-usuário',
    value: 'Colaborativo'
  }];
  return <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Hero Section */}
        <section className="py-16 md:py-24">
          
        </section>

        {/* Features Grid */}
        <section className="pb-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map(feature => <button key={feature.title} onClick={() => navigate(feature.href)} className={`group card-premium p-8 text-left transition-all duration-300 hover:shadow-xl ${feature.borderColor}`}>
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
                </button>)}
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
    </ProtectedRoute>;
};
export default Landing;