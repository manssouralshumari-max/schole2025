// Protected Route Component
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "teacher" | "student" | "parent" | "accountant";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { currentUser, userData, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role if required
  if (requiredRole) {
    // If userData is not loaded yet, wait
    if (!userData && currentUser) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading user data...</p>
          </div>
        </div>
      );
    }

    // If role doesn't match, redirect
    if (userData?.role !== requiredRole) {
      // Redirect to appropriate dashboard based on user role
      const roleDashboard = userData?.role ? `/dashboard/${userData.role.toLowerCase()}` : "/login";
      return <Navigate to={roleDashboard} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

