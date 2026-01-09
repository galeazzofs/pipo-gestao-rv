import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import EVContratos from "./pages/EVContratos";
import Previsibilidade from "./pages/Previsibilidade";
import NotFound from "./pages/NotFound";
//import { HubRoute } from "./components/HubRoute";

// Hub de Apuração (Admin e Liderança)
import GestaoTime from "./pages/hub/GestaoTime";
import ApuracaoMensal from "./pages/hub/ApuracaoMensal";
import ApuracaoTrimestral from "./pages/hub/ApuracaoTrimestral";
import HistoricoApuracoes from "./pages/hub/HistoricoApuracoes";

// Minha Comissão (Usuários)
import Simulador from "./pages/minha-comissao/Simulador";
import MeusResultados from "./pages/minha-comissao/MeusResultados";

const HubRoute = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const queryClient = new QueryClient();

// Detectar modo desenvolvimento
const IS_DEV_MODE = import.meta.env.DEV;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          {/* Banner de modo desenvolvimento */}
          {IS_DEV_MODE && (
            <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-xs font-medium text-center py-1">
              🛠️ Modo Desenvolvimento - Login desabilitado
            </div>
          )}
          <div className={IS_DEV_MODE ? 'pt-6' : ''}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Landing />} />

              {/* Minha Comissão (todos usuários) */}
              <Route path="/minha-comissao/simulador" element={<Simulador />} />
              <Route path="/minha-comissao/previsao" element={<Previsibilidade />} />
              <Route path="/minha-comissao/historico" element={<MeusResultados />} />

              {/* Hub de Apuração (admins e liderança) */}
              <Route
                path="/hub/time"
                element={
                  <HubRoute>
                    <GestaoTime />
                  </HubRoute>
                }
              />
              <Route
                path="/hub/apuracao-mensal"
                element={
                  <HubRoute>
                    <ApuracaoMensal />
                  </HubRoute>
                }
              />
              <Route
                path="/hub/apuracao-trimestral"
                element={
                  <HubRoute>
                    <ApuracaoTrimestral />
                  </HubRoute>
                }
              />
              <Route path="/hub/contratos" element={<EVContratos />} />
              <Route path="/hub/historico" element={<HistoricoApuracoes />} />

              {/* Legacy routes - redirect to new paths */}
              <Route path="/calculadora-cn" element={<Navigate to="/minha-comissao/simulador" replace />} />
              <Route path="/previsibilidade" element={<Navigate to="/minha-comissao/previsao" replace />} />
              <Route path="/ev/contratos" element={<Navigate to="/hub/contratos" replace />} />
              <Route path="/ev/apuracao" element={<Navigate to="/hub/apuracao-mensal" replace />} />
              <Route path="/ev-calculator" element={<Navigate to="/hub/contratos" replace />} />
              <Route path="/historico" element={<Navigate to="/hub/historico" replace />} />
              <Route path="/admin" element={<Navigate to="/hub/time" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
