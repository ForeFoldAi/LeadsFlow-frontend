import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthGuard from "@/components/auth-guard";

import Dashboard from "@/pages/dashboard";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import NotFound from "@/pages/not-found";
import FloatingLogo from "@/components/floating-logo";
import SendEmail from "@/pages/leads-action-center/send-email";
import Automation from "@/pages/leads-action-center/automation";
import Templates from "@/pages/leads-action-center/templates";
import CommunicationLogs from "@/pages/leads-action-center/communication-logs";

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
      <Route path="/leads-action-center/send-email" component={(props) => <ProtectedRoute component={SendEmail} {...props} />} />
      <Route path="/leads-action-center/automation" component={(props) => <ProtectedRoute component={Automation} {...props} />} />
      <Route path="/leads-action-center/templates" component={(props) => <ProtectedRoute component={Templates} {...props} />} />
      <Route path="/leads-action-center/communication-logs" component={(props) => <ProtectedRoute component={CommunicationLogs} {...props} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const hideChat = location === "/login" || location === "/signup";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        {!hideChat && <FloatingLogo />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
