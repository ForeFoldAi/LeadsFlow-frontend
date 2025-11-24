import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthGuard from "@/components/auth-guard";
import { useToast } from "@/hooks/use-toast";
import {
  isFirebaseMessagingConfigured,
  subscribeToForegroundMessages,
} from "@/lib/firebase";

import Dashboard from "@/pages/dashboard";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import NotFound from "@/pages/not-found";
import FloatingLogo from "@/components/floating-logo";

function ProtectedRoute({ component: Component, ...props }: any) {
  return (
    <AuthGuard>
      <Component {...props} />
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login">{() => {
        // Check if already authenticated
        try {
          const userStr = localStorage.getItem("user");
          if (userStr && userStr !== "null" && userStr !== "undefined") {
            const user = JSON.parse(userStr);
            if (user && user.id) {
              window.location.href = "/";
              return null;
            }
          }
        } catch (error) {
          localStorage.removeItem("user");
        }
        return <Login />;
      }}</Route>
      <Route path="/signup">{() => {
        // Check if already authenticated
        try {
          const userStr = localStorage.getItem("user");
          if (userStr && userStr !== "null" && userStr !== "undefined") {
            const user = JSON.parse(userStr);
            if (user && user.id) {
              window.location.href = "/";
              return null;
            }
          }
        } catch (error) {
          localStorage.removeItem("user");
        }
        return <Signup />;
      }}</Route>
      <Route path="/" component={(props) => <ProtectedRoute component={Dashboard} {...props} />} />
      <Route path="/analytics" component={(props) => <ProtectedRoute component={Analytics} {...props} />} />
      <Route path="/settings" component={(props) => <ProtectedRoute component={Settings} {...props} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { toast } = useToast();

  useEffect(() => {
    if (!isFirebaseMessagingConfigured()) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    subscribeToForegroundMessages((payload) => {
      console.log("[Firebase] Foreground push received:", payload);

      const title =
        payload.notification?.title ??
        payload.data?.title ??
        "LeadsFlow Notification";
      const body =
        payload.notification?.body ??
        payload.data?.message ??
        payload.data?.body ??
        "You have a new notification.";

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          const notification = new Notification(title, {
            body,
            data: payload.data,
            icon: payload.notification?.icon || "/logo.png",
          });

          notification.onclick = () => {
            const targetUrl = payload.data?.url;
            if (targetUrl) {
              window.focus();
              window.location.href = targetUrl;
            }
          };
        } catch (error) {
          console.warn("[Firebase] Failed to display foreground notification:", error);
          toast({
            title,
            description: body,
          });
        }
      } else {
        toast({
          title,
          description: body,
        });
      }
    })
      .then((unsub) => {
        if (typeof unsub === "function") {
          unsubscribe = unsub;
        }
      })
      .catch((error) => {
        console.error("[Firebase] Failed to subscribe to foreground messages:", error);
      });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <FloatingLogo />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
