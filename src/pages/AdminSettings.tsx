import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings, 
  Globe, 
  Shield, 
  Palette, 
  Save, 
  AlertTriangle,
  Lock,
  Mail,
  Zap,
  Info,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    site_config: { name: "", email: "", maintenance: false },
    security_policy: { max_login_attempts: 5, require_mfa: false, session_timeout: 3600 },
    branding: { primary_color: "#d4af37", theme: "artisanal" }
  });

  useEffect(() => {
    document.title = "Platform Settings · Command Center";
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("system_settings" as any) as any).select("*");
    if (error) {
      toast.error(error.message);
    } else {
      const s = { ...settings };
      (data as any[])?.forEach(row => {
        s[row.key] = row.value;
      });
      setSettings(s);
    }
    setLoading(false);
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    const { error } = await (supabase
      .from("system_settings" as any) as any)
      .update({ 
        value: settings[key],
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq("key", key);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${key.replace('_', ' ').toUpperCase()} updated`);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="size-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-display font-bold tracking-widest uppercase text-xs">Accessing System Registry…</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-10">
        {/* Header Section */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 mb-4 shadow-[0_0_15px_rgba(var(--primary),0.15)]">
            <Settings className="size-4 text-primary" />
            <span className="text-xs uppercase tracking-widest text-primary font-bold">
              Configuration
            </span>
          </div>
          <h1 className="text-5xl font-display font-black tracking-tighter text-white uppercase mb-2">
            Platform <span className="text-primary">Settings</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Configure core system behaviors, security protocols, and visual identity overrides.
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-8">
          <TabsList className="bg-white/[0.03] border border-white/5 p-1.5 rounded-2xl">
            <TabsTrigger value="general" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-xl px-8 h-10 font-bold uppercase tracking-widest text-[10px]">
              <Globe className="size-3.5 mr-2" /> General
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-xl px-8 h-10 font-bold uppercase tracking-widest text-[10px]">
              <Shield className="size-3.5 mr-2" /> Security
            </TabsTrigger>
            <TabsTrigger value="branding" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-xl px-8 h-10 font-bold uppercase tracking-widest text-[10px]">
              <Palette className="size-3.5 mr-2" /> Branding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-sm space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-2">
                    <Info className="size-5 text-primary" />
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">Base Configuration</h3>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Platform Name</Label>
                      <Input 
                        value={settings.site_config.name} 
                        onChange={(e) => setSettings({ ...settings, site_config: { ...settings.site_config, name: e.target.value }})}
                        className="bg-black/40 border-white/5 focus-visible:ring-primary/50 h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact Registry (Email)</Label>
                      <Input 
                        value={settings.site_config.email} 
                        onChange={(e) => setSettings({ ...settings, site_config: { ...settings.site_config, email: e.target.value }})}
                        className="bg-black/40 border-white/5 focus-visible:ring-primary/50 h-12"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">Maintenance Mode</h4>
                      <p className="text-xs text-muted-foreground">Force-redirect all non-admin traffic to a standby page.</p>
                    </div>
                    <Switch 
                      checked={settings.site_config.maintenance}
                      onCheckedChange={(v) => setSettings({ ...settings, site_config: { ...settings.site_config, maintenance: v }})}
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={() => handleSave('site_config')} 
                      disabled={saving}
                      className="w-full h-12 font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/80 text-black"
                    >
                      {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                      Sync Base Registry
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-8">
                  <AlertTriangle className="size-8 text-amber-500 mb-4" />
                  <h3 className="text-xl font-display font-black text-white uppercase tracking-tight mb-2">Caution</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Modifying core site configuration may disrupt ongoing booking sessions. Ensure you perform maintenance during off-peak hours.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-2">
                  <Lock className="size-5 text-primary" />
                  <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">Auth Protocols</h3>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-bold text-white">Max Login Attempts</Label>
                      <p className="text-xs text-muted-foreground">IP lockout threshold before temporary ban.</p>
                    </div>
                    <Input 
                      type="number" 
                      className="w-24 bg-black/40 border-white/5 h-10 text-center"
                      value={settings.security_policy.max_login_attempts}
                      onChange={(e) => setSettings({ ...settings, security_policy: { ...settings.security_policy, max_login_attempts: parseInt(e.target.value) }})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-bold text-white">Require MFA</Label>
                      <p className="text-xs text-muted-foreground">Force 2FA for all administrative accounts.</p>
                    </div>
                    <Switch 
                      checked={settings.security_policy.require_mfa}
                      onCheckedChange={(v) => setSettings({ ...settings, security_policy: { ...settings.security_policy, require_mfa: v }})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-bold text-white">Session Timeout (s)</Label>
                      <p className="text-xs text-muted-foreground">Inactivity duration before automatic logout.</p>
                    </div>
                    <Input 
                      type="number" 
                      className="w-24 bg-black/40 border-white/5 h-10 text-center"
                      value={settings.security_policy.session_timeout}
                      onChange={(e) => setSettings({ ...settings, security_policy: { ...settings.security_policy, session_timeout: parseInt(e.target.value) }})}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => handleSave('security_policy')} 
                  disabled={saving}
                  className="w-full h-12 font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/80 text-black"
                >
                  {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                  Commit Security Schema
                </Button>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 flex flex-col justify-between">
                <div>
                  <Shield className="size-12 text-primary mb-6" />
                  <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-4">Hardened Infrastructure</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Current system integrity is monitored by real-time RLS audit logs. Any unauthorized attempt to modify the registry will trigger an immediate administrative alert.
                  </p>
                </div>
                <div className="pt-6 border-t border-primary/20">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-primary">
                    <span>Security Level</span>
                    <span>High (Hardened)</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl max-w-4xl space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-2">
                <Palette className="size-5 text-primary" />
                <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">Visual Identity</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Primary Accent Color</Label>
                    <div className="flex gap-4">
                      <div className="size-12 rounded-xl border border-white/10 shrink-0" style={{ backgroundColor: settings.branding.primary_color }} />
                      <Input 
                        value={settings.branding.primary_color} 
                        onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, primary_color: e.target.value }})}
                        className="bg-black/40 border-white/5 h-12 font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Design Language</Label>
                    <select 
                      className="w-full bg-black/40 border-white/5 text-sm rounded-lg h-12 px-4 outline-none focus:ring-2 focus:ring-primary/50"
                      value={settings.branding.theme}
                      onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, theme: e.target.value }})}
                    >
                      <option value="artisanal">Artisanal Vault (Dark)</option>
                      <option value="corporate">Executive Suite (Light)</option>
                      <option value="vibrant">Neon Grid (High Contrast)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="size-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
                    <Zap className="size-8 text-primary" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-2">Live Preview</h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-6">Real-time theme reflection enabled</p>
                  <Button variant="outline" size="sm" className="border-white/10" style={{ borderColor: settings.branding.primary_color, color: settings.branding.primary_color }}>
                    Sample UI Button
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => handleSave('branding')} 
                  disabled={saving}
                  className="w-full h-12 font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/80 text-black shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                >
                  {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                  Deploy Branding Schema
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
