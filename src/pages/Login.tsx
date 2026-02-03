import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Mail, 
  ArrowRight, 
  CheckCircle, 
  Lock, 
  Loader2, 
  BarChart3, 
  Shield, 
  Briefcase, 
  HelpCircle,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type LoginType = 'admin' | 'cn' | null;

const Login = () => {
  const {
    user,
    loading,
    signInWithMagicLink,
    signInWithPassword,
    checkIfAdmin
  } = useAuth();

  // Estado para controlar a navegação visual (Seleção vs Formulário)
  const [loginType, setLoginType] = useState<LoginType>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] dark:bg-[#121212] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCheckingAdmin(true);

    // Check if email belongs to admin
    const adminStatus = await checkIfAdmin(email);
    
    // Se o usuário selecionou "Vendedor" mas tentou logar com email de admin (ou vice-versa),
    // o sistema ainda vai autenticar corretamente, mas a UI se adapta.
    setIsAdminLogin(adminStatus);
    setShowPasswordField(adminStatus);
    setIsCheckingAdmin(false);

    if (!adminStatus) {
      // Regular user - send magic link
      setIsSubmitting(true);
      const { error } = await signInWithMagicLink(email);
      if (error) {
        setError('Erro ao enviar o link. Tente novamente.');
        setIsSubmitting(false);
        return;
      }
      setEmailSent(true);
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error } = await signInWithPassword(email, password);
    if (error) {
      setError('Email ou senha incorretos.');
      setIsSubmitting(false);
      return;
    }
    // Auth state change will handle redirect
  };

  const handleBackToSelection = () => {
    setLoginType(null);
    setEmail('');
    setPassword('');
    setError(null);
    setShowPasswordField(false);
    setEmailSent(false);
  };

  const handleBackToEmail = () => {
    setShowPasswordField(false);
    setIsAdminLogin(false);
    setPassword('');
    setError(null);
  };

  // --- Renderização da Tela de Seleção (Inspirada no HTML fornecido) ---
  if (!loginType) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] dark:bg-[#121212] text-foreground font-sans antialiased overflow-x-hidden flex flex-col justify-between">
        
        {/* Header */}
        <header className="w-full px-6 py-8 flex justify-center lg:justify-start lg:px-12 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black font-bold text-xs">
              P
            </div>
            <span className="font-bold text-lg tracking-tight">Pipo Saúde</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow flex flex-col items-center justify-center px-4 py-8 w-full max-w-[1200px] mx-auto">
          <div className="w-full max-w-[640px] flex flex-col gap-10">
            
            {/* Heading */}
            <div className="text-center space-y-4 animate-fade-in delay-100">
              <div className="w-14 h-14 mx-auto bg-black/5 dark:bg-white/10 rounded-2xl flex items-center justify-center mb-2">
                <BarChart3 className="w-7 h-7 text-black/70 dark:text-white/80" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#141414] dark:text-white tracking-tight leading-tight">
                Gestão de Remuneração Variável
              </h1>
              <p className="text-[#757575] dark:text-neutral-400 text-base md:text-lg font-medium max-w-md mx-auto">
                Selecione o perfil correspondente para acessar o painel de controle e métricas.
              </p>
            </div>

            {/* Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 animate-fade-in delay-200 w-full">
              
              {/* Admin Card */}
              <button 
                onClick={() => setLoginType('admin')}
                className="group relative flex flex-col items-start justify-between h-48 md:h-56 p-6 md:p-8 bg-black dark:bg-white text-white dark:text-black rounded-2xl shadow-xl hover:-translate-y-1 transition-all duration-300 w-full text-left overflow-hidden border border-transparent"
              >
                <div className="relative z-10 w-full">
                  <div className="w-10 h-10 bg-white/20 dark:bg-black/10 rounded-lg flex items-center justify-center mb-4 backdrop-blur-sm">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">Admin & Financeiro</h3>
                  <p className="text-sm text-white/70 dark:text-black/60 font-medium">Controle de métricas e pagamentos</p>
                </div>
                <div className="relative z-10 mt-auto flex items-center gap-2 text-sm font-bold opacity-80 group-hover:opacity-100 transition-opacity">
                  <span>Acessar Painel</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>
              </button>

              {/* Vendedor Card */}
              <button 
                onClick={() => setLoginType('cn')}
                className="group relative flex flex-col items-start justify-between h-48 md:h-56 p-6 md:p-8 bg-white dark:bg-[#1E1E1E] text-black dark:text-white rounded-2xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300 w-full text-left"
              >
                <div className="w-full">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-200 dark:group-hover:bg-white/10 transition-colors">
                    <Briefcase className="w-5 h-5 text-black/70 dark:text-white/80" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">Vendedor (CN/EV)</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Visualização de comissões e metas</p>
                </div>
                <div className="mt-auto flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white opacity-80 group-hover:opacity-100 transition-opacity">
                  <span>Acessar Perfil</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>

            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full py-8 text-center animate-fade-in delay-300">
          <div className="flex flex-col items-center gap-4">
            <a className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5" href="#">
              <HelpCircle className="w-4 h-4" />
              <span>Precisa de ajuda com o acesso?</span>
            </a>
            <p className="text-xs text-gray-400 dark:text-gray-600 font-medium">
              © {new Date().getFullYear()} Pipo Saúde. Todos os direitos reservados.
            </p>
          </div>
        </footer>

        {/* Background Elements */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-gray-200/40 dark:bg-white/5 rounded-full blur-[100px] opacity-60"></div>
          <div className="absolute bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] bg-gray-200/40 dark:bg-white/5 rounded-full blur-[100px] opacity-60"></div>
        </div>
      </div>
    );
  }

  // --- Renderização do Formulário de Login (Design Minimalista) ---
  return (
    <div className="min-h-screen bg-[#F7F6F3] dark:bg-[#121212] px-4 py-12 flex items-center justify-center font-sans">
      <div className="w-full max-w-[420px] bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-scale-in">
        
        {/* Form Header */}
        <div className="p-8 pb-6 border-b border-gray-100 dark:border-gray-800">
          <button 
            onClick={handleBackToSelection}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          
          <div className="w-12 h-12 bg-black/5 dark:bg-white/10 rounded-xl flex items-center justify-center mb-4">
            {loginType === 'admin' ? (
              <Shield className="w-6 h-6 text-black dark:text-white" />
            ) : (
              <Briefcase className="w-6 h-6 text-black dark:text-white" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {loginType === 'admin' ? 'Acesso Administrativo' : 'Acesso Vendedor'}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
            {showPasswordField 
              ? 'Digite sua senha para continuar' 
              : 'Digite seu e-mail corporativo para entrar'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 pt-6">
          {emailSent ? (
            <div className="text-center py-4">
              <div className="mx-auto w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Link enviado!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Verifique sua caixa de entrada ({email}) e clique no link mágico para acessar o sistema.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setEmailSent(false)} 
                className="mt-6 w-full"
              >
                Voltar
              </Button>
            </div>
          ) : showPasswordField ? (
            // Admin Password Form
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg flex items-center gap-3 border border-gray-100 dark:border-gray-800">
                <div className="w-8 h-8 bg-white dark:bg-black rounded-full flex items-center justify-center shrink-0 shadow-sm text-xs font-bold">
                  {email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{email}</p>
                  <button 
                    type="button" 
                    onClick={handleBackToEmail}
                    className="text-xs text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    Alterar e-mail
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isSubmitting || !password}
                className="w-full h-11 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-bold rounded-lg transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Acessar Sistema
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            // Email Form
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                    placeholder="nome@piposaude.com.br"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isSubmitting || isCheckingAdmin || !email}
                className="w-full h-11 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-bold rounded-lg transition-all"
              >
                {isCheckingAdmin ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              
              <p className="text-center text-xs text-gray-400 mt-4">
                Uso exclusivo para colaboradores Pipo Saúde.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;