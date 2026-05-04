import { Link } from "react-router-dom";
import { MapPin, Clock, ArrowRight, Shield } from "lucide-react";
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
      className={`group relative overflow-hidden rounded-[2rem] bg-card/40 backdrop-blur-md border border-white/5 shadow-card hover:shadow-elevated transition-all duration-500 hover:-translate-y-2 ${p.className ?? ""}`}
    >
      <div className="aspect-[16/10] overflow-hidden relative">
        <img
          src={img}
          alt={p.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="absolute top-6 left-6 flex items-center gap-2">
          <Badge className="bg-accent/90 backdrop-blur-md text-accent-foreground text-[9px] font-black tracking-widest border-none px-3 h-7 shadow-glow-sm">
            {p.sport_type.toUpperCase()}
          </Badge>
          <div className="size-7 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Shield className="size-3 text-white/60" />
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="flex justify-between items-start mb-6">
          <h3 className="font-display text-4xl tracking-tighter leading-none group-hover:text-accent transition-colors duration-300">{p.name.toUpperCase()}</h3>
          <div className="size-10 rounded-full bg-accent/10 flex items-center justify-center text-accent -rotate-45 group-hover:rotate-0 transition-all duration-500">
            <ArrowRight className="size-5" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-y border-white/5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-3.5 text-accent" />
              <span className="text-[11px] font-mono tracking-widest uppercase truncate max-w-[150px]">{p.location}</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <span className="text-xl text-white font-bold">{formatPHP(p.hourly_price)}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">/hr</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-muted-foreground/60 uppercase">
            <Clock className="size-3 text-primary" />
            <span>OPERATIONAL: {p.open_hour}:00 – {p.close_hour}:00</span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
