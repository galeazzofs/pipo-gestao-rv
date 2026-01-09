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
import { AdminRoute } from "./components/AdminRoute";

// Hub de Apuração (Admin)
import GestaoTime from "./pages/hub/GestaoTime";
import ApuracaoMensal from "./pages/hub/ApuracaoMensal";
import ApuracaoTrimestral from "./pages/hub/ApuracaoTrimestral";

// Minha Comissão (Usuários)
import Simulador from "./pages/minha-comissao/Simulador";
import MeusResultados from "./pages/minha-comissao/MeusResultados";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Landing />} />
            
            {/* Minha Comissão (todos usuários) */}
            <Route path="/minha-comissao/simulador" element={<Simulador />} />
            <Route path="/minha-comissao/previsao" element={<Previsibilidade />} />
            <Route path="/minha-comissao/historico" element={<MeusResultados />} />
            
            {/* Hub de Apuração (apenas admins) */}
            <Route path="/hub/time" element={<AdminRoute><GestaoTime /></AdminRoute>} />
            <Route path="/hub/apuracao-mensal" element={<AdminRoute><ApuracaoMensal /></AdminRoute>} />
            <Route path="/hub/apuracao-trimestral" element={<AdminRoute><ApuracaoTrimestral /></AdminRoute>} />
            <Route path="/hub/contratos" element={<AdminRoute><EVContratos /></AdminRoute>} />
            
            {/* Legacy routes - redirect to new paths */}
            <Route path="/calculadora-cn" element={<Navigate to="/minha-comissao/simulador" replace />} />
            <Route path="/previsibilidade" element={<Navigate to="/minha-comissao/previsao" replace />} />
            <Route path="/ev/contratos" element={<Navigate to="/hub/contratos" replace />} />
            <Route path="/ev/apuracao" element={<Navigate to="/hub/apuracao-mensal" replace />} />
            <Route path="/ev-calculator" element={<Navigate to="/hub/contratos" replace />} />
            <Route path="/historico" element={<Navigate to="/hub/apuracao-mensal" replace />} />
            <Route path="/admin" element={<Navigate to="/hub/time" replace />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
