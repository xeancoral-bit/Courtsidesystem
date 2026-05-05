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
  Building2,
  Handshake,
  User,
  Home,
  Info,
} from "lucide-react";
import { CourtsideLogo } from "@/components/CourtsideLogo";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  show: boolean;
}

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { isOwner, isAdmin } = useRoles();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const navItems: NavItem[] = [
    { to: "/", label: "Home", icon: Home, show: pathname === "/" },
    { to: "/#about", label: "About", icon: Info, show: pathname === "/" },
    { to: isOwner ? "/owner" : isAdmin ? "/admin/users" : "/", label: "Dashboard", icon: LayoutDashboard, show: !!user },
    { to: "/reminders", label: "Reminders", icon: Bell, show: !!user && isOwner },
    { to: "/facilities", label: "Browse Facilities", icon: Building2, show: true },
    { to: "/my-bookings", label: "My Bookings", icon: CalendarCheck, show: !!user && !isOwner && !isAdmin },
    { to: "/partner", label: "Partner", icon: Handshake, show: !!user && !isOwner && !isAdmin },
    { to: "/admin/partners", label: "Partners", icon: Handshake, show: !!user && isAdmin },
    { to: "/profile", label: "Account", icon: User, show: !!user },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-3">
        {/* Logo — always navigates home, active state on landing */}
        <div className="w-[180px] flex-shrink-0">
          <Link
            to="/"
            aria-label="Courtside — go to home"
          >
            <CourtsideLogo className="group-hover:scale-105 transition-transform text-foreground" />
          </Link>
        </div>

        {/* Desktop nav */}
        <nav
          aria-label="Primary"
          className="hidden md:flex flex-1 items-center justify-center gap-7 font-medium text-[11px] uppercase tracking-[0.2em]"
        >
          {navItems
            .filter((i) => i.show)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `relative py-1 transition-all duration-300 font-black ${
                    isActive
                      ? "text-accent after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-0.5 after:bg-accent after:rounded-full"
                      : "text-foreground/60 hover:text-primary"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center justify-end gap-2 w-[180px] flex-shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col items-end mr-1">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold leading-none mb-1">Signed in as</span>
                <span className="text-sm font-display tracking-tight text-foreground leading-none">
                  {profile?.display_name || user.email?.split("@")[0]}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
                aria-label="Sign out of your account"
                className="hidden md:flex gap-2 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/auth")}
              aria-label="Sign in to your account"
              className="hidden md:inline-flex"
            >
              Sign in
            </Button>
          )}

          {/* Mobile burger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation menu"
                aria-expanded={open}
                aria-controls="mobile-nav"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent id="mobile-nav" side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl tracking-widest text-left">
                  COURTSIDE
                </SheetTitle>
              </SheetHeader>

              <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">
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
                            `flex items-center gap-3 px-3 py-3 rounded-lg text-sm uppercase tracking-wider transition-colors ${
                              isActive
                                ? "bg-accent/15 text-accent border border-accent/30"
                                : "text-foreground/80 hover:bg-muted hover:text-foreground"
                            }`
                          }
                        >
                          <Icon className="size-4" />
                          {item.label}
                        </NavLink>
                      </SheetClose>
                    );
                  })}
              </nav>

              <div className="mt-6 pt-6 border-t border-border">
                {user ? (
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        await signOut();
                        navigate("/");
                      }}
                    >
                      <LogOut className="size-4" /> Sign out
                    </Button>
                  </SheetClose>
                ) : (
                  <SheetClose asChild>
                    <Button className="w-full" onClick={() => navigate("/auth")}>
                      Sign in
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
