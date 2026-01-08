import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Calculator, TrendingUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Base de Contratos',
    path: '/ev/contratos',
    icon: FileText,
  },
  {
    label: 'Apuração Mensal',
    path: '/ev/apuracao',
    icon: Calculator,
  },
  {
    label: 'Minha Previsibilidade',
    path: '/previsibilidade',
    icon: TrendingUp,
  },
];

export function EVNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Button
                  key={item.path}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'gap-2',
                    isActive && 'bg-primary text-primary-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
