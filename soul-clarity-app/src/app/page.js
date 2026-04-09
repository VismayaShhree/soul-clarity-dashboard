"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID || "1PTd2y1xxw1QxlAMczoP1OJ-9HBZ-k-D_WL-AmLuHJYc";

// ── CSV Parser ──
function parseCSV(text) {
  const lines = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === "\n" && !inQuote) { lines.push(current); current = ""; continue; }
    current += ch;
  }
  if (current.trim()) lines.push(current);
  return lines.map((l) => l.split(",").map((c) => c.trim()));
}

async function fetchTab(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    return parseCSV(text);
  } catch (e) {
    console.error(`Failed: ${sheetName}`, e);
    return null;
  }
}

function parseSoulData(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const findCol = (kw) => headers.findIndex((h) => kw.some((k) => h.includes(k)));
  const cols = {
    date: findCol(["date"]),
    moon: findCol(["moonphase", "moon"]),
    energy: findCol(["energylevel", "energy"]),
    kriya: findCol(["kriya"]),
    mood: findCol(["mood"]),
    wakeup: findCol(["wakeup", "wake"]),
    sleep: findCol(["sleep"]),
    activity: findCol(["activity"]),
    sadhana: findCol(["sadhana"]),
    drinks: findCol(["drinks", "drink"]),
    fruits: findCol(["fruits", "fruit"]),
    food: findCol(["food"]),
    foodDesc: findCol(["fooddescription", "fooddesc"]),
    digestion: findCol(["digestion"]),
    remarks: findCol(["remarks", "remark"]),
    stopDoing: findCol(["stopdoing", "stop"]),
  };
  return rows
    .slice(1)
    .filter((r) => r[cols.date] && r[cols.date].match(/\d{4}/))
    .map((r) => {
      const get = (col) => (col >= 0 && r[col] ? r[col].trim() : "");
      const energy = get(cols.energy);
      const eMatch = energy.match(/E(\d)/);
      return {
        date: get(cols.date), moon: get(cols.moon),
        energy: eMatch ? `E${eMatch[1]}` : energy,
        kriya: get(cols.kriya),
        mood: get(cols.mood).split(",").map((s) => s.trim()).filter(Boolean),
        wakeup: get(cols.wakeup), sleep: get(cols.sleep),
        activity: get(cols.activity),
        sadhana: get(cols.sadhana) === "NILL" ? [] : get(cols.sadhana).split(",").map((s) => s.trim()).filter(Boolean),
        drinks: get(cols.drinks).split(",").map((s) => s.trim()).filter(Boolean),
        fruits: get(cols.fruits),
        food: get(cols.foodDesc) || get(cols.food),
        digestion: get(cols.digestion).split(",").map((s) => s.trim()).filter(Boolean),
        remarks: get(cols.remarks), stopDoing: get(cols.stopDoing),
      };
    });
}

function getMoonPhase(date = new Date()) {
  let y = date.getFullYear(), m = date.getMonth() + 1;
  const d = date.getDate();
  if (m < 3) { y--; m += 12; }
  m++;
  let jd = 365.25 * y + 30.6 * m + d - 694039.09;
  jd /= 29.5305882;
  jd -= parseInt(jd);
  let b = Math.round(jd * 8);
  if (b >= 8) b = 0;
  return [
    { name: "New Moon", emoji: "🌑", ill: 0 },
    { name: "Waxing Crescent", emoji: "🌒", ill: 15 },
    { name: "First Quarter", emoji: "🌓", ill: 50 },
    { name: "Waxing Gibbous", emoji: "🌔", ill: 78 },
    { name: "Full Moon", emoji: "🌕", ill: 100 },
    { name: "Waning Gibbous", emoji: "🌖", ill: 78 },
    { name: "Last Quarter", emoji: "🌗", ill: 50 },
    { name: "Waning Crescent", emoji: "🌘", ill: 15 },
  ][b];
}

