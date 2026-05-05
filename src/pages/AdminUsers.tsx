import { useEffect, useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/admin-client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
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
  KeyRound,
  History,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { cn } from "@/lib/utils";

type Role = "admin" | "owner" | "user";
type SortKey = "name" | "joined" | "role";
type SortDir = "asc" | "desc";
type RoleFilter = "all" | Role;

interface ProfileRow {
  id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
}

interface AuthUserRow {
  id: string;
  email?: string;
  last_sign_in_at?: string;
  confirmed_at?: string;
}

interface RoleRow {
  user_id: string;
  role: Role;
}

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-destructive/15 text-destructive border-destructive/30",
  owner: "bg-accent/15 text-accent border-accent/30",
  user: "bg-muted text-muted-foreground border-border",
};

const ROLE_RANK: Record<Role | "none", number> = { admin: 3, owner: 2, user: 1, none: 0 };

export default function AdminUsers() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isOwner, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [confirm, setConfirm] = useState<
    | { kind: "grant"; userId: string; role: Role; name: string }
    | { kind: "revoke"; userId: string; role: Role; name: string }
    | { kind: "reset"; userId: string; name: string }
    | { kind: "purge" }
    | null
  >(null);

  useEffect(() => {
    document.title = "User Management · Command Center";
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
  }, [user, authLoading, rolesLoading, isAdmin]);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    if (!profiles.length) setLoading(true);

    try {
      const [
        { data: profs, error: pErr }, 
        { data: rs, error: rErr }, 
        { data: { users: ausers }, error: uErr }
      ] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id,display_name,phone,created_at")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("user_roles").select("user_id,role"),
        supabaseAdmin.auth.admin.listUsers()
      ]);

      if (pErr) throw pErr;
      if (rErr) throw rErr;
      if (uErr) throw uErr;

      setProfiles((profs as ProfileRow[]) || []);
      setRoles((rs as RoleRow[]) || []);
      setAuthUsers((ausers as any[]) || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load management data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const authById = useMemo(() => {
    const m = new Map<string, AuthUserRow>();
    authUsers.forEach((u) => m.set(u.id, u));
    return m;
  }, [authUsers]);

  const rolesByUser = useMemo(() => {
    const m = new Map<string, Set<Role>>();
    roles.forEach((r) => {
      const set = m.get(r.user_id) || new Set<Role>();
      set.add(r.role);
      m.set(r.user_id, set);
    });
    return m;
  }, [roles]);

  const adminCount = useMemo(() => {
    let n = 0;
    rolesByUser.forEach((set) => {
      if (set.has("admin")) n++;
    });
    return n;
  }, [rolesByUser]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    
    // STRICT FILTER: Only show verified users with existing auth accounts
    let list = profiles.filter((p) => {
      const auth = authById.get(p.id);
      if (!auth || !auth.confirmed_at) return false;

      if (q) {
        const haystack = [p.display_name, p.phone, p.id, auth.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
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
      }
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = (a.display_name || "").localeCompare(b.display_name || "");
      } else if (sortKey === "joined") {
        cmp = a.created_at.localeCompare(b.created_at);
      } else {
        const aRoleRank = Array.from(rolesByUser.get(a.id) || []).reduce((max, r) => Math.max(max, ROLE_RANK[r]), 0);
        const bRoleRank = Array.from(rolesByUser.get(b.id) || []).reduce((max, r) => Math.max(max, ROLE_RANK[r]), 0);
        cmp = aRoleRank - bRoleRank;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [profiles, search, roleFilter, sortKey, sortDir, rolesByUser, authById]);

  const stats = useMemo(() => {
    let admins = 0, owners = 0, users = 0;
    filtered.forEach(p => {
      const set = rolesByUser.get(p.id);
      if (set?.has("admin")) admins++;
      else if (set?.has("owner")) owners++;
      else users++;
    });
    return { admins, owners, users, total: filtered.length };
  }, [filtered, rolesByUser]);

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
    toast.success(`Granted ${role} role`);
    refresh();
  };

  const revokeRole = async (userId: string, role: Role) => {
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
    toast.success(`Revoked ${role} role`);
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
  };

  const purgeAnomalies = async () => {
    toast.promise(
      (async () => {
        const authIds = new Set(authUsers.map(u => u.id));
        const unconfirmedIds = authUsers.filter(u => !u.confirmed_at).map(u => u.id);
        const orphanedProfiles = profiles.filter(p => !authIds.has(p.id));

        let deletedCount = 0;

        for (const p of orphanedProfiles) {
          await supabaseAdmin.from("profiles").delete().eq("id", p.id);
          await supabaseAdmin.from("user_roles").delete().eq("user_id", p.id);
          deletedCount++;
        }

        for (const id of unconfirmedIds) {
          await supabaseAdmin.auth.admin.deleteUser(id);
          deletedCount++;
        }

        await refresh();
        return deletedCount;
      })(),
      {
        loading: "Purging data anomalies...",
        success: (count) => `Successfully purged ${count} invalid records`,
        error: "Failed to purge some records"
      }
    );
  };

  if (authLoading || rolesLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="size-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-muted-foreground font-display font-bold tracking-widest uppercase text-xs">Synchronizing Identity Vault…</p>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    if (isOwner) return <Navigate to="/owner" replace />;
    return <Navigate to="/" replace />;
  }

  return (
    <AdminLayout>
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">System Integrity</span>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
            Real-time Monitoring Active
          </Badge>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter text-white mb-2">
              USER <span className="text-primary">STEWARDSHIP</span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg font-medium leading-relaxed">
              Maintain a high-fidelity database by overseeing verified account holders and enforcing role-based system access.
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setConfirm({ kind: "purge" })}
              className="border-destructive/20 text-destructive hover:bg-destructive/10 h-12 px-6 rounded-xl font-display font-bold tracking-wide"
            >
              <Trash2 className="size-5 mr-2" />
              Purge Incomplete Data
            </Button>
            <Button 
              variant="outline" 
              onClick={refresh}
              className="border-white/10 hover:bg-white/5 h-12 px-6 rounded-xl font-display font-bold tracking-wide"
            >
              <History className="size-5 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Verified" value={stats.total} icon={Users} active={roleFilter === "all"} onClick={() => setRoleFilter("all")} />
        <MetricCard label="System Admins" value={stats.admins} icon={ShieldCheck} active={roleFilter === "admin"} onClick={() => setRoleFilter("admin")} />
        <MetricCard label="Facility Owners" value={stats.owners} icon={UserCog} active={roleFilter === "owner"} onClick={() => setRoleFilter("owner")} />
        <MetricCard label="Players" value={stats.users} icon={UserPlus} active={roleFilter === "user"} onClick={() => setRoleFilter("user")} />
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6 bg-white/[0.02] border border-white/5 p-4 rounded-2xl backdrop-blur-sm">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone or UID..."
            className="pl-12 h-12 bg-black/20 border-white/5 focus-visible:ring-primary/40 rounded-xl text-base"
          />
        </div>
        {roleFilter !== "all" && (
          <Badge variant="secondary" className="h-10 px-4 rounded-xl gap-2 bg-primary/10 text-primary border-primary/20">
            Filtering: <span className="uppercase font-black">{roleFilter}</span>
            <XCircle className="size-4 cursor-pointer" onClick={() => setRoleFilter("all")} />
          </Badge>
        )}
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        <Table>
          <TableHeader className="bg-white/[0.03]">
            <TableRow className="hover:bg-transparent border-b border-white/5">
              <TableHead className="h-16 px-6">
                <button onClick={() => toggleSort("name")} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white transition-colors">
                  Identity <SortIcon k="name" />
                </button>
              </TableHead>
              <TableHead className="h-16">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Account Status</span>
              </TableHead>
              <TableHead className="h-16">
                <button onClick={() => toggleSort("role")} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white transition-colors">
                  Permissions <SortIcon k="role" />
                </button>
              </TableHead>
              <TableHead className="h-16">
                <button onClick={() => toggleSort("joined")} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white transition-colors">
                  Tenure <SortIcon k="joined" />
                </button>
              </TableHead>
              <TableHead className="h-16 px-6 text-right">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <Users className="size-12" />
                    <p className="font-display font-bold tracking-widest uppercase text-xs">No matching verified accounts found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const userRoles = rolesByUser.get(p.id) || new Set<Role>();
                const auth = authById.get(p.id)!;
                const isSelf = p.id === user?.id;
                const isAdminUser = userRoles.has("admin");
                const isOwnerUser = userRoles.has("owner");
                
                return (
                  <TableRow key={p.id} className="group hover:bg-white/[0.03] transition-colors border-b border-white/5">
                    <TableCell className="py-6 px-6">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "size-12 rounded-2xl flex items-center justify-center font-display font-black text-xl border transition-all duration-300 group-hover:scale-110 shadow-lg",
                          isAdminUser ? "bg-primary/10 border-primary/30 text-primary shadow-primary/5" :
                          isOwnerUser ? "bg-accent/10 border-accent/30 text-accent shadow-accent/5" :
                          "bg-white/5 border-white/10 text-muted-foreground shadow-white/5"
                        )}>
                          {(p.display_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-white text-lg tracking-tight group-hover:text-primary transition-colors">
                              {p.display_name || "Anonymous User"}
                            </span>
                            {isSelf && (
                              <Badge className="bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-[0.2em] px-1.5 py-0">You</Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground font-medium">{auth.email}</span>
                          <span className="text-[10px] text-muted-foreground/40 mt-1 font-mono uppercase tracking-tighter">UID: {p.id.slice(0, 18)}…</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Identity Verified</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                          Verified {format(parseISO(auth.confirmed_at!), "MMM d, h:mm a")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(userRoles).map((r) => (
                          <Badge key={r} className={cn(ROLE_BADGE[r], "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border")}>
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      <div>{format(parseISO(p.created_at), "MMM d, yyyy")}</div>
                      <div className="text-[10px] opacity-50 mt-0.5 uppercase tracking-tighter">{formatDistanceToNow(parseISO(p.created_at), { addSuffix: true })}</div>
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setConfirm({ kind: "reset", userId: p.id, name: p.display_name || p.id })}
                          className="size-9 p-0 rounded-xl border-white/5 hover:border-primary/40 hover:bg-primary/10 transition-all"
                          title="Reset Password"
                        >
                          <KeyRound className="size-4" />
                        </Button>
                        <div className="w-px h-9 bg-white/5 mx-1" />
                        
                        {!isAdminUser && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={cn(
                              "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-white/5 transition-all",
                              isOwnerUser ? "hover:border-destructive/40 hover:bg-destructive/10 text-destructive" : "hover:border-accent/40 hover:bg-accent/10 text-accent"
                            )}
                            onClick={() => isOwnerUser 
                              ? setConfirm({ kind: "revoke", userId: p.id, role: "owner", name: p.display_name || p.id })
                              : setConfirm({ kind: "grant", userId: p.id, role: "owner", name: p.display_name || p.id })
                            }
                          >
                            {isOwnerUser ? <UserMinus className="size-3.5 mr-2" /> : <UserPlus className="size-3.5 mr-2" />}
                            {isOwnerUser ? "Revoke Owner" : "Make Owner"}
                          </Button>
                        )}

                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={isAdminUser && (isSelf || adminCount <= 1)}
                          className={cn(
                            "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-white/5 transition-all",
                            isAdminUser ? "hover:border-destructive/40 hover:bg-destructive/10 text-destructive" : "hover:border-primary/40 hover:bg-primary/10 text-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                          )}
                          onClick={() => isAdminUser 
                            ? setConfirm({ kind: "revoke", userId: p.id, role: "admin", name: p.display_name || p.id })
                            : setConfirm({ kind: "grant", userId: p.id, role: "admin", name: p.display_name || p.id })
                          }
                        >
                          {isAdminUser ? <ShieldAlert className="size-3.5 mr-2" /> : <ShieldCheck className="size-3.5 mr-2" />}
                          {isAdminUser ? "Revoke Admin" : "Make Admin"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent className="bg-[#0f0f12] border border-white/10 rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              {confirm?.kind === "purge" ? <Trash2 className="size-6 text-destructive" /> : 
               confirm?.kind === "reset" ? <KeyRound className="size-6 text-primary" /> : <ShieldCheck className="size-6 text-primary" />}
            </div>
            <AlertDialogTitle className="text-2xl font-display font-black tracking-tight text-white">
              {confirm?.kind === "purge" ? "Critical System Purge" : 
               confirm?.kind === "reset" ? "Reset Credentials" : "Update System Role"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-base leading-relaxed">
              {confirm?.kind === "purge" ? "This will permanently remove all orphaned profiles and unconfirmed auth records. This action is irreversible." :
               confirm?.kind === "reset" ? `Send a secure password reset link to ${confirm?.name}?` :
               `Are you sure you want to ${confirm?.kind} the role for ${confirm?.name}? Change will be recorded in system audit logs.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-6">
            <AlertDialogCancel className="h-12 px-6 rounded-xl border-white/5 bg-white/5 hover:bg-white/10 text-white font-bold transition-all">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "h-12 px-6 rounded-xl font-black uppercase tracking-widest transition-all",
                confirm?.kind === "purge" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
              )}
              onClick={async () => {
                if (!confirm) return;
                if (confirm.kind === "grant") await grantRole(confirm.userId, confirm.role);
                else if (confirm.kind === "revoke") await revokeRole(confirm.userId, confirm.role);
                else if (confirm.kind === "reset") await sendPasswordReset(confirm.userId);
                else if (confirm.kind === "purge") await purgeAnomalies();
                setConfirm(null);
              }}
            >
              Execute Action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function MetricCard({ label, value, icon: Icon, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col p-6 rounded-2xl border transition-all duration-300 text-left group overflow-hidden relative",
        active 
          ? "bg-primary/10 border-primary/40 shadow-[0_0_30px_rgba(var(--primary),0.1)]" 
          : "bg-white/[0.02] border-white/5 hover:border-white/20"
      )}
    >
      <div className={cn(
        "size-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110",
        active ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground group-hover:text-white"
      )}>
        <Icon className="size-5" />
      </div>
      <div className="font-display text-4xl font-black text-white mb-1 group-hover:text-primary transition-colors">
        {value}
      </div>
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-muted transition-colors">
        {label}
      </div>
      {active && (
        <div className="absolute top-0 right-0 p-4">
          <div className="size-1.5 rounded-full bg-primary animate-pulse" />
        </div>
      )}
    </button>
  );
}
