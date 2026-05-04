import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FacilityCard } from "@/components/FacilityCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, Filter, Activity } from "lucide-react";
import { Link } from "react-router-dom";

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

const SPORTS = ["All", "Basketball", "Badminton", "Gym", "Soccer", "Tennis"];

export default function Facilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Facilities · CourtConnect";
    supabase.from("facilities").select("*").order("name").then(({ data }) => {
      setFacilities((data as Facility[]) || []);
      setLoading(false);
    });
  }, []);

  const visible = facilities.filter((f) => {
    if (filter !== "All" && f.sport_type !== filter) return false;
    if (search && !`${f.name} ${f.location}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent/30">
      <Navbar />
      
      {/* BACKGROUND DECOR */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-accent/5 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <main className="flex-1 container py-12 max-w-7xl relative z-10">
        {/* BACK NAVIGATION */}
        <div className="mb-12 animate-fade-in">
          <Button 
            asChild 
            variant="ghost" 
            className="text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all group px-0 font-mono text-[10px] tracking-[0.4em] uppercase"
          >
            <Link to="/">
              <ArrowLeft className="size-3 mr-3 group-hover:-translate-x-1 transition-transform" />
              TERMINAL // RETURN
            </Link>
          </Button>
        </div>

        {/* HERO SECTION */}
        <div className="mb-16 animate-fade-up">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-[1px] w-12 bg-accent/30" />
            <span className="text-[11px] uppercase tracking-[0.6em] text-accent font-black">REGISTRY // NODES</span>
            <Activity className="size-3 text-accent animate-pulse" />
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <h1 className="font-display text-7xl md:text-9xl tracking-tighter leading-[0.8] mb-6 uppercase">
                SPORTS <br />
                <span className="text-gradient italic">FACILITIES</span>
              </h1>
              <p className="text-muted-foreground text-xl font-medium border-l-2 border-accent/20 pl-6 py-2">
                Browse and secure your position in the city's premier athletic infrastructure. 
                All nodes are verified and operational.
              </p>
            </div>
            
            <div className="hidden lg:block">
              <div className="glass-card p-6 border-accent/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                  <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">System Status: Optimal</span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                  Total Nodes: {facilities.length} // Online: {facilities.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col gap-8 mb-16 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <div className="absolute inset-0 bg-accent/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
              <Input
                placeholder="QUERY NODE BY NAME, TYPE, OR LOCATION..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-14 h-16 bg-card/40 backdrop-blur-xl border-white/5 focus:border-accent/30 focus:ring-accent/10 rounded-2xl font-mono text-xs tracking-widest placeholder:opacity-30 transition-all uppercase shadow-inner-glow"
              />
            </div>
            
            <div className="flex items-center gap-2 px-4 py-3 bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl">
              <Filter className="size-4 text-accent/60" />
              <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">Filter</span>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {SPORTS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-8 h-14 rounded-full text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap transition-all border flex items-center justify-center ${
                  filter === s
                    ? "bg-accent text-accent-foreground border-accent shadow-glow scale-105"
                    : "bg-card/20 text-muted-foreground border-white/5 hover:border-accent/30 hover:bg-card/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* RESULTS GRID */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[16/11] rounded-[2rem] bg-card/40 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-32 text-center glass-card rounded-[3rem] border-dashed border-white/10">
            <div className="size-16 rounded-full bg-accent/5 flex items-center justify-center mx-auto mb-6">
              <Search className="size-8 text-accent/20" />
            </div>
            <h3 className="font-display text-4xl tracking-tight mb-2">NO NODES FOUND</h3>
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase opacity-60">Adjust your parameters and query again</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {visible.map((f, i) => (
              <div key={f.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                <FacilityCard {...f} />
              </div>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
