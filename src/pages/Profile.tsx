import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Phone, Mail, Shield, Save, KeyRound, Loader2 } from "lucide-react";

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (authLoading || rolesLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    setEmail(user.email || "");
    fetchProfile();
  }, [user, authLoading, rolesLoading, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, phone")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error.message);
    } else if (data) {
      setDisplayName(data.display_name || "");
      setPhone(data.phone || "");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        phone: phone,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated successfully");
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent!");
    }
  };

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container max-w-2xl py-12">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4 border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]">
            <User className="size-10 text-primary" />
          </div>
          <h1 className="font-display text-4xl tracking-tight text-foreground">Account Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your profile and security preferences.</p>
        </div>

        <div className="space-y-8">
          {/* Role Badges */}
          <div className="flex flex-wrap justify-center gap-2">
            {roles.map((role) => (
              <Badge 
                key={role} 
                variant="outline" 
                className={`px-3 py-1 uppercase tracking-widest text-[10px] font-bold ${
                  role === 'admin' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                  role === 'owner' ? 'bg-accent/10 text-accent border-accent/30' :
                  'bg-primary/10 text-primary border-primary/30'
                }`}
              >
                <Shield className="size-3 mr-1.5" />
                {role}
              </Badge>
            ))}
          </div>

          <section className="bg-card-gradient border border-border rounded-2xl p-8 shadow-elevated">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      value={email} 
                      disabled 
                      className="pl-10 bg-muted/50 border-border opacity-70"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Email cannot be changed.</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-sm font-medium">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                      id="name" 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="pl-10 bg-background border-border focus-visible:ring-primary/50"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      type="tel"
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+63 900 000 0000"
                      className="pl-10 bg-background border-border focus-visible:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-bold tracking-wide" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                Save Changes
              </Button>
            </form>
          </section>

          <section className="bg-card-gradient border border-border rounded-2xl p-8 shadow-elevated">
            <h2 className="text-xl font-display tracking-tight mb-4 flex items-center">
              <Shield className="size-5 mr-2 text-primary" />
              Security
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              To change your password, we will send a secure link to your email address.
            </p>
            <Button 
              variant="outline" 
              className="w-full h-12 border-primary/30 hover:bg-primary/5 hover:text-primary transition-all"
              onClick={handleResetPassword}
              disabled={loading}
            >
              <KeyRound className="size-4 mr-2" />
              Request Password Reset
            </Button>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
