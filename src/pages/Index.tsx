import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FacilityCard } from "@/components/FacilityCard";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero.jpg";
import { Calendar, Users, Zap, Shield, ArrowRight, MapPin } from "lucide-react";

interface Facility {
  id: string; name: string; sport_type: string; location: string;
  hourly_price: number; image_url: string | null; open_hour: number; close_hour: number;
}

export default function Index() {
  const [facilities, setFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    document.title = "Courtside · Book Local Sports Facilities";
    supabase.from("facilities").select("*").limit(6).then(({ data }) => {
      setFacilities((data as Facility[]) || []);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="" className="w-full h-full object-cover opacity-30" width={1600} height={1000} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>
        <div className="container py-24 md:py-36 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-6 animate-fade-up">
            <span className="size-2 rounded-full bg-accent animate-glow-pulse" />
            <span className="text-xs uppercase tracking-widest text-accent font-bold">Local sports · Booked instantly</span>
          </div>
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl tracking-wider leading-[0.95] mb-6 animate-fade-up">
            BOOK YOUR<br /><span className="text-gradient">COURT.</span> PLAY.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 animate-fade-up">
            Butuan City's home for sports facility bookings — basketball courts, badminton halls, soccer pitches, and gyms. Reserve your spot in seconds.
          </p>
          <div className="flex flex-wrap gap-3 animate-fade-up">
            <Button asChild size="lg" className="h-14 px-8 text-base font-bold tracking-wider shadow-glow">
              <Link to="/facilities">Browse facilities <ArrowRight className="size-5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base font-bold tracking-wider">
              <Link to="/auth">Sign up free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* BENTO STATS */}
      <section className="container py-16 animate-fade-up" style={{ animationDelay: "200ms" }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: MapPin, label: "Butuan venues", value: "30+" },
            { icon: Calendar, label: "Bookings this month", value: "1.2K" },
            { icon: Users, label: "Active players", value: "3.5K" },
            { icon: Zap, label: "Avg. booking time", value: "<30s" },
          ].map((s, i) => (
            <div key={i} className="bg-card-gradient border border-border rounded-2xl p-6 shadow-card hover:shadow-glow-sm hover:-translate-y-1 transition-all group overflow-hidden relative">
              <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <s.icon className="size-6 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-display text-4xl tracking-wider text-gradient">{s.value}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED BENTO GRID */}
      <section className="container py-16 animate-fade-up" style={{ animationDelay: "300ms" }}>
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-[0.5em] text-accent font-black">CURATED SELECTION</span>
              <div className="size-1.5 rounded-full bg-accent animate-pulse" />
            </div>
            <h2 className="font-display text-5xl md:text-7xl tracking-tighter uppercase italic">Top Facilities</h2>
          </div>
          <Button asChild variant="ghost" size="lg" className="font-mono text-[10px] tracking-[0.3em] uppercase group px-0">
            <Link to="/facilities" className="flex items-center">View all <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform" /></Link>
          </Button>
        </div>

        {facilities.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 md:h-[700px]">
            <FacilityCard {...facilities[0]} className="md:col-span-2 md:row-span-2 shadow-glow-sm" />
            <FacilityCard {...facilities[1]} />
            <FacilityCard {...facilities[2]} />
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-16 animate-fade-up" style={{ animationDelay: "400ms" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] uppercase tracking-[0.5em] text-primary font-black">THE PROCESS</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <h2 className="font-display text-5xl md:text-8xl tracking-tighter uppercase mb-12 italic">Three steps to play.</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { n: "01", t: "Find your spot", d: "Browse local facilities by sport, location and price." },
            { n: "02", t: "Pick your slot", d: "Real-time availability calendar — no double bookings." },
            { n: "03", t: "Show up & play", d: "Confirmation in seconds. Manage everything from your dashboard." },
          ].map((s) => (
            <div key={s.n} className="bg-card-gradient border border-border rounded-[2.5rem] p-10 shadow-card relative overflow-hidden group hover:shadow-elevated transition-all">
              <div className="font-display text-[12rem] tracking-tighter text-white/5 absolute -top-12 -right-8 pointer-events-none group-hover:text-accent/10 transition-colors">{s.n}</div>
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
                <Zap className="size-6" />
              </div>
              <h3 className="font-display text-4xl tracking-tighter mb-4 relative uppercase">{s.t}</h3>
              <p className="text-muted-foreground relative leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OWNER CTA */}
      <section className="container py-20 animate-fade-up" style={{ animationDelay: "500ms" }}>
        <div className="bg-hero border border-border rounded-[3rem] p-12 md:p-24 shadow-elevated relative overflow-hidden group">
          <div className="absolute -top-40 -right-40 size-96 rounded-full bg-accent/20 blur-[100px] group-hover:bg-accent/30 transition-all duration-1000" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-8">
              <Shield className="size-4 text-accent" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-black">PARTNERSHIP_PROTOCOL</span>
            </div>
            <h2 className="font-display text-5xl md:text-7xl tracking-tighter mb-6 uppercase italic">Own a facility? <br /><span className="text-gradient">Fill it.</span></h2>
            <p className="text-muted-foreground text-xl mb-10 leading-relaxed max-w-lg">
              List your courts and pitches on Courtside. Get more bookings, less admin. Subscriptions and per-booking commission plans available.
            </p>
            <Button asChild size="lg" className="h-14 px-10 rounded-2xl font-black tracking-widest uppercase shadow-glow hover:shadow-elevated transition-all group/btn">
              <Link to="/auth" className="flex items-center">
                Become a partner <ArrowRight className="size-5 ml-2 group-hover/btn:translate-x-2 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
