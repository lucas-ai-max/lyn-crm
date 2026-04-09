import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PrivateRouteProps {
  children: ReactNode;
  requiresCompany?: boolean;
}

export const PrivateRoute = ({ children, requiresCompany = true }: PrivateRouteProps) => {
  const { user, loading, companyId } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If the route requires a company (default) and the user doesn't have one, redirect to onboarding
  if (requiresCompany && !companyId) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
