import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Mail, ArrowRight, CheckCircle, Lock, Loader2 } from 'lucide-react';

const Login = () => {
  const { user, loading, signInWithMagicLink, signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminEmail, setIsAdminEmail] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const checkIfAdmin = async (emailToCheck: string) => {
    setIsCheckingAdmin(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('check-admin-email', {
        body: { email: emailToCheck },
      });

      if (fnError) {
        console.error('Error checking admin status:', fnError);
        setIsAdminEmail(false);
      } else {
        setIsAdminEmail(data?.isAdmin || false);
      }
    } catch (err) {
      console.error('Error:', err);
      setIsAdminEmail(false);
    } finally {
      setIsCheckingAdmin(false);
      setEmailChecked(true);
    }
  };

  const handleEmailBlur = () => {
    if (email && email.includes('@') && !emailChecked) {
      checkIfAdmin(email);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailChecked(false);
    setIsAdminEmail(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // If admin email, use password authentication
    if (isAdminEmail && password) {
      const { error } = await signInWithPassword(email, password);
      if (error) {
        setError('Email ou senha inválidos.');
        setIsSubmitting(false);
        return;
      }
      // Success - will redirect automatically
      return;
    }

    // For non-admin or first check, send magic link
    const { error } = await signInWithMagicLink(email);
    if (error) {
      setError('Erro ao enviar o link. Tente novamente.');
      setIsSubmitting(false);
      return;
    }

    setEmailSent(true);
    setIsSubmitting(false);
  };

  const handleMagicLinkClick = async () => {
    setError(null);
    setIsSubmitting(true);

    const { error } = await signInWithMagicLink(email);
    if (error) {
      setError('Erro ao enviar o link. Tente novamente.');
      setIsSubmitting(false);
      return;
    }

    setEmailSent(true);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            ComissõesPro
          </h1>
          <p className="mt-2 text-muted-foreground">
            Entre com seu email para acessar
          </p>
        </header>

        {/* Card */}
        <div className="card-premium p-6 md:p-8">
          {emailSent ? (
            <div className="text-center py-4">
              <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Email enviado!
              </h2>
              <p className="text-muted-foreground text-sm">
                Verifique sua caixa de entrada e clique no link para acessar.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Email field */}
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    required
                    className="input-field pl-10"
                    placeholder="email@empresa.com.br"
                  />
                  {isCheckingAdmin && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Password field - only for admins */}
              {isAdminEmail && emailChecked && (
                <div className="mb-4">
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-10"
                      placeholder="••••••••"
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Detectamos que você é administrador. Use sua senha para entrar.
                  </p>
                </div>
              )}

              {error && (
                <p className="mb-4 text-sm text-destructive">{error}</p>
              )}

              {/* Submit button */}
              {isAdminEmail && emailChecked ? (
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || !email || !password}
                    className="btn-primary w-full gap-2 items-center justify-center flex flex-row text-center border-0 rounded-xl"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Entrar com Senha
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleMagicLinkClick}
                    disabled={isSubmitting}
                    className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Ou enviar link por email
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !email || isCheckingAdmin}
                  className="btn-primary w-full gap-2 items-center justify-center flex flex-row text-center border-0 rounded-xl"
                >
                  {isSubmitting || isCheckingAdmin ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Enviar link de acesso
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
