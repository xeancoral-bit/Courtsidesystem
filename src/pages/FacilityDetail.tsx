import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { resolveFacilityImage } from "@/lib/facility-images";
import { formatPHP } from "@/lib/format";
import { PaymentDialog } from "@/components/PaymentDialog";
import { RecurringBookingDialog } from "@/components/RecurringBookingDialog";
import { toast } from "sonner";
import { MapPin, Clock, ArrowLeft, Users, Banknote, Star, MessageSquare, Send, ShieldCheck, Activity, Terminal } from "lucide-react";


interface Facility {
  id: string;
  name: string;
  sport_type: string;
  location: string;
  description: string | null;
  hourly_price: number;
  image_url: string | null;
  open_hour: number;
  close_hour: number;
}

export default function FacilityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [bookedHours, setBookedHours] = useState<number[]>([]);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasValidBooking, setHasValidBooking] = useState(false);


  useEffect(() => {
    if (!id) return;
    supabase.from("facilities").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setFacility(data as Facility | null);
      if (data) document.title = `${data.name} · CourtConnect`;
      setLoading(false);
    });

    fetchReviews();
    checkBookingHistory();
  }, [id, user]);

  const fetchReviews = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("reviews" as any)
      .select("*, profiles(display_name)")
      .eq("facility_id", id)
      .order("created_at", { ascending: false });
    setReviews((data as any[]) || []);
  };

  const checkBookingHistory = async () => {
    if (!id || !user) return;
    const { count } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("facility_id", id)
      .in("status", ["paid", "completed"]);
    setHasValidBooking((count || 0) > 0);
  };

  const handleSubmitReview = async () => {
    if (!id || !user || !reviewComment.trim()) return;
    setSubmittingReview(true);
    const { error } = await supabase
      .from("reviews" as any)
      .insert({
        facility_id: id,
        user_id: user.id,
        rating: reviewRating,
        comment: reviewComment.trim()
      } as any);
    
    setSubmittingReview(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Feedback submitted. Thank you!");
      setReviewComment("");
      fetchReviews();
    }
  };


  const refreshSlots = () => {
    if (!id || !date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    supabase
      .from("bookings")
      .select("start_hour,end_hour,status")
      .eq("facility_id", id)
      .eq("booking_date", dateStr)
      .neq("status", "cancelled")
      .then(({ data }) => {
        const hours: number[] = [];
        (data || []).forEach((b: any) => {
          for (let h = b.start_hour; h < b.end_hour; h++) hours.push(h);
        });
        setBookedHours(hours);
      });
  };

  useEffect(() => {
    setSelectedHours([]);
    refreshSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, date]);

  const toggleHour = (h: number) => {
    if (bookedHours.includes(h)) return;
    setSelectedHours((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h].sort((a, b) => a - b)));
  };

  const handleReserve = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!facility || !date || selectedHours.length === 0) return;

    const sorted = [...selectedHours].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        toast.error("Please select contiguous hours.");
        return;
      }
    }

    setCreating(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const start_hour = sorted[0];
    const end_hour = sorted[sorted.length - 1] + 1;
    const total_price = (end_hour - start_hour) * Number(facility.hourly_price);

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        facility_id: facility.id,
        booking_date: dateStr,
        start_hour,
        end_hour,
        total_price,
        status: "pending",
      })
      .select()
      .single();

    setCreating(false);
    if (error || !data) {
      toast.error(error?.message?.includes("duplicate") ? "Slot just got taken." : (error?.message || "Could not reserve"));
      return;
    }
    setPendingBookingId(data.id);
    setPendingAmount(total_price);
    setPayOpen(true);
    toast.success("Slot reserved · complete payment to confirm.");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar /><main className="flex-1 container py-20 text-center text-muted-foreground font-mono uppercase tracking-[0.5em] animate-pulse">Initializing Data Stream...</main><Footer />
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar /><main className="flex-1 container py-20 text-center"><p className="font-display text-4xl uppercase italic">Facility not found.</p></main><Footer />
      </div>
    );
  }

  const img = resolveFacilityImage(facility.image_url, facility.sport_type);
  const hours = Array.from({ length: facility.close_hour - facility.open_hour }, (_, i) => facility.open_hour + i);
  const totalPrice = selectedHours.length * Number(facility.hourly_price);

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent/30">
      <Navbar />
      <main className="flex-1">
        {/* HERO SECTION */}
        <div className="relative h-[65vh] min-h-[550px] overflow-hidden">
          <img src={img} alt={facility.name} className="w-full h-full object-cover scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
          
          <div className="absolute inset-0 container flex flex-col justify-end pb-16">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mb-8 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all group px-0 font-mono text-[10px] tracking-[0.5em] uppercase w-fit"
            >
              <ArrowLeft className="size-3 mr-3 group-hover:-translate-x-1 transition-transform" />
              TERMINAL // BACK
            </Button>
            
            <div className="animate-fade-up">
              <div className="flex items-center gap-4 mb-4">
                <span className="px-5 py-2 rounded-full bg-accent text-accent-foreground text-[10px] font-black uppercase tracking-[0.3em] shadow-glow">
                  {facility.sport_type}
                </span>
                <div className="flex items-center gap-2 opacity-60">
                  <Activity className="size-3 text-accent animate-pulse" />
                  <span className="text-[10px] font-mono tracking-[0.4em] uppercase text-white">Verified Infrastructure</span>
                </div>
              </div>
              <h1 className="font-display text-7xl md:text-9xl tracking-tighter leading-[0.8] mb-6 uppercase italic text-gradient">
                {facility.name}
              </h1>
            </div>

            <div className="flex flex-wrap gap-10 mt-8">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Geo-Coordinates</span>
                <div className="flex items-center gap-3 text-sm font-bold tracking-wider">
                  <MapPin className="size-4 text-accent" />
                  {facility.location.toUpperCase()}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Operational Window</span>
                <div className="flex items-center gap-3 text-sm font-bold tracking-wider">
                  <Clock className="size-4 text-accent" />
                  {facility.open_hour}:00 — {facility.close_hour}:00
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Network Usage Rate</span>
                <div className="flex items-center gap-3 text-sm font-bold tracking-wider">
                  <Banknote className="size-4 text-accent" />
                  {formatPHP(facility.hourly_price)} <span className="text-[10px] text-muted-foreground">/ HR</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-20 grid lg:grid-cols-[1fr_420px] gap-16 relative">
          <div className="space-y-20">
            {/* ABOUT SECTION */}
            <section className="animate-fade-up">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-[1px] w-12 bg-accent/30" />
                <h2 className="font-display text-4xl tracking-tight uppercase">Infrastructure <span className="text-accent italic">Overview</span></h2>
              </div>
              <div className="glass-card p-10 rounded-[2.5rem] border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity">
                  <ShieldCheck className="size-20 text-accent" />
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed font-medium relative z-10">
                  {facility.description || "No specific technical data available for this node. Verified sports infrastructure ready for deployment."}
                </p>
              </div>
            </section>

            {/* SCHEDULING SECTION */}
            <section className="animate-fade-up" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center justify-between gap-4 mb-10">
                <div className="flex items-center gap-4">
                  <div className="h-[1px] w-12 bg-accent/30" />
                  <h2 className="font-display text-4xl tracking-tight uppercase italic">Session <span className="text-accent not-italic">Scheduling</span></h2>
                </div>
                {user && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSeriesOpen(true)}
                    className="rounded-full border-accent/20 bg-accent/5 text-accent hover:bg-accent hover:text-accent-foreground text-[10px] font-black uppercase tracking-widest h-10 px-6 gap-2 transition-all shadow-glow-sm"
                  >
                    <Users className="size-4" /> Recurring Series
                  </Button>
                )}
              </div>

              <div className="grid md:grid-cols-[380px_1fr] gap-10">
                <div className="glass-card p-4 rounded-3xl border-white/5 h-fit shadow-inner-glow">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="pointer-events-auto"
                  />
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.3em]">Network Slots // Availability</span>
                    <p className="text-sm text-muted-foreground font-medium">Select one or more contiguous segments to initialize booking.</p>
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {hours.map((h) => {
                      const isBooked = bookedHours.includes(h);
                      const isSelected = selectedHours.includes(h);
                      return (
                        <button
                          key={h}
                          onClick={() => toggleHour(h)}
                          disabled={isBooked}
                          className={`h-16 rounded-2xl text-sm font-black transition-all relative overflow-hidden group border ${
                            isBooked
                              ? "bg-muted/10 text-muted-foreground/30 border-white/5 cursor-not-allowed"
                              : isSelected
                                ? "bg-accent text-accent-foreground border-accent shadow-glow scale-105 z-10"
                                : "bg-card/40 text-muted-foreground border-white/5 hover:border-accent/40 hover:bg-card/60"
                          }`}
                        >
                          <span className="relative z-10">{h}:00</span>
                          {isBooked && (
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,255,255,0.05)_5px,rgba(255,255,255,0.05)_10px)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* REVIEWS SECTION */}
            <section className="animate-fade-up" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center gap-4 mb-10">
                <div className="h-[1px] w-12 bg-accent/30" />
                <h2 className="font-display text-4xl tracking-tight uppercase">User <span className="text-accent italic">Feedback</span></h2>
              </div>

              <div className="grid gap-10">
                {user && hasValidBooking && (
                  <div className="glass-card p-10 rounded-[2.5rem] border-accent/20 bg-accent/5 shadow-glow/5">
                    <div className="flex items-center gap-3 mb-6">
                      <MessageSquare className="size-5 text-accent" />
                      <h3 className="text-xl font-bold uppercase tracking-tight">Broadcast Transmission</h3>
                    </div>
                    
                    <div className="flex gap-2 mb-6">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() => setReviewRating(s)}
                          className={`transition-all duration-300 ${reviewRating >= s ? "text-accent scale-125 drop-shadow-glow" : "text-muted-foreground opacity-20"}`}
                        >
                          <Star className="size-7 fill-current" />
                        </button>
                      ))}
                    </div>
                    
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Input your mission report for this infrastructure..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-sm focus:outline-none focus:border-accent min-h-[140px] mb-6 font-medium placeholder:opacity-30 transition-all shadow-inner"
                    />
                    
                    <Button 
                      onClick={handleSubmitReview} 
                      disabled={submittingReview || !reviewComment.trim()}
                      className="h-14 px-10 rounded-full bg-accent text-accent-foreground shadow-glow font-black text-[10px] uppercase tracking-[0.3em] gap-3"
                    >
                      {submittingReview ? "Processing..." : "Transmit Report"}
                      <Send className="size-4" />
                    </Button>
                  </div>
                )}

                <div className="space-y-6">
                  {reviews.length === 0 ? (
                    <div className="py-20 text-center glass-card rounded-[2.5rem] border-dashed border-white/10">
                      <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.5em]">No transmissions detected in this node</p>
                    </div>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="glass-card p-10 rounded-[2.5rem] border-white/5 hover:border-accent/30 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Terminal className="size-16" />
                        </div>
                        
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center font-black text-xl shadow-glow-sm">
                              {rev.profiles?.display_name?.charAt(0) || "U"}
                            </div>
                            <div>
                              <p className="font-bold text-lg tracking-tight uppercase">{rev.profiles?.display_name || "Anonymous Entity"}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Authorized Participant</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 text-accent drop-shadow-glow">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`size-3.5 ${i < rev.rating ? "fill-current" : "opacity-20"}`} />
                            ))}
                          </div>
                        </div>
                        
                        <p className="text-lg leading-relaxed text-muted-foreground/80 font-medium italic group-hover:text-foreground transition-colors">
                          "{rev.comment}"
                        </p>
                        
                        <div className="flex items-center justify-between mt-8 pt-8 border-t border-white/5">
                           <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-[0.4em]">Node Feedback // Recorded</span>
                           <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                            {format(new Date(rev.created_at), "dd.MM.yyyy // HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* BOOKING SUMMARY ASIDE */}
          <aside className="lg:sticky lg:top-32 h-fit">
            <div className="glass-card p-10 rounded-[3rem] border-accent/20 bg-accent/5 shadow-elevated relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
              
              <div className="flex items-center gap-3 mb-10">
                <Terminal className="size-5 text-accent" />
                <h3 className="font-display text-3xl tracking-tight uppercase">Manifest <span className="text-accent italic">Summary</span></h3>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Target Date</span>
                  <p className="text-lg font-bold tracking-tight uppercase">{date ? format(date, "MMMM dd, yyyy") : "No Date Selected"}</p>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Segment Allocation</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedHours.length > 0 ? (
                      selectedHours.map(h => (
                        <span key={h} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-accent">
                          {h}:00
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground opacity-30 italic">No segments selected</span>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 space-y-4">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-muted-foreground font-mono uppercase tracking-widest text-[10px]">Total Segments</span>
                    <span className="font-bold">{selectedHours.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-muted-foreground font-mono uppercase tracking-widest text-[10px]">Segment Rate</span>
                    <span className="font-bold">{formatPHP(facility.hourly_price)}</span>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/20">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-accent uppercase tracking-[0.4em] mb-1">Final Manifest</span>
                      <span className="text-muted-foreground font-mono text-[10px] uppercase">Amount Due</span>
                    </div>
                    <span className="text-5xl font-display font-black text-white drop-shadow-glow">
                      {formatPHP(totalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleReserve}
                disabled={creating || selectedHours.length === 0}
                className="w-full h-16 rounded-[1.5rem] bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow font-black text-[11px] uppercase tracking-[0.4em] gap-3 mt-12 transition-all hover:scale-[1.02] active:scale-95"
              >
                {!user ? "INITIALIZE TO BOOK" : creating ? "ALLOCATING SLOTS..." : "CONFIRM & PAY"}
              </Button>
              
              <div className="flex items-center gap-3 justify-center mt-6 opacity-40">
                <ShieldCheck className="size-3" />
                <span className="text-[8px] font-mono uppercase tracking-widest text-center">Secure Payment Node // SSL Encrypted</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {pendingBookingId && (
        <PaymentDialog
          open={payOpen}
          onOpenChange={(v) => {
            setPayOpen(v);
            if (!v) refreshSlots();
          }}
          bookingIds={[pendingBookingId]}
          amount={pendingAmount}
          onPaid={() => {
            setSelectedHours([]);
            navigate("/my-bookings");
          }}
        />
      )}

      {user && (
        <RecurringBookingDialog
          open={seriesOpen}
          onOpenChange={setSeriesOpen}
          facility={facility}
          userId={user.id}
          onCreated={() => {
            refreshSlots();
            navigate("/my-bookings");
          }}
        />
      )}

      <Footer />
    </div>
  );
}
