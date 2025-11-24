import { useLocation } from "wouter";
import { UserCheck, BarChart3, Settings } from "lucide-react";

export default function MobileBottomNav() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { path: "/", label: "Leads", icon: UserCheck },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 pb-safe shadow-sm">
      <div className="flex justify-around items-center py-2 px-4">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => setLocation(item.path)}
            className={`flex flex-col items-center justify-center min-h-[56px] px-3 py-2 rounded-md transition-all duration-200 
              ${isActive(item.path)
                ? "text-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            data-testid={`mobile-bottom-nav-${item.label.toLowerCase()}`}
          >
            <item.icon
              className={`h-5 w-5 mb-1 ${
                isActive(item.path) ? "text-blue-600" : "text-gray-500"
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isActive(item.path) ? "text-blue-600" : "text-gray-500"
              }`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
