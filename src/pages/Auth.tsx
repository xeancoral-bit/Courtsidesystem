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
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
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
  const [role] = useState<"user" | "owner">("user");
  const [showPassword, setShowPassword] = useState(false);


  useEffect(() => {
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
    toast.success("Welcome back!");
    // The useEffect will handle the redirect
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
      if (error.message.includes("already")) toast.error("Account exists. Please sign in.");
      else toast.error(error.message);
      return;
    }
    
    if (data.session) {
      // Add the selected role to user_roles
      await supabase.from("user_roles").insert({
        user_id: data.user?.id,
        role: role
      });
      
      toast.success("Account created! Welcome to Courtside.");
      // The useEffect will handle the redirect
    } else {
      toast.success("Account created! Please check your email to verify.");
    }
  };


  return (
    <div className="min-h-screen bg-hero grid place-items-center px-4 py-12 relative">
      <Link 
        to="/" 
        className="absolute top-8 left-4 md:left-8 flex items-center gap-2 text-muted-foreground hover:text-white transition-all group animate-fade-in"
      >
        <div className="size-10 rounded-full bg-card/50 backdrop-blur-sm border border-border flex items-center justify-center group-hover:bg-card group-hover:shadow-glow transition-all">
          <ArrowLeft className="size-5" />
        </div>
        <span className="font-medium text-sm tracking-wide">BACK</span>
      </Link>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="size-14 rounded-xl bg-card border border-border flex items-center justify-center shadow-glow overflow-hidden">
              <img src={courtsideLogo} alt="Logo" className="size-10 object-contain" />
            </div>
            <h1 className="font-display text-5xl tracking-widest text-white">COURTSIDE</h1>
          </div>
          <p className="text-muted-foreground mt-2">Book your court. Play your game.</p>
        </div>

        <div className="bg-card-gradient border border-border rounded-2xl p-8 shadow-elevated">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="si-pass">Password</Label>
                  <div className="relative">
                    <Input
                      id="si-pass"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="su-name">Display name</Label>
                  <Input id="su-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex Player" required />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="su-pass">Password</Label>
                  <div className="relative">
                    <Input
                      id="su-pass"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>

                  {loading ? "Creating..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
