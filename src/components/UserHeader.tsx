import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Settings, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserHeader = () => {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  return (
    <header className="mb-8 text-center">
      <div className="flex items-center justify-end gap-2 mb-4">
        {isAdmin && (
          <>
            <button
              onClick={() => navigate('/ev-calculator')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Comissões EV
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="w-4 h-4" />
              Admin
            </button>
          </>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
      
      <h1 className="text-2xl font-bold text-foreground md:text-3xl">
        Olá, {profile.nome.split(' ')[0]}!
      </h1>
      
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-card">
        <span className="h-2 w-2 rounded-full bg-foreground"></span>
        Perfil: {profile.nivel} (Mensal)
      </div>
    </header>
  );
};
