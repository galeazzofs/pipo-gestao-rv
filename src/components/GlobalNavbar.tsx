import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calculator,
  FileSpreadsheet,
  TrendingUp,
  History,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  children?: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

export const GlobalNavbar = () => {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      label: 'Início',
      href: '/',
      icon: Calculator,
    },
    {
      label: 'Calculadora CN',
      href: '/calculadora-cn',
      icon: Calculator,
    },
    {
      label: 'Previsibilidade',
      href: '/previsibilidade',
      icon: TrendingUp,
    },
    ...(isAdmin
      ? [
          {
            label: 'EV',
            href: '/ev/contratos',
            icon: FileSpreadsheet,
            children: [
              { label: 'Base de Contratos', href: '/ev/contratos', icon: FileSpreadsheet },
              { label: 'Apuração Mensal', href: '/ev/apuracao', icon: Receipt },
            ],
          },
          {
            label: 'Histórico',
            href: '/historico',
            icon: History,
          },
          {
            label: 'Admin',
            href: '/admin',
            icon: Shield,
            adminOnly: true,
          },
        ]
      : []),
  ];

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const handleNavigate = (href: string) => {
    navigate(href);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Calculator className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="hidden font-bold text-foreground sm:inline-block">
            ComissõesPro
          </span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) =>
            item.children ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`gap-1.5 ${
                      isActive(item.href)
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {item.children.map((child) => (
                    <DropdownMenuItem
                      key={child.href}
                      onClick={() => handleNavigate(child.href)}
                      className="gap-2"
                    >
                      <child.icon className="h-4 w-4" />
                      {child.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                key={item.href}
                variant="ghost"
                onClick={() => handleNavigate(item.href)}
                className={`gap-1.5 ${
                  isActive(item.href)
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            )
          )}
        </nav>

        {/* Right side - User info */}
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground lg:inline-block">
            Olá,{' '}
            <span className="font-medium text-foreground">
              {profile?.nome?.split(' ')[0] || 'Usuário'}
            </span>
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="hidden gap-1.5 md:flex"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-4 pt-8">
                {/* User info */}
                <div className="mb-4 border-b border-border pb-4">
                  <p className="text-sm text-muted-foreground">Conectado como</p>
                  <p className="font-medium text-foreground">
                    {profile?.nome || 'Usuário'}
                  </p>
                </div>

                {/* Mobile nav items */}
                {navItems.map((item) =>
                  item.children ? (
                    <div key={item.label}>
                      <p className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
                        {item.label}
                      </p>
                      {item.children.map((child) => (
                        <Button
                          key={child.href}
                          variant="ghost"
                          onClick={() => handleNavigate(child.href)}
                          className={`w-full justify-start gap-2 ${
                            isActive(child.href)
                              ? 'bg-accent text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <child.icon className="h-4 w-4" />
                          {child.label}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Button
                      key={item.href}
                      variant="ghost"
                      onClick={() => handleNavigate(item.href)}
                      className={`w-full justify-start gap-2 ${
                        isActive(item.href)
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  )
                )}

                {/* Logout */}
                <div className="mt-auto border-t border-border pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      signOut();
                      setMobileOpen(false);
                    }}
                    className="w-full gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
