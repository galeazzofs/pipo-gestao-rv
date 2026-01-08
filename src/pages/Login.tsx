import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';

const Login = () => {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithMagicLink } = useAuth();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            Simulador de Comissão
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
              <div className="mb-6">
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="input-field pl-10"
                  />
                </div>
              </div>

              {error && (
                <p className="mb-4 text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  'Enviando...'
                ) : (
                  <>
                    Enviar link de acesso
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
