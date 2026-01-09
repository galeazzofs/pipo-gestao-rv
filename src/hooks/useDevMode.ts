import { useState, useEffect, useCallback } from 'react';

const DEV_MODE_KEY = 'lovable-dev-mode-bypass';

export const useDevMode = () => {
  // Só permite toggle em ambiente de desenvolvimento
  const isDevEnvironment = import.meta.env.DEV;
  
  const [devModeEnabled, setDevModeEnabled] = useState(() => {
    if (!isDevEnvironment) return false;
    const stored = localStorage.getItem(DEV_MODE_KEY);
    return stored !== 'false'; // Default é true em dev
  });

  useEffect(() => {
    if (isDevEnvironment) {
      localStorage.setItem(DEV_MODE_KEY, String(devModeEnabled));
    }
  }, [devModeEnabled, isDevEnvironment]);

  const toggleDevMode = useCallback(() => {
    setDevModeEnabled(prev => !prev);
    // Recarrega a página para aplicar a mudança no AuthContext
    window.location.reload();
  }, []);

  return {
    isDevEnvironment,
    devModeEnabled: isDevEnvironment && devModeEnabled,
    toggleDevMode,
  };
};

// Função para ler o estado diretamente (para uso fora de React)
export const isDevModeEnabled = (): boolean => {
  if (!import.meta.env.DEV) return false;
  const stored = localStorage.getItem(DEV_MODE_KEY);
  return stored !== 'false';
};
