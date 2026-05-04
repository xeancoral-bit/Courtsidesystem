import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  duration: number;
  error?: string;
}

interface HistoryEntry {
  sql: string;
  timestamp: Date;
  success: boolean;
}

const EXAMPLES = [
  { label: "List tables", sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" },
  { label: "List columns", sql: "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;" },
  { label: "Show bookings", sql: "SELECT * FROM bookings LIMIT 20;" },
  { label: "Show facilities", sql: "SELECT * FROM facilities LIMIT 20;" },
  { label: "Show profiles", sql: "SELECT * FROM profiles LIMIT 20;" },
];

const KEYWORDS = ["SELECT","FROM","WHERE","JOIN","LEFT","RIGHT","INNER","OUTER","ON","GROUP BY","ORDER BY","LIMIT","OFFSET","INSERT","INTO","VALUES","UPDATE","SET","DELETE","CREATE","TABLE","DROP","ALTER","INDEX","HAVING","DISTINCT","AS","AND","OR","NOT","NULL","IS","IN","LIKE","BETWEEN","COUNT","SUM","AVG","MIN","MAX","RETURNING","WITH","CASE","WHEN","THEN","ELSE","END","EXISTS","UNION","ALL","ASC","DESC"];

function highlightSQL(sql: string): string {
  let result = sql
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Strings
  result = result.replace(/'([^']*)'/g, `<span style="color:#a8ff78">'$1'</span>`);
  // Numbers
  result = result.replace(/\b(\d+)\b/g, `<span style="color:#f9ca24">$1</span>`);
  // Comments
  result = result.replace(/(--[^\n]*)/g, `<span style="color:#6b7280;font-style:italic">$1</span>`);
  // Keywords
  const kwRegex = new RegExp(`\\b(${KEYWORDS.join("|")})\\b`, "gi");
  result = result.replace(kwRegex, `<span style="color:#60a5fa;font-weight:600">$1</span>`);

  return result;
}

