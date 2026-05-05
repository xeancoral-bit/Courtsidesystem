import { useEffect, useState, useMemo } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { 
  LayoutDashboard, Plus, Pencil, TrendingUp, CalendarCheck2, Wallet, 
  Download, StickyNote, Save, Loader2, LogOut, Calendar, Building2,
  MapPin, Clock, Camera, Trash2, RotateCcw, AlertCircle, Users,
  MessageSquare, LifeBuoy, ShieldCheck, Star, Send, Archive
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BookingCalendar } from "@/components/calendar/BookingCalendar";
import { toCSV, downloadCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { formatPHP } from "@/lib/format";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Facility {
  id: string; 
  name: string; 
  sport_type: string; 
  location: string;
  description: string | null; 
  hourly_price: number; 
  open_hour: number; 
  close_hour: number;
  image_url: string | null; 
  owner_id: string | null; 
  is_archived: boolean;
  created_at?: string;
  updated_at?: string;
}

interface BookingRow {
  id: string; 
  booking_date: string; 
  start_hour: number; 
  end_hour: number;
  total_price: number; 
  status: string; 
  facility_id: string; 
  reminder_text: string | null;
  created_at?: string;
  user_id?: string;
}

const SPORTS = ["basketball", "badminton", "soccer", "tennis", "gym", "volleyball", "court"];
const emptyForm: Partial<Facility> = {
  name: "", sport_type: "basketball", location: "Butuan City",
  description: "", hourly_price: 250, open_hour: 8, close_hour: 22, image_url: null,
  is_archived: false,
};

export default function OwnerDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isOwner, isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [newFacility, setNewFacility] = useState({
    name: "",
    sport_type: "Basketball",
    location: "",
    hourly_price: 500,
    open_hour: 8,
    close_hour: 22,
    image_url: "",
    description: ""
  });
  const [newStaff, setNewStaff] = useState({ name: "", role: "Manager", email: "", phone: "", facility_id: "" });
  const [newTicket, setNewTicket] = useState({ subject: "", message: "" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [staff, setStaff] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [exportFrom, setExportFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [exportTo, setExportTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [includeNotesInCSV, setIncludeNotesInCSV] = useState(true);

  const handleEdit = async () => {
    if (!editingFacility) return;
    
    // Strict Validation for Modifications
    if (!editingFacility.name.trim() || !editingFacility.location.trim()) {
      toast.error("Validation Error", { description: "Name and location are mandatory for system integrity." });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("facilities" as any)
        .update({
          name: editingFacility.name,
          sport_type: editingFacility.sport_type,
          location: editingFacility.location,
          hourly_price: editingFacility.hourly_price,
          open_hour: editingFacility.open_hour,
          close_hour: editingFacility.close_hour,
          image_url: editingFacility.image_url,
          description: editingFacility.description,
          owner_id: editingFacility.owner_id || user?.id
        })
        .eq("id", editingFacility.id);

      if (error) throw error;
      toast.success("Specifications Revised", {
        description: `${editingFacility.name} updated successfully.`,
        icon: <Save className="size-4 text-blue-400" />
      });
      setEditingFacility(null);
      await refresh();
    } catch (error: any) {
      toast.error("Update Failed", { description: error.message });
    } finally {
      setSaving(false);
    }
  };


  const handleAdd = async () => {
    if (!user) return;
    
    // Strict Input Validation - Enterprise Grade
    const errors = [];
    if (!newFacility.name.trim()) errors.push("Facility Name");
    if (!newFacility.location.trim()) errors.push("Operational Location");
    if (!newFacility.image_url) errors.push("Master Visual Asset (Image)");
    if (!newFacility.description?.trim()) errors.push("Official Description");
    if (newFacility.hourly_price <= 0) errors.push("Valid Hourly Rate");
    
    if (errors.length > 0) {
      toast.error(`Missing Required Documentation: ${errors.join(", ")}`, {
        description: "All enterprise facilities must have complete profiles before registration.",
        duration: 5000
      });
      return;
    }

    if (newFacility.open_hour >= newFacility.close_hour) {
      toast.error("Operational Conflict", {
        description: "Opening hour must precede closing hour for valid scheduling."
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("facilities" as any).insert({
        ...newFacility,
        owner_id: user.id,
        is_archived: false,
        created_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      toast.success("Facility Successfully Commissioned", {
        description: `${newFacility.name} is now live in the global registry.`,
        icon: <ShieldCheck className="size-4 text-emerald-500" />
      });

      setIsAddOpen(false);
      setNewFacility({ 
        name: "", 
        sport_type: "Basketball", 
        location: "", 
        hourly_price: 500, 
        open_hour: 8, 
        close_hour: 22, 
        image_url: "", 
        description: "" 
      });
      
      // Forced Reactive Sync
      await refresh();
    } catch (error: any) {
      toast.error("System Integration Error", {
        description: error.message || "Failed to establish the facility in the database."
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddStaff = async () => {
    if (!user || !newStaff.facility_id) {
      toast.error("Please select a facility for the staff member");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("staff" as any).insert([newStaff]);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Staff member recruited");
    setIsStaffOpen(false);
    setNewStaff({ name: "", role: "Manager", email: "", phone: "", facility_id: "" });
    refresh();
  };

  const handleDeleteStaff = async (id: string) => {
    const { error } = await supabase.from("staff" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Staff member removed");
    refresh();
  };

  const handleAddTicket = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("support_tickets" as any).insert([{
      ...newTicket,
      user_id: user.id
    }]);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticket submitted to administration");
    setIsTicketOpen(false);
    setNewTicket({ subject: "", message: "" });
    refresh();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('facility-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('facility-images')
        .getPublicUrl(filePath);

      if (editingFacility) {
        setEditingFacility({ ...editingFacility, image_url: publicUrl });
      } else {
        setNewFacility({ ...newFacility, image_url: publicUrl });
      }
      toast.success("Image uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

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
    
    // Fetch owner's facilities
    const { data: facs } = await supabase.from("facilities" as any).select("*").eq("owner_id", user.id).order("name");
    const list = (facs as unknown as Facility[]) || [];
    setFacilities(list);

    // Fetch all facilities for the browse tab
    const { data: allFacs } = await supabase.from("facilities" as any).select("*").order("name");
    setAllFacilities((allFacs as unknown as Facility[]) || []);

    if (list.length > 0) {
      const ids = list.map((f) => f.id);
      const [bookingsRes, staffRes, reviewsRes] = await Promise.all([
        supabase
          .from("bookings" as any)
          .select("id,booking_date,start_hour,end_hour,total_price,status,facility_id,reminder_text")
          .in("facility_id", ids)
          .order("booking_date", { ascending: false }),
        supabase
          .from("staff" as any)
          .select("*")
          .in("facility_id", ids),
        supabase
          .from("reviews" as any)
          .select("*, profiles(display_name)")
          .in("facility_id", ids)
      ]);

      setBookings((bookingsRes.data as unknown as BookingRow[]) || []);
      setStaff(staffRes.data || []);
      setReviews(reviewsRes.data || []);
    } else {
      setBookings([]);
      setStaff([]);
      setReviews([]);
    }

    const { data: tickets } = await supabase
      .from("support_tickets" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSupportTickets(tickets || []);

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

  const handleArchive = async (id: string, isArchived: boolean) => {
    const { error } = await supabase.from("facilities" as any).update({ is_archived: !isArchived }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(isArchived ? "Facility restored" : "Facility archived");
    refresh();
  };

  const deleteFacility = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this facility? This cannot be undone.")) return;
    const { error } = await supabase.from("facilities" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Facility deleted permanently");
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
        base.reminder_text = (b.reminder_text || "").replace(/\s+/g, " ").trim();
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
      const note = (b.reminder_text || "").replace(/\s+/g, " ").trim();
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
        reminders: Array.from(r.notes).join(" | "),
      }));
    downloadCSV(`revenue_${exportFrom}_to_${exportTo}.csv`, toCSV(rows));
    toast.success(`Exported ${rows.length} revenue row${rows.length === 1 ? "" : "s"}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading || authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#06080f]">
        <main className="flex-1 container py-20 text-center text-muted-foreground flex items-center justify-center">Loading dashboard…</main>
      </div>
    );
  }

  if (!isOwner) {
    if (isAdmin) return <Navigate to="/admin/users" replace />;
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-[#06080f]">
      <Navbar />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[70%] h-[70%] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[5%] w-[50%] h-[50%] bg-blue-900/10 blur-[100px] rounded-full" />
      </div>

      <main className="flex-1 container py-12 relative z-1">
        {/* Centered Dashboard Header */}
        <div className="flex flex-col items-center justify-center text-center mb-10 gap-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent font-bold text-[10px] uppercase tracking-[0.2em] animate-fade-in">
            <ShieldCheck className="size-3" />
            Verified Owner Terminal
          </div>
          <h1 className="font-display text-5xl md:text-7xl tracking-wider leading-none">
            OWNER <span className="text-gradient">DASHBOARD</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl">
            Manage your Butuan City venues, monitor booking activity, and oversee real-time scheduling flows from one centralized panel.
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={() => setIsAddOpen(true)}
              className="font-bold tracking-wider bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] border-none h-12 px-8 rounded-full">
              <Plus className="size-4 mr-2" /> New Facility
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
          <div className="flex justify-center">
            <TabsList className="bg-blue-950/20 border border-blue-900/30 p-1.5 rounded-2xl h-auto flex flex-wrap justify-center gap-1 backdrop-blur-sm">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all">Dashboard</TabsTrigger>
              <TabsTrigger value="reminders" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all">Reminders</TabsTrigger>
              <TabsTrigger value="facilities" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all">Venue Management</TabsTrigger>
              <TabsTrigger value="all-facilities" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all">Global Registry</TabsTrigger>
              <TabsTrigger value="archive" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all">Archive Vault</TabsTrigger>
              <TabsTrigger value="schedule" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all">
                <Calendar className="size-3.5 mr-2" />
                Scheduler
              </TabsTrigger>
              <TabsTrigger value="staff" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all">Staff</TabsTrigger>
              <TabsTrigger value="reviews" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all">Reviews</TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all">Analytics</TabsTrigger>
              <TabsTrigger value="support" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all">Support</TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-10 focus-visible:outline-none">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Wallet} label="Total revenue" value={formatPHP(stats.revenue)} />
              <StatCard icon={CalendarCheck2} label="All-time bookings" value={stats.totalBookings.toString()} />
              <StatCard icon={TrendingUp} label="Upcoming" value={stats.upcoming.toString()} />
              <StatCard icon={LayoutDashboard} label="Est. occupancy" value={`${stats.occupancy}%`} />
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-card-gradient border border-blue-900/20 rounded-2xl p-8 shadow-card">
                <h3 className="font-display text-2xl tracking-wider mb-6 text-white uppercase">Performance Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }}
                        labelStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                      />
                      <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card-gradient border border-blue-900/20 rounded-2xl p-8 shadow-card">
                <h3 className="font-display text-2xl tracking-wider mb-6 text-white uppercase">Active Reminders</h3>
                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {bookings.filter(b => b.reminder_text).slice(0, 5).map(b => (
                    <div key={b.id} className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-3 items-start">
                      <StickyNote className="size-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-white/80 italic font-medium">"{b.reminder_text}"</p>
                        <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest font-black">
                          {facilities.find(f => f.id === b.facility_id)?.name}
                        </p>
                      </div>
                    </div>
                  ))}
                  {bookings.filter(b => b.reminder_text).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground italic text-sm">No active reminders set.</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="reminders" className="space-y-6 focus-visible:outline-none">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-display text-3xl tracking-wider text-white uppercase">Operational Reminders</h2>
                <p className="text-muted-foreground text-sm">Review and update notes for upcoming bookings across all your venues.</p>
              </div>
            </div>

            <div className="grid gap-6">
              {bookings.filter(b => b.reminder_text).length === 0 ? (
                <div className="bg-blue-950/5 border border-blue-900/10 rounded-3xl p-24 text-center opacity-40">
                  <StickyNote className="size-16 text-blue-900/30 mx-auto mb-6" />
                  <p className="font-display text-xl tracking-widest uppercase text-blue-900/50">No active reminders</p>
                </div>
              ) : (
                bookings.filter(b => b.reminder_text).map((b) => (
                  <BookingNotesRow
                    key={b.id}
                    booking={b}
                    facilityName={facilities.find(f => f.id === b.facility_id)?.name || "Unknown Facility"}
                    sportType={facilities.find(f => f.id === b.facility_id)?.sport_type || "Sport"}
                    onSaved={(val) => {
                      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, reminder_text: val } : x));
                    }}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="all-facilities" className="space-y-6 focus-visible:outline-none">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-4xl tracking-wider text-white uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-400">Global Asset Registry</h2>
                <p className="text-muted-foreground text-sm font-medium">Comprehensive oversight of all sports infrastructure across the network.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-blue-950/40 border border-blue-900/30 px-6 py-3 rounded-2xl backdrop-blur-md">
                  <p className="text-[10px] text-blue-400 uppercase tracking-[0.2em] font-black mb-1">Total Network Assets</p>
                  <p className="text-2xl font-display font-black text-white">{allFacilities.length}</p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {allFacilities.filter(f => f.name && f.image_url).length === 0 ? (
                <div className="lg:col-span-2 bg-blue-950/10 border border-blue-900/20 rounded-3xl p-32 text-center">
                  <Loader2 className="size-12 text-blue-500 animate-spin mx-auto mb-6" />
                  <p className="text-xl font-display uppercase tracking-widest text-blue-400">Synchronizing Global Database…</p>
                </div>
              ) : (
                allFacilities.filter(f => f.name && f.image_url).map((f) => {
                  const facilityBookings = bookings.filter(b => b.facility_id === f.id);
                  const isOwnedByMe = f.owner_id === user?.id;
                  
                  return (
                    <div key={f.id} className="bg-gradient-to-br from-blue-950/20 to-black/60 border border-blue-900/20 rounded-3xl p-6 hover:border-blue-500/40 transition-all duration-500 group relative overflow-hidden flex flex-col sm:flex-row gap-6 shadow-card hover:shadow-glow">
                      <div className="absolute top-0 left-0 w-2 h-full bg-blue-600/20 group-hover:bg-blue-600 transition-colors" />
                      
                      <div className="w-full sm:w-48 aspect-video sm:aspect-square rounded-2xl bg-black/60 overflow-hidden border border-blue-900/40 shrink-0 relative group-hover:border-blue-500/50 transition-colors shadow-2xl">
                        {f.image_url ? (
                          <img src={f.image_url} alt={f.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 brightness-75 group-hover:brightness-100" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-950/20">
                            <Building2 className="size-12 text-blue-900/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          <Badge className={cn(
                            "text-[8px] uppercase tracking-[0.2em] font-black px-2.5 py-1 rounded-md backdrop-blur-md border-none",
                            f.is_archived ? "bg-red-500/80 text-white" : "bg-emerald-500/80 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                          )}>
                            {f.is_archived ? "Archived" : "Active"}
                          </Badge>
                          <Badge className="bg-blue-600/80 text-white border-none text-[8px] uppercase tracking-[0.2em] font-black px-2.5 py-1 rounded-md backdrop-blur-md shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                            {f.sport_type}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-display text-2xl tracking-tight text-white uppercase group-hover:text-blue-400 transition-colors truncate">{f.name}</h3>
                            {isOwnedByMe && <ShieldCheck className="size-5 text-emerald-400 shrink-0" />}
                          </div>
                          
                          <p className="text-xs text-muted-foreground flex items-center gap-2 mb-4 font-medium truncate">
                            <MapPin className="size-3.5 text-blue-500 shrink-0" /> {f.location}
                          </p>

                          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Created</span>
                              <span className="text-xs font-bold text-white/80">{f.created_at ? format(parseISO(f.created_at), "MMM d, yyyy") : "Initial Phase"}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Booking Volume</span>
                              <span className="text-xs font-bold text-blue-400">{facilityBookings.length} Total</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Hourly Rate</span>
                              <span className="text-xs font-black text-white">₱{f.hourly_price}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Maintenance</span>
                              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Optimal
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex items-center gap-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setEditingFacility(f)}
                            className="flex-1 border-blue-900/30 text-[10px] font-black uppercase tracking-widest h-10 hover:bg-blue-600 hover:text-white transition-all"
                          >
                            <Pencil className="size-3.5 mr-2" /> Details
                          </Button>
                          {isOwnedByMe && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleArchive(f.id, f.is_archived)}
                              className={cn(
                                "border-blue-900/30 text-[10px] font-black uppercase tracking-widest h-10 px-4 transition-all",
                                f.is_archived ? "hover:bg-emerald-600 hover:text-white" : "hover:bg-amber-600 hover:text-white"
                              )}
                            >
                              {f.is_archived ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="facilities" className="space-y-6 focus-visible:outline-none">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="font-display text-4xl tracking-wider text-white uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-400">Venue Management</h2>
                <p className="text-muted-foreground text-sm font-medium">Coordinate and optimize your active sports infrastructure.</p>
              </div>
              <Button onClick={() => setIsAddOpen(true)} className="bg-blue-600 hover:bg-blue-500 h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-glow border-none group">
                <Plus className="size-4 mr-2 group-hover:scale-125 transition-transform" /> Establish New Venue
              </Button>
            </div>

            <div className="grid gap-6">
              {facilities.filter(f => !f.is_archived && f.name && f.image_url).length === 0 ? (
                <div className="bg-blue-950/10 border border-blue-900/20 rounded-3xl p-32 text-center backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]" />
                  <div className="size-24 rounded-full bg-blue-600/10 border border-blue-600/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(59,130,246,0.1)] relative">
                    <Building2 className="size-12 text-blue-500" />
                  </div>
                  <h3 className="font-display text-4xl text-white mb-4 uppercase tracking-tighter">No Active Assets</h3>
                  <p className="text-muted-foreground mb-10 max-w-sm mx-auto font-medium">Your operational registry is currently empty. Initialize a new facility to begin accepting bookings.</p>
                  <Button onClick={() => setIsAddOpen(true)} size="lg" className="bg-blue-600 hover:bg-blue-500 shadow-glow rounded-full px-16 h-14 font-black uppercase tracking-[0.2em] text-xs">
                    Establish Registry
                  </Button>
                </div>
              ) : (
                facilities.filter(f => !f.is_archived && f.name && f.image_url).map((f) => {
                  const facilityBookings = bookings.filter(b => b.facility_id === f.id);
                  
                  return (
                    <div key={f.id} className="bg-gradient-to-br from-blue-950/20 to-black/60 border border-blue-900/20 rounded-3xl p-6 flex flex-col md:flex-row gap-8 items-center hover:border-blue-500/40 transition-all duration-500 group relative overflow-hidden shadow-card hover:shadow-glow">
                      <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600/30 group-hover:bg-emerald-600 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                      
                      <div className="w-full md:w-56 aspect-video md:aspect-square rounded-2xl bg-black/60 overflow-hidden border border-blue-900/40 flex items-center justify-center shrink-0 shadow-2xl relative group-hover:border-emerald-500/50 transition-colors duration-500">
                        {f.image_url ? (
                          <img src={f.image_url} alt={f.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 brightness-75 group-hover:brightness-100" />
                        ) : (
                          <Building2 className="size-12 text-blue-900/30" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-emerald-500/80 text-white border-none text-[8px] uppercase tracking-[0.2em] font-black px-2.5 py-1 rounded-md backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                            In Service
                          </Badge>
                        </div>
                      </div>

                      <div className="flex-1 space-y-4 min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-[10px] uppercase tracking-[0.3em] text-blue-400 font-black px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">{f.sport_type}</span>
                          <Badge className="bg-blue-600/10 text-blue-400 border-blue-500/20 text-[9px] uppercase tracking-widest font-black px-3 py-1">Primary Asset</Badge>
                        </div>
                        
                        <div>
                          <h3 className="font-display text-3xl tracking-tighter text-white uppercase group-hover:text-blue-400 transition-colors truncate">{f.name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1.5 font-medium truncate">
                            <MapPin className="size-4 text-blue-500" /> {f.location}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-2">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Base Rate</span>
                            <span className="text-lg font-black text-white">₱{f.hourly_price}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Operational</span>
                            <span className="text-xs font-bold text-white/90">{f.open_hour}:00 - {f.close_hour}:00</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Activity</span>
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">{facilityBookings.length} Bookings</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Health</span>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                              <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                              Optimal
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Commissioned:</span>
                          <span className="text-[10px] text-white/60 font-medium">{f.created_at ? format(parseISO(f.created_at), "MMMM d, yyyy") : "Legacy Entry"}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 w-full md:w-64">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setEditingFacility(f)}
                          className="w-full border-blue-900/30 text-[10px] font-black uppercase tracking-widest h-12 px-8 hover:bg-blue-600 hover:text-white transition-all shadow-glow border-none bg-blue-900/20"
                        >
                          <Pencil className="size-4 mr-2" /> Modify Specs
                        </Button>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleArchive(f.id, false)}
                            className="flex-1 border-amber-900/30 text-[9px] font-black uppercase tracking-widest h-10 hover:bg-amber-600 hover:text-white transition-all bg-amber-950/10"
                          >
                            <Archive className="size-3.5 mr-2" /> Archive
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => deleteFacility(f.id)}
                            className="flex-1 border-red-900/30 text-[9px] font-black uppercase tracking-widest h-10 hover:bg-red-600 hover:text-white transition-all bg-red-950/10"
                          >
                            <Trash2 className="size-3.5 mr-2" /> Purge
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="archive" className="space-y-6 focus-visible:outline-none">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display text-3xl tracking-wider text-white uppercase">Archive Vault</h2>
                <p className="text-muted-foreground text-sm font-medium">Secure storage for decommissioned assets and legacy venues.</p>
              </div>
            </div>

            <div className="grid gap-6">
              {facilities.filter(f => f.is_archived).length === 0 ? (
                <div className="bg-blue-950/5 border border-blue-900/10 rounded-3xl p-24 text-center opacity-40">
                  <div className="size-16 rounded-full bg-blue-900/10 flex items-center justify-center mx-auto mb-6">
                    <Archive className="size-7 text-blue-900/50" />
                  </div>
                  <p className="font-display text-xl tracking-widest uppercase text-blue-900/50">Vault empty</p>
                </div>
              ) : (
                facilities.filter(f => f.is_archived).map((f) => (
                  <div key={f.id} className="bg-black/40 border border-red-900/10 rounded-2xl p-6 flex flex-col md:flex-row gap-8 items-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600/30 group-hover:bg-red-600 transition-colors" />
                    
                    <div className="size-24 rounded-xl bg-black/40 overflow-hidden border border-red-900/20 flex items-center justify-center shrink-0">
                      {f.image_url ? (
                        <img src={f.image_url} alt={f.name} className="w-full h-full object-cover opacity-50" />
                      ) : (
                        <Building2 className="size-8 text-red-900/30" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[9px] uppercase tracking-widest text-red-400 font-black px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">{f.sport_type}</span>
                        <Badge variant="outline" className="text-[8px] uppercase tracking-tighter border-red-900/40 text-red-900/60 font-black">Archive ID: {f.id.slice(0, 8)}</Badge>
                      </div>
                      <h3 className="font-display text-2xl tracking-tight text-white/60 uppercase">{f.name}</h3>
                      <p className="text-xs text-muted-foreground/40 mt-1 font-medium italic">Decommissioned Status</p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleArchive(f.id, true)} 
                        className="flex-1 border-emerald-500/20 text-emerald-500/60 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-[10px] font-black uppercase tracking-widest h-10 px-6"
                      >
                        <RotateCcw className="size-3.5 mr-2" /> Restore Asset
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteFacility(f.id)} 
                        className="flex-1 border-red-500/20 text-red-500/60 hover:bg-red-600 hover:text-white hover:border-red-600 text-[10px] font-black uppercase tracking-widest h-10 px-6"
                      >
                        <Trash2 className="size-3.5 mr-2" /> Purge Permanent
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6 focus-visible:outline-none">
            <div className="bg-card-gradient border border-blue-900/20 rounded-3xl p-8 shadow-card">
              <div className="mb-8">
                <h3 className="text-3xl font-display font-black text-white uppercase tracking-tight">Real-time Scheduler</h3>
                <p className="text-muted-foreground mt-1 font-medium">Monitor your facilities and manage bookings with instant synchronization.</p>
              </div>
              <BookingCalendar ownerId={user.id} />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-10 focus-visible:outline-none">
            <div className="bg-card-gradient border border-blue-900/20 rounded-2xl p-6 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="size-5 text-blue-400" />
                <h3 className="font-display text-2xl tracking-wider text-white uppercase">Analytics Engine</h3>
              </div>
              <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-4 items-end">
                <div>
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-widest font-black">Data Origin</Label>
                  <Input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="bg-black/40 border-blue-900/30" />
                </div>
                <div>
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-widest font-black">Data Termination</Label>
                  <Input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="bg-black/40 border-blue-900/30" />
                </div>
                <Button variant="outline" onClick={exportBookingsCSV} className="border-blue-900/30 text-xs font-black uppercase tracking-widest h-10 px-6">
                  Bookings CSV
                </Button>
                <Button onClick={exportRevenueCSV} className="bg-blue-600 hover:bg-blue-500 text-xs font-black uppercase tracking-widest h-10 px-6">
                  Revenue CSV
                </Button>
              </div>
            </div>

            <div className="bg-card-gradient border border-blue-900/20 rounded-2xl p-8 shadow-card">
              <h3 className="font-display text-2xl tracking-wider mb-6 text-white uppercase">Sport Utilization Matrix</h3>
              {sportBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No historical data available for visualization.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sportBreakdown.map((s) => {
                    const max = Math.max(...sportBreakdown.map((x) => x.count));
                    return (
                      <div key={s.sport} className="p-4 rounded-xl bg-black/20 border border-blue-900/30">
                        <div className="flex justify-between text-xs mb-3">
                          <span className="capitalize font-black tracking-widest text-white/60">{s.sport}</span>
                          <span className="font-black text-blue-400">{s.count} Bookings</span>
                        </div>
                        <div className="h-2 bg-blue-900/30 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: `${(s.count / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="staff" className="space-y-6 focus-visible:outline-none">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-3xl tracking-wider text-white uppercase">Staff Registry</h2>
                <p className="text-muted-foreground text-sm">Manage personnel assigned to your various facilities.</p>
              </div>
              <Button onClick={() => setIsStaffOpen(true)} className="bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-widest text-[10px] h-11 px-6 rounded-xl shadow-glow">
                <Plus className="size-4 mr-2" /> Recruit Staff
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {staff.length === 0 ? (
                <div className="md:col-span-2 bg-blue-950/5 border border-blue-900/10 rounded-3xl p-24 text-center opacity-40">
                  <Users className="size-16 text-blue-900/30 mx-auto mb-6" />
                  <p className="font-display text-xl tracking-widest uppercase text-blue-900/50">No staff registered</p>
                </div>
              ) : (
                staff.map((s) => (
                  <div key={s.id} className="bg-card-gradient border border-blue-900/20 rounded-2xl p-6 flex gap-5 items-center hover:border-blue-500/30 transition-all group">
                    <div className="size-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                      <Users className="size-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-display text-xl tracking-tight text-white uppercase">{s.name}</h4>
                      <p className="text-xs text-blue-400 uppercase tracking-widest font-black">{s.role}</p>
                      <div className="mt-2 text-[10px] text-muted-foreground flex gap-4 uppercase tracking-widest font-medium">
                        <span>{s.email}</span>
                        <span>{s.phone}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteStaff(s.id)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6 focus-visible:outline-none">
            <div>
              <h2 className="font-display text-3xl tracking-wider text-white uppercase">Player Feedback</h2>
              <p className="text-muted-foreground text-sm">Monitor public sentiment and service ratings for your venues.</p>
            </div>

            <div className="grid gap-6">
              {reviews.length === 0 ? (
                <div className="bg-blue-950/5 border border-blue-900/10 rounded-3xl p-24 text-center opacity-40">
                  <MessageSquare className="size-16 text-blue-900/30 mx-auto mb-6" />
                  <p className="font-display text-xl tracking-widest uppercase text-blue-900/50">No reviews yet</p>
                </div>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="bg-card-gradient border border-blue-900/20 rounded-2xl p-8 shadow-card flex flex-col md:flex-row gap-6">
                    <div className="shrink-0 flex md:flex-col items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("size-4", i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-zinc-800")} />
                      ))}
                      <div className="md:mt-2 font-display text-2xl text-white/40">{r.rating}.0</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-display text-xl tracking-tight text-white uppercase">
                          {r.profiles?.display_name || "Anonymous Player"}
                        </h4>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                          {format(parseISO(r.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-muted-foreground italic text-sm leading-relaxed">"{r.comment}"</p>
                      <div className="mt-6 pt-4 border-t border-blue-900/10 flex justify-end">
                        <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black tracking-widest text-blue-400 hover:bg-blue-400/5">
                          Reply to Review
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="support" className="space-y-6 focus-visible:outline-none">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-3xl tracking-wider text-white uppercase">Support Center</h2>
                <p className="text-muted-foreground text-sm">Direct communication with Courtside administration.</p>
              </div>
              <Button onClick={() => setIsTicketOpen(true)} className="bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-widest text-[10px] h-11 px-6 rounded-xl shadow-glow">
                <Send className="size-4 mr-2" /> Open New Ticket
              </Button>
            </div>

            <div className="grid gap-4">
              {supportTickets.length === 0 ? (
                <div className="bg-blue-950/5 border border-blue-900/10 rounded-3xl p-24 text-center opacity-40">
                  <LifeBuoy className="size-16 text-blue-900/30 mx-auto mb-6" />
                  <p className="font-display text-xl tracking-widest uppercase text-blue-900/50">No active tickets</p>
                </div>
              ) : (
                supportTickets.map((t) => (
                  <div key={t.id} className="bg-card-gradient border border-blue-900/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-blue-500/20 transition-all">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className={cn(
                          "uppercase text-[9px] font-black tracking-[0.2em] px-2 py-0.5",
                          t.status === 'open' ? 'border-blue-500/50 text-blue-400 bg-blue-500/5' :
                          t.status === 'resolved' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5' :
                          'border-zinc-700 text-muted-foreground'
                        )}>
                          {t.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                          Ticket #{t.id.slice(0, 8)}
                        </span>
                      </div>
                      <h4 className="font-display text-xl tracking-tight text-white uppercase">{t.subject}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{t.message}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Last Activity</p>
                        <p className="text-xs text-white/60">{format(parseISO(t.updated_at || t.created_at), "MMM d, HH:mm")}</p>
                      </div>
                      <Button variant="outline" size="sm" className="border-blue-900/30 text-[10px] uppercase font-black tracking-widest h-10 px-6">
                        View Thread
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="focus-visible:outline-none">
            <div className="bg-card-gradient border border-blue-900/20 rounded-2xl p-8 shadow-card max-w-2xl">
              <h3 className="font-display text-2xl tracking-wider mb-6 text-white uppercase">Dashboard Preferences</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-blue-900/30">
                  <div>
                    <Label className="text-white font-bold">Automatic Data Refresh</Label>
                    <p className="text-xs text-muted-foreground">Keep stats synchronized in real-time.</p>
                  </div>
                  <Checkbox checked={true} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-blue-900/30">
                  <div>
                    <Label className="text-white font-bold">Include Reminders in CSV</Label>
                    <p className="text-xs text-muted-foreground">Export owner notes with booking data.</p>
                  </div>
                  <Checkbox checked={includeNotesInCSV} onCheckedChange={(v) => setIncludeNotesInCSV(v === true)} />
                </div>
                <Button variant="outline" onClick={handleSignOut} className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <LogOut className="size-4 mr-2" /> Logout Account
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Facility Modal */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col bg-[#0a0d14] border-blue-900/30 text-white p-0 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-8 shrink-0">
              <DialogHeader>
                <DialogTitle className="font-display text-4xl tracking-tight uppercase text-white leading-none">
                  Establish Venue
                </DialogTitle>
                <p className="text-white/70 text-xs uppercase tracking-[0.2em] font-black mt-2">
                  Register a new sports asset to the network
                </p>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-8">
                {/* Visual Identity Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="size-4 text-blue-400" />
                    <Label className="text-blue-400 uppercase text-[10px] tracking-[0.2em] font-black">Visual Identity</Label>
                  </div>
                  <div className="group relative aspect-video rounded-2xl bg-black/60 border-2 border-dashed border-blue-900/30 overflow-hidden flex flex-col items-center justify-center transition-all hover:border-blue-500/50 hover:bg-blue-500/5">
                    {newFacility.image_url ? (
                      <>
                        <img src={newFacility.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                          <Button variant="outline" size="sm" onClick={() => document.getElementById("add-file-upload")?.click()} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            <Camera className="size-3.5 mr-2" /> Replace
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => setNewFacility({ ...newFacility, image_url: "" })} className="bg-red-500/80 hover:bg-red-500">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-center p-6">
                        <div className="size-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-500">
                          {uploading ? <Loader2 className="size-7 animate-spin" /> : <Camera className="size-7" />}
                        </div>
                        <div>
                          <button type="button" onClick={() => document.getElementById("add-file-upload")?.click()} className="text-sm font-black text-white hover:text-blue-400 transition-colors uppercase tracking-widest">Upload Master Image</button>
                          <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest opacity-60">High-resolution PNG or JPG · Max 2MB</p>
                        </div>
                      </div>
                    )}
                    <input id="add-file-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Facility Name</Label>
                    <Input 
                      placeholder="e.g. Butuan Sports Center"
                      value={newFacility.name} 
                      onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })} 
                      className="bg-black/40 border-blue-900/30 h-14 rounded-xl focus:border-blue-500/50 transition-all font-display text-lg tracking-wide" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Sport Type</Label>
                      <Select value={newFacility.sport_type} onValueChange={(v) => setNewFacility({ ...newFacility, sport_type: v })}>
                        <SelectTrigger className="bg-black/40 border-blue-900/30 h-14 rounded-xl capitalize font-medium text-white/90">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0f172a] border-blue-900/30">
                          {SPORTS.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize text-white/80 focus:bg-blue-600 focus:text-white">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Hourly Rate (₱)</Label>
                      <Input 
                        type="number" 
                        min={0} 
                        value={newFacility.hourly_price} 
                        onChange={(e) => setNewFacility({ ...newFacility, hourly_price: Number(e.target.value) })} 
                        className="bg-black/40 border-blue-900/30 h-14 rounded-xl font-bold text-blue-400" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Location Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-blue-500/50" />
                      <Input 
                        value={newFacility.location} 
                        onChange={(e) => setNewFacility({ ...newFacility, location: e.target.value })} 
                        className="bg-black/40 border-blue-900/30 h-14 rounded-xl pl-12" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Open Time (24h)</Label>
                      <Input 
                        type="number" min={0} max={23} 
                        value={newFacility.open_hour} 
                        onChange={(e) => setNewFacility({ ...newFacility, open_hour: Number(e.target.value) })} 
                        className="bg-black/40 border-blue-900/30 h-14 rounded-xl" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Close Time (24h)</Label>
                      <Input 
                        type="number" min={1} max={24} 
                        value={newFacility.close_hour} 
                        onChange={(e) => setNewFacility({ ...newFacility, close_hour: Number(e.target.value) })} 
                        className="bg-black/40 border-blue-900/30 h-14 rounded-xl" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Description</Label>
                    <Textarea 
                      rows={3} 
                      placeholder="Tell players what makes this facility unique..."
                      value={newFacility.description} 
                      onChange={(e) => setNewFacility({ ...newFacility, description: e.target.value })} 
                      className="bg-black/40 border-blue-900/30 rounded-xl resize-none focus:border-blue-500/50 transition-all p-4" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-black/40 border-t border-blue-900/20 shrink-0">
              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsAddOpen(false)} 
                  className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAdd} 
                  disabled={saving || uploading} 
                  className="flex-[2] font-black uppercase tracking-widest text-[10px] h-14 bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] rounded-2xl"
                >
                  {saving ? "Processing..." : "Establish Registry"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Facility Modal */}
        <Dialog open={!!editingFacility} onOpenChange={(v) => !v && setEditingFacility(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col bg-[#0a0d14] border-blue-900/30 text-white p-0 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-8 shrink-0">
              <DialogHeader>
                <DialogTitle className="font-display text-4xl tracking-tight uppercase text-white leading-none">
                  Modify Venue
                </DialogTitle>
                <p className="text-white/70 text-xs uppercase tracking-[0.2em] font-black mt-2">
                  Update your facility specifications
                </p>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {editingFacility && (
                <div className="space-y-8">
                  {/* Visual Identity Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="size-4 text-blue-400" />
                      <Label className="text-blue-400 uppercase text-[10px] tracking-[0.2em] font-black">Visual Identity</Label>
                    </div>
                    <div className="group relative aspect-video rounded-2xl bg-black/60 border-2 border-dashed border-blue-900/30 overflow-hidden flex flex-col items-center justify-center transition-all hover:border-blue-500/50 hover:bg-blue-500/5">
                      {editingFacility.image_url ? (
                        <>
                          <img src={editingFacility.image_url} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                            <Button variant="outline" size="sm" onClick={() => document.getElementById("edit-file-upload")?.click()} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                              <Camera className="size-3.5 mr-2" /> Replace
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setEditingFacility({ ...editingFacility, image_url: null })} className="bg-red-500/80 hover:bg-red-500">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-center p-6">
                          <div className="size-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-500">
                            {uploading ? <Loader2 className="size-7 animate-spin" /> : <Camera className="size-7" />}
                          </div>
                          <div>
                            <button type="button" onClick={() => document.getElementById("edit-file-upload")?.click()} className="text-sm font-black text-white hover:text-blue-400 transition-colors uppercase tracking-widest">Upload Master Image</button>
                            <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest opacity-60">High-resolution PNG or JPG · Max 2MB</p>
                          </div>
                        </div>
                      )}
                      <input id="edit-file-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Facility Name</Label>
                      <Input 
                        placeholder="e.g. Butuan Sports Center"
                        value={editingFacility.name} 
                        onChange={(e) => setEditingFacility({ ...editingFacility, name: e.target.value })} 
                        className="bg-black/40 border-blue-900/30 h-14 rounded-xl focus:border-blue-500/50 transition-all font-display text-lg tracking-wide" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Sport Type</Label>
                        <Select value={editingFacility.sport_type} onValueChange={(v) => setEditingFacility({ ...editingFacility, sport_type: v })}>
                          <SelectTrigger className="bg-black/40 border-blue-900/30 h-14 rounded-xl capitalize font-medium text-white/90">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0f172a] border-blue-900/30">
                            {SPORTS.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize text-white/80 focus:bg-blue-600 focus:text-white">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Hourly Rate (₱)</Label>
                        <Input 
                          type="number" 
                          min={0} 
                          value={editingFacility.hourly_price} 
                          onChange={(e) => setEditingFacility({ ...editingFacility, hourly_price: Number(e.target.value) })} 
                          className="bg-black/40 border-blue-900/30 h-14 rounded-xl font-bold text-blue-400" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Location Address</Label>
                      <Input 
                        value={editingFacility.location} 
                        onChange={(e) => setEditingFacility({ ...editingFacility, location: e.target.value })} 
                        className="bg-black/40 border-blue-900/30 h-14 rounded-xl" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Open Time (24h)</Label>
                        <Input 
                          type="number" min={0} max={23} 
                          value={editingFacility.open_hour} 
                          onChange={(e) => setEditingFacility({ ...editingFacility, open_hour: Number(e.target.value) })} 
                          className="bg-black/40 border-blue-900/30 h-14 rounded-xl" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Close Time (24h)</Label>
                        <Input 
                          type="number" min={1} max={24} 
                          value={editingFacility.close_hour} 
                          onChange={(e) => setEditingFacility({ ...editingFacility, close_hour: Number(e.target.value) })} 
                          className="bg-black/40 border-blue-900/30 h-14 rounded-xl" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black ml-1">Description</Label>
                      <Textarea 
                        rows={3} 
                        value={editingFacility.description || ""} 
                        onChange={(e) => setEditingFacility({ ...editingFacility, description: e.target.value })} 
                        className="bg-black/40 border-blue-900/30 rounded-xl resize-none" 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-black/40 border-t border-blue-900/20 shrink-0">
              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setEditingFacility(null)} 
                  className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleEdit} 
                  disabled={saving || uploading} 
                  className="flex-[2] font-black uppercase tracking-widest text-[10px] h-14 bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] rounded-2xl"
                >
                  {saving ? "Processing..." : "Apply Modifications"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Recruit Staff Modal */}
        <Dialog open={isStaffOpen} onOpenChange={setIsStaffOpen}>
          <DialogContent className="sm:max-w-xl bg-[#0a0d14] border-blue-900/30 text-white p-0 rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-8">
              <DialogHeader>
                <DialogTitle className="font-display text-4xl tracking-tight uppercase text-white">Recruit Personnel</DialogTitle>
                <p className="text-white/70 text-xs uppercase tracking-widest font-black mt-2">Onboard new staff to your sports network</p>
              </DialogHeader>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-blue-400 ml-1">Assigned Facility</Label>
                <Select value={newStaff.facility_id} onValueChange={(v) => setNewStaff({ ...newStaff, facility_id: v })}>
                  <SelectTrigger className="bg-black/40 border-blue-900/30 h-14 rounded-xl">
                    <SelectValue placeholder="Select Venue" />
                  </SelectTrigger>
                  <SelectContent className="bg-blue-950 border-blue-900/40 text-white">
                    {facilities.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-blue-400 ml-1">Staff Name</Label>
                  <Input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} className="bg-black/40 border-blue-900/30 h-14 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-blue-400 ml-1">Role Title</Label>
                  <Input value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })} className="bg-black/40 border-blue-900/30 h-14 rounded-xl" placeholder="e.g. Manager" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-blue-400 ml-1">Email Address</Label>
                  <Input value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} className="bg-black/40 border-blue-900/30 h-14 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-blue-400 ml-1">Contact Number</Label>
                  <Input value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} className="bg-black/40 border-blue-900/30 h-14 rounded-xl" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setIsStaffOpen(false)} className="flex-1 border-blue-900/30 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</Button>
                <Button onClick={handleAddStaff} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow">
                  {saving ? <Loader2 className="animate-spin" /> : "Deploy Personnel"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Support Ticket Modal */}
        <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
          <DialogContent className="sm:max-w-xl bg-[#0a0d14] border-blue-900/30 text-white p-0 rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-8">
              <DialogHeader>
                <DialogTitle className="font-display text-4xl tracking-tight uppercase text-white">Open Support Ticket</DialogTitle>
                <p className="text-white/70 text-xs uppercase tracking-widest font-black mt-2">Request assistance from system administrators</p>
              </DialogHeader>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-blue-400 ml-1">Subject</Label>
                <Input value={newTicket.subject} onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })} className="bg-black/40 border-blue-900/30 h-14 rounded-xl" placeholder="Briefly describe the issue" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-blue-400 ml-1">Detailed Message</Label>
                <Textarea value={newTicket.message} onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })} className="bg-black/40 border-blue-900/30 min-h-[150px] rounded-xl" placeholder="Provide full details..." />
              </div>
              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setIsTicketOpen(false)} className="flex-1 border-blue-900/30 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</Button>
                <Button onClick={handleAddTicket} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow">
                  {saving ? <Loader2 className="animate-spin" /> : "Dispatch Ticket"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-gradient-to-br from-blue-950/40 to-black/60 border border-blue-900/20 rounded-2xl p-6 shadow-card group hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
        <Icon className="size-20" />
      </div>
      <div className="size-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5 text-blue-400 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-500">
        <Icon className="size-5" />
      </div>
      <div className="font-display text-4xl tracking-tight font-black text-white mb-1.5 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-blue-400/60 font-black">{label}</div>
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
  const [notes, setNotes] = useState(booking.reminder_text || "");
  const [state, setState] = useState<"idle" | "typing" | "saving" | "saved" | "error">("idle");
  const initial = booking.reminder_text || "";

  useEffect(() => {
    if (notes === initial && state === "idle") return;
    if (notes === initial) { setState("idle"); return; }
    setState("typing");
    const t = setTimeout(async () => {
      setState("saving");
      const value = notes.trim() ? notes.trim() : null;
      const { error } = await supabase.from("bookings" as any).update({ reminder_text: value }).eq("id", booking.id);
      if (error) { setState("error"); toast.error(error.message); return; }
      onSaved(value);
      setState("saved");
    }, 800);
    return () => clearTimeout(t);
  }, [notes]);

  useEffect(() => {
    if (state !== "saved") return;
    const t = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(t);
  }, [state]);

  const statusColor =
    booking.status === "paid" ? "text-blue-400"
    : booking.status === "cancelled" ? "text-destructive"
    : booking.status === "completed" ? "text-emerald-400"
    : "text-muted-foreground";

  const indicator = (() => {
    switch (state) {
      case "typing": return <span className="text-muted-foreground font-black uppercase text-[9px] tracking-widest">Editing…</span>;
      case "saving": return <span className="text-muted-foreground flex items-center gap-1 font-black uppercase text-[9px] tracking-widest"><Loader2 className="size-2.5 animate-spin" /> Syncing…</span>;
      case "saved": return <span className="text-blue-400 flex items-center gap-1 font-black uppercase text-[9px] tracking-widest"><Save className="size-2.5" /> Logged</span>;
      case "error": return <span className="text-destructive font-black uppercase text-[9px] tracking-widest">Sync Error</span>;
      default: return <span className="text-muted-foreground/30 font-black uppercase text-[9px] tracking-widest">Autosave Active</span>;
    }
  })();

  return (
    <div className="bg-card-gradient border border-blue-900/10 rounded-2xl p-6 shadow-card grid md:grid-cols-[300px_1fr] gap-6 items-start hover:bg-blue-900/5 transition-colors">
      <div>
        <span className="text-[10px] uppercase tracking-widest text-blue-400 font-black">{sportType}</span>
        <div className="font-display text-2xl tracking-tight font-black text-white leading-tight mt-1">{facilityName}</div>
        <div className="text-xs font-bold text-muted-foreground mt-2">
          {format(parseISO(booking.booking_date), "PPP")} · {booking.start_hour}:00–{booking.end_hour}:00
        </div>
        <div className="flex items-center gap-3 mt-4">
          <span className="text-[10px] font-mono text-white/30 tracking-widest">#{booking.id.slice(0, 8).toUpperCase()}</span>
          <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-blue-900/30", statusColor)}>
            {booking.status}
          </Badge>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
            <StickyNote className="size-3.5 text-blue-400" /> Owner Reminder
          </Label>
          {indicator}
        </div>
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Arrive 10 min early, look for the gate entrance B."
          className="bg-black/30 border-blue-900/30 rounded-xl text-white placeholder:text-white/10"
        />
      </div>
    </div>
  );
}
