import { Pencil, Trash2, TrendingUp, Target } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Colaborador, Cargo } from '@/hooks/useColaboradores';

interface ColaboradorCardProps {
  colaborador: Colaborador;
  lider?: Colaborador;
  onEdit: (colaborador: Colaborador) => void;
  onDelete: (id: string) => void;
  onManageMetas: (colaborador: Colaborador) => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function getRoleBadgeColor(cargo: Cargo) {
  switch (cargo) {
    case 'CN': return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800';
    case 'EV': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
    case 'Lideranca': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function getAvatarColor(cargo: Cargo) {
  switch (cargo) {
    case 'CN': return 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400';
    case 'EV': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400';
    case 'Lideranca': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export function ColaboradorCard({ colaborador, lider, onEdit, onDelete, onManageMetas }: ColaboradorCardProps) {
  return (
    <Card className="group flex flex-col h-full hover:shadow-md transition-all duration-200 border-border">
      <div className="p-6 flex flex-col gap-4 flex-1">
        {/* Top Row */}
        <div className="flex justify-between items-start">
          <Avatar className={`h-14 w-14 border ${getAvatarColor(colaborador.cargo)} border-transparent`}>
            <AvatarFallback className="text-lg font-bold bg-transparent">
              {getInitials(colaborador.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(colaborador.cargo)}`}>
              {colaborador.cargo === 'CN' ? colaborador.nivel : colaborador.cargo}
            </span>
            {colaborador.cargo === 'CN' && colaborador.porte && (
              <span className="text-[10px] font-semibold text-muted-foreground border px-1.5 rounded bg-muted/30">
                Porte {colaborador.porte}
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div>
          <h3 className="font-bold text-foreground text-lg truncate">{colaborador.nome}</h3>
          <p className="text-sm text-muted-foreground truncate">{colaborador.email}</p>
        </div>

        {/* Leader Info */}
        <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="text-[10px] bg-background">
              {lider ? getInitials(lider.nome) : '--'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Líder</span>
            <span className="text-xs font-semibold text-foreground">
              {lider ? lider.nome.split(' ').slice(0, 2).join(' ') : 'Sem líder'}
            </span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-2 mt-auto">
          <div>
            <span className="text-xs text-muted-foreground block mb-0.5">Meta Principal</span>
            <span className="text-sm font-bold text-foreground">
              {colaborador.cargo === 'EV' && `MRR: R$ ${colaborador.meta_mrr}`}
              {colaborador.cargo === 'CN' && `SAO: ${colaborador.meta_sao}`}
              {colaborador.cargo === 'Lideranca' && 'Gestão'}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-0.5">Performance</span>
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
              <TrendingUp className="w-4 h-4" />
              <span>--%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/30 rounded-b-xl">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colaborador.ativo ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colaborador.ativo ? 'bg-green-500' : 'bg-gray-400'}`}></span>
          {colaborador.ativo ? 'Ativo' : 'Inativo'}
        </span>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {colaborador.cargo === 'CN' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-background shadow-none"
              onClick={() => onManageMetas(colaborador)}
              title="Gerenciar Metas Mensais"
            >
              <Target className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-background shadow-none"
            onClick={() => onEdit(colaborador)}
          >
            <Pencil className="w-4 h-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-background shadow-none"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover colaborador?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O colaborador {colaborador.nome} será removido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(colaborador.id)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
}
