import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Colaborador } from './useColaboradores';

/**
 * Hook otimizado que busca apenas o colaborador do usuário logado,
 * evitando o fetch de toda a lista de colaboradores.
 */
export function useCurrentColaborador() {
  const { user, loading: authLoading } = useAuth();
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.email) {
      setColaborador(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    supabase
      .from('colaboradores')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()
      .then(({ data }) => {
        setColaborador(data as Colaborador | null);
        setIsLoading(false);
      });
  }, [user?.email, authLoading]);

  return { colaborador, isLoading };
}
