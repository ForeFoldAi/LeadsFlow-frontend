import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Users, Search, BarChart3, Settings, LogOut, Menu, X, UserCheck, Bell, BellOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";


export default function AppHeader() {
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("notificationsEnabled");
    if (stored !== null) return stored === "true";
    return true;
  });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "default";
    }
    return Notification.permission;
  });
  const { toast } = useToast();

  const getUserFromStorage = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr || userStr === "undefined" || userStr === "null") {
        return null;
      }
      return JSON.parse(userStr);
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
      localStorage.removeItem("user");
      return null;
    }
  };

  // Load user data on mount and listen for storage changes
  useEffect(() => {
    const loadUser = () => {
      const user = getUserFromStorage();
      setCurrentUser(user);
    };

    const updatePermission = () => {
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotificationPermission(Notification.permission);
      }
    };

    const loadNotificationPreference = () => {
      const stored = localStorage.getItem("notificationsEnabled");
      setNotificationsEnabled(stored === null ? true : stored === "true");
      updatePermission();
    };

    // Load initial user data
    loadUser();
    loadNotificationPreference();

    // Listen for storage changes (when user data is updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user") {
        loadUser();
      }
      if (e.key === "notificationsEnabled") {
        loadNotificationPreference();
      }
    };

    // Listen for custom events when user data is updated
    const handleUserUpdate = () => {
      loadUser();
    };

    const handleNotificationsUpdate = () => {
      loadNotificationPreference();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("userUpdated", handleUserUpdate);
    window.addEventListener("notificationsUpdated", handleNotificationsUpdate);
    window.addEventListener("focus", loadNotificationPreference);
    document.addEventListener("visibilitychange", loadNotificationPreference);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userUpdated", handleUserUpdate);
      window.removeEventListener("notificationsUpdated", handleNotificationsUpdate);
      window.removeEventListener("focus", loadNotificationPreference);
      document.removeEventListener("visibilitychange", loadNotificationPreference);
    };
  }, []);

  const syncPermissionWithState = (permission: NotificationPermission) => {
    setNotificationPermission(permission);
    if (permission !== "granted") {
      setNotificationsEnabled(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("notificationsEnabled", "false");
        window.dispatchEvent(new Event("notificationsUpdated"));
      }
    }
  };

  const toggleNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast({
        title: "Browser Not Supported",
        description: "Your browser does not support push notifications.",
        variant: "destructive",
      });
      return;
    }

    const latestPermission = Notification.permission;
    syncPermissionWithState(latestPermission);

    let currentPermission = latestPermission;

    if (notificationPermission !== "granted") {
      try {
        const permission = await Notification.requestPermission();
        syncPermissionWithState(permission);
        currentPermission = permission;
        if (permission !== "granted") {
          toast({
            title: "Notifications Blocked",
            description: "Enable notifications in your browser settings to receive alerts.",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error("Failed to request notification permission:", error);
        toast({
          title: "Notification Error",
          description: "We couldn't update your notification permission. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    const canShow = currentPermission === "granted";
    setNotificationsEnabled((prev) => {
      const next = canShow ? !prev : prev;
      if (canShow) {
        localStorage.setItem("notificationsEnabled", String(next));
        window.dispatchEvent(new Event("notificationsUpdated"));
        toast({
          title: next ? "Notifications Enabled" : "Notifications Muted",
          description: next
            ? "You will receive alerts and updates."
            : "Notifications are muted until you re-enable them.",
        });
      }
      return next;
    });
  };

  const isBrowserPushActive = notificationPermission === "granted" && notificationsEnabled;

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const stored = localStorage.getItem("notificationsEnabled");
    if (stored === null && Notification.permission === "denied") {
      setNotificationsEnabled(false);
      localStorage.setItem("notificationsEnabled", "false");
    }
  }, [notificationPermission]);

  const handleToggleClick = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      syncPermissionWithState(Notification.permission);
    }
    setNotificationsEnabled((prev) => {
      if (notificationPermission !== "granted") {
        toggleNotifications();
        return prev;
      }
      const next = !prev;
      localStorage.setItem("notificationsEnabled", String(next));
      window.dispatchEvent(new Event("notificationsUpdated"));
      toast({
        title: next ? "Notifications Enabled" : "Notifications Muted",
        description: next
          ? "You will receive alerts and updates."
          : "Notifications are muted until you re-enable them.",
      });
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    toast({
      title: "Success",
      description: "Logged out successfully",
    });
    setLocation("/login");
  };

  const navItems = [
    { path: "/", label: "Leads", icon: UserCheck },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo, Brand and Welcome Section */}
          <div className="flex items-center space-x-3 md:space-x-6">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-2 md:space-x-4">
                <div className="relative">
                  <img 
                    src="/logo.png" 
                    alt="ForeFold AI Logo" 
                    className="h-8 w-8 md:h-12 md:w-12 object-contain filter drop-shadow-lg"
                  />
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl"></div>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                    LeadsFlow
                  </h1>
                  <p className="text-xs md:text-sm text-slate-400 font-medium tracking-wide">
                    powered by <span className="text-purple-400">Forefold</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Welcome Section - Hidden on mobile */}
            <div className="hidden lg:flex flex-col border-l border-slate-600 pl-6">
              <p className="text-slate-300 text-sm font-medium">Welcome,</p>
              <p className="text-white text-base font-semibold">
                {currentUser?.companyName || currentUser?.name || "User"}
              </p>
            </div>
          </div>

          {/* Right side - Navigation and User Menu */}
          <div className="flex items-center space-x-3 md:space-x-6">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-2">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="default"
                  onClick={() => setLocation(item.path)}
                  className="flex items-center space-x-2 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200 px-4 py-2 rounded-lg border border-transparent hover:border-slate-600"
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Button>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (notificationPermission !== "granted") {
                    toggleNotifications();
                  } else {
                    handleToggleClick();
                  }
                }}
                className={`relative h-10 w-10 rounded-full border border-slate-700 bg-slate-800/40 hover:bg-slate-700/60 transition-colors ${isBrowserPushActive ? "text-yellow-300" : "text-slate-400"}`}
                aria-label={
                  notificationPermission === "granted"
                    ? isBrowserPushActive
                      ? "Mute notifications"
                      : "Enable notifications"
                    : "Request notification permission"
                }
                data-testid="button-toggle-notifications"
              >
                {isBrowserPushActive ? (
                  <Bell className="h-5 w-5" />
                ) : (
                  <BellOff className="h-5 w-5" />
                )}
                {isBrowserPushActive && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
                  </span>
                )}
              </Button>

              {/* User Profile Section - Desktop */}
              <div className="hidden md:flex items-center space-x-3 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{currentUser?.name || "User"}</p>
                  <p className="text-xs text-slate-400 truncate max-w-[120px]">
                    {currentUser?.email}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-purple-500/30 hover:border-purple-400 transition-colors" data-testid="user-menu">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white font-semibold">
                          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-3 bg-slate-900/50">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium text-white">{currentUser?.name || "User"}</p>
                        <p className="w-[200px] truncate text-sm text-slate-400">
                          {currentUser?.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem onClick={() => setLocation("/settings")} data-testid="menu-settings" className="text-slate-300 hover:text-white hover:bg-slate-700">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout" className="text-slate-300 hover:text-white hover:bg-slate-700">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile User Menu */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full border border-slate-600 p-0" data-testid="mobile-user-menu">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white text-xs">
                          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-3 bg-slate-900/50">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium text-white">{currentUser?.name || "User"}</p>
                        <p className="w-[200px] truncate text-sm text-slate-400">
                          {currentUser?.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem onClick={() => setLocation("/settings")} data-testid="mobile-menu-settings" className="text-slate-300 hover:text-white hover:bg-slate-700">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem onClick={handleLogout} data-testid="mobile-menu-logout" className="text-slate-300 hover:text-white hover:bg-slate-700">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>


      </div>
    </header>
  );
}