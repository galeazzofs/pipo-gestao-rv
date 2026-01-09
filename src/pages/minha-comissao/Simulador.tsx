import { useState, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LevelSelector } from '@/components/LevelSelector';
import { MetricInputGroup } from '@/components/MetricInputGroup';
import { ResultDisplay } from '@/components/ResultDisplay';
import { calcularComissaoCN, CNLevel, getFaixaPagamento, formatPorcentagem } from '@/lib/cnCalculations';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Calculator, Info } from 'lucide-react';

export default function Simulador() {
  const { profile } = useAuth();
  const userLevel = (profile?.nivel as CNLevel) || 'CN1';
  
  const [level, setLevel] = useState<CNLevel>(userLevel);
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
      level,
      parseFloat(saoMeta) || 0,
      parseFloat(saoRealizado) || 0,
      parseFloat(vidasMeta) || 0,
      parseFloat(vidasRealizado) || 0
    );
    setResult(resultado.comissao);
    setDetails(resultado.details);
    setShowResult(true);
  }, [level, saoMeta, saoRealizado, vidasMeta, vidasRealizado]);

  const isFormValid = 
    saoMeta !== '' && 
    saoRealizado !== '' && 
    vidasMeta !== '' && 
    vidasRealizado !== '';

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
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-card">
                <span className="h-2 w-2 rounded-full bg-foreground"></span>
                Perfil: CN (Mensal)
              </div>
            </header>

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
              {/* Level Selector */}
              <div className="mb-8">
                <label className="mb-3 block text-sm font-medium text-foreground">
                  Selecione seu nível
                </label>
                <LevelSelector value={level} onChange={setLevel} />
              </div>

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
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
