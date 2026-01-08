import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

export const ProtectedRoute = ({ children, requireProfile = true }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireProfile && !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card-premium p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold text-foreground mb-4">Acesso Pendente</h2>
          <p className="text-muted-foreground">
            Seu perfil ainda não foi cadastrado pelo administrador. 
            Por favor, aguarde ou entre em contato.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
