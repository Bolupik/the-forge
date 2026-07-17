import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useStacksAuth } from "@/contexts/StacksAuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

const ProtectedRoute = ({ children, redirectTo = "/auth" }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useStacksAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-10">
        <div
          className="w-12 h-12 rounded-full animate-spin"
          style={{
            border: "2px solid rgba(224,72,58,0.2)",
            borderTopColor: "var(--cf-gold)",
          }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
