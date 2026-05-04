import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import {
  LogOut,
  CalendarCheck,
  LayoutDashboard,
  Bell,
  Menu,
  Home,
  Building2,
  ShieldCheck,
  User,
  Activity,
  Zap
} from "lucide-react";

import courtsideLogo from "@/assets/courtside-logo.png";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  show: boolean;
}

export function Navbar() {
  const { user, signOut } = useAuth();
  const { isOwner, isAdmin } = useRoles();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isHome = pathname === "/";

  const navItems: NavItem[] = [
    { to: "/", label: "Portal", icon: Home, show: true },
    { to: "/facilities", label: "Registry", icon: Building2, show: true },
    { to: "/customer", label: "User Hub", icon: User, show: !!user && !isOwner && !isAdmin },
    { to: "/owner", label: "Owner Hub", icon: LayoutDashboard, show: !!user && isOwner && !isAdmin },
    { to: "/admin/users", label: "Admin Hub", icon: ShieldCheck, show: !!user && isAdmin },
    { to: "/my-bookings", label: "Operations", icon: CalendarCheck, show: !!user && !isAdmin },
    { to: "/reminders", label: "Relay", icon: Bell, show: !!user && !isAdmin },
  ];

  return (
    <header 
      className={`sticky top-0 z-[100] transition-all duration-500 border-b ${
        scrolled 
          ? "bg-background/80 backdrop-blur-2xl border-white/5 py-2" 
          : "bg-transparent border-transparent py-4"
      }`}
    >
      <div className="container flex items-center justify-between gap-4">
        {/* LOGO SECTION */}
        <Link
          to="/"
          className="flex items-center gap-3 group relative"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <img
              src={courtsideLogo}
              alt="Logo"
              className="h-10 w-auto group-hover:scale-110 transition-transform dark:brightness-0 dark:invert relative z-10"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-2xl font-black tracking-[0.2em] text-white leading-none group-hover:text-accent transition-colors">
              COURTCONNECT
            </span>
            <div className="flex items-center gap-1.5 opacity-40">
              <div className="size-1 rounded-full bg-accent animate-pulse" />
              <span className="text-[8px] font-mono tracking-[0.4em] uppercase">Secure Node // v2.0.4</span>
            </div>
          </div>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav className="hidden lg:flex items-center gap-1 p-1 bg-white/5 backdrop-blur-md border border-white/5 rounded-full">
          {navItems
            .filter((i) => i.show)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group ${
                    isActive
                      ? "text-accent-foreground bg-accent shadow-glow-sm"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`
                }
              >
                <span className="relative z-10 flex items-center gap-2">
                  {item.label}
                  {item.label === "Operations" && (
                    <Activity className="size-3 opacity-50" />
                  )}
                </span>
              </NavLink>
            ))}
        </nav>

        {/* ACTIONS SECTION */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Active Node</span>
                <span className="text-[10px] font-black text-white/80">{user.email?.split("@")[0].toUpperCase()}</span>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
                className="rounded-full size-10 border-white/10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all group"
              >
                <LogOut className="size-4 group-hover:scale-110 transition-transform" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => navigate("/auth")}
              className="hidden md:flex h-11 px-8 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow font-black text-[10px] uppercase tracking-[0.2em] gap-3"
            >
              <Zap className="size-4" />
              Initialize Session
            </Button>
          )}

          {/* MOBILE MENU */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-full size-10 bg-white/5 border border-white/5"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-background/95 backdrop-blur-2xl border-white/5">
              <SheetHeader className="mb-12">
                <SheetTitle className="text-left">
                   <div className="flex flex-col">
                    <span className="font-display text-2xl font-black tracking-[0.2em] text-white">COURTCONNECT</span>
                    <span className="text-[8px] font-mono tracking-[0.4em] text-accent uppercase mt-1">Terminal Menu</span>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-3">
                {navItems
                  .filter((i) => i.show)
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <SheetClose asChild key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.to === "/"}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all border ${
                              isActive
                                ? "bg-accent text-accent-foreground border-accent shadow-glow"
                                : "text-muted-foreground border-white/5 hover:bg-white/5"
                            }`
                          }
                        >
                          <div className="flex items-center gap-4">
                            <Icon className="size-4" />
                            {item.label}
                          </div>
                          <ArrowRight className="size-3 opacity-30" />
                        </NavLink>
                      </SheetClose>
                    );
                  })}
              </nav>

              <div className="mt-auto pt-12">
                {user ? (
                   <Button
                    variant="outline"
                    className="w-full h-14 rounded-2xl border-white/10 font-black text-[10px] uppercase tracking-[0.2em] gap-3"
                    onClick={async () => {
                      await signOut();
                      navigate("/");
                    }}
                  >
                    <LogOut className="size-4 text-red-500" /> Disconnect Session
                  </Button>
                ) : (
                  <Button 
                    className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-black text-[10px] uppercase tracking-[0.2em] shadow-glow"
                    onClick={() => navigate("/auth")}
                  >
                    Initialize Session
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
