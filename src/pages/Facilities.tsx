import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FacilityCard } from "@/components/FacilityCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import {
  Search, SlidersHorizontal, MapPin, Clock, TrendingUp,
  Building2, X, ChevronDown, LayoutGrid, List,
} from "lucide-react";
import { formatPHP } from "@/lib/format";

interface Facility {
  id: string;
  name: string;
  sport_type: string;
  location: string;
  hourly_price: number;
  image_url: string | null;
  open_hour: number;
  close_hour: number;
  is_archived: boolean;
  owner_id: string | null;
  description: string | null;
}

const SPORTS = ["All", "Basketball", "Badminton", "Gym", "Soccer", "Tennis", "Volleyball"];
const SORT_OPTIONS = [
  { value: "name_asc",    label: "Name A–Z" },
  { value: "price_asc",   label: "Price: Low to High" },
  { value: "price_desc",  label: "Price: High to Low" },
  { value: "hours_desc",  label: "Most Hours Available" },
];

const SPORT_EMOJI: Record<string, string> = {
  basketball: "🏀", badminton: "🏸", soccer: "⚽",
  tennis: "🎾", gym: "🏋️", volleyball: "🏐",
};

export default function Facilities() {
  const { user } = useAuth();
  const { isAdmin, isOwner, loading: rolesLoading } = useRoles();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name_asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMax, setPriceMax] = useState<number | "">("");

  if (!rolesLoading && isAdmin) return <Navigate to="/admin/users" replace />;

  useEffect(() => {
    document.title = "Facilities · Courtside";
    
    let query = supabase.from("facilities").select("*").eq("is_archived", false);
    
    // If owner is logged in, show only their facilities
    if (isOwner && user) {
      query = query.eq("owner_id", user.id);
    }
    
    query.order("name").then(({ data }) => {
      setFacilities((data as unknown as Facility[]) || []);
      setLoading(false);
    });
  }, [isOwner, user]);

  const now = new Date().getHours();
  const openNowCount = facilities.filter(f => now >= f.open_hour && now < f.close_hour).length;
  const sportCounts = SPORTS.slice(1).reduce<Record<string, number>>((acc, s) => {
    acc[s] = facilities.filter(f => f.sport_type.toLowerCase() === s.toLowerCase()).length;
    return acc;
  }, {});

  const visible = facilities
    .filter(f => {
      if (filter !== "All" && f.sport_type.toLowerCase() !== filter.toLowerCase()) return false;
      if (search && !`${f.name} ${f.location}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (priceMax !== "" && Number(f.hourly_price) > Number(priceMax)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "price_asc")  return Number(a.hourly_price) - Number(b.hourly_price);
      if (sort === "price_desc") return Number(b.hourly_price) - Number(a.hourly_price);
      if (sort === "hours_desc") return (b.close_hour - b.open_hour) - (a.close_hour - a.open_hour);
      return a.name.localeCompare(b.name);
    });

  const hasActiveFilters = filter !== "All" || search !== "" || priceMax !== "";

  const clearFilters = () => {
    setFilter("All");
    setSearch("");
    setPriceMax("");
    setSort("name_asc");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero banner */}
      <div className="relative border-b border-border bg-gradient-to-b from-accent/5 to-transparent">
        <div className="container py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-black uppercase tracking-widest mb-4">
                <Building2 className="size-3.5" />
                Butuan City · Sports & Recreation
              </div>
              <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-3">
                All <span className="text-accent">Facilities</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                Discover and book world-class sports venues in Butuan City. Real-time availability, instant booking.
              </p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              {[
                { icon: Building2, label: "Total Venues", value: loading ? "—" : facilities.length.toString() },
                { icon: TrendingUp, label: "Open Now", value: loading ? "—" : openNowCount.toString() },
                { icon: Clock, label: "Sports Types", value: loading ? "—" : Object.keys(sportCounts).filter(k => sportCounts[k] > 0).length.toString() },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-card border border-border rounded-xl p-3 text-center min-w-[90px]">
                  <Icon className="size-4 text-accent mx-auto mb-1" />
                  <div className="text-xl font-black text-foreground">{value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container py-8">
        {/* Search + controls bar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or location…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10 bg-card border-border"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="h-10 pl-3 pr-8 rounded-md border border-border bg-card text-sm font-medium text-foreground appearance-none cursor-pointer hover:border-accent/50 transition-colors"
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              </div>

              {/* Advanced filters toggle */}
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`h-10 px-4 rounded-md border text-sm font-bold flex items-center gap-2 transition-all ${
                  showFilters ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-accent/50"
                }`}
              >
                <SlidersHorizontal className="size-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>

              {/* View mode */}
              <div className="flex border border-border rounded-md overflow-hidden bg-card">
                {(["grid", "list"] as const).map(mode => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className={`h-10 px-3 flex items-center transition-colors ${viewMode === mode ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {mode === "grid" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced filter panel */}
          {showFilters && (
            <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground block mb-1.5">Max Price / hr</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={priceMax}
                    onChange={e => setPriceMax(e.target.value === "" ? "" : Number(e.target.value))}
                    className="pl-7 w-32 h-9 bg-background border-border"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground block mb-1.5">Location</label>
                <div className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-background text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  <span>Butuan City</span>
                </div>
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters}
                  className="h-9 px-4 rounded-md border border-destructive/40 text-destructive text-sm font-bold hover:bg-destructive/10 transition-colors flex items-center gap-1.5">
                  <X className="size-3.5" /> Clear All
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sport filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {SPORTS.map(s => {
            const count = s === "All" ? facilities.length : (sportCounts[s] ?? 0);
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                  active
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-accent/50 hover:text-foreground"
                }`}
              >
                {SPORT_EMOJI[s.toLowerCase()] && <span>{SPORT_EMOJI[s.toLowerCase()]}</span>}
                {s}
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${active ? "bg-white/20" : "bg-muted"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading venues…" : (
                <>
                  Showing <strong className="text-foreground">{visible.length}</strong> of{" "}
                  <strong className="text-foreground">{facilities.length}</strong> venues
                </>
              )}
            </p>
            {hasActiveFilters && (
              <Badge variant="outline" className="text-[10px] font-bold border-accent/40 text-accent">
                Filtered
              </Badge>
            )}
          </div>
        </div>

        {/* Grid / List */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-card border border-border overflow-hidden animate-pulse">
                <div className="aspect-[16/9] bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="size-7 text-muted-foreground" />
            </div>
            <h3 className="font-display text-2xl tracking-wide mb-2">No venues found</h3>
            <p className="text-muted-foreground mb-6 max-w-xs">No facilities match your current filters. Try adjusting your search or sport type.</p>
            <button onClick={clearFilters}
              className="px-5 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-bold hover:opacity-90 transition-opacity">
              Clear Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map(f => <FacilityCard key={f.id} {...f} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map(f => {
              const isOpen = now >= f.open_hour && now < f.close_hour;
              return (
                <a key={f.id} href={`/facilities/${f.id}`}
                  className="group flex items-center gap-5 bg-card border border-border rounded-xl p-4 hover:border-accent/40 hover:shadow-md transition-all">
                  <div className="size-16 rounded-lg bg-muted overflow-hidden shrink-0">
                    <img src={`/sports/${f.sport_type}.jpg`} alt={f.sport_type} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-accent">{f.sport_type}</span>
                      <div className={`flex items-center gap-1 text-[9px] font-black uppercase ${isOpen ? "text-emerald-400" : "text-zinc-500"}`}>
                        <div className={`size-1.5 rounded-full ${isOpen ? "bg-emerald-400" : "bg-zinc-500"}`} />
                        {isOpen ? "Open" : "Closed"}
                      </div>
                    </div>
                    <h3 className="font-display text-lg tracking-wide text-foreground group-hover:text-accent transition-colors truncate">{f.name}</h3>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="size-3" />{f.location}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" />{f.open_hour}:00–{f.close_hour}:00</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Rate</div>
                    <div className="text-lg font-black text-accent">{formatPHP(f.hourly_price)}</div>
                    <div className="text-[10px] text-muted-foreground">per hour</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