function MoonSVG({ phase, size = 60 }) {
  const ill = phase.ill / 100, r = size / 2 - 3, cx = size / 2, cy = size / 2;
  const isW = phase.name.includes("Waxing") || phase.name === "First Quarter" || phase.name === "Full Moon";
  let mk = "";
  if (phase.name === "New Moon") mk = `M${cx},${cy - r}A${r},${r} 0 1,1 ${cx},${cy + r}A${r},${r} 0 1,1 ${cx},${cy - r}`;
  else if (phase.name !== "Full Moon") {
    const cr = r * Math.abs(1 - 2 * ill), sw = ill > 0.5 ? 1 : 0;
    mk = isW
      ? `M${cx},${cy - r}A${r},${r} 0 0,0 ${cx},${cy + r}A${cr},${r} 0 0,${sw} ${cx},${cy - r}`
      : `M${cx},${cy - r}A${r},${r} 0 0,1 ${cx},${cy + r}A${cr},${r} 0 0,${1 - sw} ${cx},${cy - r}`;
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id={`mn${size}`} cx="40%" cy="40%">
          <stop offset="0%" stopColor="#fffde7" />
          <stop offset="100%" stopColor="#e0d68a" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#mn${size})`} />
      {mk && <path d={mk} fill="rgba(10,10,26,0.9)" />}
    </svg>
  );
}

function exportCSV(entries, filename) {
  const hd = ["Date", "Moon Phase", "Energy", "Kriya", "Mood", "WakeUp", "Sleep", "Sadhana", "Drinks", "Fruits", "Food", "Digestion", "Remarks"];
  const rows = entries.map((e) =>
    [e.date, e.moon, e.energy, e.kriya, (e.mood || []).join("; "), e.wakeup, e.sleep, (e.sadhana || []).join("; "), (e.drinks || []).join("; "), e.fruits, e.food, (e.digestion || []).join("; "), e.remarks].map((v) => `"${(v || "").replace(/"/g, '""')}"`)
  );
  const csv = [hd.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const EVALS = { E0: 0, E1: 1, E2: 2, E3: 3, E4: 4 };
const ECOLS = { E0: "#64748b", E1: "#f87171", E2: "#fbbf24", E3: "#34d399", E4: "#818cf8" };
const MOON_PHASES = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];

function AnimNum({ value }) {
  const [d, setD] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const st = performance.now();
    const f = (now) => {
      const p = Math.min((now - st) / 1000, 1);
      setD(Math.round((1 - (1 - p) ** 3) * value));
      if (p < 1) ref.current = requestAnimationFrame(f);
    };
    ref.current = requestAnimationFrame(f);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return (<span>{d}</span>);
}

function Ring({ score, size = 100, sw = 7, label, small }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, off = c - (score / 100) * c;
  const col = score >= 75 ? "#34d399" : score >= 50 ? "#fbbf24" : score >= 25 ? "#fb923c" : "#f87171";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={sw} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={sw} fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div style={{ marginTop: -size / 2 - (small ? 10 : 12), fontSize: small ? 14 : 24, fontWeight: 800, color: col, fontFamily: "var(--mono)" }}>
        <AnimNum value={score} />
      </div>
      {label && (<div style={{ marginTop: small ? 2 : 14, fontSize: small ? 8 : 10, textTransform: "uppercase", letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", fontFamily: "var(--mono)", textAlign: "center", lineHeight: 1.2 }}>{label}</div>)}
    </div>
  );
}

function SparkBar({ data, height = 60, label }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.v), 1);
  const w = 100 / data.length;
  return (
    <div>
      {label && (<div style={{ fontSize: 9, fontFamily: "var(--mono)", letterSpacing: 1.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>)}
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.v / max) * (height - 4);
          return (<rect key={i} x={i * w + w * 0.15} y={height - h} width={w * 0.7} height={Math.max(h, 1)} rx={1.5} fill={d.col || "#818cf8"} opacity={0.8}><title>{d.label}: {d.v}</title></rect>);
        })}
      </svg>
    </div>
  );
}

