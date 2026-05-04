import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatPHP } from "@/lib/format";
import { LayoutDashboard, Plus, Pencil, TrendingUp, CalendarCheck2, Wallet, Download, StickyNote, Save, Loader2, ArrowLeft, Shield, Activity, Users, Clock } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { toCSV, downloadCSV } from "@/lib/csv";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface Facility {
  id: string; name: string; sport_type: string; location: string;
  description: string | null; hourly_price: number; open_hour: number; close_hour: number;
  image_url: string | null; owner_id: string | null;
}

interface BookingRow {
  id: string; booking_date: string; start_hour: number; end_hour: number;
  total_price: number; status: string; facility_id: string; owner_notes: string | null;
}

const SPORTS = ["basketball", "badminton", "soccer", "tennis", "gym", "volleyball"];
const emptyForm: Partial<Facility> = {
  name: "", sport_type: "basketball", location: "Butuan City",
  description: "", hourly_price: 250, open_hour: 8, close_hour: 22, image_url: null,
};

export default function OwnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isOwner, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Facility> | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportFrom, setExportFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [exportTo, setExportTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [includeNotesInCSV, setIncludeNotesInCSV] = useState(true);

  useEffect(() => { document.title = "Owner Dashboard · Courtside"; }, []);

  useEffect(() => {
    if (authLoading || rolesLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (!isOwner) { setLoading(false); return; }
    refresh();
  }, [user, authLoading, rolesLoading, isOwner, navigate]);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { data: facs } = await supabase.from("facilities").select("*").eq("owner_id", user.id).order("name");
    const list = (facs as Facility[]) || [];
    setFacilities(list);
    if (list.length > 0) {
      const ids = list.map((f) => f.id);
      const { data: bks } = await supabase
        .from("bookings")
        .select("id,booking_date,start_hour,end_hour,total_price,status,facility_id,owner_notes")
        .in("facility_id", ids)
        .order("booking_date", { ascending: false });
      setBookings((bks as BookingRow[]) || []);
    } else {
      setBookings([]);
    }
    setLoading(false);
  };

  const stats = useMemo(() => {
    const paid = bookings.filter((b) => b.status === "paid" || b.status === "completed");
    const revenue = paid.reduce((s, b) => s + Number(b.total_price), 0);
    const upcoming = bookings.filter((b) => b.status !== "cancelled" && parseISO(b.booking_date) >= new Date(new Date().setHours(0, 0, 0, 0))).length;
    const totalHours = paid.reduce((s, b) => s + (b.end_hour - b.start_hour), 0);
    const occupancy = facilities.length > 0
      ? Math.min(100, Math.round((totalHours / (facilities.reduce((s, f) => s + (f.close_hour - f.open_hour), 0) * 30)) * 100))
      : 0;
    return { revenue, upcoming, totalBookings: bookings.length, occupancy };
  }, [bookings, facilities]);

  const chartData = useMemo(() => {
    const days: { date: string; bookings: number; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const todays = bookings.filter((b) => b.booking_date === d && b.status !== "cancelled");
      days.push({
        date: format(subDays(new Date(), i), "MMM d"),
        bookings: todays.length,
        revenue: todays.reduce((s, b) => s + Number(b.total_price), 0),
      });
    }
    return days;
  }, [bookings]);

  const sportBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    bookings.forEach((b) => {
      const f = facilities.find((x) => x.id === b.facility_id);
      if (!f) return;
      m.set(f.sport_type, (m.get(f.sport_type) || 0) + 1);
    });
    return Array.from(m.entries()).map(([sport, count]) => ({ sport, count }));
  }, [bookings, facilities]);

  const saveFacility = async () => {
    if (!user || !editing) return;
    if (!editing.name?.trim()) { toast.error("Name required"); return; }
    if ((editing.close_hour ?? 0) <= (editing.open_hour ?? 0)) { toast.error("Close hour must be after open hour"); return; }

    setSaving(true);
    const payload = {
      name: editing.name!.trim(),
      sport_type: editing.sport_type!,
      location: editing.location!,
      description: editing.description ?? null,
      hourly_price: Number(editing.hourly_price) || 0,
      open_hour: Number(editing.open_hour) || 8,
      close_hour: Number(editing.close_hour) || 22,
      image_url: editing.image_url ?? null,
      owner_id: user.id,
    };

    const { error } = editing.id
      ? await supabase.from("facilities").update(payload).eq("id", editing.id)
      : await supabase.from("facilities").insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing.id ? "Facility updated" : "Facility created");
    setEditing(null);
    refresh();
  };

  const exportBookingsCSV = () => {
    const from = parseISO(exportFrom);
    const to = parseISO(exportTo);
    if (to < from) { toast.error("End date must be after start date"); return; }
    const filtered = bookings.filter((b) => {
      const d = parseISO(b.booking_date);
      return d >= from && d <= to;
    });
    const rows = filtered.map((b) => {
      const f = facilities.find((x) => x.id === b.facility_id);
      const base: Record<string, any> = {
        booking_id: b.id,
        facility_name: f?.name || "",
        sport_type: f?.sport_type || "",
        booking_status: b.status,
        date: b.booking_date,
        start_hour: b.start_hour,
        end_hour: b.end_hour,
        hours: b.end_hour - b.start_hour,
        amount_php: Number(b.total_price).toFixed(2),
      };
      if (includeNotesInCSV) {
        base.owner_notes = (b.owner_notes || "").replace(/\s+/g, " ").trim();
      }
      return base;
    });
    downloadCSV(`bookings_${exportFrom}_to_${exportTo}.csv`, toCSV(rows));
    toast.success(`Exported ${rows.length} booking${rows.length === 1 ? "" : "s"}`);
  };

  const exportRevenueCSV = () => {
    const from = parseISO(exportFrom);
    const to = parseISO(exportTo);
    if (to < from) { toast.error("End date must be after start date"); return; }
    const filtered = bookings.filter((b) => {
      const d = parseISO(b.booking_date);
      return d >= from && d <= to;
    });
    const buckets = new Map<string, { date: string; facility_name: string; sport_type: string; booking_status: string; bookings: number; revenue: number; notes: Set<string> }>();
    filtered.forEach((b) => {
      const f = facilities.find((x) => x.id === b.facility_id);
      const key = `${b.booking_date}|${b.facility_id}|${b.status}`;
      const cur = buckets.get(key) || {
        date: b.booking_date,
        facility_name: f?.name || "",
        sport_type: f?.sport_type || "",
        booking_status: b.status,
        bookings: 0,
        revenue: 0,
        notes: new Set<string>(),
      };
      cur.bookings += 1;
      if (b.status === "paid" || b.status === "completed") cur.revenue += Number(b.total_price);
      const note = (b.owner_notes || "").replace(/\s+/g, " ").trim();
      if (note) cur.notes.add(note);
      buckets.set(key, cur);
    });
    const rows = Array.from(buckets.values())
      .sort((a, b) => a.date.localeCompare(b.date) || a.facility_name.localeCompare(b.facility_name))
      .map((r) => ({
        date: r.date,
        facility_name: r.facility_name,
        sport_type: r.sport_type,
        booking_status: r.booking_status,
        bookings: r.bookings,
        revenue_php: r.revenue.toFixed(2),
        owner_notes: Array.from(r.notes).join(" | "),
      }));
    downloadCSV(`revenue_${exportFrom}_to_${exportTo}.csv`, toCSV(rows));
    toast.success(`Exported ${rows.length} revenue row${rows.length === 1 ? "" : "s"}`);
  };

  if (loading || authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar /><main className="flex-1 container py-20 text-center text-muted-foreground">Loading dashboard…</main><Footer />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-20 max-w-2xl text-center">
          <LayoutDashboard className="size-12 text-accent mx-auto mb-4" />
          <h1 className="font-display text-4xl tracking-wider mb-3">Owner access required</h1>
          <p className="text-muted-foreground mb-6">
            Your account isn't a registered facility owner yet. Owners are approved by an admin — once promoted, this dashboard unlocks instantly.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <a href="http://localhost:8080/">
              <ArrowLeft className="size-4 mr-2" />
              Back to Portal
            </a>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent/30">
      <Navbar />
      <main className="flex-1 container py-12 max-w-7xl">
        <div className="mb-8 animate-fade-up">
          <Button
            asChild
            variant="ghost"
            className="text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all group px-0 font-mono text-[10px] tracking-[0.3em] uppercase"
          >
            <a href="http://localhost:8080/">
              <ArrowLeft className="size-3 mr-2 group-hover:-translate-x-1 transition-transform" />
              BACK TO PORTAL
            </a>
          </Button>
        </div>

        <div className="flex items-end justify-between flex-wrap gap-8 mb-12 animate-fade-up">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-accent/30 text-accent font-mono text-[10px] tracking-[0.2em] px-3 py-1 bg-accent/5">
                OWNER // AUTHORITY_LEVEL_02
              </Badge>
              <div className="size-2 rounded-full bg-accent animate-pulse shadow-glow-sm" />
            </div>
            <h1 className="font-display text-6xl md:text-8xl tracking-tighter leading-none">
              OWNER <span className="text-gradient">DASHBOARD</span>
            </h1>
            <p className="text-muted-foreground text-lg font-medium max-w-xl bg-white/5 px-4 py-2 rounded-lg border border-white/5 backdrop-blur-md">
              Oversee your sporting nodes, monitor revenue flows, and manage bookings across Butuan City.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => setEditing({ ...emptyForm })}
            className="h-16 px-8 rounded-2xl bg-accent text-accent-foreground font-black tracking-widest uppercase text-xs shadow-glow hover:shadow-glow-lg transition-all hover:-translate-y-1 group"
          >
            <Plus className="size-5 mr-2 group-hover:rotate-90 transition-transform" /> New facility node
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <StatCard icon={Wallet} label="Net Revenue" value={formatPHP(stats.revenue)} trend="+12.5% vs last month" />
          <StatCard icon={CalendarCheck2} label="Total Cycles" value={stats.totalBookings.toString()} trend="Active throughput" />
          <StatCard icon={TrendingUp} label="Upcoming Nodes" value={stats.upcoming.toString()} trend="Next 24h schedule" />
          <StatCard icon={LayoutDashboard} label="Node Occupancy" value={`${stats.occupancy}%`} trend="Optimization rate" />
        </div>

        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-card mb-12 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center gap-4 mb-8">
            <div className="size-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Download className="size-6" />
            </div>
            <div>
              <h3 className="font-display text-3xl tracking-tighter">DATA EXTRACTION</h3>
              <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">Export ledger in CSV format</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-6 items-end">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] tracking-widest uppercase ml-1">TEMPORAL_START</Label>
              <Input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className="h-14 bg-black/20 border-white/10 rounded-xl font-mono text-xs tracking-wider focus:border-accent/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] tracking-widest uppercase ml-1">TEMPORAL_END</Label>
              <Input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className="h-14 bg-black/20 border-white/10 rounded-xl font-mono text-xs tracking-wider focus:border-accent/50"
              />
            </div>
            <Button variant="outline" onClick={exportBookingsCSV} className="h-14 px-8 rounded-xl border-white/10 hover:bg-white/5 font-black tracking-widest text-[10px] uppercase transition-all">
              <Download className="size-4 mr-2" /> Bookings Ledger
            </Button>
            <Button onClick={exportRevenueCSV} className="h-14 px-8 rounded-xl bg-accent text-accent-foreground font-black tracking-widest text-[10px] uppercase shadow-glow hover:shadow-glow-lg transition-all">
              <Download className="size-4 mr-2" /> Revenue Report
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-between flex-wrap gap-4 pt-6 border-t border-white/5">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <Checkbox
                  checked={includeNotesInCSV}
                  onCheckedChange={(v) => setIncludeNotesInCSV(v === true)}
                  className="size-5 rounded-lg border-white/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent transition-all"
                />
              </div>
              <span className="text-[11px] font-mono tracking-widest uppercase group-hover:text-foreground transition-colors">
                Include <span className="text-accent font-bold">Owner Metadata</span> (Notes)
              </span>
            </label>
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground/60 uppercase">
              Aggregation level: Daily // Status: Validated
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="lg:col-span-2 bg-card/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-card">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Activity className="size-5 text-accent" />
                <h3 className="font-display text-3xl tracking-tighter">THROUGHPUT ANALYSIS</h3>
              </div>
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase bg-white/5 px-3 py-1 rounded-full border border-white/5">
                LAST 14 CYCLES
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    fontFamily="JetBrains Mono, monospace"
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    fontFamily="JetBrains Mono, monospace"
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{
                      background: "rgba(0,0,0,0.8)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "1rem",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
                    }}
                    itemStyle={{ color: "hsl(var(--accent))", fontWeight: "bold", fontSize: "12px", fontFamily: "JetBrains Mono" }}
                    labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: "4px", fontSize: "10px", fontFamily: "JetBrains Mono" }}
                  />
                  <Bar dataKey="bookings" radius={[4, 4, 0, 0]} barSize={24}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-card flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <Users className="size-5 text-accent" />
              <h3 className="font-display text-3xl tracking-tighter">DISTRIBUTION</h3>
            </div>
            {sportBreakdown.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <Shield className="size-12 mb-4" />
                <p className="text-[10px] font-mono tracking-widest uppercase">No nodal data available</p>
              </div>
            ) : (
              <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {sportBreakdown.map((s) => {
                  const max = Math.max(...sportBreakdown.map((x) => x.count));
                  return (
                    <div key={s.sport} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground group-hover:text-accent transition-colors">{s.sport}</span>
                        <span className="font-display text-2xl tracking-tighter text-white">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent shadow-glow-sm transition-all duration-1000"
                          style={{ width: `${(s.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mb-12 animate-fade-up" style={{ animationDelay: "400ms" }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="size-1.5 rounded-full bg-accent shadow-glow-sm" />
            <h2 className="font-display text-4xl tracking-tighter">NODE REGISTRY</h2>
          </div>

          {facilities.length === 0 ? (
            <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-20 text-center">
              <div className="size-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <Shield className="size-10 text-muted-foreground/30" />
              </div>
              <h3 className="font-display text-3xl mb-2 opacity-60">NO NODES REGISTERED</h3>
              <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground/60 mb-8">Establish your first facility to begin monitoring throughput.</p>
              <Button onClick={() => setEditing({ ...emptyForm })} className="h-14 px-8 rounded-xl bg-accent text-accent-foreground font-black tracking-widest text-[10px] uppercase shadow-glow">
                <Plus className="size-4 mr-2" /> Initial Registration
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              {facilities.map((f) => {
                const fBookings = bookings.filter((b) => b.facility_id === f.id);
                const fRevenue = fBookings.filter((b) => b.status === "paid" || b.status === "completed").reduce((s, b) => s + Number(b.total_price), 0);
                return (
                  <div
                    key={f.id}
                    className="group bg-card/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-card grid md:grid-cols-[1fr_auto_auto] gap-8 items-center hover:bg-white/5 transition-all duration-500 hover:border-white/10"
                  >
                    <div className="space-y-2">
                      <Badge className="bg-accent/10 text-accent text-[9px] font-black tracking-widest border-none px-3 h-6 mb-2">
                        {f.sport_type.toUpperCase()}
                      </Badge>
                      <h3 className="font-display text-4xl tracking-tighter group-hover:text-accent transition-colors">{f.name.toUpperCase()}</h3>
                      <div className="flex items-center gap-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                        <span className="text-accent">LOCATION</span>
                        <span>{f.location}</span>
                        <span className="opacity-20">//</span>
                        <span className="text-primary">HOURS</span>
                        <span>{f.open_hour}:00–{f.close_hour}:00</span>
                        <span className="opacity-20">//</span>
                        <span className="text-white font-bold">{formatPHP(f.hourly_price)}/HR</span>
                      </div>
                    </div>
                    <div className="text-right px-8 border-x border-white/5 h-full flex flex-col justify-center">
                      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">ACCUMULATED_VALVE</div>
                      <div className="font-display text-4xl tracking-tighter text-accent leading-none mb-1">{formatPHP(fRevenue)}</div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest opacity-60">
                        {fBookings.length} TOTAL_CYCLES
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setEditing(f)}
                      className="h-16 px-8 rounded-2xl border-white/10 hover:bg-white/10 font-black tracking-widest text-[10px] uppercase transition-all"
                    >
                      <Pencil className="size-4 mr-2" /> RECONFIGURE_NODE
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {bookings.length > 0 && (
          <div className="mt-20 animate-fade-up" style={{ animationDelay: "500ms" }}>
            <div className="flex items-end justify-between mb-8">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="size-1.5 rounded-full bg-primary" />
                  <h2 className="font-display text-4xl tracking-tighter">RECENT_CYCLES</h2>
                </div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                  ACTIVE LEDGER // INLINE METADATA INJECTION
                </p>
              </div>
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground/40 uppercase max-w-[300px] text-right">
                Notes injected here are propagated to both customer interface and terminal receipts.
              </p>
            </div>
            <div className="grid gap-6">
              {bookings.slice(0, 25).map((b) => {
                const f = facilities.find((x) => x.id === b.facility_id);
                return (
                  <BookingNotesRow
                    key={b.id}
                    booking={b}
                    facilityName={f?.name || "—"}
                    sportType={f?.sport_type || ""}
                    onSaved={(notes) =>
                      setBookings((bs) => bs.map((x) => (x.id === b.id ? { ...x, owner_notes: notes } : x)))
                    }
                  />
                );
              })}
            </div>
          </div>
        )}

        <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-2xl border-white/10 rounded-[2.5rem] p-12 shadow-elevated">
            <DialogHeader className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-1.5 rounded-full bg-accent shadow-glow-sm" />
                <span className="text-[10px] font-mono tracking-[0.3em] text-accent uppercase">NODE_CONFIGURATION</span>
              </div>
              <DialogTitle className="font-display text-5xl tracking-tighter leading-none">
                {editing?.id ? "UPDATE" : "ESTABLISH"} <span className="text-gradient">FACILITY</span>
              </DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground ml-1">NODE_IDENTIFIER</Label>
                  <Input
                    placeholder="ENTER FACILITY NAME..."
                    value={editing.name || ""}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-xl tracking-tight focus:border-accent/50 focus:ring-accent/20 transition-all font-display"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground ml-1">SPORT_TYPE</Label>
                    <Select value={editing.sport_type} onValueChange={(v) => setEditing({ ...editing, sport_type: v })}>
                      <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-xl px-6 font-mono text-xs tracking-widest uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10 rounded-xl overflow-hidden">
                        {SPORTS.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize font-mono text-xs py-3 tracking-widest">
                            {s.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground ml-1">HOURLY_VALVE (₱)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editing.hourly_price ?? 0}
                      onChange={(e) => setEditing({ ...editing, hourly_price: Number(e.target.value) })}
                      className="h-14 bg-white/5 border-white/10 rounded-xl px-6 font-mono text-xs tracking-widest focus:border-accent/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground ml-1">COORDINATES / LOCATION</Label>
                  <Input
                    placeholder="STREET, DISTRICT, CITY..."
                    value={editing.location || ""}
                    onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                    className="h-14 bg-white/5 border-white/10 rounded-xl px-6 font-mono text-xs tracking-widest focus:border-accent/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground ml-1">TEMPORAL_OPEN (24H)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={editing.open_hour ?? 8}
                      onChange={(e) => setEditing({ ...editing, open_hour: Number(e.target.value) })}
                      className="h-14 bg-white/5 border-white/10 rounded-xl px-6 font-mono text-xs tracking-widest focus:border-accent/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground ml-1">TEMPORAL_CLOSE (24H)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={editing.close_hour ?? 22}
                      onChange={(e) => setEditing({ ...editing, close_hour: Number(e.target.value) })}
                      className="h-14 bg-white/5 border-white/10 rounded-xl px-6 font-mono text-xs tracking-widest focus:border-accent/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground ml-1">NODE_NARRATIVE</Label>
                  <Textarea
                    rows={4}
                    placeholder="DESCRIBE THE FACILITY INFRASTRUCTURE..."
                    value={editing.description || ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    className="bg-white/5 border-white/10 rounded-2xl p-6 text-sm resize-none focus:border-accent/50 transition-all"
                  />
                </div>

                <Button
                  onClick={saveFacility}
                  disabled={saving}
                  className="w-full h-16 rounded-2xl bg-accent text-accent-foreground font-black tracking-[0.2em] uppercase text-xs shadow-glow hover:shadow-glow-lg transition-all"
                >
                  {saving ? (
                    <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> SYNCHRONIZING...</span>
                  ) : (
                    editing.id ? "UPDATE_NODE_MANIFEST" : "AUTHORIZE_NEW_NODE"
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend }: { icon: any; label: string; value: string; trend?: string }) {
  return (
    <div className="group bg-card/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-card hover:bg-white/5 transition-all duration-500 hover:border-white/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="size-24 -mr-8 -mt-8" />
      </div>
      <div className="relative z-10">
        <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
          <Icon className="size-5" />
        </div>
        <div className="font-display text-4xl tracking-tighter text-white mb-1">{value}</div>
        <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3 opacity-60">{label}</div>
        {trend && (
          <div className="text-[9px] font-black tracking-[0.2em] text-accent uppercase flex items-center gap-2">
            <div className="size-1 rounded-full bg-accent shadow-glow-sm" />
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingNotesRow({
  booking,
  facilityName,
  sportType,
  onSaved,
}: {
  booking: BookingRow;
  facilityName: string;
  sportType: string;
  onSaved: (notes: string | null) => void;
}) {
  const [notes, setNotes] = useState(booking.owner_notes || "");
  const [state, setState] = useState<"idle" | "typing" | "saving" | "saved" | "error">("idle");
  const initial = booking.owner_notes || "";

  // Debounced autosave
  useEffect(() => {
    if (notes === initial && state === "idle") return;
    if (notes === initial) { setState("idle"); return; }
    setState("typing");
    const t = setTimeout(async () => {
      setState("saving");
      const value = notes.trim() ? notes.trim() : null;
      const { error } = await supabase.from("bookings").update({ owner_notes: value }).eq("id", booking.id);
      if (error) { setState("error"); toast.error(error.message); return; }
      onSaved(value);
      setState("saved");
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  // Auto-clear "saved" indicator after a moment
  useEffect(() => {
    if (state !== "saved") return;
    const t = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(t);
  }, [state]);

  const statusColor =
    booking.status === "paid" ? "text-accent"
      : booking.status === "cancelled" ? "text-destructive"
        : booking.status === "completed" ? "text-primary"
          : "text-muted-foreground";

  const indicator = (() => {
    switch (state) {
      case "typing": return <span className="text-muted-foreground">Editing…</span>;
      case "saving": return <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Saving…</span>;
      case "saved": return <span className="text-accent flex items-center gap-1"><Save className="size-3" /> Saved</span>;
      case "error": return <span className="text-destructive">Save failed — retry</span>;
      default: return <span className="text-muted-foreground/60">Autosaves as you type</span>;
    }
  })();

  return (
    <div className="group bg-card/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-card grid md:grid-cols-[320px_1fr] gap-10 items-start hover:bg-white/5 transition-all duration-500 hover:border-white/10">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge className="bg-accent/10 text-accent text-[9px] font-black tracking-widest border-none px-3 h-6">
            {sportType.toUpperCase()}
          </Badge>
          <span className="text-[10px] font-mono tracking-widest text-muted-foreground/40 uppercase">#{booking.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="font-display text-3xl tracking-tighter leading-none text-white group-hover:text-accent transition-colors">{facilityName.toUpperCase()}</div>
        <div className="space-y-1.5 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
            <CalendarCheck2 className="size-3 text-accent" />
            <span>{format(parseISO(booking.booking_date), "PPP").toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
            <Clock className="size-3 text-primary" />
            <span>{booking.start_hour}:00–{booking.end_hour}:00</span>
          </div>
        </div>
        <div className="pt-2">
          <span className={`text-[10px] font-black tracking-[0.2em] uppercase px-3 py-1 rounded-full border border-current bg-transparent ${statusColor}`}>
            {booking.status}
          </span>
        </div>
      </div>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <Label className="flex items-center gap-2 text-[10px] font-mono tracking-[0.3em] uppercase text-muted-foreground">
            <StickyNote className="size-3.5 text-accent" /> INJECT_METADATA
          </Label>
          <div className="text-[10px] font-mono tracking-widest uppercase">{indicator}</div>
        </div>
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ENTER OPERATIONAL NOTES OR CUSTOMER INSTRUCTIONS..."
          className="flex-1 bg-black/20 border-white/10 rounded-2xl p-6 text-sm font-mono tracking-tight resize-none focus:border-accent/50 transition-all placeholder:opacity-20"
        />
      </div>
    </div>
  );
}
