type CNLevel = 'CN1' | 'CN2' | 'CN3';

interface LevelSelectorProps {
  value: CNLevel;
  onChange: (level: CNLevel) => void;
}

const levels: { key: CNLevel; label: string }[] = [
  { key: 'CN1', label: 'CN 1' },
  { key: 'CN2', label: 'CN 2' },
  { key: 'CN3', label: 'CN 3' },
];

export const LevelSelector = ({ value, onChange }: LevelSelectorProps) => {
  return (
    <div className="flex gap-3">
      {levels.map((level) => (
        <button
          key={level.key}
          onClick={() => onChange(level.key)}
          className={`btn-selector flex-1 ${
            value === level.key ? 'btn-selector-active' : ''
          }`}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
};
