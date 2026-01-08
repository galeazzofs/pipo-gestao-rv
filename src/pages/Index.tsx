import { CNCalculator } from '@/components/CNCalculator';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const Index = () => {
  return (
    <ProtectedRoute>
      <CNCalculator />
    </ProtectedRoute>
  );
};

export default Index;
