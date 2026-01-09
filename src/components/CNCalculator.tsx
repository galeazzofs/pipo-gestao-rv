import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { MetricInputGroup } from './MetricInputGroup';
import { ResultDisplay } from './ResultDisplay';

type CNLevel = 'CN1' | 'CN2' | 'CN3';

const TARGETS: Record<CNLevel, number> = {
  CN1: 2000,
  CN2: 2500,
  CN3: 3000,
};

const calculateCommission = (
  level: CNLevel,
  saoMeta: number,
  saoRealizado: number,
  vidasMeta: number,
  vidasRealizado: number
): number => {
  if (saoMeta <= 0 || vidasMeta <= 0) return 0;

  // Calculate KPIs
  const pctSAO = saoRealizado / saoMeta;
  let pctVidas = vidasRealizado / vidasMeta;
  
  // Cap Vidas at 1.5
  if (pctVidas > 1.5) pctVidas = 1.5;

  // Weighted score
  const scoreFinal = (pctSAO * 0.70) + (pctVidas * 0.30);

  // Payment multiplier
  let mult = 0;
  if (scoreFinal < 0.199) {
    mult = 0;
  } else if (scoreFinal >= 0.20 && scoreFinal < 0.399) {
    mult = 0.20;
  } else if (scoreFinal >= 0.40 && scoreFinal < 0.999) {
    mult = scoreFinal;
  } else if (scoreFinal >= 1.00 && scoreFinal < 1.099) {
    mult = 1.20;
  } else if (scoreFinal >= 1.10 && scoreFinal < 1.399) {
    mult = 1.80;
  } else if (scoreFinal >= 1.40) {
    mult = 2.10;
  }

  return TARGETS[level] * mult;
};

export const CNCalculator = () => {
  const { profile } = useAuth();
  const [saoMeta, setSaoMeta] = useState<string>('');
  const [saoRealizado, setSaoRealizado] = useState<string>('');
  const [vidasMeta, setVidasMeta] = useState<string>('');
  const [vidasRealizado, setVidasRealizado] = useState<string>('');
  const [result, setResult] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const level = profile?.nivel || 'CN1';

  const handleCalculate = useCallback(() => {
    const commission = calculateCommission(
      level,
      parseFloat(saoMeta) || 0,
      parseFloat(saoRealizado) || 0,
      parseFloat(vidasMeta) || 0,
      parseFloat(vidasRealizado) || 0
    );
    setResult(commission);
    setShowResult(true);
  }, [level, saoMeta, saoRealizado, vidasMeta, vidasRealizado]);

  const isFormValid = 
    saoMeta !== '' && 
    saoRealizado !== '' && 
    vidasMeta !== '' && 
    vidasRealizado !== '';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-4 py-8 md:py-12">
        <div className="mx-auto max-w-lg">
          {/* Header */}
          <header className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              Calculadora CN
            </h1>
            <p className="mt-2 text-muted-foreground">
              Calcule sua comissão mensal baseada em SAOs e Vidas
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Nível: {level}
            </div>
          </header>

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
            <ResultDisplay value={result} />
          )}
        </div>
      </div>
    </div>
  );
};
