import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useColaboradores } from '@/hooks/useColaboradores';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Calculator,
  FileSpreadsheet,
  Receipt,
  TrendingUp,
  History,
  Menu,
  ChevronDown,
  LogOut,
  Home,
  Users,
  CalendarCheck,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavLinkItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

// Links para área "Minha Comissão" (todos usuários)
const userLinks: NavLinkItem[] = [
  { label: 'Início', href: '/', icon: Home },
  { label: 'Simulador', href: '/minha-comissao/simulador', icon: Calculator },
  { label: 'Previsão', href: '/minha-comissao/previsao', icon: TrendingUp },
  { label: 'Histórico', href: '/minha-comissao/historico', icon: History },
];

// Links para área "Hub de Apuração" (admins e liderança)
const adminLinks: NavLinkItem[] = [
  { label: 'Time', href: '/hub/time', icon: Users },
  { label: 'Mensal', href: '/hub/apuracao-mensal', icon: Receipt },
  { label: 'Trimestral', href: '/hub/apuracao-trimestral', icon: CalendarCheck },
  { label: 'Contratos', href: '/hub/contratos', icon: FileSpreadsheet },
  { label: 'Histórico', href: '/hub/historico', icon: History },
];

export function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { colaboradores } = useColaboradores();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if user is Liderança
  const colaborador = colaboradores.find(c => c.email === user?.email);
  const isLider = colaborador?.cargo === 'Lideranca';
  const canAccessHub = isAdmin || isLider;

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const NavLink = ({ link }: { link: NavLinkItem }) => {
    const Icon = link.icon;
    const active = isActive(link.href);

    return (
      <Link
        to={link.href}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          active
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        <Icon className="h-4 w-4" />
        <span>{link.label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm group-hover:shadow-md transition-shadow">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground hidden sm:block">
              ComissõesPro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Seção Minha Comissão */}
            <div className="flex items-center gap-0.5 px-2 py-1 rounded-xl bg-muted/50">
              {userLinks.map((link) => (
                <NavLink key={link.href} link={link} />
              ))}
            </div>
            
            {canAccessHub && (
              <>
                <div className="h-8 w-px bg-border mx-3" />
                
                {/* Seção Hub de Apuração */}
                <div className="flex items-center gap-0.5 px-2 py-1 rounded-xl bg-muted/50">
                  <span className="text-xs font-medium text-muted-foreground px-2 hidden xl:block">Hub</span>
                  {adminLinks.map((link) => (
                    <NavLink key={link.href} link={link} />
                  ))}
                </div>
              </>
            )}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Desktop User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="hidden md:flex">
                <Button variant="ghost" size="sm" className="gap-2 h-10 px-3 hover:bg-accent">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                    <span className="text-sm font-semibold text-primary">
                      {profile?.nome?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium text-foreground leading-none">
                      {profile?.nome?.split(' ')[0] || 'Usuário'}
                    </span>
                    <span className="text-xs text-muted-foreground leading-none mt-0.5">
                      {isAdmin ? 'Administrador' : isLider ? 'Liderança' : 'Colaborador'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{profile?.nome}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={signOut} 
                  className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* User Info Header */}
                  <div className="flex items-center gap-3 p-6 border-b border-border bg-muted/30">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                      <span className="text-lg font-semibold text-primary">
                        {profile?.nome?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{profile?.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                      <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {isAdmin ? 'Administrador' : isLider ? 'Liderança' : 'Colaborador'}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <nav className="flex-1 overflow-y-auto p-4">
                    {/* Minha Comissão */}
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
                        Minha Comissão
                      </p>
                      <div className="space-y-1">
                        {userLinks.map((link) => {
                          const Icon = link.icon;
                          const active = isActive(link.href);
                          return (
                            <Link
                              key={link.href}
                              to={link.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                active
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-foreground hover:bg-accent'
                              )}
                            >
                              <Icon className="h-5 w-5" />
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hub de Apuração (Admin and Liderança Only) */}
                    {canAccessHub && (
                      <div className="mb-6">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
                          Hub de Apuração
                        </p>
                        <div className="space-y-1">
                          {adminLinks.map((link) => {
                            const Icon = link.icon;
                            const active = isActive(link.href);
                            return (
                              <Link
                                key={link.href}
                                to={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                  active
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-foreground hover:bg-accent'
                                )}
                              >
                                <Icon className="h-5 w-5" />
                                {link.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </nav>

                  {/* Logout Footer */}
                  <div className="p-4 border-t border-border bg-muted/30">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Sair da conta
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
