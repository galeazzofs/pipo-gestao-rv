import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useApuracoesFechadas } from '@/hooks/useApuracoesFechadas';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  Loader2,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';

interface ResultadoItem {
  id: string;
  total_pagar: number;
  comissao_base: number | null;
  bonus_trimestral: number | null;
  comissao_safra: number | null;
  bonus_ev: number | null;
  bonus_lideranca: number | null;
  created_at: string;
  apuracao: {
    id: string;
    tipo: string;
    mes_referencia: string;
    data_fechamento: string;
  };
}

export default function MeusResultados() {
  const { profile } = useAuth();
  const { getMeusResultados } = useApuracoesFechadas();
  const [resultados, setResultados] = useState<ResultadoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResultados = async () => {
      if (!profile?.email) return;
      
      setIsLoading(true);
      const data = await getMeusResultados(profile.email);
      setResultados(data as ResultadoItem[]);
      setIsLoading(false);
    };

    fetchResultados();
  }, [profile?.email, getMeusResultados]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const totalUltimos12Meses = resultados.reduce((sum, r) => sum + (r.total_pagar || 0), 0);

  const getDetalhesTipo = (item: ResultadoItem) => {
    if (item.comissao_base !== null) {
      return `Comissão: ${formatCurrency(item.comissao_base)}${item.bonus_trimestral ? ` + Bônus: ${formatCurrency(item.bonus_trimestral)}` : ''}`;
    }
    if (item.comissao_safra !== null) {
      return `Safra: ${formatCurrency(item.comissao_safra)}${item.bonus_ev ? ` + Bônus: ${formatCurrency(item.bonus_ev)}` : ''}`;
    }
    if (item.bonus_lideranca !== null) {
      return `Bônus Liderança: ${formatCurrency(item.bonus_lideranca)}`;
    }
    return '-';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <History className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Meus Resultados</h1>
                <p className="text-sm text-muted-foreground">
                  Olá, {profile?.nome?.split(' ')[0]}! Confira suas comissões fechadas.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="card-premium p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Recebido</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(totalUltimos12Meses)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-premium p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Apurações</p>
                  <p className="text-2xl font-bold">{resultados.length}</p>
                </div>
              </div>
            </div>

            <div className="card-premium p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Média/Apuração</p>
                  <p className="text-2xl font-bold">
                    {resultados.length > 0 
                      ? formatCurrency(totalUltimos12Meses / resultados.length)
                      : formatCurrency(0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Histórico de Comissões</h2>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : resultados.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Nenhuma comissão fechada encontrada.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Seus resultados aparecerão aqui quando o admin processar as apurações.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Data Fechamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultados.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.apuracao?.mes_referencia || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.apuracao?.tipo === 'trimestral' ? 'default' : 'outline'}>
                          {item.apuracao?.tipo === 'trimestral' ? 'Trimestral' : 'Mensal'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {getDetalhesTipo(item)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-success">
                        {formatCurrency(item.total_pagar)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.apuracao?.data_fechamento 
                          ? formatDate(item.apuracao.data_fechamento)
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
