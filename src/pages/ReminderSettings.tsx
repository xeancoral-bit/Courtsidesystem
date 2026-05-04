import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Mail, BellOff, Smartphone, ArrowLeft, Terminal, ShieldCheck, Activity, Radio, Signal, Wifi, Zap } from "lucide-react";

interface Reminder {
  id: string;
  minutes_before: number;
  label: string;
  enabled: boolean;
}

type Channel = "in_app" | "email";

const PRESETS = [
  { label: "15 minutes", minutes: 15 },
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "3 hours", minutes: 180 },
  { label: "12 hours", minutes: 720 },
  { label: "1 day", minutes: 1440 },
  { label: "2 days", minutes: 2880 },
  { label: "1 week", minutes: 10080 },
];

const formatLeadTime = (m: number) => {
  if (m < 60) return `${m} MIN BEFORE`;
  if (m < 1440) return `${m / 60} HR BEFORE`;
  if (m < 10080) return `${m / 1440} DAY${m === 1440 ? "" : "S"} BEFORE`;
  return `${m / 10080} WEEK BEFORE`;
};

export default function ReminderSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPreset, setNewPreset] = useState("60");
  const [newLabel, setNewLabel] = useState("");
  const [channel, setChannel] = useState<Channel>("in_app");
  const [mainEnabled, setMainEnabled] = useState(true);

  useEffect(() => { document.title = "TEMPORAL_ALERTS // COURTSIDE"; }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    refresh();
  }, [user, authLoading, navigate]);

  const refresh = async () => {
    if (!user) return;
    const [{ data: rems }, { data: prof }] = await Promise.all([
      supabase.from("reminder_preferences").select("id,minutes_before,label,enabled").eq("user_id", user.id).order("minutes_before"),
      supabase.from("profiles").select("reminder_channel,reminders_enabled").eq("id", user.id).maybeSingle(),
    ]);
    setReminders((rems as Reminder[]) || []);
    if (prof) {
      setChannel((prof.reminder_channel as Channel) || "in_app");
      setMainEnabled(prof.reminders_enabled ?? true);
    }
    setLoading(false);
  };

  const updateChannel = async (next: Channel) => {
    if (!user) return;
    setChannel(next);
    const { error } = await supabase.from("profiles").update({ reminder_channel: next }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success(`DELIVERY_PROTOCOL_SET: ${next === "in_app" ? "INTERNAL_NODE" : "SMTP_RELAY"}`);
  };

  const updateMaster = async (next: boolean) => {
    if (!user) return;
    setMainEnabled(next);
    const { error } = await supabase.from("profiles").update({ reminders_enabled: next }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "TELEMETRY_ALERTS_ENGAGED" : "TELEMETRY_ALERTS_SUSPENDED");
  };

  const addReminder = async () => {
    if (!user) return;
    const minutes = Number(newPreset);
    if (reminders.some((r) => r.minutes_before === minutes)) {
      toast.error("DUPLICATE_TEMPORAL_THRESHOLD");
      return;
    }
    const { error } = await supabase.from("reminder_preferences").insert({
      user_id: user.id,
      minutes_before: minutes,
      label: newLabel.trim() || formatLeadTime(minutes),
      enabled: true,
    });
    if (error) return toast.error(error.message);
    toast.success("THRESHOLD_LOGGED");
    setNewLabel("");
    refresh();
  };

  const toggle = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from("reminder_preferences").update({ enabled }).eq("id", id);
    if (error) return toast.error(error.message);
    setReminders((rs) => rs.map((r) => (r.id === id ? { ...r, enabled } : r)));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("reminder_preferences").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setReminders((rs) => rs.filter((r) => r.id !== id));
    toast.success("THRESHOLD_PURGED");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#030303] text-foreground selection:bg-accent/30">
      <Navbar />
      <main className="flex-1 container max-w-4xl py-12 space-y-12 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-6 pb-8 border-b border-white/5">
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
              <span className="text-[10px] font-mono tracking-[0.3em] text-accent uppercase">SYSTEM_TELEMETRY // ALERTS</span>
            </div>
          </div>
          <h1 className="font-display text-7xl md:text-8xl tracking-tighter leading-[0.85] uppercase">
            TEMPORAL_<span className="text-gradient">ALERTS</span>
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground/60 leading-relaxed font-mono tracking-tight">
            Configure automated nodal transmissions for upcoming session allocations. Establish lead-time thresholds for synchronized operations.
          </p>
        </div>

        {/* Master Control */}
        <section className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-elevated relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Signal className="size-24" />
          </div>

          <div className="space-y-10">
            {/* Status Banner */}
            <div className={`rounded-2xl border px-6 py-4 flex items-center gap-4 transition-all duration-500 ${
              mainEnabled 
                ? "border-accent/30 bg-accent/5" 
                : "border-white/5 bg-white/2"
            }`}>
              <div className={`size-12 rounded-xl flex items-center justify-center ${mainEnabled ? "bg-accent shadow-glow" : "bg-white/5"}`}>
                {mainEnabled ? <Bell className="size-6 text-accent-foreground" /> : <BellOff className="size-6 text-muted-foreground" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className={`size-1.5 rounded-full ${mainEnabled ? "bg-accent animate-pulse" : "bg-muted-foreground"}`} />
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase font-black">
                    SYSTEM_STATUS: {mainEnabled ? "OPERATIONAL" : "SUSPENDED"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {mainEnabled 
                    ? "Transmissions are actively monitoring all temporal thresholds."
                    : "Alert protocols are offline. All scheduled lead-times are currently paused."}
                </p>
              </div>
              <Switch checked={mainEnabled} onCheckedChange={updateMaster} className="data-[state=checked]:bg-accent" />
            </div>

            {/* Delivery Protocol */}
            <div className={`space-y-4 ${!mainEnabled && "opacity-40 grayscale pointer-events-none transition-all duration-500"}`}>
              <div className="flex items-center gap-2 ml-1">
                <Wifi className="size-3 text-accent" />
                <Label className="text-[10px] font-mono tracking-[0.3em] uppercase text-muted-foreground">Delivery_Protocol</Label>
              </div>
              <Select value={channel} onValueChange={(v) => updateChannel(v as Channel)}>
                <SelectTrigger className="h-16 bg-white/5 border-white/5 rounded-2xl font-mono text-xs tracking-widest uppercase px-6 focus:ring-accent/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-3xl border-white/10 rounded-2xl">
                  <SelectItem value="in_app" className="font-mono text-xs tracking-widest uppercase">
                    <div className="flex items-center gap-3 py-1"><Smartphone className="size-4 text-accent" /> INTERNAL_INTERFACE</div>
                  </SelectItem>
                  <SelectItem value="email" className="font-mono text-xs tracking-widest uppercase">
                    <div className="flex items-center gap-3 py-1"><Mail className="size-4 text-accent" /> SMTP_RELAY (BETA)</div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {channel === "email" && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/5 border border-accent/20">
                  <Terminal className="size-3 text-accent" />
                  <p className="text-[10px] font-mono text-accent/60 uppercase tracking-tight">
                    NOTE: SMTP relay node is in staging. Preference saved.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Add Reminder */}
        <section className={`bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-elevated relative overflow-hidden transition-all duration-500 ${!mainEnabled && "opacity-20 grayscale pointer-events-none"}`}>
          <div className="flex items-center gap-3 mb-8">
            <Zap className="size-5 text-accent" />
            <h2 className="font-display text-3xl tracking-tight uppercase">Initialize_Threshold</h2>
          </div>
          <div className="grid md:grid-cols-[200px_1fr_auto] gap-6 items-end">
            <div className="space-y-2">
              <Label className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground ml-1">Temporal_Lead</Label>
              <Select value={newPreset} onValueChange={setNewPreset}>
                <SelectTrigger className="h-14 bg-white/5 border-white/5 rounded-xl font-mono text-[10px] tracking-widest uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-3xl border-white/10 rounded-xl">
                  {PRESETS.map((p) => (
                    <SelectItem key={p.minutes} value={String(p.minutes)} className="font-mono text-[10px] tracking-widest uppercase">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground ml-1">Telemetry_Label (OPTIONAL)</Label>
              <Input 
                value={newLabel} 
                onChange={(e) => setNewLabel(e.target.value)} 
                placeholder="E.G. PRE_FLIGHT_MANIFEST" 
                className="h-14 bg-white/5 border-white/5 rounded-xl font-mono text-[10px] tracking-widest placeholder:opacity-20"
              />
            </div>
            <Button 
              onClick={addReminder}
              className="h-14 px-8 rounded-xl bg-accent text-accent-foreground font-black text-[10px] uppercase tracking-widest gap-2 shadow-glow hover:scale-105 transition-transform"
            >
              <Plus className="size-4" /> ADD_THRESHOLD
            </Button>
          </div>
        </section>

        {/* List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between ml-2">
            <div className="flex items-center gap-3">
              <div className="h-4 w-1 bg-accent" />
              <span className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground/60 uppercase">ACTIVE_THRESHOLDS</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground/30 uppercase tracking-[0.2em]">TOTAL_NODES: {reminders.length}</span>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-4 animate-pulse">
              <Terminal className="size-8 text-muted-foreground/10 mx-auto" />
              <p className="font-mono text-[9px] tracking-[0.5em] text-muted-foreground/40 uppercase">SCANNING_PROTOCOLS...</p>
            </div>
          ) : reminders.length === 0 ? (
            <div className="py-20 text-center space-y-4 bg-card/40 backdrop-blur-3xl border border-dashed border-white/10 rounded-[2.5rem]">
              <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground/40 uppercase">NO_THRESHOLDS_DEFINED</p>
            </div>
          ) : (
            <div className={`grid gap-4 transition-all duration-500 ${!mainEnabled && "opacity-40 grayscale"}`}>
              {reminders.map((r) => (
                <div key={r.id} className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-2xl p-6 flex items-center justify-between gap-6 group hover:border-accent/30 transition-all shadow-card hover:shadow-elevated">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`size-1 rounded-full ${r.enabled ? "bg-accent" : "bg-muted-foreground/30"}`} />
                      <span className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground/40 uppercase font-black">MANIFEST_ENTRY // {r.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="font-display text-3xl tracking-tight uppercase group-hover:text-accent transition-colors">
                      {formatLeadTime(r.minutes_before)}
                    </div>
                    {r.label && r.label !== formatLeadTime(r.minutes_before) && (
                      <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mt-1 italic opacity-60">"{r.label}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[8px] font-mono tracking-[0.3em] text-muted-foreground/30 uppercase font-black">LOGIC_FLOW</span>
                      <Switch 
                        checked={r.enabled} 
                        onCheckedChange={(v) => toggle(r.id, v)} 
                        disabled={!mainEnabled} 
                        className="data-[state=checked]:bg-accent"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => remove(r.id)}
                      className="h-12 w-12 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all p-0 border border-white/5"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
