import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, ArrowRight, CheckCircle, Lock, Loader2 } from 'lucide-react';
const Login = () => {
  const {
    user,
    loading,
    signInWithMagicLink,
    signInWithPassword,
    checkIfAdmin
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>;
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
    setIsAdminLogin(adminStatus);
    setShowPasswordField(adminStatus);
    setIsCheckingAdmin(false);
    if (!adminStatus) {
      // Regular user - send magic link
      setIsSubmitting(true);
      const {
        error
      } = await signInWithMagicLink(email);
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
    const {
      error
    } = await signInWithPassword(email, password);
    if (error) {
      setError('Email ou senha incorretos.');
      setIsSubmitting(false);
      return;
    }
    // Auth state change will handle redirect
  };
  const handleBack = () => {
    setShowPasswordField(false);
    setIsAdminLogin(false);
    setPassword('');
    setError(null);
  };
  return <div className="min-h-screen bg-background px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Calculadora RV PIPO</h1>
          <p className="mt-2 text-muted-foreground">
            {showPasswordField ? 'Digite sua senha para acessar' : 'Entre com seu email para acessar'}
          </p>
        </header>

        {/* Card */}
        <div className="card-premium p-6 md:p-8">
          {emailSent ? <div className="text-center py-4">
              <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Email enviado!
              </h2>
              <p className="text-muted-foreground text-sm">
                Verifique sua caixa de entrada e clique no link para acessar.
              </p>
            </div> : showPasswordField ?
        // Admin Password Form
        <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 rounded-lg">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{email}</span>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input-field pl-10" placeholder="••••••••" autoFocus />
                </div>
              </div>

              {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

              <button type="submit" disabled={isSubmitting || !password} className="btn-primary w-full gap-2 items-center justify-center flex flex-row text-center border-0 rounded-sm">
                {isSubmitting ? <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entrando...
                  </> : <>
                    Entrar
                    <ArrowRight className="w-4 h-4" />
                  </>}
              </button>

              <button type="button" onClick={handleBack} className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Voltar e usar outro email
              </button>
            </form> :
        // Email Form
        <form onSubmit={handleEmailSubmit}>
              <div className="mb-6">
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-field pl-10" placeholder="email@piposaude.com.br" />
                </div>
              </div>

              {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

              <button type="submit" disabled={isSubmitting || isCheckingAdmin || !email} className="btn-primary w-full gap-2 items-center justify-center flex flex-row text-center border-0 rounded-sm">
                {isCheckingAdmin ? <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando...
                  </> : isSubmitting ? 'Enviando...' : <>
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </>}
              </button>
            </form>}
        </div>
      </div>
    </div>;
};
export default Login;