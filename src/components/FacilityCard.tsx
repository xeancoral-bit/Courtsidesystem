import { Link } from "react-router-dom";
import { MapPin, Clock, ChevronRight, Zap } from "lucide-react";
import { resolveFacilityImage } from "@/lib/facility-images";
import { formatPHP } from "@/lib/format";

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

const SPORT_COLORS: Record<string, string> = {
  basketball: "bg-orange-500/90 text-white",
  badminton:  "bg-emerald-500/90 text-white",
  soccer:     "bg-green-600/90 text-white",
  tennis:     "bg-yellow-500/90 text-black",
  gym:        "bg-violet-600/90 text-white",
  volleyball: "bg-blue-500/90 text-white",
};

export function FacilityCard(p: Props) {
  const img = resolveFacilityImage(p.image_url, p.sport_type);
  const sportColor = SPORT_COLORS[p.sport_type.toLowerCase()] ?? "bg-primary/90 text-primary-foreground";
  const now = new Date().getHours();
  const isOpen = now >= p.open_hour && now < p.close_hour;
  const hoursAvailable = p.close_hour - p.open_hour;

  return (
    <Link
      to={`/facilities/${p.id}`}
      className={`group relative overflow-hidden rounded-2xl bg-card border border-border shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1 flex flex-col ${p.className ?? ""}`}
    >
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={img}
          alt={p.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />

        {/* Sport badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${sportColor} backdrop-blur-sm shadow-sm`}>
            {p.sport_type}
          </span>
        </div>

        {/* Live open/closed status */}
        <div className="absolute top-3 right-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm text-[10px] font-black uppercase tracking-widest border ${
            isOpen
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              : "bg-zinc-900/60 border-zinc-700/50 text-zinc-400"
          }`}>
            <div className={`size-1.5 rounded-full ${isOpen ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
            {isOpen ? "Open Now" : "Closed"}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-display text-xl tracking-wide text-foreground mb-1 leading-tight group-hover:text-accent transition-colors">
          {p.name}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{p.location}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <Clock className="size-3 shrink-0" />
          <span>{p.open_hour}:00 – {p.close_hour}:00 · {hoursAvailable}h window</span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Hourly Rate</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-accent">{formatPHP(p.hourly_price)}</span>
              <span className="text-xs text-muted-foreground">/hr</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground group-hover:text-accent transition-colors">
            <Zap className="size-3.5" />
            <span>Book Now</span>
            <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
