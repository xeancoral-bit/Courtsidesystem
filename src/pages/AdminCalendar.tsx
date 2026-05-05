import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { BookingCalendar } from "@/components/calendar/BookingCalendar";
import { 
  Calendar as CalendarIcon, 
  Info, 
  Search, 
  Filter,
  MoreVertical,
  User,
  MapPin,
  Clock,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export default function AdminCalendar() {
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Global Schedule · Command Center";
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    const { data } = await supabase.from("facilities").select("id, name");
    setFacilities(data || []);
    setLoading(false);
  };

  const handleBookingSelect = (booking: any) => {
    setSelectedBooking(booking);
    setIsSheetOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 mb-4 shadow-[0_0_15px_rgba(var(--primary),0.15)]">
              <CalendarIcon className="size-4 text-primary" />
              <span className="text-xs uppercase tracking-widest text-primary font-bold">
                Temporal Oversight
              </span>
            </div>
            <h1 className="text-5xl font-display font-black tracking-tighter text-white uppercase mb-2">
              Global <span className="text-primary">Schedule</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Centralized monitoring of all facility reservations. Detect conflicts and manage platform capacity in real-time.
            </p>
          </div>
          
          <div className="flex gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl backdrop-blur-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search events..." 
                className="pl-10 bg-black/40 border-white/5 w-64 h-11 focus-visible:ring-primary/50"
              />
            </div>
            <Button variant="outline" className="border-white/10 h-11 hover:bg-white/5">
              <Filter className="size-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 px-6 py-4 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Conflict</span>
          </div>
        </div>

        {/* Main Calendar View */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-sm min-h-[800px]">
          {loading ? (
            <div className="h-[600px] flex flex-col items-center justify-center gap-4">
              <Loader2 className="size-12 text-primary animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Synchronizing Temporal Data…</p>
            </div>
          ) : (
            <BookingCalendar 
              isAdmin 
              onSelectBooking={handleBookingSelect}
            />
          )}
        </div>

        {/* Booking Detail Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-[400px] sm:w-[540px] bg-[#0a0a0c] border-white/10 text-white p-0">
            {selectedBooking && (
              <div className="flex flex-col h-full">
                <div className="p-8 space-y-6">
                  <SheetHeader className="text-left space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 uppercase tracking-widest text-[10px] font-black px-3 py-1">
                        Confirmed Booking
                      </Badge>
                      <Button variant="ghost" size="icon" className="size-8 rounded-full hover:bg-white/5">
                        <MoreVertical className="size-4" />
                      </Button>
                    </div>
                    <div>
                      <SheetTitle className="text-4xl font-display font-black tracking-tighter uppercase text-white leading-none">
                        Reservation <span className="text-primary">Details</span>
                      </SheetTitle>
                      <SheetDescription className="text-muted-foreground mt-2 font-medium">
                        Internal Reference: {selectedBooking.id}
                      </SheetDescription>
                    </div>
                  </SheetHeader>

                  <div className="grid gap-6">
                    {/* Time Info */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <CalendarIcon className="size-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reservation Date</p>
                          <p className="text-lg font-bold text-white">{format(parseISO(selectedBooking.booking_date), "MMMM dd, yyyy")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                        <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <Clock className="size-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Allocated Time Slot</p>
                          <p className="text-lg font-bold text-white">{selectedBooking.start_time} - {selectedBooking.end_time}</p>
                        </div>
                      </div>
                    </div>

                    {/* Participant Info */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <User className="size-3" /> Party Information
                      </h4>
                      <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-black">
                            {selectedBooking.profiles?.display_name?.[0] || "U"}
                          </div>
                          <span className="font-bold text-white">{selectedBooking.profiles?.display_name || "Unknown User"}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-white">
                          View Profile <ChevronRight className="size-3 ml-1" />
                        </Button>
                      </div>
                    </div>

                    {/* Facility Info */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <MapPin className="size-3" /> Designated Facility
                      </h4>
                      <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-white/5 flex items-center justify-center">
                            <Info className="size-4 text-muted-foreground" />
                          </div>
                          <span className="font-bold text-white">{selectedBooking.facilities?.name || "Facility Hub"}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-white">
                          Locate <ExternalLink className="size-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto p-8 border-t border-white/5 bg-white/[0.01] space-y-4">
                  <div className="flex items-center gap-3 text-amber-500 mb-2">
                    <ShieldAlert className="size-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Administrative Overrides</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-[10px] uppercase font-black tracking-widest h-12">
                      Revoke Reservation
                    </Button>
                    <Button variant="outline" className="border-white/10 hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-[10px] uppercase font-black tracking-widest h-12">
                      Modify Schedule
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
