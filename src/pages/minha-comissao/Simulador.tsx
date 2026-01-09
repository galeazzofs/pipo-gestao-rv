import { useState, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MetricInputGroup } from '@/components/MetricInputGroup';
import { ResultDisplay } from '@/components/ResultDisplay';
import { calcularComissaoCN, CNLevel, CN_TARGETS, getFaixaPagamento, formatPorcentagem } from '@/lib/cnCalculations';
import { useAuth } from '@/contexts/AuthContext';
import { useColaboradores } from '@/hooks/useColaboradores';
import { Badge } from '@/components/ui/badge';
import { Calculator, Info, AlertCircle, Loader2, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Simulador() {
  const { user } = useAuth();
  const { colaboradores, isLoading: loadingColaborador } = useColaboradores();
  
  // Buscar colaborador pelo email do usuário logado
  const colaborador = colaboradores.find(c => c.email === user?.email);
  const nivel = (colaborador?.nivel as CNLevel) || 'CN1';
  const nome = colaborador?.nome || 'Usuário';
  const target = CN_TARGETS[nivel];
  const isRegistered = !!colaborador;
  
  const [saoMeta, setSaoMeta] = useState<string>('');
  const [saoRealizado, setSaoRealizado] = useState<string>('');
  const [vidasMeta, setVidasMeta] = useState<string>('');
  const [vidasRealizado, setVidasRealizado] = useState<string>('');
  const [result, setResult] = useState<number | null>(null);
  const [details, setDetails] = useState<{
    pctSAO: number;
    pctVidas: number;
    scoreFinal: number;
    multiplicador: number;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleCalculate = useCallback(() => {
    const resultado = calcularComissaoCN(
      nivel,
      parseFloat(saoMeta) || 0,
      parseFloat(saoRealizado) || 0,
      parseFloat(vidasMeta) || 0,
      parseFloat(vidasRealizado) || 0
    );
    setResult(resultado.comissao);
    setDetails(resultado.details);
    setShowResult(true);
  }, [nivel, saoMeta, saoRealizado, vidasMeta, vidasRealizado]);

  const isFormValid = 
    saoMeta !== '' && 
    saoRealizado !== '' && 
    vidasMeta !== '' && 
    vidasRealizado !== '';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="px-4 py-8 md:py-12">
          <div className="mx-auto max-w-lg">
            {/* Header */}
            <header className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Calculator className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                Simulador de Comissão
              </h1>
              <p className="mt-2 text-muted-foreground">
                Calcule sua comissão mensal baseada nos KPIs
              </p>
            </header>

            {loadingColaborador ? (
              <div className="card-premium p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !isRegistered ? (
              /* Usuário não cadastrado */
              <div className="card-premium p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Cadastro não encontrado</h2>
                <p className="text-muted-foreground mb-4">
                  Você ainda não está cadastrado no sistema como colaborador. 
                  Solicite ao administrador que adicione seu cadastro na Gestão de Time.
                </p>
                <p className="text-sm text-muted-foreground">
                  Email logado: <span className="font-medium">{user?.email}</span>
                </p>
              </div>
            ) : (
              <>
                {/* User Info Card */}
                <div className="card-premium p-4 mb-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{nome}</p>
                  <div className="flex items-center gap-3 mt-1">
                      <Badge variant="secondary">{nivel}</Badge>
                    </div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="card-premium p-4 mb-6 flex items-start gap-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-300">Como funciona</p>
                    <p className="text-blue-700 dark:text-blue-400">
                      SAO tem peso de 70% e Vidas 30% (trava em 150%). O score final determina o multiplicador na régua de payout.
                    </p>
                  </div>
                </div>

                {/* Main Card */}
                <div className="card-premium p-6 md:p-8">
                  {/* SAOs Input Group */}
                  <MetricInputGroup
                    title="SAOs"
                    metaValue={saoMeta}
                    realizadoValue={saoRealizado}
                    onMetaChange={setSaoMeta}
                    onRealizadoChange={setSaoRealizado}
                  />

                  {/* Vidas SAOs Input Group */}
                  <MetricInputGroup
                    title="Vidas SAOs"
                    metaValue={vidasMeta}
                    realizadoValue={vidasRealizado}
                    onMetaChange={setVidasMeta}
                    onRealizadoChange={setVidasRealizado}
                  />

                  {/* Calculate Button */}
                  <button
                    onClick={handleCalculate}
                    disabled={!isFormValid}
                    className="btn-primary mt-2 w-full"
                  >
                    Calcular Comissão Mensal
                  </button>
                </div>

                {/* Result */}
                {showResult && result !== null && (
                  <>
                    <ResultDisplay value={result} />
                    
                    {/* Details Card */}
                    {details && (
                      <div className="card-premium p-6 mt-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                          Detalhes do Cálculo
                        </h3>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">% SAO (peso 70%)</span>
                            <span className="font-medium">{formatPorcentagem(details.pctSAO)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">% Vidas (peso 30%)</span>
                            <span className="font-medium">{formatPorcentagem(details.pctVidas)}</span>
                          </div>
                          <div className="h-px bg-border my-2" />
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Score Final</span>
                            <span className="font-bold text-lg">{formatPorcentagem(details.scoreFinal)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Multiplicador</span>
                            <span className="font-bold">{formatPorcentagem(details.multiplicador)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Faixa</span>
                            <Badge variant="outline">{getFaixaPagamento(details.scoreFinal)}</Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
