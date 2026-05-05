import { useEffect, useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, isToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Info,
  CheckCircle2,
  AlertCircle,
  BellRing
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Booking {
  id: string;
  facility_id: string;
  user_id: string;
  booking_date: string;
  start_hour: number;
  end_hour: number;
  status: string;
  reminder_text?: string;
  facilities?: {
    name: string;
    location: string;
  };
  profiles?: {
    display_name: string;
    phone: string;
  };
}

interface BookingCalendarProps {
  facilityId?: string;
  ownerId?: string;
  isAdmin?: boolean;
  onSelectBooking?: (booking: Booking) => void;
}

export function BookingCalendar({ facilityId, ownerId, isAdmin, onSelectBooking }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  const loadBookings = async () => {
    setLoading(true);
    let query = supabase
      .from("bookings")
      .select(`
        *,
        facilities (name, location),
        profiles (display_name, phone)
      `)
      .gte("booking_date", format(startOfMonth(currentMonth), "yyyy-MM-dd"))
      .lte("booking_date", format(endOfMonth(currentMonth), "yyyy-MM-dd"));

    if (facilityId) {
      query = query.eq("facility_id", facilityId);
    } else if (ownerId) {
      // For owners, we need to filter by facilities they own
      const { data: ownFacilities } = await supabase
        .from("facilities")
        .select("id")
        .eq("owner_id", ownerId);
      
      const ids = ownFacilities?.map(f => f.id) || [];
      if (ids.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }
      query = query.in("facility_id", ids);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load schedule data");
    } else {
      setBookings(data as any || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBookings();

    // Set up Realtime subscription
    const channel = supabase
      .channel("booking-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentMonth, facilityId, ownerId]);

  const getBookingsForDay = (date: Date) => {
    return bookings.filter((b) => isSameDay(parseISO(b.booking_date), date));
  };

  const selectedDayBookings = useMemo(() => {
    if (!selectedDate) return [];
    return getBookingsForDay(selectedDate).sort((a, b) => a.start_hour - b.start_hour);
  }, [selectedDate, bookings]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
      {/* Calendar View */}
      <div className="lg:col-span-4 bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <CalendarIcon className="size-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Schedule Custodian</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="rounded-xl border-white/5 hover:bg-white/5"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="rounded-xl border-white/5 hover:bg-white/5"
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center py-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{d}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Pad empty days at start of month */}
          {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}
          
          {days.map((date) => {
            const dayBookings = getBookingsForDay(date);
            const isSel = selectedDate && isSameDay(date, selectedDate);
            const isTodayDate = isToday(date);

            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "aspect-square rounded-2xl border transition-all duration-300 relative flex flex-col items-center justify-center gap-1 group",
                  isSel 
                    ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]" 
                    : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.05]",
                  isTodayDate && !isSel && "border-primary/40"
                )}
              >
                <span className={cn(
                  "font-display font-black text-lg tracking-tight",
                  isSel ? "text-primary" : "text-white/80 group-hover:text-white"
                )}>
                  {format(date, "d")}
                </span>
                
                {dayBookings.length > 0 && (
                  <div className="flex gap-0.5">
                    {dayBookings.slice(0, 3).map((b, idx) => (
                      <div 
                        key={b.id} 
                        className={cn(
                          "size-1.5 rounded-full",
                          b.status === "confirmed" ? "bg-emerald-500" : "bg-amber-500"
                        )} 
                      />
                    ))}
                    {dayBookings.length > 3 && <div className="size-1.5 rounded-full bg-white/20" />}
                  </div>
                )}

                {isTodayDate && !isSel && (
                  <div className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Details View */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 flex-1 backdrop-blur-md">
          <div className="mb-8">
            <h3 className="text-3xl font-display font-black text-white tracking-tighter uppercase mb-1">
              {selectedDate ? format(selectedDate, "EEEE") : "Select a Date"}
            </h3>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Archive Review"}
            </p>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {selectedDayBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                <Clock className="size-12" />
                <p className="text-xs font-black uppercase tracking-widest">No reservations log</p>
              </div>
            ) : (
              selectedDayBookings.map((booking) => (
                <div 
                  key={booking.id}
                  onClick={() => {
                    if (onSelectBooking) {
                      onSelectBooking(booking);
                    } else {
                      setSelectedBooking(booking);
                    }
                  }}
                  className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-primary/30 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Clock className="size-5" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white tracking-tight">
                          {booking.start_hour}:00 - {booking.end_hour}:00
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Duration: {booking.end_hour - booking.start_hour}h</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2.5 py-1",
                      booking.status === "confirmed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {booking.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <MapPin className="size-3.5 text-primary/50" />
                      <span className="font-medium">{booking.facilities?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <User className="size-3.5 text-primary/50" />
                      <span className="font-medium">{booking.profiles?.display_name}</span>
                    </div>
                  </div>

                  {booking.reminder_text && (
                    <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-primary">
                      <BellRing className="size-4 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Reminder Set</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Info className="size-5 text-primary" />
            <h4 className="text-sm font-bold text-white uppercase tracking-tight">System Notice</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            Real-time synchronization is enabled. All updates from facility owners and administrators will reflect instantly on this grid.
          </p>
        </div>
      </div>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(v) => !v && setSelectedBooking(null)}>
        <DialogContent className="bg-[#0f0f12] border-white/10 text-white max-w-md rounded-3xl p-8 backdrop-blur-xl">
          <DialogHeader className="mb-8">
            <div className="flex items-center justify-between">
              <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <CheckCircle2 className="size-7 text-primary" />
              </div>
              <Badge className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5",
                selectedBooking?.status === "confirmed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              )}>
                {selectedBooking?.status}
              </Badge>
            </div>
            <DialogTitle className="text-3xl font-display font-black tracking-tight mt-6 uppercase">Booking Specification</DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              Detailed registry log for <span className="text-white font-bold">{selectedBooking?.facilities?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Schedule</p>
                <p className="text-lg font-bold text-white">{selectedBooking?.booking_date}</p>
              </div>
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Time Slot</p>
                <p className="text-lg font-bold text-white">{selectedBooking?.start_hour}:00 - {selectedBooking?.end_hour}:00</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-black/20 border border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Customer Intelligence</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Identity</span>
                  <span className="text-sm font-bold text-white">{selectedBooking?.profiles?.display_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Registry Phone</span>
                  <span className="text-sm font-bold text-white">{selectedBooking?.profiles?.phone || "N/A"}</span>
                </div>
              </div>
            </div>

            {selectedBooking?.reminder_text ? (
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-3">
                  <BellRing className="size-4 text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Owner Reminder</p>
                </div>
                <p className="text-sm text-white/90 font-medium italic leading-relaxed">
                  "{selectedBooking.reminder_text}"
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-white/10 flex items-center justify-center gap-3">
                <AlertCircle className="size-4 text-muted-foreground/30" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">No internal reminders set</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setSelectedBooking(null)}
              className="h-12 px-8 rounded-xl border-white/5 hover:bg-white/5 font-bold"
            >
              Close Registry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
