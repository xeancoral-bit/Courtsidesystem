import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Building2, 
  Calendar, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  LayoutDashboard,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  Terminal,
  ChevronRight,
  PlusCircle,
  FileText,
  Settings as SettingsIcon,
  RefreshCw
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const data = [
  { name: "Mon", bookings: 400 },
  { name: "Tue", bookings: 300 },
  { name: "Wed", bookings: 500 },
  { name: "Thu", bookings: 280 },
  { name: "Fri", bookings: 590 },
  { name: "Sat", bookings: 800 },
  { name: "Sun", bookings: 750 },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    facilities: 0,
    bookings: 0,
    activeSessions: 0
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Command Center · Administration";
    fetchStats();
    fetchRecentLogs();

    // Subscribe to realtime logs
    const channel = supabase
      .channel('admin_dashboard')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload: any) => {
        setRecentLogs(prev => [payload.new, ...prev].slice(0, 5));
        fetchStats(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const [profiles, facilities, bookings] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("facilities").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true })
      ]);

      setStats({
        users: profiles.count || 0,
        facilities: facilities.count || 0,
        bookings: bookings.count || 0,
        activeSessions: Math.floor(Math.random() * 20) + 5 // Mocking active sessions
      });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const fetchRecentLogs = async () => {
    const { data, error } = await (supabase
      .from("audit_logs" as any) as any)
      .select("*, profiles(display_name)")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error) setRecentLogs(data || []);
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 mb-4 shadow-[0_0_15px_rgba(var(--primary),0.15)]">
              <ShieldCheck className="size-4 text-primary" />
              <span className="text-xs uppercase tracking-widest text-primary font-bold">
                Level 4 Access · Authorized Only
              </span>
            </div>
            <h1 className="text-6xl font-display font-black tracking-tighter text-white uppercase leading-[0.9]">
              Command <span className="text-primary">Center</span>
            </h1>
            <p className="text-muted-foreground text-lg mt-4 max-w-2xl">
              Real-time synchronization across all facility endpoints. Monitor, modulate, and manage global operations.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-sm">
              <div className="size-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System Status</p>
                <p className="text-sm font-bold text-white uppercase tracking-tighter">All Nodes Operational</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Operatives", value: stats.users, icon: Users, color: "text-blue-500", trend: "+12%" },
            { label: "Facility Nodes", value: stats.facilities, icon: Building2, color: "text-primary", trend: "+2" },
            { label: "Active Transactions", value: stats.bookings, icon: Activity, color: "text-amber-500", trend: "+84%" },
            { label: "Neural Traffic", value: stats.activeSessions, icon: TrendingUp, color: "text-green-500", trend: "Stable" },
          ].map((stat, i) => (
            <div key={i} className="group relative bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/[0.08] transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <stat.icon className="size-20" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-xl bg-white/5 border border-white/10", stat.color)}>
                    <stat.icon className="size-5" />
                  </div>
                  <Badge variant="outline" className="border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
                    {stat.trend}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-4xl font-display font-black text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">Traffic Analytics</h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">Global Booking Volume (7D Window)</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 uppercase tracking-widest text-[10px] font-black">Realtime</Badge>
                </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#ffffff30" 
                      fontSize={10} 
                      fontWeight={800}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#ffffff30" 
                      fontSize={10} 
                      fontWeight={800}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0a0a0c', 
                        border: '1px solid #ffffff10',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                      }}
                      itemStyle={{ color: '#d4af37', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="#d4af37" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorBookings)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Access Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "New Facility", icon: PlusCircle, path: "/admin/partners" },
                { label: "System Logs", icon: FileText, path: "/admin/logs" },
                { label: "User Access", icon: Users, path: "/admin/users" },
                { label: "Registry", icon: SettingsIcon, path: "/admin/settings" },
              ].map((action, i) => (
                <Link key={i} to={action.path}>
                  <Button variant="outline" className="w-full h-24 flex-col gap-3 rounded-2xl border-white/5 bg-white/5 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all group">
                    <action.icon className="size-6 transition-transform group-hover:scale-110" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{action.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity Feed Sidebar */}
          <div className="space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-md flex flex-col h-full">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Terminal className="size-4 text-primary" />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Surveillance Feed</h3>
                </div>
                <Button variant="ghost" size="icon" className="size-8 rounded-full hover:bg-white/5" onClick={fetchRecentLogs}>
                  <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                </Button>
              </div>

              <div className="space-y-6">
                {recentLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
                    <Clock className="size-10 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Logs…</p>
                  </div>
                ) : (
                  recentLogs.map((log, i) => (
                    <div key={log.id} className="relative pl-6 pb-6 border-l border-white/10 last:pb-0">
                      <div className="absolute left-[-5px] top-0 size-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="p-0 border-none text-[10px] font-black uppercase tracking-widest text-primary leading-none">
                            {log.action}
                          </Badge>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{format(new Date(log.created_at), "HH:mm")}</span>
                        </div>
                        <p className="text-sm text-white/80 font-medium">
                          {log.profiles?.display_name || "System"} modified {log.target_type}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate italic">
                          ID: {log.target_id?.slice(0, 12)}...
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-auto pt-8">
                <Link to="/admin/logs">
                  <Button variant="outline" className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5">
                    View Full Audit Trail <ChevronRight className="size-3 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Alert Box */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-amber-500">Node Warning</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Peak activity detected in North Sector. Recommend monitoring facility load capacities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
