import { useLocation } from "wouter";
import { UserCheck, BarChart3, Zap, MessageSquare, Clock, FileText, History } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function MobileBottomNav() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { path: "/", label: "Leads", icon: UserCheck },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
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
              className={`h-5 w-5 mb-1 ${isActive(item.path) ? "text-blue-600" : "text-gray-500"
                }`}
            />
            <span
              className={`text-xs font-medium ${isActive(item.path) ? "text-blue-600" : "text-gray-500"
                }`}
            >
              {item.label}
            </span>
          </button>
        ))}

        {/* Lead Action Center for Mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex flex-col items-center justify-center min-h-[56px] px-3 py-2 rounded-md transition-all duration-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              data-testid="mobile-bottom-nav-actions"
            >
              <Zap className="h-5 w-5 mb-1 text-gray-500" />
              <span className="text-xs font-medium text-gray-500">Actions</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-white border-gray-200 mb-2" align="end" side="top">
            <DropdownMenuItem onClick={() => setLocation("/leads-action-center/send-email")} className="cursor-pointer py-3">
              <MessageSquare className="mr-3 h-4 w-4 text-blue-600" />
              <span>Send Messages</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/leads-action-center/automation")} className="cursor-pointer py-3">
              <Clock className="mr-3 h-4 w-4 text-blue-600" />
              <span>Schedulers</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/leads-action-center/templates")} className="cursor-pointer py-3">
              <FileText className="mr-3 h-4 w-4 text-blue-600" />
              <span>Templates</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/leads-action-center/communication-logs")} className="cursor-pointer py-3">
              <History className="mr-3 h-4 w-4 text-blue-600" />
              <span>Communication Logs</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
