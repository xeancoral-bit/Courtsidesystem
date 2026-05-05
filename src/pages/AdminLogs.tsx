import { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { 
  History, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Terminal, 
  User, 
  Clock, 
  Database,
  RefreshCw,
  Download,
  AlertCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  created_at: string;
  profiles?: {
    display_name: string | null;
  };
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    document.title = "System Logs · Command Center";
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await (supabase
      .from("audit_logs" as any) as any)
      .select("*, profiles(display_name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.target_type.toLowerCase().includes(search.toLowerCase()) ||
        (log.profiles?.display_name?.toLowerCase().includes(search.toLowerCase()));
      
      const matchesType = filterType === "all" || log.target_type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [logs, search, filterType]);

  const targetTypes = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.target_type)));
  }, [logs]);

  return (
    <AdminLayout>
      <div className="space-y-10">
        {/* Header Section */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 mb-4 shadow-[0_0_15px_rgba(var(--primary),0.15)]">
            <Terminal className="size-4 text-primary" />
            <span className="text-xs uppercase tracking-widest text-primary font-bold">
              Surveillance
            </span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl font-display font-black tracking-tighter text-white uppercase mb-2">
                System <span className="text-primary">Logs</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Immutable record of every administrative action, user modification, and system event.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={fetchLogs} className="border-white/10 hover:bg-white/5">
                <RefreshCw className={cn("size-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button variant="outline" className="border-white/10 hover:bg-white/5 text-primary">
                <Download className="size-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search actions, targets, or users..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-black/40 border-white/5 focus-visible:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="size-4 text-muted-foreground" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-black/40 border-white/5 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Targets</option>
              {targetTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="w-[180px] text-primary font-black uppercase tracking-widest text-[10px]">Timestamp</TableHead>
                <TableHead className="text-primary font-black uppercase tracking-widest text-[10px]">Initiator</TableHead>
                <TableHead className="text-primary font-black uppercase tracking-widest text-[10px]">Action</TableHead>
                <TableHead className="text-primary font-black uppercase tracking-widest text-[10px]">Target</TableHead>
                <TableHead className="text-primary font-black uppercase tracking-widest text-[10px] text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-white/5 animate-pulse">
                    <TableCell colSpan={5} className="h-16 bg-white/[0.01]" />
                  </TableRow>
                ))
              ) : filteredLogs.length === 0 ? (
                <TableRow className="border-white/5">
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 opacity-20">
                      <History className="size-12" />
                      <p className="font-display font-bold tracking-widest uppercase text-xs">No entries found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="size-3" />
                        {format(parseISO(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] text-primary font-black">
                          {log.profiles?.display_name?.[0] || 'A'}
                        </div>
                        <span className="text-sm font-medium text-white/80">
                          {log.profiles?.display_name || "System"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-black tracking-widest">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Database className="size-3.5" />
                        <span className="capitalize">{log.target_type}</span>
                        <span className="text-[10px] opacity-30">({log.target_id?.slice(0, 8)})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-white hover:bg-white/5">
                        Inspect Payload
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Info */}
        <div className="flex items-center gap-4 p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
          <AlertCircle className="size-5 text-amber-500 shrink-0" />
          <p className="text-xs font-bold text-amber-500/80 leading-relaxed uppercase tracking-wider">
            Retention Policy: System logs are preserved for 90 days. Modifications to the audit log are strictly prohibited by protocol.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
