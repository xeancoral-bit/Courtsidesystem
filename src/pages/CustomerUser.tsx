import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Settings, 
  Calendar, 
  MapPin, 
  Zap, 
  Star, 
  ArrowRight, 
  CheckCircle2, 
  Bell,
  Search,
  CreditCard,
  History,
  Activity,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Shield,
  ArrowLeft,
  Lock,
  ZapOff
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { formatPHP } from "@/lib/format";
import courtsideLogo from "@/assets/courtside-logo.png";

export default function CustomerUser() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, spent: 0, upcoming: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Player Hub · Courtside";
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(prof);

      // 2. Fetch Bookings for Stats & Recent Activity
      const { data: bks, error: bksErr } = await supabase
        .from("bookings")
        .select(`
          *,
          facilities (
            name,
            sport_type,
            location
          )
        `)
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false });

      if (bksErr) throw bksErr;

      const bookings = bks || [];
      const now = new Date();
      
      const total = bookings.length;
      const spent = bookings
        .filter(b => b.status === "paid" || b.status === "completed")
        .reduce((sum, b) => sum + Number(b.total_price), 0);
      
      const upcoming = bookings.filter(b => {
        const d = parseISO(b.booking_date);
        return d >= new Date(now.setHours(0,0,0,0)) && b.status !== "cancelled";
      }).length;

      setStats({ total, spent, upcoming });
      setRecentBookings(bookings.slice(0, 5));

    } catch (error: any) {
      console.error("Dashboard data error:", error.message);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "nearby":
        navigate("/facilities?filter=nearby");
        break;
      case "instant":
        navigate("/facilities?filter=instant");
        break;
      case "favorites":
        toast.info("Favorites feature coming soon!", {
          description: "We're currently indexing your top venues for quick access.",
        });
        break;
      case "payments":
        toast.info("Payment methods coming soon!", {
          description: "Secure vault for your payment methods is being finalized.",
        });
        break;
      default:
        break;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container py-24 flex flex-col items-center justify-center">
          <div className="relative mb-8">
            <div className="size-20 rounded-2xl bg-card border border-border flex items-center justify-center animate-pulse shadow-glow">
              <img src={courtsideLogo} alt="Logo" className="size-12 object-contain grayscale opacity-50" />
            </div>
            <div className="absolute inset-0 size-20 border-2 border-accent/20 rounded-2xl animate-ping" />
          </div>
          <p className="font-display text-3xl tracking-[0.3em] text-foreground animate-pulse">SYNCHRONIZING HUB</p>
          <p className="mt-4 text-muted-foreground font-mono text-sm tracking-widest opacity-60">RETRIEVING PLAYER ARCHIVES...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent/30">
      <Navbar />
      
      <main className="flex-1 container py-8 max-w-7xl">
        {/* BACK BUTTON */}
        <div className="mb-8 animate-fade-up">
          <Button
            asChild
            variant="ghost"
            className="text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all group px-0 font-mono text-[10px] tracking-[0.3em] uppercase"
          >
            <Link to="/">
              <ArrowLeft className="size-3 mr-2 group-hover:-translate-x-1 transition-transform" />
              BACK TO CENTRAL HUB
            </Link>
          </Button>
        </div>


        {/* WELCOME HERO SECTION */}
        <section className="mb-20 animate-fade-up">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 pb-10 border-b border-border/50 relative">
            <div className="absolute -bottom-px left-0 w-32 h-px bg-gradient-to-r from-accent to-transparent" />
            <div className="flex items-center gap-8">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-primary to-accent rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                <div className="relative size-24 md:size-28 rounded-[1.5rem] bg-card/40 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center shadow-glow overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                  <img src={courtsideLogo} alt="Courtside" className="size-12 md:size-14 object-contain brightness-0 invert mb-1" />
                  <span className="text-[8px] font-black tracking-[0.3em] text-white/40">EST. 2024</span>
                </div>
                <div className="absolute -bottom-2 -right-2 size-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center border-4 border-background shadow-lg rotate-3">
                  <Shield className="size-5" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] md:text-xs uppercase tracking-[0.5em] text-accent font-black">PLAYER IDENTIFIED</span>
                    <div className="size-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_hsl(var(--accent))]" />
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] px-3 py-0.5 h-6 font-mono tracking-widest backdrop-blur-sm">
                    VAULT_ACCESS_LEVEL:01
                  </Badge>
                </div>
                <h1 className="font-display text-6xl md:text-8xl tracking-tighter leading-[0.8] mb-2">
                  <span className="text-white">HELLO,</span> <br />
                  <span className="text-gradient drop-shadow-2xl">{profile?.display_name?.split(' ')[0].toUpperCase() || "ATHLETE"}</span>
                </h1>
                <div className="flex items-center gap-6">
                  <p className="text-muted-foreground font-medium flex items-center gap-2.5 bg-white/5 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
                    <Activity className="size-4 text-accent animate-pulse" /> 
                    <span className="text-sm">{stats.upcoming > 0 ? `Active Sessions: ${stats.upcoming}` : "Waiting for next session"}</span>
                  </p>
                  <div className="hidden md:flex items-center gap-2 text-[10px] font-black tracking-widest text-white/30 uppercase">
                    <Lock className="size-3" /> Secure Node 12.0.4
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button asChild variant="outline" className="h-12 px-6 rounded-xl border-border bg-card/50 backdrop-blur-sm hover:bg-card hover:border-accent/50 transition-all group">
                <Link to="/reminders">
                  <Settings className="size-4 mr-2 group-hover:rotate-90 transition-transform duration-500" />
                  SETTINGS
                </Link>
              </Button>
              <Button asChild className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-sm font-black tracking-widest uppercase">
                <Link to="/facilities">
                  BOOK NOW <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card className="bg-card-gradient border-border shadow-card hover:shadow-elevated transition-all group overflow-hidden relative border-l-4 border-l-accent h-full group/card">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-all translate-x-4 -translate-y-4 group-hover:scale-110">
                  <MapPin className="size-32 text-accent" />
                </div>
                <CardHeader className="relative z-10">
                  <div className="size-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform shadow-glow-sm">
                    <Search className="size-6" />
                  </div>
                  <CardTitle className="text-3xl tracking-tight mb-2">DISCOVER COURTS</CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground/80">Explore premium basketball, tennis, and badminton facilities across the city with real-time analytics.</CardDescription>
                </CardHeader>
                <CardContent className="mt-4 relative z-10">
                  <Button asChild variant="link" className="text-accent p-0 font-black tracking-[0.2em] uppercase hover:no-underline group/btn">
                    <Link to="/facilities" className="flex items-center gap-2">
                      EXPLORE GRID <ChevronRight className="size-4 group-hover/btn:translate-x-2 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
                <Card className="bg-card-gradient border-border shadow-card hover:shadow-elevated transition-all group overflow-hidden relative border-l-4 border-l-primary group/card">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-all translate-x-4 -translate-y-4 group-hover:scale-110">
                    <Calendar className="size-32 text-primary" />
                  </div>
                  <CardHeader className="relative z-10">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform shadow-glow-sm">
                      <History className="size-6" />
                    </div>
                    <CardTitle className="text-3xl tracking-tight mb-2">YOUR REGISTRY</CardTitle>
                    <CardDescription className="text-muted-foreground/80">Review your past triumphs and upcoming court appointments in the secure ledger.</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-4 relative z-10">
                    <Button asChild variant="link" className="text-primary p-0 font-black tracking-[0.2em] uppercase hover:no-underline group/btn">
                      <Link to="/my-bookings" className="flex items-center gap-2">
                        VIEW LEDGER <ChevronRight className="size-4 group-hover/btn:translate-x-2 transition-transform" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-card-gradient border-border shadow-card hover:shadow-elevated transition-all group overflow-hidden relative border-l-4 border-l-muted group/card">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-all translate-x-4 -translate-y-4 group-hover:scale-110">
                    <TrendingUp className="size-32 text-muted-foreground" />
                  </div>
                  <CardHeader className="relative z-10">
                    <div className="size-12 rounded-xl bg-muted/20 flex items-center justify-center text-muted-foreground mb-6 group-hover:scale-110 transition-transform shadow-glow-sm">
                      <Activity className="size-6" />
                    </div>
                    <CardTitle className="text-3xl tracking-tight mb-2">PLAYER STATS</CardTitle>
                    <CardDescription className="text-muted-foreground/80">Track your frequency and court spending with high-fidelity performance metrics.</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase text-muted-foreground tracking-[0.2em] font-black">TOTAL_EXPENDED</p>
                        <p className="font-mono text-2xl text-accent font-bold tracking-tighter">{formatPHP(stats.spent)}</p>
                      </div>
                      <Badge variant="outline" className="h-9 border-white/10 bg-white/5 backdrop-blur-md px-4 font-mono text-[10px] tracking-widest">TIER_BRONZE</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* MAIN CONTENT AREA (Left 8 cols) */}
          <div className="lg:col-span-8 space-y-12 animate-fade-up" style={{ animationDelay: "100ms" }}>
            
            {/* QUICK ACTIONS GRID */}
            <section>
               <div className="flex items-center gap-4 mb-10">
                <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shadow-glow-sm">
                  <Zap className="size-5" />
                </div>
                <h2 className="font-display text-5xl tracking-tighter">QUICK ACTIONS</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <button 
                  onClick={() => handleQuickAction("nearby")}
                  className="flex items-center gap-5 p-6 rounded-2xl bg-card border border-border hover:border-accent/40 hover:bg-accent/5 hover:shadow-glow-sm transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -translate-y-12 translate-x-12 blur-3xl group-hover:bg-accent/10 transition-all" />
                  <div className="size-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform relative z-10">
                    <MapPin className="size-7" />
                  </div>
                  <div className="relative z-10">
                    <div className="font-bold text-lg tracking-tight group-hover:text-accent transition-colors">Nearby Facilities</div>
                    <div className="text-sm text-muted-foreground mt-0.5">Find courts within your radius</div>
                  </div>
                </button>
                
                <button 
                  onClick={() => handleQuickAction("instant")}
                  className="flex items-center gap-5 p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 hover:shadow-glow-sm transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-12 translate-x-12 blur-3xl group-hover:bg-primary/10 transition-all" />
                  <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform relative z-10">
                    <Zap className="size-7" />
                  </div>
                  <div className="relative z-10">
                    <div className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">Instant Booking</div>
                    <div className="text-sm text-muted-foreground mt-0.5">Slots available in next 2 hours</div>
                  </div>
                </button>

                <button 
                  onClick={() => handleQuickAction("favorites")}
                  className="flex items-center gap-5 p-6 rounded-2xl bg-card border border-border hover:border-accent/40 hover:bg-accent/5 hover:shadow-glow-sm transition-all text-left group relative overflow-hidden"
                >
                  <div className="size-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform relative z-10">
                    <Star className="size-7" />
                  </div>
                  <div className="relative z-10">
                    <div className="font-bold text-lg tracking-tight">Favorite Venues</div>
                    <div className="text-sm text-muted-foreground mt-0.5">One-tap access to top spots</div>
                  </div>
                </button>

                <button 
                  onClick={() => handleQuickAction("payments")}
                  className="flex items-center gap-5 p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 hover:shadow-glow-sm transition-all text-left group relative overflow-hidden"
                >
                  <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform relative z-10">
                    <CreditCard className="size-7" />
                  </div>
                  <div className="relative z-10">
                    <div className="font-bold text-lg tracking-tight">Digital Vault</div>
                    <div className="text-sm text-muted-foreground mt-0.5">Manage payments & invoices</div>
                  </div>
                </button>
              </div>
            </section>

            {/* RECENT ACTIVITY SECTION */}
            <section>               <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-glow-sm">
                    <History className="size-5" />
                  </div>
                  <h2 className="font-display text-5xl tracking-tighter uppercase">Recent Activity</h2>
                </div>
                {recentBookings.length > 0 && (
                  <Button variant="ghost" asChild className="text-accent hover:text-accent hover:bg-accent/10 rounded-full px-6 font-black tracking-widest text-[10px]">
                    <Link to="/my-bookings" className="flex items-center gap-2">
                      VIEW FULL ARCHIVE <ExternalLink className="size-3" />
                    </Link>
                  </Button>
                )}
              </div>

              
              {recentBookings.length === 0 ? (
                <div className="bg-card-gradient border border-border border-dashed rounded-3xl p-16 text-center flex flex-col items-center justify-center min-h-[300px] empty-court">
                  <div className="size-24 rounded-full bg-muted/10 border border-border/50 flex items-center justify-center mb-6 shadow-inner">
                    <CheckCircle2 className="size-10 text-muted-foreground/30" />
                  </div>
                  <h3 className="font-display text-3xl tracking-widest mb-3 opacity-80 uppercase">The Floor is Empty</h3>
                  <p className="text-muted-foreground max-w-sm mb-10 leading-relaxed">
                    Your history is a clean slate. Break the silence and secure your first court session today.
                  </p>
                  <Button asChild className="rounded-full px-10 h-14 font-black tracking-[0.2em] shadow-glow hover:shadow-elevated transition-all">
                    <Link to="/facilities">EXPLORE FACILITIES</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {recentBookings.map((b) => (
                    <div key={b.id} className="bg-card-gradient border border-border rounded-2xl p-5 flex items-center justify-between group hover:border-accent/40 hover:bg-card hover:shadow-glow-sm transition-all relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 w-1 bg-accent/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-5">
                        <div className="size-14 rounded-xl bg-background border border-border flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300">
                          <Calendar className="size-6" />
                        </div>
                        <div>
                          <div className="font-bold text-lg tracking-tight group-hover:text-foreground transition-colors">{b.facilities?.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1 font-medium">
                            <span className="capitalize px-2 py-0.5 rounded bg-muted/50 border border-border text-[10px] tracking-widest font-black">{b.facilities?.sport_type}</span>
                            <span className="opacity-40">•</span>
                            <span className="flex items-center gap-1"><Clock className="size-3" /> {format(parseISO(b.booking_date), "MMMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="font-mono text-lg text-accent font-bold">{formatPHP(b.total_price)}</div>
                        <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                          b.status === 'paid' ? 'bg-accent/10 text-accent border-accent/30' : 
                          b.status === 'cancelled' ? 'bg-destructive/10 text-destructive border-destructive/30' : 
                          'bg-muted/10 text-muted-foreground border-border'
                        }`}>
                          {b.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* SIDEBAR AREA (Right 4 cols) */}
          <aside className="lg:col-span-4 space-y-10 animate-fade-up" style={{ animationDelay: "200ms" }}>
            
            {/* PLAYER CARD */}
            <section>
              <h2 className="font-display text-3xl tracking-tight mb-8">IDENTIFICATION</h2>
              <Card className="bg-card-gradient border-border shadow-card overflow-hidden rounded-3xl relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="h-32 bg-gradient-to-r from-primary/40 to-accent/40 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-card" />
                  <div className="absolute -top-12 -right-12 size-40 bg-white/5 rounded-full blur-3xl animate-pulse" />
                </div>
                <CardContent className="pt-0 -mt-14 relative z-10 px-8 pb-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="size-28 rounded-3xl border-4 border-background bg-card flex items-center justify-center shadow-2xl mb-5 ring-2 ring-accent/20 group-hover:scale-105 transition-transform duration-500 overflow-hidden relative">
                       <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-50" />
                       <User className="size-14 text-accent relative z-10" />
                    </div>
                    <h3 className="font-display text-3xl tracking-widest mb-1">{profile?.display_name || "RECRUIT"}</h3>
                    <p className="text-xs text-muted-foreground mb-8 font-mono tracking-tighter opacity-70">{user?.email}</p>
                    
                    <div className="grid grid-cols-2 w-full gap-4 mb-10">
                      <div className="p-4 rounded-2xl bg-background/50 border border-border/50 group/stat">
                        <div className="text-3xl font-display text-primary group-hover/stat:scale-110 transition-transform">{stats.upcoming}</div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black mt-1">UPCOMING</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-background/50 border border-border/50 group/stat">
                        <div className="text-3xl font-display text-accent group-hover/stat:scale-110 transition-transform">{stats.total}</div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black mt-1">LIFETIME</div>
                      </div>
                    </div>
                    
                    <div className="w-full space-y-1 px-1">
                      <div className="flex justify-between items-center py-4 border-b border-border/30">
                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Clock className="size-3 text-accent" /> MEMBER_SINCE</span>
                        <span className="font-bold text-sm">{profile?.created_at ? format(parseISO(profile.created_at), "MMM yyyy") : "N/A"}</span>
                      </div>
                      <div className="flex justify-between items-center py-4 border-b border-border/30">
                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><CreditCard className="size-3 text-accent" /> TOTAL_EXPENDED</span>
                        <span className="font-mono font-bold text-sm text-accent">{formatPHP(stats.spent)}</span>
                      </div>
                      <div className="flex justify-between items-center py-4">
                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Shield className="size-3 text-accent" /> PLAYER_TIER</span>
                        <Badge className="bg-accent text-accent-foreground text-[10px] font-black tracking-widest px-3 py-0.5 rounded-full shadow-glow-sm">BRONZE_I</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* NOTIFICATIONS / UPDATES */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-display text-3xl tracking-tight">TRANSMISSIONS</h2>
                <div className="size-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-[11px] font-black shadow-glow-sm">1</div>
              </div>
              <div className="space-y-4">
                {[
                  { title: "Network Established", time: "SYSTEM_CORE", desc: "Your player profile is now synchronized with the Butuan City facility network.", icon: Bell },
                ].map((n, i) => (
                  <div key={i} className="flex gap-5 p-5 rounded-2xl bg-card border border-border relative overflow-hidden group hover:border-accent/40 hover:bg-card/80 transition-all">
                    <div className="absolute top-0 left-0 w-1 h-full bg-accent shadow-[0_0_15px_hsl(var(--accent))]" />
                    <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                      <n.icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-black tracking-tight group-hover:text-accent transition-colors uppercase">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-medium">{n.desc}</div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[9px] font-black tracking-[0.2em] text-accent/80 uppercase">{n.time}</span>
                        <span className="text-[10px] text-muted-foreground/40 font-mono italic flex items-center gap-1">
                          <Activity className="size-3" /> ONLINE
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
