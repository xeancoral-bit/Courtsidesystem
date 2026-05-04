import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FacilityCard } from "@/components/FacilityCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft } from "lucide-react";
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
    document.title = "Facilities · Courtside";
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
    <div className="min-h-screen flex flex-col bg-background">
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
              BACK TO PORTAL
            </Link>
          </Button>
        </div>

        <div className="mb-12 animate-fade-up">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] uppercase tracking-[0.5em] text-accent font-black">REGISTRY // NODES</span>
            <div className="size-1.5 rounded-full bg-accent animate-pulse" />
          </div>
          <h1 className="font-display text-6xl md:text-8xl tracking-tighter leading-none mb-4">
            ALL <span className="text-gradient">FACILITIES</span>
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-xl bg-white/5 px-4 py-2 rounded-lg border border-white/5 backdrop-blur-md inline-block">
            Secure your slot in the city's most prestigious sporting nodes.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-12 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-accent/5 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-hover:text-accent transition-colors" />
            <Input
              placeholder="QUERY NODE BY NAME OR COORDINATES..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 bg-card/50 backdrop-blur-md border-border focus:border-accent/50 focus:ring-accent/20 rounded-xl font-mono text-xs tracking-widest placeholder:opacity-30 transition-all"
            />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {SPORTS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-6 h-14 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border flex items-center justify-center ${
                  filter === s
                    ? "bg-accent text-accent-foreground border-accent shadow-glow-sm scale-105"
                    : "bg-card/40 text-muted-foreground border-border hover:border-accent/30 hover:bg-card/60"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading facilities…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No facilities match your filters.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((f) => (
              <FacilityCard key={f.id} {...f} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
