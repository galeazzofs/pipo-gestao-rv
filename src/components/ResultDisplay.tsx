interface ResultDisplayProps {
  value: number;
}

export const ResultDisplay = ({ value }: ResultDisplayProps) => {
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);

  return (
    <div className="card-premium mt-6 animate-fade-in p-8 text-center">
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        Sua comissão estimada
      </p>
      <p className="result-value">{formattedValue}</p>
    </div>
  );
};
