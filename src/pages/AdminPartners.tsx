import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Clock, XCircle, Building2, ShieldCheck, History } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { cn } from "@/lib/utils";

type Status = "pending" | "approved" | "rejected";

export default function AdminPartners() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isOwner, loading: rolesLoading } = useRoles();
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | Status>("pending");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (refreshing) return;
    setRefreshing(true);
    if (!apps.length) setLoading(true);

    const { data, error } = await supabase
      .from("partner_applications")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error(error.message);
    } else {
      setApps(data ?? []);
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    document.title = "Partner Applications · Command Center";
  }, []);

  useEffect(() => {
    if (authLoading || rolesLoading) return;
    if (!isAdmin) return;
    load();
  }, [isAdmin, authLoading, rolesLoading]);

  if (authLoading || rolesLoading || (loading && !apps.length)) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="size-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-muted-foreground font-display font-bold tracking-widest uppercase text-xs">Syncing identity vault…</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    if (isOwner) return <Navigate to="/owner" replace />;
    return <Navigate to="/" replace />;
  }

  const filtered = filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const counts = {
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  return (
    <AdminLayout>
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-2">
            <Building2 className="size-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Enterprise Review</span>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
            Provisioning Active
          </Badge>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter text-white mb-2">
              PARTNER <span className="text-primary">REVIEW</span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg font-medium leading-relaxed">
              Authenticate owner applications. Provisioning automatically grants the <span className="text-primary">Owner</span> role and unlocks the dashboard.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={load}
            className="border-white/10 hover:bg-white/5 h-12 px-6 rounded-xl font-display font-bold tracking-wide"
          >
            <History className="size-5 mr-2" />
            {refreshing ? "Syncing..." : "Refresh"}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex p-1.5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
          {(["all", "pending", "approved", "rejected"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2.5",
                filter === k 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              {k}
              {k !== "all" && (
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-black",
                  filter === k ? "bg-white/20 text-white" : "bg-white/5 text-muted-foreground"
                )}>
                  {counts[k]}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <div className="text-[10px] text-muted-foreground font-black tracking-[0.2em] uppercase">
          {filtered.length} Applications Under Custody
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-24 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center">
          <div className="p-5 rounded-2xl bg-white/5 mb-6">
            <Clock className="size-12 text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-display font-black text-white mb-2 uppercase tracking-tight">No Matching Records</h3>
          <p className="text-muted-foreground max-w-xs text-sm font-medium">
            The application vault is currently empty for the <span className="text-primary">{filter}</span> category.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filtered.map((a) => (
            <ApplicationRow key={a.id} app={a} onChanged={load} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function ApplicationRow({ app, onChanged }: { app: any; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  const review = async (approve: boolean) => {
    setBusy(approve ? "approve" : "reject");
    const { error } = await supabase.rpc("admin_review_partner_application", {
      _application_id: app.id,
      _approve: approve,
      _notes: notes || null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved & Owner role granted" : "Application rejected");
    setOpen(false);
    onChanged();
  };

  const status: Status = app.status;
  const statusUI = {
    pending: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", label: "Pending Review" },
    approved: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", label: "Approved" },
    rejected: { icon: XCircle, color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20", label: "Rejected" },
  }[status];
  const Icon = statusUI.icon;

  return (
    <div className="group relative p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-5 transition-opacity duration-700">
        <Building2 className="size-48" />
      </div>

      <div className="relative flex flex-col lg:flex-row lg:items-start justify-between gap-8">
        <div className="flex gap-6 flex-1">
          <div className="mt-1 size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
            <Building2 className="size-7" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-4 mb-2">
              <h3 className="text-2xl font-display font-black text-white tracking-tight group-hover:text-primary transition-colors">
                {app.business_name}
              </h3>
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                statusUI.bg, statusUI.color, statusUI.border
              )}>
                <Icon className="size-3" />
                {statusUI.label}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-y-1 gap-x-6 text-sm font-medium text-muted-foreground mb-6">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary/50" />
                {app.facility_type}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="size-4 text-primary/50" />
                Submitted {new Date(app.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-6 p-6 rounded-2xl bg-black/20 border border-white/5 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Lead Contact</p>
                <p className="text-sm font-bold text-white">{app.contact_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Direct Email</p>
                <p className="text-sm font-bold text-white">{app.contact_email}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Mobile Registry</p>
                <p className="text-sm font-bold text-white">{app.contact_phone}</p>
              </div>
            </div>

            {app.description && (
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Operational Narrative</p>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium italic border-l-2 border-primary/20 pl-4 py-1">
                  "{app.description}"
                </p>
              </div>
            )}

            {app.review_notes && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-muted-foreground text-sm font-medium">
                <span className="text-primary font-black uppercase tracking-widest text-[10px] mr-3">Audit Notes:</span> 
                {app.review_notes}
              </div>
            )}
          </div>
        </div>

        {status === "pending" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_25px_rgba(var(--primary),0.2)] rounded-xl px-10 h-14 font-display font-black uppercase tracking-widest text-xs">
                Review Case
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f0f12] border-white/10 text-white max-w-md rounded-3xl p-8 backdrop-blur-xl">
              <DialogHeader className="mb-6">
                <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <ShieldCheck className="size-7 text-primary" />
                </div>
                <DialogTitle className="text-3xl font-display font-black tracking-tight">Review Protocol</DialogTitle>
                <DialogDescription className="text-muted-foreground text-base leading-relaxed">
                  Evaluate <span className="text-white font-bold">{app.business_name}</span>. Provisioning will immediately grant <span className="text-primary font-black">OWNER</span> access.
                </DialogDescription>
              </DialogHeader>
              
              <div className="mb-8">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-3">Decision Log (Internal)</label>
                <Textarea
                  placeholder="Summarize the reasoning for this decision..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-black/20 border-white/10 rounded-2xl focus:ring-primary/40 min-h-[140px] text-white text-base p-4 placeholder:text-muted-foreground/30"
                />
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => review(false)}
                  className="flex-1 border-white/5 hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive text-muted-foreground h-14 rounded-xl font-black uppercase tracking-widest text-[10px] order-2 sm:order-1"
                >
                  {busy === "reject" ? "Processing..." : "Decline Partner"}
                </Button>
                <Button
                  disabled={!!busy}
                  onClick={() => review(true)}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-14 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(var(--primary),0.2)] order-1 sm:order-2"
                >
                  {busy === "approve" ? "Syncing..." : "Provision & Approve"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
