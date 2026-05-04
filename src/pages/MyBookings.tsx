import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolveFacilityImage } from "@/lib/facility-images";
import { formatPHP } from "@/lib/format";
import { BookingTimeline, type BookingStatus } from "@/components/BookingTimeline";
import { PaymentDialog } from "@/components/PaymentDialog";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, X, CreditCard, Users, Receipt, Search, StickyNote, XCircle, SlidersHorizontal, ArrowLeft, Terminal, Activity, ShieldCheck, ActivitySquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { downloadReceipt } from "@/lib/receipt";

interface Booking {
  id: string;
  booking_date: string;
  start_hour: number;
  end_hour: number;
  total_price: number;
  status: BookingStatus;
  series_id: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  owner_notes: string | null;
  facilities: {
    id: string;
    name: string;
    sport_type: string;
    location: string;
    image_url: string | null;
  } | null;
}

type FilterStatus = "all" | "pending" | "paid" | "completed" | "cancelled";

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "ALL_RECORDS" },
  { value: "pending", label: "PENDING_SETTLEMENT" },
  { value: "paid", label: "VERIFIED_ALLOCATION" },
  { value: "completed", label: "ARCHIVED_SESSION" },
  { value: "cancelled", label: "TERMINATED" },
];

export default function MyBookings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [payTarget, setPayTarget] = useState<{ ids: string[]; amount: number } | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [customerName, setCustomerName] = useState<string>("");
  
  // Advanced filters
  const [advBookingId, setAdvBookingId] = useState("");
  const [advFacility, setAdvFacility] = useState("__any__");
  const [advFrom, setAdvFrom] = useState("");
  const [advTo, setAdvTo] = useState("");

  useEffect(() => { document.title = "SESSION_REGISTRY // COURTSIDE"; }, []);

  const refresh = () => {
    if (!user) return;
    supabase
      .from("bookings")
      .select("id,booking_date,start_hour,end_hour,total_price,status,series_id,payment_ref,paid_at,owner_notes,facilities(id,name,sport_type,location,image_url)")
      .eq("user_id", user.id)
      .order("booking_date", { ascending: false })
      .then(({ data }) => {
        setBookings((data as any as Booking[]) || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    refresh();
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setCustomerName(data?.display_name || user.email || ""));
  }, [user, authLoading, navigate]);

  const cancelBooking = async (id: string) => {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    setBookings((b) => b.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x)));
    toast.success("TERMINATION_SUCCESSFUL");
  };

  const filteredBookings = useMemo(() => {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const q = search.trim().toLowerCase();
    const idQuery = advBookingId.trim().toLowerCase().replace(/^#/, "");
    const fromD = advFrom ? parseISO(advFrom) : null;
    const toD = advTo ? parseISO(advTo) : null;

    return bookings.filter((b) => {
      const isPast = parseISO(b.booking_date) < today;
      const displayStatus: BookingStatus = b.status === "paid" && isPast ? "completed" : b.status;
      if (filter !== "all" && displayStatus !== filter) return false;

      if (idQuery) {
        const full = b.id.toLowerCase();
        const short = b.id.slice(0, 8).toLowerCase();
        if (full !== idQuery && short !== idQuery) return false;
      }
      if (advFacility !== "__any__" && b.facilities?.name !== advFacility) return false;
      
      const bd = parseISO(b.booking_date);
      if (fromD && bd < fromD) return false;
      if (toD && bd > toD) return false;

      if (!q) return true;
      const haystack = [
        b.id,
        b.id.slice(0, 8),
        b.facilities?.name,
        b.facilities?.sport_type,
        b.facilities?.location,
        b.booking_date,
        format(parseISO(b.booking_date), "PPP").toLowerCase(),
        format(parseISO(b.booking_date), "MMM d yyyy").toLowerCase(),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [bookings, filter, search, advBookingId, advFacility, advFrom, advTo]);

  const grouped = useMemo(() => {
    const series = new Map<string, Booking[]>();
    const single: Booking[] = [];
    filteredBookings.forEach((b) => {
      if (b.series_id) {
        const arr = series.get(b.series_id) || [];
        arr.push(b);
        series.set(b.series_id, arr);
      } else single.push(b);
    });
    return { series: Array.from(series.entries()), single };
  }, [filteredBookings]);

  const counts = useMemo(() => {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const c: Record<FilterStatus, number> = { all: bookings.length, pending: 0, paid: 0, completed: 0, cancelled: 0 };
    bookings.forEach((b) => {
      const isPast = parseISO(b.booking_date) < today;
      const s: BookingStatus = b.status === "paid" && isPast ? "completed" : b.status;
      c[s as FilterStatus] = (c[s as FilterStatus] || 0) + 1;
    });
    return c;
  }, [bookings]);

  const facilityOptions = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((b) => { if (b.facilities?.name) set.add(b.facilities.name); });
    return Array.from(set).sort();
  }, [bookings]);

  const advActive = !!(advBookingId || (advFacility && advFacility !== "__any__") || advFrom || advTo);
  const advCount = [advBookingId, advFacility !== "__any__" ? advFacility : "", advFrom, advTo].filter(Boolean).length;

  const clearAdvanced = () => {
    setAdvBookingId("");
    setAdvFacility("__any__");
    setAdvFrom("");
    setAdvTo("");
  };

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const facilities = new Set<string>();
    const dates = new Set<string>();
    const ids: string[] = [];
    bookings.forEach((b) => {
      const name = b.facilities?.name;
      if (name && name.toLowerCase().includes(q)) facilities.add(name);
      const pretty = format(parseISO(b.booking_date), "PPP");
      if (pretty.toLowerCase().includes(q) || b.booking_date.includes(q)) dates.add(pretty);
      const shortId = b.id.slice(0, 8).toUpperCase();
      if (shortId.toLowerCase().includes(q.replace(/^#/, ""))) ids.push(`#${shortId}`);
    });
    return [
      ...Array.from(facilities).slice(0, 4).map((v) => ({ kind: "NODE", value: v })),
      ...Array.from(dates).slice(0, 4).map((v) => ({ kind: "TEMPORAL", value: v })),
      ...ids.slice(0, 4).map((v) => ({ kind: "MANIFEST_ID", value: v })),
    ].slice(0, 8);
  }, [search, bookings]);

  return (
    <div className="min-h-screen flex flex-col bg-[#030303] text-foreground selection:bg-accent/30">
      <Navbar />
      <main className="flex-1 container max-w-7xl py-12 space-y-12 animate-fade-in">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-white/5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
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
              <div className="h-4 w-px bg-white/10 mx-2" />
              <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-accent shadow-glow-sm" />
                <span className="text-[10px] font-mono tracking-[0.3em] text-accent uppercase">SESSION_REGISTRY // USER_MANIFEST</span>
              </div>
            </div>
            <h1 className="font-display text-7xl md:text-8xl tracking-tighter leading-[0.85] uppercase">
              MY_<span className="text-gradient">SESSIONS</span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground/60 leading-relaxed font-mono tracking-tight">
              Centralized record of your authorized facility allocations. Track status, execute payments, and manage recurring node series.
            </p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[320px] group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="SEARCH BY DATE, FACILITY, OR SESSION_ID..."
              className="h-16 pl-14 pr-14 bg-white/5 border-white/5 rounded-2xl font-mono text-xs tracking-wider focus:border-accent/50 focus:ring-accent/20 transition-all placeholder:opacity-20"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
              >
                <XCircle className="size-4 text-muted-foreground" />
              </button>
            )}
            {searchFocused && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-card/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-elevated overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.kind}-${s.value}-${i}`}
                    onMouseDown={(e) => { e.preventDefault(); setSearch(s.value.replace(/^#/, "")); }}
                    className="w-full text-left px-6 py-4 hover:bg-white/5 flex items-center justify-between gap-3 group transition-colors"
                  >
                    <span className="font-mono text-xs tracking-wider text-muted-foreground group-hover:text-white transition-colors">{s.value}</span>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-accent font-black opacity-40 group-hover:opacity-100 transition-opacity">{s.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                variant="ghost"
                onClick={() => setFilter(f.value)}
                className={`h-16 px-6 rounded-2xl border font-mono text-[10px] tracking-[0.2em] uppercase transition-all duration-300 ${
                  filter === f.value 
                    ? 'bg-accent text-accent-foreground border-accent shadow-glow' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-muted-foreground'
                }`}
              >
                {f.label}
                <span className={`ml-3 opacity-40 ${filter === f.value ? 'text-accent-foreground' : ''}`}>[{counts[f.value] || 0}]</span>
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost"
                  className={`h-16 px-6 rounded-2xl border font-mono text-[10px] tracking-[0.2em] uppercase transition-all duration-300 ${
                    advActive 
                      ? 'bg-primary text-primary-foreground border-primary shadow-glow' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-muted-foreground'
                  }`}
                >
                  <SlidersHorizontal className="size-4 mr-2" /> 
                  ADVANCED
                  {advActive && <span className="ml-3">[{advCount}]</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 bg-card/95 backdrop-blur-3xl border-white/10 rounded-[2rem] p-8 shadow-elevated" align="end">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-accent" />
                      <h4 className="font-display text-2xl tracking-tight uppercase">Filter_Logic</h4>
                    </div>
                    {advActive && (
                      <Button variant="ghost" size="sm" onClick={clearAdvanced} className="h-8 px-3 rounded-lg text-[9px] font-mono tracking-widest uppercase hover:bg-white/5">RESET_QUERY</Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground uppercase ml-1">Session_ID (Exact)</Label>
                      <Input
                        value={advBookingId}
                        onChange={(e) => setAdvBookingId(e.target.value)}
                        placeholder="E.G. A1B2C3D4"
                        className="h-12 bg-black/20 border-white/5 rounded-xl font-mono text-xs tracking-wider"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground uppercase ml-1">Node_Allocation</Label>
                      <Select value={advFacility} onValueChange={setAdvFacility}>
                        <SelectTrigger className="h-12 bg-black/20 border-white/5 rounded-xl font-mono text-xs tracking-wider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card/95 backdrop-blur-3xl border-white/10">
                          <SelectItem value="__any__" className="font-mono text-xs tracking-wider">ANY_NODE</SelectItem>
                          {facilityOptions.map((n) => <SelectItem key={n} value={n} className="font-mono text-xs tracking-wider">{n.toUpperCase()}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground uppercase ml-1">Temporal_Start</Label>
                        <Input
                          type="date"
                          value={advFrom}
                          onChange={(e) => setAdvFrom(e.target.value)}
                          className="h-12 bg-black/20 border-white/5 rounded-xl font-mono text-[10px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground uppercase ml-1">Temporal_End</Label>
                        <Input
                          type="date"
                          value={advTo}
                          onChange={(e) => setAdvTo(e.target.value)}
                          className="h-12 bg-black/20 border-white/5 rounded-xl font-mono text-[10px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {loading ? (
          <div className="py-40 text-center space-y-4 animate-pulse">
            <Terminal className="size-12 text-muted-foreground/10 mx-auto" />
            <p className="font-mono text-xs tracking-[0.5em] text-muted-foreground/40 uppercase">SYNCHRONIZING_MANIFEST...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-40 text-center space-y-8 bg-card/40 backdrop-blur-3xl border border-dashed border-white/10 rounded-[3rem]">
            <div className="space-y-4">
              <ActivitySquare className="size-16 text-muted-foreground/10 mx-auto" />
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground/40 uppercase">NO_ACTIVE_ALLOCATIONS_DETECTED</p>
            </div>
            <Button 
              onClick={() => navigate("/facilities")}
              className="h-14 px-10 rounded-2xl bg-accent text-accent-foreground shadow-glow font-black text-[11px] uppercase tracking-[0.3em] hover:scale-105 transition-transform"
            >
              BROWSE_FACILITY_NODES
            </Button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-40 text-center space-y-8 bg-card/40 backdrop-blur-3xl border border-dashed border-white/10 rounded-[3rem]">
            <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground/40 uppercase">QUERY_RETURNED_ZERO_RESULTS</p>
            <Button 
              variant="outline" 
              onClick={() => { setFilter("all"); setSearch(""); clearAdvanced(); }}
              className="h-14 px-10 rounded-2xl border-white/10 font-mono text-[10px] tracking-[0.3em] uppercase hover:bg-white/5"
            >
              CLEAR_SEARCH_FILTERS
            </Button>
          </div>
        ) : (
          <div className="space-y-12 pb-20">
            {/* Recurring series */}
            {grouped.series.map(([sid, items]) => {
              const pendingItems = items.filter((i) => i.status === "pending");
              const totalPending = pendingItems.reduce((s, i) => s + Number(i.total_price), 0);
              const facility = items[0].facilities;
              return (
                <section key={sid} className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-elevated relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity className="size-20" />
                  </div>
                  
                  <div className="flex items-center justify-between flex-wrap gap-8 mb-10 border-b border-white/5 pb-8">
                    <div className="flex items-center gap-6">
                      <div className="size-16 rounded-[1.25rem] bg-accent/10 border border-accent/20 flex items-center justify-center shadow-glow-sm">
                        <Users className="size-8 text-accent" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="size-1.5 rounded-full bg-accent animate-pulse" />
                          <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-black">RECURRING_NODAL_SERIES</span>
                        </div>
                        <h2 className="font-display text-4xl tracking-tighter uppercase">{facility?.name}</h2>
                        <p className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] mt-1">
                          {items.length} ALLOCATED_SEGMENTS // SERIES_ID: {sid.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    {pendingItems.length > 0 && (
                      <Button 
                        onClick={() => setPayTarget({ ids: pendingItems.map((i) => i.id), amount: totalPending })}
                        className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground shadow-glow font-black text-[11px] uppercase tracking-[0.3em] gap-3"
                      >
                        <CreditCard className="size-4" /> PAY_AGGREGATE · {formatPHP(totalPending)}
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4">
                    {items.map((b) => (
                      <BookingRow 
                        key={b.id} 
                        b={b} 
                        customerName={customerName} 
                        onCancel={cancelBooking} 
                        onPay={(id, amt) => setPayTarget({ ids: [id], amount: amt })} 
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Single bookings */}
            {grouped.single.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 ml-2">
                  <div className="h-4 w-1 bg-accent" />
                  <span className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground/60 uppercase">INDEPENDENT_MANIFEST_ENTRIES</span>
                </div>
                <div className="grid gap-4">
                  {grouped.single.map((b) => (
                    <BookingRow 
                      key={b.id} 
                      b={b} 
                      customerName={customerName} 
                      onCancel={cancelBooking} 
                      onPay={(id, amt) => setPayTarget({ ids: [id], amount: amt })} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {payTarget && (
        <PaymentDialog
          open={!!payTarget}
          onOpenChange={(v) => !v && setPayTarget(null)}
          bookingIds={payTarget.ids}
          amount={payTarget.amount}
          onPaid={refresh}
        />
      )}

      <Footer />
    </div>
  );
}

function BookingRow({
  b,
  customerName,
  onCancel,
  onPay,
}: {
  b: Booking;
  customerName: string;
  onCancel: (id: string) => void;
  onPay: (id: string, amount: number) => void;
}) {
  const isPast = parseISO(b.booking_date) < new Date(new Date().setHours(0, 0, 0, 0));
  const displayStatus: BookingStatus = b.status === "paid" && isPast ? "completed" : b.status;
  
  const [includeNotes, setIncludeNotes] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`courtside:receiptNotes:${b.id}`);
      if (stored !== null) return stored === "1";
      const last = sessionStorage.getItem("courtside:receiptNotes:lastUsed");
      if (last !== null) return last === "1";
    } catch { }
    return true;
  });

  const updateIncludeNotes = (next: boolean) => {
    setIncludeNotes(next);
    try {
      localStorage.setItem(`courtside:receiptNotes:${b.id}`, next ? "1" : "0");
      sessionStorage.setItem("courtside:receiptNotes:lastUsed", next ? "1" : "0");
    } catch { }
  };

  const canShowReceipt = b.status === "paid" || b.status === "completed";

  return (
    <div className="grid md:grid-cols-[200px_1fr_auto] gap-8 bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-6 group hover:border-accent/30 transition-all shadow-card hover:shadow-elevated relative overflow-hidden">
      <div className="relative aspect-square md:aspect-auto md:h-full overflow-hidden rounded-2xl">
        <img
          src={resolveFacilityImage(b.facilities?.image_url, b.facilities?.sport_type)}
          alt={b.facilities?.name || "Facility"}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black tracking-widest text-white uppercase">
          {b.facilities?.sport_type}
        </div>
      </div>

      <div className="flex flex-col justify-between gap-6 py-2">
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-display text-3xl tracking-tight uppercase group-hover:text-accent transition-colors">{b.facilities?.name}</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">
              <span className="flex items-center gap-2"><MapPin className="size-3 text-accent" />{b.facilities?.location}</span>
              <span className="flex items-center gap-2"><Calendar className="size-3 text-accent" />{format(parseISO(b.booking_date), "MMM_dd_yyyy")}</span>
              <span className="flex items-center gap-2"><Clock className="size-3 text-accent" />{b.start_hour}:00 – {b.end_hour}:00</span>
              <span className="text-accent/30 tracking-normal">ID:{b.id.slice(0, 12).toUpperCase()}</span>
            </div>
          </div>
          
          {b.owner_notes && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <StickyNote className="size-12" />
              </div>
              <Activity className="size-4 text-accent flex-shrink-0 mt-1" />
              <div className="space-y-1">
                <span className="text-[9px] font-mono tracking-widest text-accent/60 uppercase">Operator_Transmission</span>
                <p className="text-xs text-muted-foreground leading-relaxed italic">"{b.owner_notes}"</p>
              </div>
            </div>
          )}
        </div>
        <div className="w-fit">
          <BookingTimeline status={displayStatus} />
        </div>
      </div>

      <div className="flex flex-col items-end justify-between py-2 pr-2">
        <div className="text-right space-y-1">
          <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase block opacity-40">Settlement_Amount</span>
          <div className="text-4xl font-display font-black text-white group-hover:text-accent transition-colors drop-shadow-glow">
            {formatPHP(b.total_price)}
          </div>
        </div>
        
        <div className="flex flex-col gap-3 w-full sm:w-auto items-end">
          {b.status === "pending" && !isPast && (
            <Button 
              size="sm" 
              onClick={() => onPay(b.id, Number(b.total_price))}
              className="h-11 px-6 rounded-xl bg-accent text-accent-foreground shadow-glow font-black text-[10px] uppercase tracking-widest gap-2 hover:scale-105 transition-transform"
            >
              <CreditCard className="size-3.5" /> INITIALIZE_PAYMENT
            </Button>
          )}
          {canShowReceipt && (
            <div className="flex flex-col gap-3 items-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => downloadReceipt(b, customerName, { includeOwnerNotes: includeNotes })}
                className="h-11 px-6 rounded-xl border-white/10 font-mono text-[10px] tracking-widest uppercase bg-white/5 hover:bg-white/10 gap-2"
              >
                <Receipt className="size-3.5" /> DOWNLOAD_MANIFEST
              </Button>
              {b.owner_notes && (
                <label className="flex items-center gap-3 text-[9px] font-mono tracking-widest text-muted-foreground/40 uppercase cursor-pointer select-none group/check">
                  <Checkbox
                    checked={includeNotes}
                    onCheckedChange={(v) => updateIncludeNotes(v === true)}
                    className="size-4 border-white/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  ATTACH_TRANSMISSIONS
                </label>
              )}
            </div>
          )}
          {b.status !== "cancelled" && !isPast && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onCancel(b.id)}
              className="h-11 px-6 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-mono text-[10px] tracking-widest uppercase transition-all"
            >
              <XCircle className="size-3.5 mr-2" /> CANCEL_SESSION
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
