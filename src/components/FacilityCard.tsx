import { Link } from "react-router-dom";
import { MapPin, Clock, ArrowRight, Shield, Activity } from "lucide-react";
import { resolveFacilityImage } from "@/lib/facility-images";
import { formatPHP } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

interface Props {
  id: string;
  name: string;
  sport_type: string;
  location: string;
  hourly_price: number;
  image_url?: string | null;
  open_hour: number;
  close_hour: number;
  className?: string;
}

export function FacilityCard(p: Props) {
  const img = resolveFacilityImage(p.image_url, p.sport_type);
  return (
     <Link
      to={`/facilities/${p.id}`}
      className={`group relative overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-xl border border-white/5 shadow-card hover:shadow-glow/20 transition-all duration-700 hover:-translate-y-3 ${p.className ?? ""}`}
    >
      {/* IMAGE CONTAINER */}
      <div className="aspect-[16/11] overflow-hidden relative">
        <img
          src={img}
          alt={p.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90" />
        <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* OVERLAY BADGES */}
        <div className="absolute top-8 left-8 flex items-center gap-2">
          <Badge className="bg-accent text-accent-foreground text-[9px] font-black tracking-[0.2em] border-none px-4 h-8 shadow-glow-sm uppercase">
            {p.sport_type}
          </Badge>
          <div className="h-8 px-3 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
            <Activity className="size-3 text-accent animate-pulse" />
            <span className="text-[8px] font-mono text-white/80 uppercase tracking-widest">Live Status</span>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-10 relative">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-1.5 rounded-full bg-accent/50" />
              <span className="text-[9px] font-mono tracking-[0.4em] text-muted-foreground uppercase">Node Identification</span>
            </div>
            <h3 className="font-display text-4xl tracking-tighter leading-none group-hover:text-accent transition-colors duration-500 uppercase">{p.name}</h3>
          </div>
          <div className="size-12 rounded-full bg-accent/10 flex items-center justify-center text-accent -rotate-45 group-hover:rotate-0 transition-all duration-700 border border-accent/20 group-hover:bg-accent group-hover:text-accent-foreground">
            <ArrowRight className="size-6" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between py-4 border-y border-white/5">
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="size-4 text-accent/60" />
              <span className="text-[11px] font-mono tracking-widest uppercase truncate max-w-[160px]">{p.location}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Rate // hour</span>
              <div className="flex items-center gap-1 font-mono">
                <span className="text-2xl text-white font-black">{formatPHP(p.hourly_price)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.2em] text-muted-foreground/60 uppercase">
              <Clock className="size-4 text-accent/40" />
              <span>{p.open_hour}:00 – {p.close_hour}:00</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-1 rounded-full bg-green-500/50" />
              <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">Verified</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* BOTTOM GLOW */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
    </Link>
  );
}