export default function SqlEditor() {
  const [sql, setSql] = useState("SELECT * FROM bookings LIMIT 10;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"results" | "history">("results");
  const [showHighlight, setShowHighlight] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const runQuery = useCallback(async () => {
    if (!sql.trim()) return;
    setLoading(true);
    const start = performance.now();
    try {
      const { data, error } = await supabase.rpc("execute_sql" as never, { query: sql } as never);
      const duration = Math.round(performance.now() - start);

      if (error) {
        // Fallback: try direct query parsing for simple SELECT
        const trimmed = sql.trim().toLowerCase();
        if (trimmed.startsWith("select")) {
          // Extract table name heuristically
          const fromMatch = sql.match(/from\s+(\w+)/i);
          if (fromMatch) {
            const table = fromMatch[1];
            const limitMatch = sql.match(/limit\s+(\d+)/i);
            const lim = limitMatch ? parseInt(limitMatch[1]) : 50;
            const { data: d2, error: e2 } = await supabase
              .from(table as never)
              .select("*")
              .limit(lim);
            const dur2 = Math.round(performance.now() - start);
            if (e2) {
              setResult({ columns: [], rows: [], rowCount: 0, duration: dur2, error: e2.message });
              setHistory(h => [{ sql, timestamp: new Date(), success: false }, ...h.slice(0, 49)]);
            } else {
              const rows = (d2 as Record<string, unknown>[]) ?? [];
              const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
              setResult({ columns, rows, rowCount: rows.length, duration: dur2 });
              setHistory(h => [{ sql, timestamp: new Date(), success: true }, ...h.slice(0, 49)]);
            }
            setActiveTab("results");
            setLoading(false);
            return;
          }
        }
        setResult({ columns: [], rows: [], rowCount: 0, duration, error: error.message });
        setHistory(h => [{ sql, timestamp: new Date(), success: false }, ...h.slice(0, 49)]);
      } else {
        const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        setResult({ columns, rows, rowCount: rows.length, duration });
        setHistory(h => [{ sql, timestamp: new Date(), success: true }, ...h.slice(0, 49)]);
      }
    } catch (e: unknown) {
      const duration = Math.round(performance.now() - start);
      setResult({ columns: [], rows: [], rowCount: 0, duration, error: String(e) });
      setHistory(h => [{ sql, timestamp: new Date(), success: false }, ...h.slice(0, 49)]);
    }
    setActiveTab("results");
    setLoading(false);
  }, [sql]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current!;
      const s = ta.selectionStart, en = ta.selectionEnd;
      const newVal = sql.substring(0, s) + "  " + sql.substring(en);
      setSql(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, hsl(158,35%,7%) 0%, hsl(215,40%,10%) 100%)",
      fontFamily: "'Barlow', sans-serif",
      color: "hsl(40,30%,95%)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <header style={{
        padding: "16px 24px",
        borderBottom: "1px solid hsl(158,22%,18%)",
        background: "hsl(158,32%,8%/0.95)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:8,
            background:"linear-gradient(135deg,hsl(221,83%,53%),hsl(199,89%,48%))",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 0 20px hsl(221,83%,53%/0.4)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, color:"hsl(40,30%,95%)" }}>SQL EDITOR</div>
            <div style={{ fontSize:11, color:"hsl(40,12%,60%)", marginTop:-2 }}>CourtConnect · Supabase</div>
          </div>
        </div>

        <div style={{ flex:1 }} />

        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {EXAMPLES.map(ex => (
            <button key={ex.label} onClick={() => setSql(ex.sql)} style={{
              padding:"5px 12px", borderRadius:6, border:"1px solid hsl(158,22%,22%)",
              background:"hsl(158,28%,12%)", color:"hsl(40,25%,80%)", fontSize:12,
              cursor:"pointer", transition:"all 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(221,83%,53%)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(158,22%,22%)")}>
              {ex.label}
            </button>
          ))}
        </div>

        <a href="/" style={{
          padding:"7px 16px", borderRadius:7, background:"hsl(158,28%,14%)",
          border:"1px solid hsl(158,22%,22%)", color:"hsl(40,25%,80%)", textDecoration:"none",
          fontSize:13, display:"flex", alignItems:"center", gap:6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back
        </a>
      </header>

      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:0 }}>
        {/* Editor panel */}
        <div style={{ padding:"20px 24px 0" }}>
          <div style={{
            borderRadius:12, border:"1px solid hsl(158,22%,20%)",
            background:"hsl(158,28%,9%)",
            overflow:"hidden",
            boxShadow:"0 4px 40px hsl(158,60%,3%/0.5)",
          }}>
            {/* Editor toolbar */}
            <div style={{
              display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
              borderBottom:"1px solid hsl(158,22%,16%)",
              background:"hsl(158,30%,8%)",
            }}>
              <span style={{ fontSize:12, color:"hsl(40,12%,55%)", fontFamily:"monospace" }}>SQL</span>
              <div style={{ flex:1 }} />
              <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"hsl(40,12%,60%)", cursor:"pointer" }}>
                <input type="checkbox" checked={showHighlight} onChange={e => setShowHighlight(e.target.checked)}
                  style={{ accentColor:"hsl(221,83%,53%)" }} />
                Highlight
              </label>
              <button onClick={() => setSql("")} style={{
                padding:"4px 10px", borderRadius:5, border:"1px solid hsl(158,22%,22%)",
                background:"transparent", color:"hsl(40,12%,60%)", fontSize:11, cursor:"pointer",
              }}>Clear</button>
              <button onClick={runQuery} disabled={loading} style={{
                padding:"6px 20px", borderRadius:7,
                background: loading ? "hsl(221,83%,40%)" : "linear-gradient(135deg,hsl(221,83%,53%),hsl(199,89%,48%))",
                border:"none", color:"white", fontWeight:700, fontSize:13, cursor: loading ? "not-allowed" : "pointer",
                display:"flex", alignItems:"center", gap:6,
                boxShadow: loading ? "none" : "0 0 16px hsl(221,83%,53%/0.35)",
                transition:"all 0.2s",
              }}>
                {loading ? (
                  <>
                    <div style={{ width:12, height:12, border:"2px solid white", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
                    Running…
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Run  <span style={{ fontSize:11, opacity:0.7 }}>Ctrl+↵</span>
                  </>
                )}
              </button>
            </div>

            {/* Code area */}
            <div style={{ position:"relative", minHeight:180 }}>
              {/* Line numbers */}
              <div style={{
                position:"absolute", left:0, top:0, bottom:0, width:44,
                background:"hsl(158,30%,7%)", borderRight:"1px solid hsl(158,22%,14%)",
                padding:"14px 0", display:"flex", flexDirection:"column",
                alignItems:"flex-end", userSelect:"none",
              }}>
                {sql.split("\n").map((_, i) => (
                  <div key={i} style={{ color:"hsl(40,12%,35%)", fontSize:12, lineHeight:"21px", paddingRight:10, fontFamily:"monospace" }}>{i + 1}</div>
                ))}
              </div>

              {/* Highlight layer */}
              {showHighlight && (
                <pre style={{
                  position:"absolute", left:44, top:0, right:0, bottom:0,
                  margin:0, padding:"14px 16px", fontSize:13, lineHeight:"21px",
                  fontFamily:"'Fira Code','Cascadia Code',monospace",
                  whiteSpace:"pre-wrap", wordBreak:"break-all", pointerEvents:"none",
                  color:"transparent",
                  overflow:"hidden",
                }} dangerouslySetInnerHTML={{ __html: highlightSQL(sql) + "\n" }} />
              )}

              <textarea
                ref={textareaRef}
                value={sql}
                onChange={e => setSql(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                placeholder="Type your SQL query here…"
                style={{
                  position:"relative", zIndex:1,
                  width:"100%", boxSizing:"border-box",
                  paddingLeft: 44 + 16,
                  paddingTop:14, paddingRight:16, paddingBottom:14,
                  minHeight:180, resize:"vertical",
                  background: showHighlight ? "transparent" : "hsl(158,28%,9%)",
                  color: showHighlight ? "transparent" : "hsl(40,30%,90%)",
                  caretColor:"hsl(40,30%,90%)",
                  border:"none", outline:"none",
                  fontSize:13, lineHeight:"21px",
                  fontFamily:"'Fira Code','Cascadia Code',monospace",
                  whiteSpace:"pre",
                }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding:"16px 24px 0", display:"flex", gap:4, borderBottom:"1px solid hsl(158,22%,16%)", marginTop:16 }}>
          {(["results","history"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding:"8px 18px", borderRadius:"8px 8px 0 0", border:"1px solid",
              borderColor: activeTab === tab ? "hsl(158,22%,20%)" : "transparent",
              borderBottom: activeTab === tab ? "1px solid hsl(158,28%,9%)" : "1px solid transparent",
              background: activeTab === tab ? "hsl(158,28%,9%)" : "transparent",
              color: activeTab === tab ? "hsl(40,30%,95%)" : "hsl(40,12%,55%)",
              fontSize:13, fontWeight: activeTab === tab ? 600 : 400,
              cursor:"pointer", transition:"all 0.15s", textTransform:"capitalize",
              display:"flex", alignItems:"center", gap:6,
            }}>
              {tab === "results" ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              )}
              {tab}
              {tab === "results" && result && (
                <span style={{ padding:"1px 7px", borderRadius:10, background:"hsl(221,83%,53%/0.2)", color:"hsl(221,83%,70%)", fontSize:11 }}>
                  {result.error ? "ERR" : result.rowCount}
                </span>
              )}
              {tab === "history" && history.length > 0 && (
                <span style={{ padding:"1px 7px", borderRadius:10, background:"hsl(158,28%,16%)", color:"hsl(40,12%,60%)", fontSize:11 }}>
                  {history.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Results panel */}
        <div style={{ flex:1, padding:"0 24px 24px", overflowAuto:"auto" } as React.CSSProperties}>
          {activeTab === "results" && (
            <div style={{ background:"hsl(158,28%,9%)", borderRadius:"0 8px 12px 12px", border:"1px solid hsl(158,22%,20%)", borderTop:"none", overflow:"hidden", minHeight:200 }}>
              {!result && !loading && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:60, color:"hsl(40,12%,45%)", gap:12 }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.4 }}>
                    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                  </svg>
                  <div style={{ fontSize:15 }}>Run a query to see results</div>
                  <div style={{ fontSize:12, opacity:0.6 }}>Press Ctrl+Enter to execute</div>
                </div>
              )}
              {loading && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60, gap:12, color:"hsl(221,83%,70%)" }}>
                  <div style={{ width:24, height:24, border:"3px solid hsl(221,83%,53%/0.3)", borderTopColor:"hsl(221,83%,53%)", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
                  Executing query…
                </div>
              )}
              {result && !loading && (
                <>
                  {/* Status bar */}
                  <div style={{ display:"flex", alignItems:"center", gap:16, padding:"10px 16px", borderBottom:"1px solid hsl(158,22%,15%)", background:"hsl(158,30%,8%)" }}>
                    {result.error ? (
                      <span style={{ color:"hsl(0,78%,65%)", fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Error
                      </span>
                    ) : (
                      <span style={{ color:"hsl(142,71%,55%)", fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        {result.rowCount} row{result.rowCount !== 1 ? "s" : ""} returned
                      </span>
                    )}
                    <span style={{ color:"hsl(40,12%,50%)", fontSize:12 }}>{result.duration}ms</span>
                    <div style={{ flex:1 }} />
                    {!result.error && result.rows.length > 0 && (
                      <button onClick={() => {
                        const csv = [result.columns.join(","), ...result.rows.map(r => result.columns.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
                        const a = document.createElement("a");
                        a.href = "data:text/csv," + encodeURIComponent(csv);
                        a.download = "query_result.csv";
                        a.click();
                      }} style={{ padding:"4px 12px", borderRadius:5, border:"1px solid hsl(158,22%,22%)", background:"transparent", color:"hsl(40,12%,65%)", fontSize:11, cursor:"pointer" }}>
                        ↓ Export CSV
                      </button>
                    )}
                  </div>

                  {result.error ? (
                    <div style={{ padding:24 }}>
                      <div style={{ background:"hsl(0,78%,10%)", border:"1px solid hsl(0,78%,25%)", borderRadius:8, padding:16, fontFamily:"monospace", fontSize:13, color:"hsl(0,78%,75%)", lineHeight:1.6 }}>
                        {result.error}
                      </div>
                    </div>
                  ) : result.rows.length === 0 ? (
                    <div style={{ padding:40, textAlign:"center", color:"hsl(40,12%,50%)", fontSize:13 }}>No rows returned</div>
                  ) : (
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:"monospace" }}>
                        <thead>
                          <tr style={{ background:"hsl(158,30%,7%)" }}>
                            <th style={{ padding:"8px 12px", borderBottom:"1px solid hsl(158,22%,18%)", color:"hsl(40,12%,50%)", textAlign:"right", width:44, userSelect:"none" }}>#</th>
                            {result.columns.map(col => (
                              <th key={col} style={{ padding:"8px 12px", borderBottom:"1px solid hsl(158,22%,18%)", color:"hsl(221,83%,70%)", textAlign:"left", fontWeight:600, whiteSpace:"nowrap" }}>
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "hsl(158,30%,8%)" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "hsl(221,83%,53%/0.07)")}
                              onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "hsl(158,30%,8%)")}>
                              <td style={{ padding:"6px 12px", borderBottom:"1px solid hsl(158,22%,12%)", color:"hsl(40,12%,40%)", textAlign:"right" }}>{i + 1}</td>
                              {result.columns.map(col => {
                                const val = row[col];
                                const isNull = val === null || val === undefined;
                                const isNum = typeof val === "number";
                                const isBool = typeof val === "boolean";
                                return (
                                  <td key={col} style={{ padding:"6px 12px", borderBottom:"1px solid hsl(158,22%,12%)", whiteSpace:"nowrap", maxWidth:320, overflow:"hidden", textOverflow:"ellipsis",
                                    color: isNull ? "hsl(40,12%,35%)" : isNum ? "hsl(35,95%,70%)" : isBool ? "hsl(142,71%,55%)" : "hsl(40,25%,88%)" }}>
                                    {isNull ? <span style={{ fontStyle:"italic" }}>NULL</span> : isBool ? String(val) : typeof val === "object" ? JSON.stringify(val) : String(val)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div style={{ background:"hsl(158,28%,9%)", borderRadius:"0 8px 12px 12px", border:"1px solid hsl(158,22%,20%)", borderTop:"none", overflow:"hidden", minHeight:200 }}>
              {history.length === 0 ? (
                <div style={{ padding:60, textAlign:"center", color:"hsl(40,12%,45%)", fontSize:13 }}>No queries run yet</div>
              ) : history.map((h, i) => (
                <div key={i} style={{ borderBottom:"1px solid hsl(158,22%,14%)", padding:"12px 16px", display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer" }}
                  onClick={() => { setSql(h.sql); setActiveTab("results"); }}
                  onMouseEnter={e => (e.currentTarget.style.background = "hsl(221,83%,53%/0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span style={{ marginTop:2, color: h.success ? "hsl(142,71%,50%)" : "hsl(0,78%,60%)", flexShrink:0 }}>
                    {h.success ? "✓" : "✗"}
                  </span>
                  <pre style={{ margin:0, flex:1, fontSize:12, fontFamily:"monospace", color:"hsl(40,25%,80%)", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>{h.sql}</pre>
                  <span style={{ color:"hsl(40,12%,45%)", fontSize:11, flexShrink:0, marginTop:2 }}>
                    {h.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
