import courtsideLogo from "@/assets/courtside-logo.png";
import { Shield, MapPin, Mail, Clock, Instagram, Twitter, Facebook } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/5 bg-black/20 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 pointer-events-none" />
      
      <div className="container relative z-10 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-card border border-white/10 flex items-center justify-center shadow-glow-sm overflow-hidden">
              <img src={courtsideLogo} alt="Logo" className="size-8 object-contain" />
            </div>
            <span className="font-display text-2xl tracking-[0.2em] text-white">COURTSIDE</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs font-medium">
            The ultimate authorization layer for sports facility management. Book, manage, and play with zero latency.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="size-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent/50 transition-all">
              <Instagram className="size-5" />
            </a>
            <a href="#" className="size-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent/50 transition-all">
              <Twitter className="size-5" />
            </a>
            <a href="#" className="size-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent/50 transition-all">
              <Facebook className="size-5" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-display text-xs tracking-[0.3em] uppercase text-white mb-6 flex items-center gap-2">
            <Shield className="size-3 text-accent" /> SYSTEM_NODES
          </h4>
          <ul className="space-y-4 text-[11px] font-mono tracking-widest text-muted-foreground uppercase">
            <li><a href="/facilities" className="hover:text-accent transition-colors">Browse_Grid</a></li>
            <li><a href="/my-bookings" className="hover:text-accent transition-colors">User_Ledger</a></li>
            <li><a href="/auth" className="hover:text-accent transition-colors">Access_Portal</a></li>
            <li><a href="/owner" className="hover:text-accent transition-colors">Owner_Terminal</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-xs tracking-[0.3em] uppercase text-white mb-6 flex items-center gap-2">
            <MapPin className="size-3 text-accent" /> LOCATION_ARRAY
          </h4>
          <ul className="space-y-4 text-[11px] font-mono tracking-widest text-muted-foreground uppercase">
            <li>Butuan City Central</li>
            <li>Libertad Sub-Station</li>
            <li>Ampayon Node</li>
            <li>Baan Facility Cluster</li>
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="font-display text-xs tracking-[0.3em] uppercase text-white mb-6 flex items-center gap-2">
            <Mail className="size-3 text-accent" /> SECURE_CONTACT
          </h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="size-4 text-accent mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-tighter">Availability</p>
                <p className="text-xs font-medium text-muted-foreground">Mon–Sun · 08:00 – 22:00</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="size-4 text-accent mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-tighter">Support_Endpoint</p>
                <p className="text-xs font-medium text-muted-foreground">ops@courtside.app</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-mono tracking-[0.3em] text-muted-foreground/40 uppercase">
            © {new Date().getFullYear()} COURTSIDE // ALL_RIGHTS_RESERVED
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[9px] font-black tracking-widest text-accent/40 animate-pulse">SYSTEM_STATUS: OPERATIONAL</span>
            <span className="text-[9px] font-black tracking-widest text-white/20">NODE: PH-085</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

