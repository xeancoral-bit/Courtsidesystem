import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import courtsideLogo from "@/assets/courtside-logo.png";
import { Eye, EyeOff, ArrowLeft, Shield, Lock, Zap, User, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  displayName: z.string().trim().min(1).max(60).optional(),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"user" | "owner">("user");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Access Portal · Courtside";
    if (user) {
      redirectUser();
    }
  }, [user]);

  const redirectUser = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id)
      .maybeSingle();
    
    const userRole = data?.role || "user";
    if (userRole === "admin") navigate("/admin/users");
    else if (userRole === "owner") navigate("/owner");
    else navigate("/customer");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Identity verified. Accessing vault...");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, displayName });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/customer`,
        data: { display_name: displayName || undefined },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("already")) toast.error("Identity exists. Please authenticate.");
      else toast.error(error.message);
      return;
    }
    
    if (data.session) {
      await supabase.from("user_roles").insert({
        user_id: data.user?.id,
        role: role
      });
      toast.success("New node initialized. Welcome to the network.");
    } else {
      toast.success("Registration sequence started. Verify your email link.");
    }
  };

  return (
    <div className="min-h-screen bg-hero grid place-items-center px-4 py-12 relative overflow-hidden">
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 size-[500px] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 size-[500px] rounded-full bg-accent/20 blur-[120px] animate-pulse delay-1000" />
      </div>

      <Link 
        to="/" 
        className="absolute top-8 left-4 md:left-8 flex items-center gap-3 text-muted-foreground hover:text-white transition-all group z-20"
      >
        <div className="size-10 rounded-full bg-card/50 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-accent/20 group-hover:border-accent/50 group-hover:shadow-glow-sm transition-all">
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
        </div>
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase hidden sm:inline">BACK_TO_CENTRAL</span>
      </Link>

      <div className="w-full max-w-md relative z-10 animate-fade-up">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
              <div className="relative size-20 rounded-2xl bg-card border border-white/10 flex items-center justify-center shadow-glow-sm overflow-hidden">
                <img src={courtsideLogo} alt="Logo" className="size-14 object-contain brightness-0 invert" />
              </div>
            </div>
            <div className="text-left">
              <h1 className="font-display text-6xl tracking-tighter text-white leading-none">ACCESS</h1>
              <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-accent animate-pulse" />
                <span className="font-mono text-[10px] tracking-[0.5em] text-accent uppercase">PORTAL_SECURE</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 -translate-y-4 translate-x-4">
            <Shield className="size-32 text-accent" />
          </div>

          <Tabs defaultValue="signin" className="relative z-10">
            <TabsList className="grid grid-cols-2 w-full mb-10 h-14 bg-black/40 border border-white/5 rounded-2xl p-1.5">
              <TabsTrigger 
                value="signin" 
                className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm font-black tracking-widest text-[10px] uppercase transition-all"
              >
                <Lock className="size-3 mr-2" /> Authenticate
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-glow-sm font-black tracking-widest text-[10px] uppercase transition-all"
              >
                <UserPlus className="size-3 mr-2" /> Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="si-email" className="font-mono text-[9px] tracking-[0.2em] uppercase ml-1 opacity-60">USER_CREDENTIAL // EMAIL</Label>
                  <Input 
                    id="si-email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="h-14 glass-input rounded-xl px-5 font-mono text-xs tracking-wider"
                    placeholder="name@node.net"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pass" className="font-mono text-[9px] tracking-[0.2em] uppercase ml-1 opacity-60">ACCESS_KEY // PASSWORD</Label>
                  <div className="relative">
                    <Input
                      id="si-pass"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 glass-input rounded-xl px-5 pr-12 font-mono text-xs tracking-wider"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black tracking-[0.3em] uppercase text-xs shadow-glow hover:shadow-glow-lg transition-all group" 
                  disabled={loading}
                >
                  {loading ? "AUTHENTICATING..." : (
                    <>GRANT_ACCESS <Zap className="size-4 ml-2 group-hover:scale-125 transition-transform" /></>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <form onSubmit={handleSignUp} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="su-name" className="font-mono text-[9px] tracking-[0.2em] uppercase ml-1 opacity-60">IDENTITY // DISPLAY_NAME</Label>
                  <Input 
                    id="su-name" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    className="h-14 glass-input rounded-xl px-5 font-mono text-xs tracking-wider"
                    placeholder="Alex_Player_01" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email" className="font-mono text-[9px] tracking-[0.2em] uppercase ml-1 opacity-60">USER_CREDENTIAL // EMAIL</Label>
                  <Input 
                    id="su-email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="h-14 glass-input rounded-xl px-5 font-mono text-xs tracking-wider"
                    placeholder="name@node.net"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pass" className="font-mono text-[9px] tracking-[0.2em] uppercase ml-1 opacity-60">ACCESS_KEY // PASSWORD</Label>
                  <div className="relative">
                    <Input
                      id="su-pass"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 glass-input rounded-xl px-5 pr-12 font-mono text-xs tracking-wider"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="font-mono text-[9px] tracking-[0.2em] uppercase ml-1 opacity-60">AUTHORIZATION_LEVEL</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("user")}
                      className={`h-14 rounded-xl border flex items-center justify-center gap-2 font-mono text-[10px] font-black tracking-widest uppercase transition-all ${role === "user" ? "bg-primary/20 border-primary text-primary shadow-glow-sm" : "bg-white/5 border-white/10 text-muted-foreground hover:border-primary/50"}`}
                    >
                      <User className="size-3" /> Player
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("owner")}
                      className={`h-14 rounded-xl border flex items-center justify-center gap-2 font-mono text-[10px] font-black tracking-widest uppercase transition-all ${role === "owner" ? "bg-accent/20 border-accent text-accent shadow-glow-sm" : "bg-white/5 border-white/10 text-muted-foreground hover:border-accent/50"}`}
                    >
                      <Shield className="size-3" /> Owner
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-16 rounded-2xl bg-accent hover:bg-accent/90 text-accent-foreground font-black tracking-[0.3em] uppercase text-xs shadow-glow hover:shadow-glow-lg transition-all group" 
                  disabled={loading}
                >
                  {loading ? "INITIALIZING..." : (
                    <>INITIALIZE_NODE <UserPlus className="size-4 ml-2 group-hover:scale-125 transition-transform" /></>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] font-mono tracking-[0.3em] text-muted-foreground/40 uppercase">
            SECURE_CONNECTION // SHA-256_ENCRYPTED
          </p>
        </div>
      </div>
    </div>
  );
}