// ════════════════════════════
// MAIN COMPONENT
// ════════════════════════════
export default function SoulClarityDashboard() {
  const [entries, setEntries] = useState([]);
  const [extraTabs, setExtraTabs] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadStatus, setLoadStatus] = useState("Connecting to Google Sheets...");
  const [mainView, setMainView] = useState("dashboard");
  const [timeRange, setTimeRange] = useState("month");
  const [decodeMode, setDecodeMode] = useState("month");
  const [selectedMoon, setSelectedMoon] = useState("Full Moon");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aMsg, setAMsg] = useState(0);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const loadFromSheets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLoadStatus("Fetching 2026 data...");
      const d26 = await fetchTab("Soul_Clarity_Tracker");
      const p26 = parseSoulData(d26);

      setLoadStatus("Fetching 2025 data...");
      const d25 = await fetchTab("K2MJ");
      const p25 = parseSoulData(d25);

      const byDate = {};
      [...p25, ...p26].forEach((e) => { byDate[e.date] = e; });
      setEntries(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)));

      setLoadStatus("Fetching other tabs...");
      const extras = {};
      for (const name of ["Moon_cycle_2026", "Moon_cycel 2025", "Dream_Tracker", "Gym calendar", "TIME SHEET"]) {
        const data = await fetchTab(name);
        if (data && data.length > 1) extras[name] = data;
      }
      setExtraTabs(extras);
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      setError("Failed to load from Google Sheets.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadFromSheets(); }, [loadFromSheets]);

  const rangeEntries = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    if (timeRange === "week") start.setDate(start.getDate() - 7);
    else if (timeRange === "month") start.setMonth(start.getMonth() - 1);
    else if (timeRange === "3months") start.setMonth(start.getMonth() - 3);
    else start.setFullYear(start.getFullYear() - 1);
    return entries.filter((e) => e.date >= start.toISOString().split("T")[0]);
  }, [entries, timeRange]);

  const decodeEntries = useMemo(() => {
    if (decodeMode === "day") return entries.filter((e) => e.date === selectedDate);
    if (decodeMode === "moon") return entries.filter((e) => e.moon === selectedMoon);
    const now = new Date();
    let start = new Date(now);
    if (decodeMode === "week") start.setDate(start.getDate() - 7);
    else if (decodeMode === "month") start.setMonth(start.getMonth() - 1);
    else start.setFullYear(start.getFullYear() - 1);
    return entries.filter((e) => e.date >= start.toISOString().split("T")[0]);
  }, [entries, decodeMode, selectedDate, selectedMoon]);

  const energyData = useMemo(() => rangeEntries.map((e) => ({ v: EVALS[e.energy] ?? 0, col: ECOLS[e.energy] || "#64748b", label: e.date })), [rangeEntries]);
  const sadhanaFreq = useMemo(() => { const c = {}; rangeEntries.forEach((e) => (e.sadhana || []).forEach((s) => { c[s] = (c[s] || 0) + 1; })); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 10); }, [rangeEntries]);
  const digestData = useMemo(() => rangeEntries.map((e) => { const d = e.digestion || []; let col = "rgba(255,255,255,0.04)"; if (d.includes("Smooth")) col = "rgba(52,211,153,0.5)"; if (d.includes("Pelleted")) col = "rgba(251,191,36,0.5)"; if (d.includes("Hurting") || d.includes("Hard plug")) col = "rgba(248,113,113,0.5)"; return { col, tip: `${e.date}: ${d.join(", ")}` }; }), [rangeEntries]);
  const moonDist = useMemo(() => { const c = {}; rangeEntries.forEach((e) => { if (e.moon) c[e.moon] = (c[e.moon] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]); }, [rangeEntries]);
  const kriyaRate = useMemo(() => { if (!rangeEntries.length) return 0; const y = rangeEntries.filter((e) => e.kriya === "Yes").length; const p = rangeEntries.filter((e) => e.kriya === "Partial").length; return Math.round(((y + p * 0.5) / rangeEntries.length) * 100); }, [rangeEntries]);
  const avgE = useMemo(() => { if (!rangeEntries.length) return "0"; return (rangeEntries.reduce((s, e) => s + (EVALS[e.energy] ?? 0), 0) / rangeEntries.length).toFixed(1); }, [rangeEntries]);

  const ldMsgs = ["Mapping prana flow...", "Reading circadian alignment...", "Analyzing sadhana patterns...", "Consulting moon cycles...", "Decoding digestive trends...", "Synthesizing yogic science..."];
  useEffect(() => { if (!analyzing) return; const i = setInterval(() => setAMsg((p) => (p + 1) % ldMsgs.length), 2000); return () => clearInterval(i); }, [analyzing]);

  async function runAnalysis() {
    setAnalyzing(true);
    setResult(null);
    const de = decodeEntries;
    const modeLabel = decodeMode === "moon" ? `${selectedMoon} PHASE` : decodeMode === "day" ? `SINGLE DAY (${selectedDate})` : decodeMode.toUpperCase();
    const sf = {};
    de.forEach((e) => (e.sadhana || []).forEach((s) => { sf[s] = (sf[s] || 0) + 1; }));
    const md = {};
    de.forEach((e) => { if (e.moon) md[e.moon] = (md[e.moon] || 0) + 1; });

    const summary = de.length
      ? `${modeLabel} (${de.length} days, ${de[0]?.date} to ${de[de.length - 1]?.date})\nAvg Energy: ${(de.reduce((s, e) => s + (EVALS[e.energy] ?? 0), 0) / de.length).toFixed(1)}/4\nKriya: Yes=${de.filter((e) => e.kriya === "Yes").length} Partial=${de.filter((e) => e.kriya === "Partial").length} No=${de.filter((e) => e.kriya === "No").length}\nTop Sadhana: ${Object.entries(sf).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s, n]) => `${s}(${n})`).join(", ")}\nMoon: ${Object.entries(md).map(([m, n]) => `${m}(${n})`).join(", ")}\nDigestion: ${de.map((e) => (e.digestion || []).join("/")).filter(Boolean).slice(-15).join(" > ")}\nMoods: ${de.map((e) => (e.mood || []).join("/")).filter(Boolean).slice(-15).join(" > ")}\nFoods: ${de.map((e) => e.food || "").filter(Boolean).slice(-15).join(", ")}\nDrinks: ${de.map((e) => (e.drinks || []).join("+")).filter(Boolean).slice(-10).join(", ")}\nRemarks: ${de.map((e) => e.remarks || "").filter(Boolean).slice(-8).join(" | ")}\n\nEntries:\n${de.slice(-20).map((e) => `${e.date}: E=${e.energy} K=${e.kriya} S=[${(e.sadhana || []).join(",")}] Moon=${e.moon} Food=${e.food || "?"} Dig=[${(e.digestion || []).join(",")}] Wake=${e.wakeup}`).join("\n")}`
      : "No data. General guidance for a sadhaka.";

    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      console.error(e);
      setError("Analysis failed. Check API key in Vercel settings.");
    }
    setAnalyzing(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#07071a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#818cf8", fontFamily: "var(--mono)", gap: 16 }}>
        <style>{`:root { --mono: 'JetBrains Mono', monospace; } @keyframes pulse { 0%,100%{opacity:.4}50%{opacity:1} }`}</style>
        <MoonSVG phase={getMoonPhase()} size={48} />
        <div style={{ fontSize: 14 }}>{loadStatus}</div>
        <div style={{ width: 200, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "60%", background: "linear-gradient(90deg,#818cf8,#a855f7)", borderRadius: 2, animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
      </div>
    );
  }

  const InsightCard = ({ ins, i }) => {
    const C = { strength: { bg: "rgba(52,211,153,.05)", bd: "rgba(52,211,153,.15)", c: "#34d399", l: "STRENGTH" }, warning: { bg: "rgba(251,191,36,.05)", bd: "rgba(251,191,36,.15)", c: "#fbbf24", l: "WATCH OUT" }, tip: { bg: "rgba(129,140,248,.05)", bd: "rgba(129,140,248,.15)", c: "#818cf8", l: "PRO TIP" }, moon: { bg: "rgba(244,114,182,.05)", bd: "rgba(244,114,182,.15)", c: "#f472b6", l: "MOON" }, sadhana: { bg: "rgba(168,85,247,.05)", bd: "rgba(168,85,247,.15)", c: "#a855f7", l: "SADHANA" } };
    const cc = C[ins.type || "tip"] || C.tip;
    return (
      <div style={{ background: cc.bg, border: `1px solid ${cc.bd}`, borderRadius: 11, padding: "12px 14px", animation: `fadeUp .4s ${i * .04}s both ease-out` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
          <span style={{ fontSize: 15 }}>{ins.icon}</span>
          <span style={{ fontSize: 7, fontWeight: 700, color: cc.c, fontFamily: "var(--mono)", letterSpacing: 1 }}>{cc.l}</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", marginBottom: 2 }}>{ins.title}</div>
        <div style={{ fontSize: 10, lineHeight: 1.7, color: "rgba(255,255,255,.5)" }}>{ins.body}</div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(170deg,#07071a,#0c1024 50%,#0a0f1a)", color: "#e2e8f0", fontFamily: "var(--body)" }}>
      <style>{`
        :root { --body: 'Outfit', sans-serif; --mono: 'JetBrains Mono', monospace; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:.4}50%{opacity:1} }
        .cd { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05); border-radius:14px; padding:16px; animation:fadeUp .4s ease-out both }
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "18px 12px 50px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#f1f5f9" }}>Soul Clarity</h1>
            <div style={{ fontSize: 8, fontFamily: "var(--mono)", color: "rgba(255,255,255,.2)", letterSpacing: 2, marginTop: 1 }}>
              LIVE · {entries.length} ENTRIES {lastSync && `· ${lastSync}`}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={loadFromSheets} style={{ background: "none", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "5px 10px", color: "rgba(255,255,255,.3)", fontSize: 10, cursor: "pointer", fontFamily: "var(--mono)" }}>↻ Sync</button>
            <MoonSVG phase={getMoonPhase()} size={28} />
          </div>
        </div>

        {error && (<div style={{ background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 12, fontSize: 12, color: "#f87171" }}>{error}</div>)}

        {/* Nav */}
        <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
          {[{ id: "dashboard", l: "📊 Dashboard" }, { id: "analyze", l: "🧬 Decode" }, { id: "data", l: "📋 Data" }].map((n) => (
            <button key={n.id} onClick={() => setMainView(n.id)} style={{ flex: 1, padding: "9px 6px", borderRadius: 11, fontSize: 11, fontFamily: "var(--mono)", cursor: "pointer", transition: "all .2s", border: mainView === n.id ? "1px solid rgba(129,140,248,.25)" : "1px solid rgba(255,255,255,.05)", background: mainView === n.id ? "rgba(129,140,248,.08)" : "transparent", color: mainView === n.id ? "#818cf8" : "rgba(255,255,255,.3)" }}>{n.l}</button>
          ))}
        </div>

        {/* ══ DASHBOARD ══ */}
        {mainView === "dashboard" && (
          <div style={{ animation: "fadeUp .4s .1s both ease-out" }}>
            <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
              {["week", "month", "3months", "year"].map((t) => (
                <button key={t} onClick={() => setTimeRange(t)} style={{ padding: "6px 12px", borderRadius: 9, fontSize: 9, fontFamily: "var(--mono)", letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", border: timeRange === t ? "1px solid rgba(129,140,248,.3)" : "1px solid rgba(255,255,255,.04)", background: timeRange === t ? "rgba(129,140,248,.1)" : "transparent", color: timeRange === t ? "#818cf8" : "rgba(255,255,255,.2)" }}>{t === "3months" ? "3M" : t}</button>
              ))}
              <div style={{ marginLeft: "auto", fontSize: 9, color: "rgba(255,255,255,.15)", fontFamily: "var(--mono)", alignSelf: "center" }}>{rangeEntries.length}d</div>
            </div>

            {!rangeEntries.length ? (
              <div className="cd" style={{ textAlign: "center", padding: 36 }}><div style={{ fontSize: 32, marginBottom: 8 }}>🪷</div><div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>No data for this period</div></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7 }}>
                  {[{ l: "Avg Energy", v: avgE, s: "/4", c: "#818cf8" }, { l: "Kriya", v: `${kriyaRate}%`, c: "#a855f7" }, { l: "Days", v: rangeEntries.length, c: "#34d399" }, { l: "Total", v: entries.length, s: "all", c: "#fbbf24" }].map((x, i) => (
                    <div key={i} className="cd" style={{ textAlign: "center", padding: "10px 4px" }}>
                      <div style={{ fontSize: 7, fontFamily: "var(--mono)", letterSpacing: 1.5, color: "rgba(255,255,255,.2)", textTransform: "uppercase", marginBottom: 4 }}>{x.l}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: x.c }}>{x.v}<span style={{ fontSize: 9, fontWeight: 400, color: "rgba(255,255,255,.15)" }}>{x.s || ""}</span></div>
                    </div>
                  ))}
                </div>
                <div className="cd"><SparkBar data={energyData} height={60} label={`Energy — ${timeRange}`} /><div style={{ display: "flex", gap: 6, marginTop: 5, justifyContent: "center" }}>{Object.entries(ECOLS).map(([k, c]) => (<div key={k} style={{ display: "flex", alignItems: "center", gap: 2 }}><div style={{ width: 6, height: 6, borderRadius: 2, background: c }} /><span style={{ fontSize: 6, color: "rgba(255,255,255,.2)", fontFamily: "var(--mono)" }}>{k}</span></div>))}</div></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  <div className="cd"><div style={{ fontSize: 8, fontFamily: "var(--mono)", letterSpacing: 1.5, color: "rgba(255,255,255,.2)", textTransform: "uppercase", marginBottom: 7 }}>🪷 Sadhana</div>{sadhanaFreq.map(([s, c]) => (<div key={s} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}><div style={{ flex: 1, height: 4, background: "rgba(255,255,255,.03)", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${(c / (sadhanaFreq[0]?.[1] || 1)) * 100}%`, background: "rgba(168,85,247,0.4)", borderRadius: 2 }} /></div><span style={{ fontSize: 7, color: "rgba(255,255,255,.3)", fontFamily: "var(--mono)", minWidth: 50, textAlign: "right" }}>{s}</span><span style={{ fontSize: 7, color: "#a855f7", fontFamily: "var(--mono)", width: 14 }}>{c}</span></div>))}</div>
                  <div className="cd"><div style={{ fontSize: 8, fontFamily: "var(--mono)", letterSpacing: 1.5, color: "rgba(255,255,255,.2)", textTransform: "uppercase", marginBottom: 7 }}>💚 Digestion</div><div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>{digestData.map((d, i) => (<div key={i} title={d.tip} style={{ width: 10, height: 10, borderRadius: 2, background: d.col }} />))}</div><div style={{ display: "flex", gap: 5, marginTop: 6 }}>{[["✓", "rgba(52,211,153,.5)"], ["●", "rgba(251,191,36,.5)"], ["!", "rgba(248,113,113,.5)"]].map(([l, c]) => (<div key={l} style={{ display: "flex", alignItems: "center", gap: 2 }}><div style={{ width: 5, height: 5, borderRadius: 1, background: c }} /><span style={{ fontSize: 6, color: "rgba(255,255,255,.2)", fontFamily: "var(--mono)" }}>{l}</span></div>))}</div></div>
                </div>
                <div className="cd"><div style={{ fontSize: 8, fontFamily: "var(--mono)", letterSpacing: 1.5, color: "rgba(255,255,255,.2)", textTransform: "uppercase", marginBottom: 6 }}>🌙 Moons</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{moonDist.map(([m, c]) => (<div key={m} style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(255,255,255,.02)", padding: "3px 8px", borderRadius: 7 }}><span style={{ fontSize: 9, color: "rgba(255,255,255,.35)" }}>{m}</span><span style={{ fontSize: 9, color: "#fbbf24", fontFamily: "var(--mono)", fontWeight: 700 }}>{c}d</span></div>))}</div></div>
              </div>
            )}
          </div>
        )}

        {/* ══ DECODE ══ */}
        {mainView === "analyze" && (
          <div style={{ animation: "fadeUp .4s ease-out" }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {[{ id: "day", l: "📅Day" }, { id: "week", l: "📆Week" }, { id: "month", l: "🗓Month" }, { id: "year", l: "📊Year" }, { id: "moon", l: "🌙Moon" }].map((t) => (
                <button key={t.id} onClick={() => { setDecodeMode(t.id); setResult(null); }} style={{ flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 10, fontFamily: "var(--mono)", cursor: "pointer", border: decodeMode === t.id ? "1px solid rgba(168,85,247,.3)" : "1px solid rgba(255,255,255,.04)", background: decodeMode === t.id ? "rgba(168,85,247,.1)" : "transparent", color: decodeMode === t.id ? "#a855f7" : "rgba(255,255,255,.25)" }}>{t.l}</button>
              ))}
            </div>

            {decodeMode === "day" && (<div className="cd" style={{ marginBottom: 10, padding: "10px 14px" }}><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "1px solid rgba(255,255,255,.05)", borderRadius: 8, padding: "8px", color: "#e2e8f0", fontSize: 12, fontFamily: "var(--mono)", textAlign: "center" }} /></div>)}

            {decodeMode === "moon" && (
              <div className="cd" style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontFamily: "var(--mono)", color: "rgba(255,255,255,.3)", marginBottom: 8 }}>Select Moon Phase</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {MOON_PHASES.map((m) => { const ct = entries.filter((e) => e.moon === m).length; return (<button key={m} onClick={() => { setSelectedMoon(m); setResult(null); }} style={{ padding: "7px 12px", borderRadius: 10, fontSize: 10, cursor: "pointer", fontFamily: "var(--mono)", border: selectedMoon === m ? "1px solid rgba(244,114,182,.3)" : "1px solid rgba(255,255,255,.05)", background: selectedMoon === m ? "rgba(244,114,182,.1)" : "transparent", color: selectedMoon === m ? "#f472b6" : "rgba(255,255,255,.3)" }}>{m} ({ct}d)</button>); })}
                </div>
              </div>
            )}

            <div className="cd" style={{ textAlign: "center", padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginBottom: 5 }}>{decodeEntries.length} days {decodeMode === "moon" ? `(${selectedMoon})` : ""}</div>
              <button onClick={runAnalysis} disabled={analyzing || !decodeEntries.length} style={{ marginTop: 4, padding: "12px 22px", borderRadius: 11, background: analyzing ? "rgba(255,255,255,.04)" : "linear-gradient(135deg,#818cf8,#a855f7)", border: "none", color: analyzing ? "rgba(255,255,255,.2)" : "#fff", fontSize: 12, fontWeight: 700, cursor: analyzing ? "wait" : "pointer", fontFamily: "var(--mono)", letterSpacing: 1, boxShadow: analyzing ? "none" : "0 3px 14px rgba(168,85,247,.2)" }}>{analyzing ? "Analyzing..." : `🧬 DECODE`}</button>
              {analyzing && (<div style={{ marginTop: 10, fontSize: 10, fontFamily: "var(--mono)", color: "rgba(168,85,247,.5)", animation: "pulse 2s ease-in-out infinite" }}>{ldMsgs[aMsg]}</div>)}
            </div>

            {result && (
              <div style={{ animation: "fadeUp .5s ease-out" }}>
                <div style={{ textAlign: "center", marginBottom: 20 }}><Ring score={result.overallScore} size={120} sw={8} /><div style={{ marginTop: 12, fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{result.tagline}</div></div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, marginBottom: 8 }}>{[{ s: result.circadianAlignment, l: "Circadian" }, { s: result.energyOptimization, l: "Energy" }, { s: result.recoveryBalance, l: "Recovery" }].map((x) => (<Ring key={x.l} score={x.s} size={60} sw={4} label={x.l} small />))}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, marginBottom: 18 }}>{[{ s: result.sadhanaDepth, l: "Sadhana" }, { s: result.moonHarmony, l: "Moon ✦" }, { s: result.digestiveHealth, l: "Digestion" }].map((x) => (<Ring key={x.l} score={x.s} size={60} sw={4} label={x.l} small />))}</div>

                {result.moonInsight && (<div className="cd" style={{ borderColor: "rgba(244,114,182,.12)", marginBottom: 9, display: "flex", gap: 10 }}><MoonSVG phase={getMoonPhase()} size={32} /><div><div style={{ fontSize: 7, fontFamily: "var(--mono)", letterSpacing: 2, color: "#f472b6", textTransform: "uppercase", marginBottom: 3 }}>🌙 Moon</div><div style={{ fontSize: 11, lineHeight: 1.7, color: "rgba(255,255,255,.55)" }}>{result.moonInsight}</div></div></div>)}
                {result.sadhanaNote && (<div className="cd" style={{ borderColor: "rgba(168,85,247,.12)", marginBottom: 9 }}><div style={{ fontSize: 7, fontFamily: "var(--mono)", letterSpacing: 2, color: "#a855f7", textTransform: "uppercase", marginBottom: 3 }}>🪷 Sadhana</div><div style={{ fontSize: 11, lineHeight: 1.7, color: "rgba(255,255,255,.55)" }}>{result.sadhanaNote}</div></div>)}

                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>{result.insights?.map((ins, i) => (<InsightCard key={i} ins={ins} i={i} />))}</div>

                <div className="cd" style={{ borderColor: "rgba(129,140,248,.1)", marginBottom: 9 }}><div style={{ fontSize: 7, fontFamily: "var(--mono)", letterSpacing: 2, color: "rgba(129,140,248,.5)", textTransform: "uppercase", marginBottom: 3 }}>🔬 Science</div><div style={{ fontSize: 11, lineHeight: 1.7, color: "rgba(255,255,255,.55)" }}>{result.scienceNugget}</div></div>
                <div className="cd" style={{ borderColor: "rgba(52,211,153,.12)", marginBottom: 14 }}><div style={{ fontSize: 7, fontFamily: "var(--mono)", letterSpacing: 2, color: "#34d399", textTransform: "uppercase", marginBottom: 3 }}>🎯 #1 Change</div><div style={{ fontSize: 11, lineHeight: 1.7, color: "#f1f5f9", fontWeight: 500 }}>{result.oneChange}</div></div>
              </div>
            )}
          </div>
        )}

        {/* ══ DATA ══ */}
        {mainView === "data" && (
          <div style={{ animation: "fadeUp .4s ease-out" }}>
            <div className="cd" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.5)" }}>Export Data</div><div style={{ fontSize: 9, color: "rgba(255,255,255,.2)", marginTop: 2 }}>{entries.length} entries</div></div>
              <button onClick={() => exportCSV(entries, `soul-clarity-${new Date().toISOString().split("T")[0]}.csv`)} style={{ padding: "10px 18px", borderRadius: 10, background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.25)", color: "#34d399", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--mono)" }}>📥 CSV</button>
            </div>
            <div className="cd" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 8, fontFamily: "var(--mono)", letterSpacing: 1.5, color: "rgba(255,255,255,.2)", textTransform: "uppercase", marginBottom: 8 }}>Connected Sheets</div>
              {[
                { n: "Soul Clarity 2026", c: entries.filter((e) => e.date >= "2026").length },
                { n: "Soul Clarity 2025", c: entries.filter((e) => e.date < "2026").length },
                ...Object.entries(extraTabs).map(([k, d]) => ({ n: k, c: d?.length || 0 })),
              ].map((x) => (
                <div key={x.n} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{x.n}</span>
                  <span style={{ fontSize: 10, color: x.c ? "#34d399" : "#f87171", fontFamily: "var(--mono)" }}>{x.c} rows</span>
                </div>
              ))}
            </div>
            <div className="cd">
              <div style={{ fontSize: 8, fontFamily: "var(--mono)", letterSpacing: 1.5, color: "rgba(255,255,255,.2)", textTransform: "uppercase", marginBottom: 8 }}>Recent Entries</div>
              <div style={{ maxHeight: 350, overflowY: "auto" }}>
                {entries.slice(-30).reverse().map((e) => (
                  <div key={e.date} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                    <div style={{ width: 68, fontSize: 9, fontFamily: "var(--mono)", color: "rgba(255,255,255,.3)" }}>{e.date}</div>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: ECOLS[e.energy] || "#64748b" }} title={e.energy} />
                    <div style={{ flex: 1, fontSize: 9, color: "rgba(255,255,255,.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.kriya === "Yes" ? "✅" : e.kriya === "Partial" ? "🟡" : "⬜"} {(e.sadhana || []).slice(0, 3).join(", ")}
                    </div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,.2)" }}>{e.moon}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#818cf8", fontFamily: "var(--mono)" }}>Open Google Sheet ↗</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
