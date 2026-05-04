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
import { MapPin, Clock, ArrowLeft, Users, Banknote, Star, MessageSquare, Send } from "lucide-react";


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
      if (data) document.title = `${data.name} · Courtside`;
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
      <div className="min-h-screen flex flex-col">
        <Navbar /><main className="flex-1 container py-20 text-center text-muted-foreground">Loading…</main><Footer />
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar /><main className="flex-1 container py-20 text-center"><p>Facility not found.</p></main><Footer />
      </div>
    );
  }

  const img = resolveFacilityImage(facility.image_url, facility.sport_type);
  const hours = Array.from({ length: facility.close_hour - facility.open_hour }, (_, i) => facility.open_hour + i);
  const totalPrice = selectedHours.length * Number(facility.hourly_price);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
          <img src={img} alt={facility.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        <div className="absolute inset-0 container flex flex-col justify-end pb-12">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mb-4 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all group px-0 font-mono text-[10px] tracking-[0.3em] uppercase w-fit"
            >
              <ArrowLeft className="size-3 mr-2 group-hover:-translate-x-1 transition-transform" />
              BACK
            </Button>
            <div className="animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-accent/90 text-accent-foreground text-[10px] font-black uppercase tracking-widest shadow-glow-sm">
                  {facility.sport_type}
                </span>
                <div className="size-1.5 rounded-full bg-accent animate-pulse" />
              </div>
              <h1 className="font-display text-5xl md:text-8xl tracking-tighter leading-none mb-2 uppercase italic">{facility.name}</h1>
            </div>
            <div className="flex flex-wrap gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2"><MapPin className="size-4 text-accent" />{facility.location}</div>
              <div className="flex items-center gap-2"><Clock className="size-4 text-accent" />{facility.open_hour}:00 – {facility.close_hour}:00</div>
              <div className="flex items-center gap-2"><Banknote className="size-4 text-accent" />{formatPHP(facility.hourly_price)}/hour</div>
            </div>
          </div>
        </div>

        <div className="container py-12 grid lg:grid-cols-[1fr_400px] gap-10">
          <div>
            <h2 className="font-display text-3xl tracking-wider mb-3">About</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">{facility.description}</p>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="font-display text-3xl tracking-wider">Pick a date</h2>
              {user && (
                <Button variant="outline" size="sm" onClick={() => setSeriesOpen(true)}>
                  <Users className="size-4" /> Recurring team series
                </Button>
              )}
            </div>
            <div className="bg-card-gradient border border-border rounded-2xl p-4 inline-block">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                className="pointer-events-auto"
              />
            </div>

            <h2 className="font-display text-3xl tracking-wider mb-3 mt-8">Available time slots</h2>
            <p className="text-sm text-muted-foreground mb-4">Tap one or more contiguous hours.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {hours.map((h) => {
                const isBooked = bookedHours.includes(h);
                const isSelected = selectedHours.includes(h);
                return (
                  <button
                    key={h}
                    onClick={() => toggleHour(h)}
                    disabled={isBooked}
                    className={`py-3 rounded-lg text-sm font-bold transition-all ${isBooked
                        ? "bg-muted text-muted-foreground line-through cursor-not-allowed opacity-50"
                        : isSelected
                          ? "bg-primary text-primary-foreground shadow-glow scale-105"
                          : "bg-secondary text-secondary-foreground hover:bg-primary/40"
                      }`}
                  >
                    {h}:00
                  </button>
                );
              })}
            </div>

            <div className="mt-16">
              <div className="flex items-center gap-3 mb-8">
                <MessageSquare className="size-8 text-accent" />
                <h2 className="font-display text-4xl tracking-wider uppercase">Community Feedback</h2>
              </div>

              {user && hasValidBooking && (
                <div className="bg-card-gradient border border-border rounded-2xl p-6 mb-10 shadow-glow/10">
                  <h3 className="text-xl font-bold mb-4">Leave a review</h3>
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setReviewRating(s)}
                        className={`transition-all ${reviewRating >= s ? "text-accent scale-110" : "text-muted-foreground opacity-30"}`}
                      >
                        <Star className="size-6 fill-current" />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience with this facility..."
                    className="w-full bg-secondary/30 border border-border rounded-xl p-4 text-sm focus:outline-none focus:border-accent min-h-[100px] mb-4"
                  />
                  <Button 
                    onClick={handleSubmitReview} 
                    disabled={submittingReview || !reviewComment.trim()}
                    className="gap-2"
                  >
                    <Send className="size-4" /> {submittingReview ? "Posting..." : "Post Review"}
                  </Button>
                </div>
              )}

              <div className="space-y-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-2xl">
                    <p>No feedback yet. Be the first to review!</p>
                  </div>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="bg-secondary/20 border border-border/50 rounded-2xl p-6 transition-all hover:border-accent/30 group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent border border-accent/30">
                            {rev.profiles?.display_name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="font-bold">{rev.profiles?.display_name || "Anonymous User"}</p>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Verified Participant</p>
                          </div>
                        </div>
                        <div className="flex gap-1 text-accent">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="size-3 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors italic">
                        "{rev.comment}"
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-4 text-right">
                        {format(new Date(rev.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>


          <aside className="lg:sticky lg:top-24 h-fit bg-card-gradient border border-border rounded-2xl p-6 shadow-card">
            <h3 className="font-display text-2xl tracking-wider mb-4">Booking summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{date ? format(date, "PPP") : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Hours</span><span>{selectedHours.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Price/hr</span><span>{formatPHP(facility.hourly_price)}</span></div>
              <div className="border-t border-border my-3" />
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-accent">{formatPHP(totalPrice)}</span></div>
            </div>
            <Button
              onClick={handleReserve}
              disabled={creating || selectedHours.length === 0}
              size="lg"
              className="w-full mt-6"
            >
              {!user ? "Sign in to book" : creating ? "Reserving…" : "Reserve & pay"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-3">Slot is held as <strong>pending</strong> until payment confirms it.</p>
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
