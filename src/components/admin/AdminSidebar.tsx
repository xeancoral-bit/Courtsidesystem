
import { Link, useLocation } from "react-router-dom";
import { 
  Users, 
  LayoutDashboard, 
  Building2, 
  Settings, 
  ShieldCheck, 
  Calendar,
  LogOut,
  ChevronRight,
  TrendingUp,
  History
} from "lucide-react";
import { CourtsideLogo } from "@/components/CourtsideLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin" },
  { label: "User Management", icon: Users, path: "/admin/users" },
  { label: "Facility Oversight", icon: Building2, path: "/admin/partners" },
  { label: "Global Schedule", icon: Calendar, path: "/admin/calendar" },
  { label: "System Logs", icon: History, path: "/admin/logs" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

export function AdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside className="w-72 bg-[#0a0a0c] border-r border-white/5 flex flex-col h-screen sticky top-0">
      <div className="p-8">
        <Link to="/admin" className="flex items-center gap-3 group">
          <CourtsideLogo size="sm" className="text-primary" />
          <div className="flex flex-col">
            <span className="font-display font-black tracking-tighter text-xl text-white group-hover:text-primary transition-colors">COURTSIDE</span>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary bg-primary/10 px-1.5 py-0.5 rounded leading-none w-fit">Command Center</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]" 
                  : "text-muted-foreground hover:text-white hover:bg-white/[0.03]"
              )}
            >
              <item.icon className={cn(
                "size-5 transition-transform duration-300 group-hover:scale-110",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-white"
              )} />
              <span className="font-display font-bold tracking-wide text-sm">{item.label}</span>
              {isActive && <ChevronRight className="size-4 ml-auto text-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="size-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">System Health</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-muted-foreground">Uptime</span>
              <span className="text-emerald-500">99.9%</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="w-[99%] h-full bg-emerald-500" />
            </div>
          </div>
        </div>

        <Button 
          variant="ghost" 
          onClick={signOut}
          className="w-full justify-start gap-3 px-4 py-3 h-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
        >
          <LogOut className="size-5" />
          <span className="font-display font-bold tracking-wide text-sm">Terminate Session</span>
        </Button>
      </div>
    </aside>
  );
}
