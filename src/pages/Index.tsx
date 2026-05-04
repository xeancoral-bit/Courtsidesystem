import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FacilityCard } from "@/components/FacilityCard";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero.jpg";
import { Calendar, Users, Zap, Shield, ArrowRight, MapPin, Terminal, Cpu, Globe, Activity } from "lucide-react";

interface Facility {
  id: string;
  name: string;
  sport_type: string;
  location: string;
  hourly_price: number;
  image_url: string | null;
  open_hour: number;
  close_hour: number;
}

export default function Index() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "COURTCONNECT // Central Intelligence Hub";
    
    // Redirect if already authenticated
    if (user) {
      redirectUser();
    }

    supabase.from("facilities").select("*").limit(6).then(({ data }) => {
      setFacilities((data as Facility[]) || []);
    });
  }, [user]);

  const redirectUser = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id)
      .maybeSingle();
    
    const userRole = data?.role || "user";
    if (userRole === "admin") navigate("/admin/users");
    else if (userRole === "owner") navigate("/owner");
    else navigate("/customer");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
      <Navbar />

      {/* HERO SECTION - THE VAULT ENTRANCE */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img 
            src={heroImg} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-20 scale-110 blur-[2px]" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
        </div>

        <div className="container relative z-10 px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 mb-8 animate-fade-up">
              <Terminal className="size-3 text-accent" />
              <span className="text-[10px] uppercase tracking-[0.4em] text-accent font-black">SYSTEM_INITIALIZED // NODE_READY</span>
            </div>

            <h1 className="font-display text-7xl md:text-9xl lg:text-[10rem] tracking-tighter leading-[0.8] mb-8 animate-fade-up">
              BOOK THE<br />
              <span className="text-gradient drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]">COURT.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-up leading-relaxed font-light">
              The premier athletic resource registry for Butuan City. High-performance booking infrastructure for basketball, badminton, and specialized training nodes.
            </p>

            <div className="flex flex-wrap justify-center gap-4 animate-fade-up">
              <Button asChild size="lg" className="h-16 px-10 text-xs font-black uppercase tracking-[0.3em] rounded-2xl shadow-glow hover:shadow-glow-lg transition-all group">
                <Link to="/facilities" className="flex items-center">
                  Access Registry <ArrowRight className="size-4 ml-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-16 px-10 text-xs font-black uppercase tracking-[0.3em] rounded-2xl border-white/10 backdrop-blur-xl hover:bg-white/5 transition-all">
                <Link to="/auth">Initialize Node</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Technical HUD Overlay */}
        <div className="absolute bottom-10 left-10 hidden lg:block animate-fade-in delay-500">
          <div className="flex flex-col gap-1 opacity-40 font-mono text-[9px] tracking-widest uppercase">
            <div className="flex items-center gap-2"><div className="size-1 bg-accent" /> LATENCY: 24MS</div>
            <div className="flex items-center gap-2"><div className="size-1 bg-accent" /> BANDWIDTH: OPTIMAL</div>
            <div className="flex items-center gap-2"><div className="size-1 bg-accent" /> UPTIME: 99.9%</div>
          </div>
        </div>
      </section>

      {/* BENTO STATS - NETWORK TELEMETRY */}
      <section className="container py-24 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-accent/50 to-transparent" />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Globe, label: "Registry Nodes", value: "30+" },
            { icon: Activity, label: "Relay Operations", value: "1.2K" },
            { icon: Users, label: "Verified Entities", value: "3.5K" },
            { icon: Cpu, label: "Execution Speed", value: "<30s" },
          ].map((s, i) => (
            <div key={i} className="glass-card rounded-3xl p-8 border-white/5 hover:border-accent/20 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <s.icon className="size-5 text-accent/60 mb-4 group-hover:text-accent transition-colors" />
              <div className="font-display text-5xl tracking-tighter text-white mb-2">{s.value}</div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-black">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED REGISTRY - LIVE NODE VIEW */}
      <section className="container py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="px-2 py-0.5 rounded bg-accent/20 border border-accent/30 text-[9px] font-black text-accent tracking-tighter uppercase">HIGH_PRIORITY</div>
              <div className="h-px w-12 bg-accent/30" />
            </div>
            <h2 className="font-display text-6xl md:text-8xl tracking-tighter uppercase italic leading-none">
              Featured <span className="text-gradient">Nodes</span>
            </h2>
          </div>
          <Button asChild variant="ghost" className="h-auto p-0 font-mono text-[10px] tracking-[0.4em] uppercase hover:bg-transparent group">
            <Link to="/facilities" className="flex items-center">
              Browse Complete Registry <ArrowRight className="size-4 ml-3 group-hover:translate-x-2 transition-transform" />
            </Link>
          </Button>
        </div>

        {facilities.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {facilities.slice(0, 3).map((facility, idx) => (
              <FacilityCard key={facility.id} {...facility} className={idx === 0 ? "md:col-span-2 md:row-span-2" : ""} />
            ))}
          </div>
        )}
      </section>

      {/* HOW IT WORKS - CORE PROTOCOL */}
      <section className="container py-32 bg-accent/5 rounded-[4rem] my-24 border border-accent/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-24 opacity-5 pointer-events-none">
          <Cpu className="size-96 text-accent" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center mb-20">
          <div className="inline-block px-3 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-black text-muted-foreground tracking-widest uppercase mb-6">OPERATIONAL_GUIDE</div>
          <h2 className="font-display text-5xl md:text-8xl tracking-tighter uppercase italic mb-8">The Protocol.</h2>
          <p className="text-lg text-muted-foreground font-light max-w-xl mx-auto">Three automated sequences to secure your facility resource.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto px-6">
          {[
            { n: "01", t: "NODE_DISCOVERY", d: "Scan the registry for available athletic nodes matching your parameters." },
            { n: "02", t: "SLOT_ALLOCATION", d: "Real-time synchronization ensures immediate block reservations." },
            { n: "03", t: "SESS_VERIFICATION", d: "Instant verification sent to your terminal. Zero latency booking." },
          ].map((s) => (
            <div key={s.n} className="relative group">
              <div className="font-display text-9xl text-white/5 absolute -top-16 -left-8 pointer-events-none transition-colors group-hover:text-accent/10">{s.n}</div>
              <div className="relative pt-8">
                <h3 className="font-display text-3xl tracking-tighter mb-4 uppercase">{s.t}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-light">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* OWNER CTA - NODE EXPANSION */}
      <section className="container py-24">
        <div className="glass-card border-white/10 rounded-[3.5rem] p-12 md:p-24 relative overflow-hidden group shadow-glow-sm">
          <div className="absolute -top-40 -right-40 size-[30rem] rounded-full bg-accent/10 blur-[120px] group-hover:bg-accent/20 transition-all duration-1000" />
          
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-3 px-4 py-1 rounded-full bg-accent/10 border border-accent/20 mb-8">
              <Shield className="size-3 text-accent" />
              <span className="text-[10px] uppercase tracking-[0.4em] text-accent font-black">PARTNER_INTEGRATION</span>
            </div>
            
            <h2 className="font-display text-5xl md:text-8xl tracking-tighter mb-8 uppercase italic leading-[0.8]">
              Expand the <br />
              <span className="text-gradient">Network.</span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed font-light">
              Integrate your facility into the COURTCONNECT infrastructure. Scale your reach, automate your terminal, and optimize node occupancy.
            </p>
            
            <Button asChild size="lg" className="h-16 px-12 rounded-2xl font-black tracking-[0.3em] uppercase shadow-glow hover:shadow-elevated transition-all group/btn">
              <Link to="/auth" className="flex items-center">
                Initialize Integration <ArrowRight className="size-5 ml-3 group-hover/btn:translate-x-2 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
