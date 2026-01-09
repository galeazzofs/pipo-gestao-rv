import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useColaboradores } from '@/hooks/useColaboradores';
import { Loader2 } from 'lucide-react';

interface HubRouteProps {
  children: ReactNode;
}

export function HubRoute({ children }: HubRouteProps) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { colaboradores, isLoading: colaboradoresLoading } = useColaboradores();

  const isLoading = authLoading || colaboradoresLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is Liderança
  const colaborador = colaboradores.find(c => c.email === user.email);
  const isLider = colaborador?.cargo === 'Lideranca';
  const hasAccess = isAdmin || isLider;

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
