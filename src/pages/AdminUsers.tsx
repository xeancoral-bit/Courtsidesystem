import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area
} from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { downloadCSV, toCSV } from "@/lib/csv";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  TrendingUp,
  KeyRound,
  History,
  Download,
  ArrowLeft,
} from "lucide-react";

type Role = "admin" | "owner" | "user";
type SortKey = "name" | "joined" | "role";
type SortDir = "asc" | "desc";
type RoleFilter = "all" | Role | "no-role";

interface ProfileRow {
  id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: Role;
}

interface AuditRow {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  action: "grant" | "revoke" | "password_reset";
  role: Role | null;
  created_at: string;
}

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-destructive/15 text-destructive border-destructive/30",
  owner: "bg-accent/15 text-accent border-accent/30",
  user: "bg-muted text-muted-foreground border-border",
};

const ROLE_RANK: Record<Role | "none", number> = { admin: 3, owner: 2, user: 1, none: 0 };

export default function AdminUsers() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showAudit, setShowAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditAction, setAuditAction] = useState<"all" | "grant" | "revoke" | "password_reset">("all");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditSortDir, setAuditSortDir] = useState<SortDir>("desc");
  const [confirm, setConfirm] = useState<
    | { kind: "grant"; userId: string; role: Role; name: string }
    | { kind: "revoke"; userId: string; role: Role; name: string }
    | { kind: "reset"; userId: string; name: string }
    | null
  >(null);

  useEffect(() => {
    document.title = "Admin · Users · Courtside";
  }, []);

  useEffect(() => {
    if (authLoading || rolesLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, rolesLoading, isAdmin]);

  // Realtime notification feed: toast when audit log gets new entries.
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-audit-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_audit_log" },
        (payload) => {
          const row = payload.new as AuditRow;
          // Skip self-initiated actions to avoid double-toasting.
          if (row.admin_user_id === user?.id) return;
          const label =
            row.action === "password_reset"
              ? "Password reset triggered"
              : `Role ${row.action}: ${row.role ?? ""}`;
          toast(label, { description: "New admin action recorded" });
          setAudit((prev) => [row, ...prev].slice(0, 200));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, user?.id]);

  const refresh = async () => {
    setLoading(true);
    const [{ data: profs, error: pErr }, { data: rs, error: rErr }, { data: au, error: aErr }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id,display_name,phone,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
        supabase
          .from("admin_audit_log" as any)
          .select("id,admin_user_id,target_user_id,action,role,created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
    if (pErr) toast.error(pErr.message);
    if (rErr) toast.error(rErr.message);
    if (aErr && aErr.code !== "PGRST116") {
      // ignore "no rows" style errors silently
      console.warn("Audit fetch:", aErr.message);
    }
    setProfiles((profs as ProfileRow[]) || []);
    setRoles((rs as RoleRow[]) || []);
    setAudit(((au as unknown) as AuditRow[]) || []);
    setLoading(false);
  };

  const rolesByUser = useMemo(() => {
    const m = new Map<string, Set<Role>>();
    roles.forEach((r) => {
      const set = m.get(r.user_id) || new Set<Role>();
      set.add(r.role);
      m.set(r.user_id, set);
    });
    return m;
  }, [roles]);

  const profileById = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const adminCount = useMemo(() => {
    let n = 0;
    rolesByUser.forEach((set) => {
      if (set.has("admin")) n++;
    });
    return n;
  }, [rolesByUser]);

  const counts = useMemo(() => {
    let admins = 0,
      owners = 0,
      users = 0;
    rolesByUser.forEach((set) => {
      if (set.has("admin")) admins++;
      if (set.has("owner")) owners++;
      if (set.has("user") && !set.has("admin") && !set.has("owner")) users++;
    });
    return { admins, owners, users, total: profiles.length };
  }, [rolesByUser, profiles.length]);

  const topRole = (id: string): Role | "none" => {
    const set = rolesByUser.get(id);
    if (!set) return "none";
    if (set.has("admin")) return "admin";
    if (set.has("owner")) return "owner";
    if (set.has("user")) return "user";
    return "none";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = profiles.filter((p) => {
      if (q) {
        const haystack = [p.display_name, p.phone, p.id].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      const set = rolesByUser.get(p.id);
      switch (roleFilter) {
        case "all":
          return true;
        case "admin":
          return !!set?.has("admin");
        case "owner":
          return !!set?.has("owner");
        case "user":
          return !!set?.has("user") && !set?.has("admin") && !set?.has("owner");
        case "no-role":
          return !set || set.size === 0;
      }
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = (a.display_name || "").localeCompare(b.display_name || "");
      } else if (sortKey === "joined") {
        cmp = a.created_at.localeCompare(b.created_at);
      } else {
        cmp = ROLE_RANK[topRole(a.id)] - ROLE_RANK[topRole(b.id)];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, search, roleFilter, sortKey, sortDir, rolesByUser]);

  const growthData = useMemo(() => {
    const daily: Record<string, number> = {};
    profiles.forEach(p => {
      const date = format(parseISO(p.created_at), "MMM dd");
      daily[date] = (daily[date] || 0) + 1;
    });
    return Object.entries(daily)
      .map(([name, nodes]) => ({ name, nodes }))
      .reverse()
      .slice(-7);
  }, [profiles]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "joined" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="size-3.5 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
  };

  const grantRole = async (userId: string, role: Role) => {
    const { error } = await supabase.rpc("admin_grant_role", {
      _target_user_id: userId,
      _role: role,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Granted ${role}`);
    refresh();
  };

  const revokeRole = async (userId: string, role: Role) => {
    // Client-side guardrail that mirrors the DB safeguard so UX is clearer
    if (role === "admin" && adminCount <= 1) {
      toast.error("Cannot revoke the last remaining admin");
      return;
    }
    const { error } = await supabase.rpc("admin_revoke_role", {
      _target_user_id: userId,
      _role: role,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Revoked ${role}`);
    refresh();
  };

  const sendPasswordReset = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { target_user_id: userId },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if ((data as any)?.error) {
      toast.error((data as any).error);
      return;
    }
    toast.success("Password reset email sent");
    refresh();
  };

  if (authLoading || rolesLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-20 text-center text-muted-foreground">Loading admin…</main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-20 max-w-2xl text-center">
          <ShieldAlert className="size-12 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-4xl tracking-wider mb-3">Admin access required</h1>
          <p className="text-muted-foreground mb-6">
            This area is restricted to platform administrators. If you believe this is a mistake,
            contact an existing admin to grant your account the role.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">
              <ArrowLeft className="size-4 mr-2" />
              Back to Portal
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const lastAdminGuard = (targetId: string) =>
    adminCount <= 1 && rolesByUser.get(targetId)?.has("admin");

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
                <span className="text-[10px] font-mono tracking-[0.3em] text-accent uppercase">ADMIN_TERMINAL // USER_REGISTRY</span>
              </div>
            </div>
            <h1 className="font-display text-7xl md:text-8xl tracking-tighter leading-[0.85] uppercase">
              USER_<span className="text-gradient">NODES</span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground/60 leading-relaxed font-mono tracking-tight">
              Central authorization registry. Manage node permissions, security credentials, and operational audits across the Courtside network.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setShowAudit((v) => !v)}
              className={`h-14 px-8 rounded-2xl border-white/10 font-mono text-[10px] tracking-[0.2em] uppercase transition-all duration-500 ${showAudit ? 'bg-accent text-accent-foreground border-accent shadow-glow' : 'hover:bg-white/5'}`}
            >
              <History className={`size-4 mr-2 ${showAudit ? 'animate-spin-slow' : ''}`} />
              {showAudit ? "TERMINATE_AUDIT" : "INITIALIZE_AUDIT_STREAM"}
            </Button>
          </div>
        </div>

        {/* Analytics Hub */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <FilterCard
            icon={Users}
            label="TOTAL_REGISTRY"
            value={counts.total.toString()}
            active={roleFilter === "all"}
            onClick={() => setRoleFilter("all")}
          />
          <FilterCard
            icon={ShieldCheck}
            label="SUPERUSER_NODES"
            value={counts.admins.toString()}
            active={roleFilter === "admin"}
            onClick={() => setRoleFilter("admin")}
            isAccent
          />
          <FilterCard
            icon={UserCog}
            label="OPERATOR_NODES"
            value={counts.owners.toString()}
            active={roleFilter === "owner"}
            onClick={() => setRoleFilter("owner")}
          />
          <FilterCard
            icon={UserPlus}
            label="CONSUMER_NODES"
            value={counts.users.toString()}
            active={roleFilter === "user"}
            onClick={() => setRoleFilter("user")}
          />
        </div>

        {/* Analytics Growth Chart */}
        <section className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-elevated overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all pointer-events-none">
            <TrendingUp className="size-64 text-accent" />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="size-1.5 rounded-full bg-accent shadow-glow-sm" />
                <h2 className="font-display text-4xl tracking-tighter uppercase">NODE_GROWTH_ANALYSIS</h2>
              </div>
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground/60 uppercase">TEMPORAL_DISTRIBUTION // 7_DAY_WINDOW</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase mb-1">AGGREGATE_FLUX</p>
                <p className="text-2xl font-display text-accent">+{profiles.length} <span className="text-[10px] text-muted-foreground/40 font-mono">NODES</span></p>
              </div>
              <div className="size-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-accent">
                <TrendingUp className="size-6" />
              </div>
            </div>
          </div>

          <div className="h-[300px] w-full relative z-10 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(10,10,10,0.9)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    backdropFilter: 'blur(10px)'
                  }}
                  itemStyle={{ color: 'hsl(var(--accent))' }}
                />
                <Bar 
                  dataKey="nodes" 
                  fill="url(#barGradient)" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[320px] group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH BY IDENTIFIER, COORDINATES, OR METADATA..."
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
          </div>
          {roleFilter !== "all" && (
            <Badge
              variant="outline"
              className="h-16 px-6 gap-3 rounded-2xl border-accent/30 bg-accent/5 text-accent font-mono text-[10px] tracking-widest uppercase cursor-pointer hover:bg-accent/10 transition-all"
              onClick={() => setRoleFilter("all")}
            >
              FILTER_ACTIVE: {roleFilter}
              <XCircle className="size-3.5" />
            </Badge>
          )}
        </div>

        {/* Audit Log Panel */}
        {showAudit && (() => {
          const filteredAudit = audit.filter((a) => {
            if (auditAction !== "all" && a.action !== auditAction) return false;
            if (auditFrom && a.created_at < auditFrom) return false;
            if (auditTo && a.created_at > `${auditTo}T23:59:59`) return false;
            const q = auditSearch.trim().toLowerCase();
            if (q) {
              const adminName = profileById.get(a.admin_user_id)?.display_name || "";
              const targetName = profileById.get(a.target_user_id)?.display_name || "";
              const hay = [adminName, targetName, a.admin_user_id, a.target_user_id, a.role ?? "", a.action].join(" ").toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          });
          const sortedAudit = [...filteredAudit].sort((a, b) => {
            const cmp = a.created_at.localeCompare(b.created_at);
            return auditSortDir === "asc" ? cmp : -cmp;
          });
          const exportAudit = () => {
            const rows = sortedAudit.map((a) => ({
              timestamp: a.created_at,
              action: a.action,
              role: a.role ?? "",
              admin_id: a.admin_user_id,
              admin_name: profileById.get(a.admin_user_id)?.display_name ?? "",
              target_id: a.target_user_id,
              target_name: profileById.get(a.target_user_id)?.display_name ?? "",
            }));
            downloadCSV(`audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`, toCSV(rows, ["timestamp", "action", "role", "admin_id", "admin_name", "target_id", "target_name"]));
            toast.success("METADATA_EXPORT_COMPLETE");
          };
          return (
            <section className="animate-in slide-in-from-top-4 duration-500 bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-elevated">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <History className="size-5 text-accent animate-pulse" />
                    <h2 className="font-display text-4xl tracking-tighter uppercase">AUDIT_STREAM</h2>
                  </div>
                  <p className="text-[10px] font-mono tracking-widest text-muted-foreground/60 uppercase">
                    INLINE_MODIFICATIONS // {sortedAudit.length} RECORDS_PARSED
                  </p>
                </div>
                <Button variant="outline" size="lg" onClick={exportAudit} disabled={sortedAudit.length === 0} className="h-12 px-6 rounded-xl border-white/10 font-mono text-[10px] tracking-widest uppercase bg-white/5 hover:bg-white/10">
                  <Download className="size-4 mr-2" /> EXPORT_CSV
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/30" />
                  <Input
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="SCAN_RECORDS..."
                    className="h-12 pl-11 bg-black/20 border-white/5 rounded-xl font-mono text-[10px] tracking-widest"
                  />
                </div>
                <Select value={auditAction} onValueChange={(v) => setAuditAction(v as typeof auditAction)}>
                  <SelectTrigger className="h-12 bg-black/20 border-white/5 rounded-xl font-mono text-[10px] tracking-widest uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                    <SelectItem value="all" className="font-mono text-[10px] tracking-widest uppercase">ALL_ACTIONS</SelectItem>
                    <SelectItem value="grant" className="font-mono text-[10px] tracking-widest uppercase">GRANT</SelectItem>
                    <SelectItem value="revoke" className="font-mono text-[10px] tracking-widest uppercase">REVOKE</SelectItem>
                    <SelectItem value="password_reset" className="font-mono text-[10px] tracking-widest uppercase">PW_RESET</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input type="date" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} className="h-12 bg-black/20 border-white/5 rounded-xl font-mono text-[10px]" />
                  <Input type="date" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} className="h-12 bg-black/20 border-white/5 rounded-xl font-mono text-[10px]" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/10">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground h-12">
                        <button onClick={() => setAuditSortDir((d) => (d === "asc" ? "desc" : "asc"))} className="flex items-center gap-2">
                          TIMESTAMP <SortIcon k="joined" />
                        </button>
                      </TableHead>
                      <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground h-12">ORIGIN_ADMIN</TableHead>
                      <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground h-12">ACTION_VECTOR</TableHead>
                      <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground h-12">TARGET_NODE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAudit.map((a) => {
                      const adminName = profileById.get(a.admin_user_id)?.display_name || a.admin_user_id.slice(0, 8).toUpperCase();
                      const targetName = profileById.get(a.target_user_id)?.display_name || a.target_user_id.slice(0, 8).toUpperCase();
                      return (
                        <TableRow key={a.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                          <TableCell className="font-mono text-[10px] text-muted-foreground/60 whitespace-nowrap">
                            {formatDistanceToNow(parseISO(a.created_at), { addSuffix: true }).toUpperCase()}
                          </TableCell>
                          <TableCell className="font-display text-sm tracking-tight">{adminName}</TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] uppercase tracking-widest font-black h-5 border-none ${
                              a.action === 'grant' ? 'bg-primary/10 text-primary' : a.action === 'revoke' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'
                            }`}>
                              {a.action === 'password_reset' ? 'RESET' : `${a.action} ${a.role ?? ''}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-display text-sm tracking-tight text-muted-foreground">{targetName}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>
          );
        })()}

        {/* Main Registry Table */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="size-1.5 rounded-full bg-primary" />
              <h2 className="font-display text-4xl tracking-tighter uppercase">REGISTRY_OUTPUT</h2>
            </div>
            <p className="text-[10px] font-mono tracking-[0.3em] text-muted-foreground/40 uppercase">
              LIVE_DATA_FEED // ENCRYPTED_HANDSHAKE
            </p>
          </div>

          <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-elevated">
            {filtered.length === 0 ? (
              <div className="py-32 text-center space-y-4">
                <Users className="size-12 text-muted-foreground/10 mx-auto" />
                <p className="font-mono text-xs tracking-widest text-muted-foreground/40 uppercase">NO_MATCHING_NODES_FOUND</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="h-16 px-8">
                      <button onClick={() => toggleSort("name")} className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase text-muted-foreground hover:text-white transition-colors">
                        NODE_IDENTIFIER <SortIcon k="name" />
                      </button>
                    </TableHead>
                    <TableHead className="h-16">
                      <button onClick={() => toggleSort("joined")} className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase text-muted-foreground hover:text-white transition-colors">
                        REGISTRATION_DATE <SortIcon k="joined" />
                      </button>
                    </TableHead>
                    <TableHead className="h-16">
                      <button onClick={() => toggleSort("role")} className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase text-muted-foreground hover:text-white transition-colors">
                        PERMISSIONS <SortIcon k="role" />
                      </button>
                    </TableHead>
                    <TableHead className="h-16 text-right px-8 font-mono text-[10px] tracking-widest uppercase text-muted-foreground">VECTORS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const userRoles = rolesByUser.get(p.id) || new Set<Role>();
                    const isSelf = p.id === user?.id;
                    const isAdminUser = userRoles.has("admin");
                    const isOwnerUser = userRoles.has("owner");
                    const blockRevokeAdmin = isAdminUser && (isSelf || lastAdminGuard(p.id));
                    return (
                      <TableRow key={p.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                        <TableCell className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              <span className="font-display text-xl tracking-tight text-white group-hover:text-accent transition-colors">
                                {p.display_name || "UNIDENTIFIED_NODE"}
                              </span>
                              {isSelf && (
                                <Badge className="bg-accent/10 text-accent text-[8px] font-black tracking-widest border-none px-2 h-4">ORIGIN</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground/40 tracking-wider">
                              <span className="text-accent/40">ID:{p.id.slice(0, 12).toUpperCase()}</span>
                              {p.phone && <span>TL:{p.phone}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground tracking-tighter">
                            {format(parseISO(p.created_at), "MMM_dd_yyyy").toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {(["admin", "owner", "user"] as Role[]).map((r) =>
                              userRoles.has(r) ? (
                                <Badge key={r} className={`text-[9px] font-black tracking-widest border-none h-6 px-3 ${ROLE_BADGE[r]}`}>
                                  {r.toUpperCase()}
                                </Badge>
                              ) : null,
                            )}
                            {userRoles.size === 0 && (
                              <span className="text-[10px] font-mono tracking-widest text-muted-foreground/20 uppercase">NO_PRIVILEGES</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-8">
                          <div className="flex items-center justify-end gap-2">
                            {isOwnerUser ? (
                              <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: "revoke", userId: p.id, role: "owner", name: p.display_name || "this user" })} className="h-9 rounded-xl border border-white/5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-[10px] font-mono tracking-widest uppercase">
                                <UserMinus className="size-3.5 mr-2" /> REVOKE_OWNER
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: "grant", userId: p.id, role: "owner", name: p.display_name || "this user" })} className="h-9 rounded-xl border border-white/5 hover:bg-accent/10 hover:text-accent hover:border-accent/20 text-[10px] font-mono tracking-widest uppercase">
                                <UserPlus className="size-3.5 mr-2" /> GRANT_OWNER
                              </Button>
                            )}

                            {isAdminUser ? (
                              <Button variant="ghost" size="sm" disabled={blockRevokeAdmin} onClick={() => setConfirm({ kind: "revoke", userId: p.id, role: "admin", name: p.display_name || "this user" })} className="h-9 rounded-xl border border-white/5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-[10px] font-mono tracking-widest uppercase">
                                <ShieldAlert className="size-3.5 mr-2" /> REVOKE_ROOT
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: "grant", userId: p.id, role: "admin", name: p.display_name || "this user" })} className="h-9 rounded-xl border border-white/5 hover:bg-primary/10 hover:text-primary hover:border-primary/20 text-[10px] font-mono tracking-widest uppercase">
                                <ShieldCheck className="size-3.5 mr-2" /> GRANT_ROOT
                              </Button>
                            )}

                            <Button variant="ghost" size="icon" onClick={() => setConfirm({ kind: "reset", userId: p.id, name: p.display_name || "this user" })} className="size-9 rounded-xl border border-white/5 hover:bg-white/10" title="Trigger Password Reset">
                              <KeyRound className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Modals */}
      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-2xl border-white/10 rounded-[2.5rem] p-10 max-w-lg shadow-elevated">
          <AlertDialogHeader className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`size-1.5 rounded-full shadow-glow-sm ${confirm?.kind === 'revoke' ? 'bg-destructive' : 'bg-accent'}`} />
              <span className="text-[10px] font-mono tracking-[0.3em] text-muted-foreground uppercase">SYSTEM_AUTHORIZATION</span>
            </div>
            <AlertDialogTitle className="font-display text-4xl tracking-tighter uppercase leading-none">
              {confirm?.kind === "grant" ? "CONFIRM_ELEVATION" : confirm?.kind === "revoke" ? "CONFIRM_RESTRICTION" : "CONFIRM_RESET"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-mono tracking-tight text-muted-foreground/60 pt-4">
              {confirm?.kind === "grant" ? (
                <>Are you sure you want to grant <span className="text-accent">{confirm.role.toUpperCase()}</span> permissions to <span className="text-white">{confirm.name.toUpperCase()}</span>?</>
              ) : confirm?.kind === "revoke" ? (
                <>Proceed with revoking <span className="text-destructive">{confirm.role.toUpperCase()}</span> access from <span className="text-white">{confirm.name.toUpperCase()}</span>?</>
              ) : (
                <>Trigger a secure credential reset link for <span className="text-white">{confirm?.name?.toUpperCase()}</span>?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 font-mono text-[10px] tracking-widest uppercase transition-all">TERMINATE_OP</AlertDialogCancel>
            <AlertDialogAction
              className={`h-14 px-8 rounded-2xl font-mono text-[10px] tracking-widest uppercase shadow-glow transition-all ${
                confirm?.kind === "revoke" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-accent text-accent-foreground hover:bg-accent/90"
              }`}
              onClick={() => {
                if (!confirm) return;
                if (confirm.kind === "grant") grantRole(confirm.userId, confirm.role);
                else if (confirm.kind === "revoke") revokeRole(confirm.userId, confirm.role);
                else sendPasswordReset(confirm.userId);
                setConfirm(null);
              }}
            >
              EXECUTE_OVERRIDE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}



function FilterCard({
  icon: Icon,
  label,
  value,
  active,
  onClick,
  isAccent = false,
}: {
  icon: any;
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
  isAccent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden bg-card/40 backdrop-blur-xl border rounded-[2rem] p-8 text-left transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] shadow-card hover:shadow-elevated ${
        active 
          ? isAccent ? 'border-accent shadow-glow' : 'border-primary shadow-glow'
          : 'border-white/5 hover:border-white/10'
      }`}
    >
      {active && (
        <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${isAccent ? 'from-accent' : 'from-primary'} to-transparent`} />
      )}
      <div className="relative space-y-4">
        <div className={`size-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
          active 
            ? isAccent ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'
            : 'bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-white'
        }`}>
          <Icon className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-mono tracking-[0.3em] text-muted-foreground group-hover:text-white/60 transition-colors uppercase">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl tracking-tighter">{value}</span>
            <span className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-widest">NODES</span>
          </div>
        </div>
      </div>
    </button>
  );
}
