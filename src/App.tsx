import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Páginas Públicas / Autenticação
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Hub de Apuração (Admin e Liderança)
import GestaoTime from "./pages/hub/GestaoTime";
import ApuracaoMensal from "./pages/hub/ApuracaoMensal";
import ApuracaoTrimestral from "./pages/hub/ApuracaoTrimestral";
import HistoricoApuracoes from "./pages/hub/HistoricoApuracoes";
import EVContratos from "./pages/EVContratos"; // Página de Contratos (Admin)

// Minha Comissão (Usuários / CNs)
import Simulador from "./pages/minha-comissao/Simulador";
import Previsibilidade from "./pages/Previsibilidade"; // Previsão (agora em Minha Comissão)
import MeusResultados from "./pages/minha-comissao/MeusResultados";

// Componente auxiliar para rotas do Hub (pode ser expandido para validações futuras)
const HubRoute = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Toasters para notificações do sistema */}
      <Toaster />
      <Sonner />
      
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Rota de Login (Novo Design) */}
            <Route path="/login" element={<Login />} />
            
            {/* Rota Raiz (Landing): 
              - Se Admin -> Redireciona visualmente para o Dashboard novo
              - Se CN -> Mostra os módulos de comissão 
            */}
            <Route path="/" element={<Landing />} />

            {/* --- Rotas do Vendedor (Minha Comissão) --- */}
            <Route path="/minha-comissao/simulador" element={<Simulador />} />
            <Route path="/minha-comissao/previsao" element={<Previsibilidade />} />
            <Route path="/minha-comissao/historico" element={<MeusResultados />} />

            {/* --- Rotas do Admin (Hub de Apuração) --- */}
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
            <Route 
              path="/hub/contratos" 
              element={
                <HubRoute>
                  <EVContratos />
                </HubRoute>
              } 
            />
            <Route 
              path="/hub/historico" 
              element={
                <HubRoute>
                  <HistoricoApuracoes />
                </HubRoute>
              } 
            />

            {/* --- Redirecionamentos para Manter Compatibilidade (Rotas Antigas) --- */}
            <Route path="/calculadora-cn" element={<Navigate to="/minha-comissao/simulador" replace />} />
            <Route path="/previsibilidade" element={<Navigate to="/minha-comissao/previsao" replace />} />
            <Route path="/ev/contratos" element={<Navigate to="/hub/contratos" replace />} />
            <Route path="/ev/apuracao" element={<Navigate to="/hub/apuracao-mensal" replace />} />
            <Route path="/ev-calculator" element={<Navigate to="/hub/contratos" replace />} />
            <Route path="/historico" element={<Navigate to="/hub/historico" replace />} />
            <Route path="/admin" element={<Navigate to="/hub/time" replace />} />

            {/* Rota 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;