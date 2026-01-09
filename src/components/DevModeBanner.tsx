import { useDevMode } from '@/hooks/useDevMode';
import { Switch } from '@/components/ui/switch';
import { Lock, LockOpen } from 'lucide-react';

export const DevModeBanner = () => {
  const { isDevEnvironment, devModeEnabled, toggleDevMode } = useDevMode();

  if (!isDevEnvironment) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-3 transition-colors ${
        devModeEnabled 
          ? 'bg-amber-500 text-amber-950' 
          : 'bg-emerald-600 text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        {devModeEnabled ? (
          <>
            <LockOpen className="h-3 w-3" />
            <span>🛠️ Modo Dev - Login desabilitado</span>
          </>
        ) : (
          <>
            <Lock className="h-3 w-3" />
            <span>🔐 Modo Produção - Login ativo</span>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-[10px] opacity-80">
          {devModeEnabled ? 'Dev' : 'Prod'}
        </span>
        <Switch
          checked={!devModeEnabled}
          onCheckedChange={toggleDevMode}
          className="scale-75"
        />
        <span className="text-[10px] opacity-80">
          {devModeEnabled ? 'Prod' : 'Dev'}
        </span>
      </div>
    </div>
  );
};
