import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader } from "@/components/ui/loader";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      console.log("========== AUTH GUARD CHECK ==========");
      try {
        const userStr = localStorage.getItem("user");
        console.log("User from localStorage:", userStr);
        
        if (!userStr || userStr === "null" || userStr === "undefined") {
          console.log("❌ Auth failed: No user data in localStorage");
          setIsAuthenticated(false);
          setLocation("/login");
          return;
        }
        
        const user = JSON.parse(userStr);
        console.log("Parsed user:", user);
        console.log("User has ID:", !!user.id);
        
        if (user && user.id) {
          console.log("✅ Auth passed: User authenticated");
          setIsAuthenticated(true);
        } else {
          console.log("❌ Auth failed: User data missing ID");
          setIsAuthenticated(false);
          setLocation("/login");
        }
      } catch (error) {
        console.error("❌ Auth check failed with error:", error);
        localStorage.removeItem("user");
        setIsAuthenticated(false);
        setLocation("/login");
      }
      console.log("=====================================");
    };

    checkAuth();
  }, [setLocation]);

  if (isAuthenticated === null) {
    return <Loader text="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}