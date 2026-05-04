import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ghost } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "404 · Lost in the Court";
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container flex flex-col items-center justify-center py-20">
        <div className="relative mb-8 animate-fade-up">
          <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
          <div className="relative size-32 rounded-3xl bg-card-gradient border border-white/10 flex items-center justify-center shadow-glow">
            <Ghost className="size-16 text-accent animate-pulse" />
          </div>
        </div>
        
        <div className="text-center space-y-4 max-w-md animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-[0.5em] text-accent font-black">ERROR // 404</span>
            <div className="size-1.5 rounded-full bg-accent" />
          </div>
          <h1 className="font-display text-6xl md:text-7xl tracking-tighter leading-none">
            LOST IN THE <span className="text-gradient">COURT.</span>
          </h1>
          <p className="text-muted-foreground text-lg font-medium px-4 py-2 rounded-lg bg-white/5 border border-white/5 backdrop-blur-md">
            The node you're looking for doesn't exist or has been decommissioned.
          </p>
          
          <div className="pt-8">
            <Button 
              size="lg" 
              onClick={() => navigate("/")}
              className="font-mono text-[10px] tracking-[0.3em] uppercase group"
            >
              <ArrowLeft className="size-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              BACK TO CENTRAL HUB
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;

