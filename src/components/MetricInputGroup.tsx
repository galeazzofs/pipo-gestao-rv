interface MetricInputGroupProps {
  title: string;
  metaValue: string;
  realizadoValue: string;
  onMetaChange: (value: string) => void;
  onRealizadoChange: (value: string) => void;
}

export const MetricInputGroup = ({
  title,
  metaValue,
  realizadoValue,
  onMetaChange,
  onRealizadoChange,
}: MetricInputGroupProps) => {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void
  ) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Meta
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={metaValue}
            onChange={(e) => handleInputChange(e, onMetaChange)}
            className="input-premium w-full"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Realizado
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={realizadoValue}
            onChange={(e) => handleInputChange(e, onRealizadoChange)}
            className="input-premium w-full"
          />
        </div>
      </div>
    </div>
  );
};
