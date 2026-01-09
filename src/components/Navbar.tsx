import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  Shield,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Home,
  Users,
  CalendarCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavLinkItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

// Links para área "Minha Comissão" (todos usuários)
const userLinks: NavLinkItem[] = [
  { label: 'Início', href: '/', icon: Home },
  { label: 'Simulador', href: '/minha-comissao/simulador', icon: Calculator },
  { label: 'Previsibilidade', href: '/minha-comissao/previsao', icon: TrendingUp },
  { label: 'Meus Resultados', href: '/minha-comissao/historico', icon: History },
];

// Links para área "Hub de Apuração" (apenas admins)
const adminLinks: NavLinkItem[] = [
  { label: 'Gestão de Time', href: '/hub/time', icon: Users, adminOnly: true },
  { label: 'Apuração Mensal', href: '/hub/apuracao-mensal', icon: Receipt, adminOnly: true },
  { label: 'Apuração Trimestral', href: '/hub/apuracao-trimestral', icon: CalendarCheck, adminOnly: true },
  { label: 'Contratos EV', href: '/hub/contratos', icon: FileSpreadsheet, adminOnly: true },
  { label: 'Admin', href: '/admin', icon: Shield, adminOnly: true },
];

export function Navbar() {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        <Icon className="h-4 w-4" />
        {link.label}
      </Link>
    );
  };

  const allLinks = isAdmin ? [...userLinks, ...adminLinks] : userLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground hidden sm:block">
              ComissõesPro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {userLinks.map((link) => (
              <NavLink key={link.href} link={link} />
            ))}
            
            {isAdmin && (
              <>
                <div className="w-px h-6 bg-border mx-2" />
                {adminLinks.map((link) => (
                  <NavLink key={link.href} link={link} />
                ))}
              </>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            {/* Desktop User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="hidden md:flex">
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {profile?.nome?.split(' ')[0] || 'Usuário'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.nome}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col h-full">
                  {/* User Info */}
                  <div className="flex items-center gap-3 pb-6 border-b border-border">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{profile?.nome}</p>
                      <p className="text-xs text-muted-foreground">{profile?.email}</p>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <nav className="flex flex-col gap-1 py-4 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                      Minha Comissão
                    </p>
                    {userLinks.map((link) => (
                      <NavLink key={link.href} link={link} />
                    ))}

                    {isAdmin && (
                      <>
                        <div className="h-px bg-border my-4" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                          Hub de Apuração
                        </p>
                        {adminLinks.map((link) => (
                          <NavLink key={link.href} link={link} />
                        ))}
                      </>
                    )}
                  </nav>

                  {/* Logout */}
                  <div className="border-t border-border pt-4">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
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
