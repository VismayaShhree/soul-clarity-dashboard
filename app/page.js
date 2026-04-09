"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID || "1PTd2y1xxw1QxlAMczoP1OJ-9HBZ-k-D_WL-AmLuHJYc";

function parseCSV(text) {
  const lines = []; let current = ""; let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === "\n" && !inQuote) { lines.push(current); current = ""; continue; }
    current += ch;
  }
  if (current.trim()) lines.push(current);
  return lines.map(l => l.split(",").map(c => c.trim()));
}

async function fetchTab(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  try { const res = await fetch(url); if (!res.ok) return null; return parseCSV(await res.text()); } catch (e) { return null; }
}

function parseSoulData(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const findCol = kw => headers.findIndex(h => kw.some(k => h.includes(k)));
  const cols = { date:findCol(["date"]),moon:findCol(["moonphase","moon"]),energy:findCol(["energylevel","energy"]),kriya:findCol(["kriya"]),mood:findCol(["mood"]),wakeup:findCol(["wakeup","wake"]),sleep:findCol(["sleep"]),activity:findCol(["activity"]),sadhana:findCol(["sadhana"]),drinks:findCol(["drinks","drink"]),fruits:findCol(["fruits","fruit"]),food:findCol(["food"]),foodDesc:findCol(["fooddescription","fooddesc"]),digestion:findCol(["digestion"]),remarks:findCol(["remarks","remark"]),stopDoing:findCol(["stopdoing","stop"]) };
  return rows.slice(1).filter(r => r[cols.date] && r[cols.date].match(/\d{4}/)).map(r => {
    const get = col => (col >= 0 && r[col] ? r[col].trim() : "");
    const energy = get(cols.energy); const eMatch = energy.match(/E(\d)/);
    return { date:get(cols.date),moon:get(cols.moon),energy:eMatch?`E${eMatch[1]}`:energy,kriya:get(cols.kriya),mood:get(cols.mood).split(",").map(s=>s.trim()).filter(Boolean),wakeup:get(cols.wakeup),sleep:get(cols.sleep),activity:get(cols.activity),sadhana:get(cols.sadhana)==="NILL"?[]:get(cols.sadhana).split(",").map(s=>s.trim()).filter(Boolean),drinks:get(cols.drinks).split(",").map(s=>s.trim()).filter(Boolean),fruits:get(cols.fruits),food:get(cols.foodDesc)||get(cols.food),digestion:get(cols.digestion).split(",").map(s=>s.trim()).filter(Boolean),remarks:get(cols.remarks),stopDoing:get(cols.stopDoing) };
  });
}

function getMoonPhase(date = new Date()) {
  let y=date.getFullYear(),m=date.getMonth()+1; const d=date.getDate();
  if(m<3){y--;m+=12;} m++; let jd=365.25*y+30.6*m+d-694039.09; jd/=29.5305882; jd-=parseInt(jd);
  let b=Math.round(jd*8); if(b>=8) b=0;
  return [{name:"New Moon",emoji:"🌑",ill:0},{name:"Waxing Crescent",emoji:"🌒",ill:15},{name:"First Quarter",emoji:"🌓",ill:50},{name:"Waxing Gibbous",emoji:"🌔",ill:78},{name:"Full Moon",emoji:"🌕",ill:100},{name:"Waning Gibbous",emoji:"🌖",ill:78},{name:"Last Quarter",emoji:"🌗",ill:50},{name:"Waning Crescent",emoji:"🌘",ill:15}][b];
}

function MoonSVG({phase,size=60}) {
  const ill=phase.ill/100,r=size/2-3,cx=size/2,cy=size/2;
  const isW=phase.name.includes("Waxing")||phase.name==="First Quarter"||phase.name==="Full Moon";
  let mk="";
  if(phase.name==="New Moon") mk=`M${cx},${cy-r}A${r},${r} 0 1,1 ${cx},${cy+r}A${r},${r} 0 1,1 ${cx},${cy-r}`;
  else if(phase.name!=="Full Moon") { const cr=r*Math.abs(1-2*ill),sw=ill>0.5?1:0; mk=isW?`M${cx},${cy-r}A${r},${r} 0 0,0 ${cx},${cy+r}A${cr},${r} 0 0,${sw} ${cx},${cy-r}`:`M${cx},${cy-r}A${r},${r} 0 0,1 ${cx},${cy+r}A${cr},${r} 0 0,${1-sw} ${cx},${cy-r}`; }
  return (<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><defs><radialGradient id={`mn${size}`} cx="40%" cy="40%"><stop offset="0%" stopColor="#fffde7"/><stop offset="100%" stopColor="#e0d68a"/></radialGradient></defs><circle cx={cx} cy={cy} r={r} fill={`url(#mn${size})`}/>{mk&&<path d={mk} fill="rgba(10,10,26,0.9)"/>}</svg>);
}

function exportCSV(entries,filename) {
  const hd=["Date","Moon","Energy","Kriya","Mood","Wake","Sleep","Sadhana","Drinks","Fruits","Food","Digestion","Remarks"];
  const rows=entries.map(e=>[e.date,e.moon,e.energy,e.kriya,(e.mood||[]).join("; "),e.wakeup,e.sleep,(e.sadhana||[]).join("; "),(e.drinks||[]).join("; "),e.fruits,e.food,(e.digestion||[]).join("; "),e.remarks].map(v=>`"${(v||"").replace(/"/g,'""')}"`));
  const csv=[hd.join(","),...rows.map(r=>r.join(","))].join("\n");
  const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

const EVALS={E0:0,E1:1,E2:2,E3:3,E4:4};
const ECOLS={E0:"#64748b",E1:"#f87171",E2:"#fbbf24",E3:"#34d399",E4:"#818cf8"};
const MOON_PHASES=["New Moon","Waxing Crescent","First Quarter","Waxing Gibbous","Full Moon","Waning Gibbous","Last Quarter","Waning Crescent"];

function AnimNum({value}) { const[d,setD]=useState(0); const ref=useRef(null); useEffect(()=>{const st=performance.now();const f=now=>{const p=Math.min((now-st)/1000,1);setD(Math.round((1-(1-p)**3)*value));if(p<1)ref.current=requestAnimationFrame(f);};ref.current=requestAnimationFrame(f);return()=>cancelAnimationFrame(ref.current);},[value]); return (<span>{d}</span>); }

function Ring({score,size=100,sw=7,label,small}) {
  const r=(size-sw)/2,c=2*Math.PI*r,off=c-(score/100)*c;
  const col=score>=75?"#34d399":score>=50?"#fbbf24":score>=25?"#fb923c":"#f87171";
  return (<div style={{display:"flex",flexDirection:"column",alignItems:"center"}}><svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={sw} fill="none"/><circle cx={size/2} cy={size/2} r={r} stroke={col} strokeWidth={sw} fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{transition:"stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)"}}/></svg><div style={{marginTop:-size/2-(small?10:12),fontSize:small?14:24,fontWeight:800,color:col,fontFamily:"var(--mono)"}}><AnimNum value={score}/></div>{label&&(<div style={{marginTop:small?2:14,fontSize:small?8:10,textTransform:"uppercase",letterSpacing:1.5,color:"rgba(255,255,255,0.4)",fontFamily:"var(--mono)",textAlign:"center",lineHeight:1.2}}>{label}</div>)}</div>);
}

function SparkBar({data,height=60,label}) {
  if(!data.length) return null; const max=Math.max(...data.map(d=>d.v),1); const w=100/data.length;
  return (<div>{label&&(<div style={{fontSize:9,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:6}}>{label}</div>)}<svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">{data.map((d,i)=>{const h=(d.v/max)*(height-4);return (<rect key={i} x={i*w+w*0.15} y={height-h} width={w*0.7} height={Math.max(h,1)} rx={1.5} fill={d.col||"#818cf8"} opacity={0.8}><title>{d.label}: {d.v}</title></rect>);})}</svg></div>);
}

function computeInsights(entries) {
  if(!entries.length) return null;
  const t=entries.length, eSum=entries.reduce((s,e)=>s+(EVALS[e.energy]??0),0), avgE=eSum/t;
  const kY=entries.filter(e=>e.kriya==="Yes").length, kP=entries.filter(e=>e.kriya==="Partial").length;
  const kRate=Math.round(((kY+kP*0.5)/t)*100);
  const sc={}; entries.forEach(e=>(e.sadhana||[]).forEach(s=>{sc[s]=(sc[s]||0)+1}));
  const topS=Object.entries(sc).sort((a,b)=>b[1]-a[1]);
  const smD=entries.filter(e=>(e.digestion||[]).includes("Smooth")).length;
  const htD=entries.filter(e=>(e.digestion||[]).some(d=>d.includes("Hurt")||d.includes("Hard"))).length;
  const plD=entries.filter(e=>(e.digestion||[]).includes("Pelleted")).length;
  const dScore=Math.round((smD/t)*100);
  const mE={}; entries.forEach(e=>{if(!e.moon)return;if(!mE[e.moon])mE[e.moon]={sum:0,count:0};mE[e.moon].sum+=EVALS[e.energy]??0;mE[e.moon].count++;});
  const mEA=Object.entries(mE).map(([m,d])=>({moon:m,avg:(d.sum/d.count).toFixed(1),count:d.count})).sort((a,b)=>b.avg-a.avg);
  const kE={Yes:{sum:0,c:0},Partial:{sum:0,c:0},No:{sum:0,c:0}};
  entries.forEach(e=>{const k=e.kriya||"No";if(kE[k]){kE[k].sum+=EVALS[e.energy]??0;kE[k].c++;}});
  const mC={}; entries.forEach(e=>(e.mood||[]).forEach(m=>{mC[m]=(mC[m]||0)+1}));
  const topM=Object.entries(mC).sort((a,b)=>b[1]-a[1]);
  const eW=entries.filter(e=>e.wakeup&&e.wakeup.match(/^[45]:/)).length;
  const lW=entries.filter(e=>e.wakeup==="Later").length;
  const dC={}; entries.forEach(e=>(e.drinks||[]).forEach(d=>{dC[d]=(dC[d]||0)+1}));
  const topD=Object.entries(dC).sort((a,b)=>b[1]-a[1]);
  let cS=0,mS=0; for(let i=entries.length-1;i>=0;i--){if(entries[i].kriya==="Yes"||entries[i].kriya==="Partial"){cS++;mS=Math.max(mS,cS);}else{if(i<entries.length-1)break;cS=0;}}
  const pD=entries.filter(e=>(e.mood||[]).some(m=>m.includes("Period"))).length;
  return {totalDays:t,avgEnergy:avgE.toFixed(1),kriyaRate:kRate,topSadhana:topS,smoothDays:smD,hurtDays:htD,pelletDays:plD,digestScore:dScore,moonEnergyAvg:mEA,kriyaEnergy:kE,topMoods:topM,earlyWakes:eW,lateWakes:lW,topDrinks:topD,currentStreak:cS,maxStreak:mS,periodDays:pD,e4Days:entries.filter(e=>e.energy==="E4").length,e0Days:entries.filter(e=>e.energy==="E0").length,kriyaYes:kY,kriyaPartial:kP};
}

export default function SoulClarityDashboard() {
  const [entries,setEntries]=useState([]);
  const [extraTabs,setExtraTabs]=useState({});
  const [loading,setLoading]=useState(true);
  const [loadStatus,setLoadStatus]=useState("Connecting...");
  const [mainView,setMainView]=useState("dashboard");
  const [timeRange,setTimeRange]=useState("month");
  const [insightRange,setInsightRange]=useState("month");
  const [insightMoon,setInsightMoon]=useState("Full Moon");
  const [insightMode,setInsightMode]=useState("time");
  const [error,setError]=useState(null);
  const [lastSync,setLastSync]=useState(null);

  const loadFromSheets=useCallback(async()=>{
    setLoading(true);setError(null);
    try{
      setLoadStatus("Fetching 2026...");
      const p26=parseSoulData(await fetchTab("Soul_Clarity_Tracker"));
      setLoadStatus("Fetching 2025...");
      const p25=parseSoulData(await fetchTab("K2MJ"));
      const byDate={};[...p25,...p26].forEach(e=>{byDate[e.date]=e;});
      setEntries(Object.values(byDate).sort((a,b)=>a.date.localeCompare(b.date)));
      setLoadStatus("Fetching extras...");
      const extras={};
      for(const name of["Moon_cycle_2026","Moon_cycel 2025","Dream_Tracker","Gym calendar","TIME SHEET"]){const d=await fetchTab(name);if(d&&d.length>1)extras[name]=d;}
      setExtraTabs(extras);setLastSync(new Date().toLocaleTimeString());
    }catch(e){setError("Failed to load. Is the sheet publicly shared?");}
    setLoading(false);
  },[]);
  useEffect(()=>{loadFromSheets();},[loadFromSheets]);

  const rangeEntries=useMemo(()=>{const now=new Date();let s=new Date(now);if(timeRange==="week")s.setDate(s.getDate()-7);else if(timeRange==="month")s.setMonth(s.getMonth()-1);else if(timeRange==="3months")s.setMonth(s.getMonth()-3);else s.setFullYear(s.getFullYear()-1);return entries.filter(e=>e.date>=s.toISOString().split("T")[0]);},[entries,timeRange]);
  const insightEntries=useMemo(()=>{if(insightMode==="moon")return entries.filter(e=>e.moon===insightMoon);const now=new Date();let s=new Date(now);if(insightRange==="week")s.setDate(s.getDate()-7);else if(insightRange==="month")s.setMonth(s.getMonth()-1);else if(insightRange==="3months")s.setMonth(s.getMonth()-3);else s.setFullYear(s.getFullYear()-1);return entries.filter(e=>e.date>=s.toISOString().split("T")[0]);},[entries,insightRange,insightMode,insightMoon]);
  const insights=useMemo(()=>computeInsights(insightEntries),[insightEntries]);

  const energyData=useMemo(()=>rangeEntries.map(e=>({v:EVALS[e.energy]??0,col:ECOLS[e.energy]||"#64748b",label:e.date})),[rangeEntries]);
  const sadhanaFreq=useMemo(()=>{const c={};rangeEntries.forEach(e=>(e.sadhana||[]).forEach(s=>{c[s]=(c[s]||0)+1}));return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,10);},[rangeEntries]);
  const digestData=useMemo(()=>rangeEntries.map(e=>{const d=e.digestion||[];let col="rgba(255,255,255,0.04)";if(d.includes("Smooth"))col="rgba(52,211,153,0.5)";if(d.includes("Pelleted"))col="rgba(251,191,36,0.5)";if(d.includes("Hurting")||d.includes("Hard plug"))col="rgba(248,113,113,0.5)";return{col,tip:`${e.date}: ${d.join(",")||"—"}`};}),[rangeEntries]);
  const moonDist=useMemo(()=>{const c={};rangeEntries.forEach(e=>{if(e.moon)c[e.moon]=(c[e.moon]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1]);},[rangeEntries]);
  const kriyaRate=useMemo(()=>{if(!rangeEntries.length)return 0;const y=rangeEntries.filter(e=>e.kriya==="Yes").length;const p=rangeEntries.filter(e=>e.kriya==="Partial").length;return Math.round(((y+p*0.5)/rangeEntries.length)*100);},[rangeEntries]);
  const avgE=useMemo(()=>{if(!rangeEntries.length)return"0";return(rangeEntries.reduce((s,e)=>s+(EVALS[e.energy]??0),0)/rangeEntries.length).toFixed(1);},[rangeEntries]);

  if(loading) return (<div style={{minHeight:"100vh",background:"#07071a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#818cf8",fontFamily:"'JetBrains Mono',monospace",gap:16}}><style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style><MoonSVG phase={getMoonPhase()} size={48}/><div style={{fontSize:14}}>{loadStatus}</div><div style={{width:200,height:3,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:"60%",background:"linear-gradient(90deg,#818cf8,#a855f7)",borderRadius:2,animation:"pulse 1.5s ease-in-out infinite"}}/></div></div>);

  const Stat=({l,v,s,c})=>(<div className="cd" style={{textAlign:"center",padding:"10px 4px"}}><div style={{fontSize:7,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,.2)",textTransform:"uppercase",marginBottom:4}}>{l}</div><div style={{fontSize:18,fontWeight:800,color:c}}>{v}<span style={{fontSize:9,fontWeight:400,color:"rgba(255,255,255,.15)"}}>{s||""}</span></div></div>);

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(170deg,#07071a,#0c1024 50%,#0a0f1a)",color:"#e2e8f0",fontFamily:"var(--body)"}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet"/>
      <style>{`:root{--body:'Outfit',sans-serif;--mono:'JetBrains Mono',monospace}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}.cd{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:16px;animation:fadeUp .4s ease-out both}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}`}</style>
      <div style={{maxWidth:800,margin:"0 auto",padding:"18px 12px 50px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div><h1 style={{fontSize:20,fontWeight:800,margin:0,color:"#f1f5f9"}}>Soul Clarity</h1><div style={{fontSize:8,fontFamily:"var(--mono)",color:"rgba(255,255,255,.2)",letterSpacing:2,marginTop:1}}>LIVE · {entries.length} ENTRIES {lastSync&&`· ${lastSync}`}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><button onClick={loadFromSheets} style={{background:"none",border:"1px solid rgba(255,255,255,.08)",borderRadius:8,padding:"5px 10px",color:"rgba(255,255,255,.3)",fontSize:10,cursor:"pointer",fontFamily:"var(--mono)"}}>↻ Sync</button><MoonSVG phase={getMoonPhase()} size={28}/></div>
        </div>
        {error&&(<div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:12,padding:"12px 16px",marginBottom:12,fontSize:12,color:"#f87171"}}>{error}</div>)}
        <div style={{display:"flex",gap:5,marginBottom:14}}>
          {[{id:"dashboard",l:"📊 Dashboard"},{id:"insights",l:"🔍 Insights"},{id:"data",l:"📋 Data"}].map(n=>(<button key={n.id} onClick={()=>setMainView(n.id)} style={{flex:1,padding:"9px 6px",borderRadius:11,fontSize:11,fontFamily:"var(--mono)",cursor:"pointer",border:mainView===n.id?"1px solid rgba(129,140,248,.25)":"1px solid rgba(255,255,255,.05)",background:mainView===n.id?"rgba(129,140,248,.08)":"transparent",color:mainView===n.id?"#818cf8":"rgba(255,255,255,.3)"}}>{n.l}</button>))}
        </div>

        {mainView==="dashboard"&&(<div style={{animation:"fadeUp .4s .1s both ease-out"}}>
          <div style={{display:"flex",gap:5,marginBottom:12}}>{["week","month","3months","year"].map(t=>(<button key={t} onClick={()=>setTimeRange(t)} style={{padding:"6px 12px",borderRadius:9,fontSize:9,fontFamily:"var(--mono)",letterSpacing:1,textTransform:"uppercase",cursor:"pointer",border:timeRange===t?"1px solid rgba(129,140,248,.3)":"1px solid rgba(255,255,255,.04)",background:timeRange===t?"rgba(129,140,248,.1)":"transparent",color:timeRange===t?"#818cf8":"rgba(255,255,255,.2)"}}>{t==="3months"?"3M":t}</button>))}<div style={{marginLeft:"auto",fontSize:9,color:"rgba(255,255,255,.15)",fontFamily:"var(--mono)",alignSelf:"center"}}>{rangeEntries.length}d</div></div>
          {!rangeEntries.length?(<div className="cd" style={{textAlign:"center",padding:36}}><div style={{fontSize:32}}>🪷</div><div style={{fontSize:13,color:"rgba(255,255,255,.4)",marginTop:8}}>No data for this period</div></div>):(<div style={{display:"flex",flexDirection:"column",gap:9}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}><Stat l="Avg Energy" v={avgE} s="/4" c="#818cf8"/><Stat l="Kriya" v={`${kriyaRate}%`} c="#a855f7"/><Stat l="Days" v={rangeEntries.length} c="#34d399"/><Stat l="Total" v={entries.length} s="all" c="#fbbf24"/></div>
            <div className="cd"><SparkBar data={energyData} height={60} label={`Energy — ${timeRange}`}/><div style={{display:"flex",gap:6,marginTop:5,justifyContent:"center"}}>{Object.entries(ECOLS).map(([k,c])=>(<div key={k} style={{display:"flex",alignItems:"center",gap:2}}><div style={{width:6,height:6,borderRadius:2,background:c}}/><span style={{fontSize:6,color:"rgba(255,255,255,.2)",fontFamily:"var(--mono)"}}>{k}</span></div>))}</div></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              <div className="cd"><div style={{fontSize:8,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,.2)",textTransform:"uppercase",marginBottom:7}}>🪷 Sadhana</div>{sadhanaFreq.map(([s,c])=>(<div key={s} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}><div style={{flex:1,height:4,background:"rgba(255,255,255,.03)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${(c/(sadhanaFreq[0]?.[1]||1))*100}%`,background:"rgba(168,85,247,0.4)",borderRadius:2}}/></div><span style={{fontSize:7,color:"rgba(255,255,255,.3)",fontFamily:"var(--mono)",minWidth:50,textAlign:"right"}}>{s}</span><span style={{fontSize:7,color:"#a855f7",fontFamily:"var(--mono)",width:14}}>{c}</span></div>))}</div>
              <div className="cd"><div style={{fontSize:8,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,.2)",textTransform:"uppercase",marginBottom:7}}>💚 Digestion</div><div style={{display:"flex",gap:2,flexWrap:"wrap"}}>{digestData.map((d,i)=>(<div key={i} title={d.tip} style={{width:10,height:10,borderRadius:2,background:d.col}}/>))}</div></div>
            </div>
            <div className="cd"><div style={{fontSize:8,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,.2)",textTransform:"uppercase",marginBottom:6}}>🌙 Moons</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{moonDist.map(([m,c])=>(<div key={m} style={{display:"flex",alignItems:"center",gap:3,background:"rgba(255,255,255,.02)",padding:"3px 8px",borderRadius:7}}><span style={{fontSize:9,color:"rgba(255,255,255,.35)"}}>{m}</span><span style={{fontSize:9,color:"#fbbf24",fontFamily:"var(--mono)",fontWeight:700}}>{c}d</span></div>))}</div></div>
          </div>)}
        </div>)}

        {mainView==="insights"&&insights&&(<div style={{animation:"fadeUp .4s ease-out"}}>
          <div style={{display:"flex",gap:5,marginBottom:10}}><button onClick={()=>setInsightMode("time")} style={{flex:1,padding:"9px",borderRadius:10,fontSize:11,fontFamily:"var(--mono)",cursor:"pointer",border:insightMode==="time"?"1px solid rgba(129,140,248,.25)":"1px solid rgba(255,255,255,.04)",background:insightMode==="time"?"rgba(129,140,248,.08)":"transparent",color:insightMode==="time"?"#818cf8":"rgba(255,255,255,.25)"}}>📆 By Time</button><button onClick={()=>setInsightMode("moon")} style={{flex:1,padding:"9px",borderRadius:10,fontSize:11,fontFamily:"var(--mono)",cursor:"pointer",border:insightMode==="moon"?"1px solid rgba(244,114,182,.25)":"1px solid rgba(255,255,255,.04)",background:insightMode==="moon"?"rgba(244,114,182,.08)":"transparent",color:insightMode==="moon"?"#f472b6":"rgba(255,255,255,.25)"}}>🌙 By Moon</button></div>
          {insightMode==="time"&&(<div style={{display:"flex",gap:4,marginBottom:12}}>{["week","month","3months","year"].map(t=>(<button key={t} onClick={()=>setInsightRange(t)} style={{padding:"6px 12px",borderRadius:9,fontSize:9,fontFamily:"var(--mono)",letterSpacing:1,textTransform:"uppercase",cursor:"pointer",border:insightRange===t?"1px solid rgba(129,140,248,.3)":"1px solid rgba(255,255,255,.04)",background:insightRange===t?"rgba(129,140,248,.1)":"transparent",color:insightRange===t?"#818cf8":"rgba(255,255,255,.2)"}}>{t==="3months"?"3M":t}</button>))}</div>)}
          {insightMode==="moon"&&(<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>{MOON_PHASES.map(m=>{const ct=entries.filter(e=>e.moon===m).length;return(<button key={m} onClick={()=>setInsightMoon(m)} style={{padding:"6px 11px",borderRadius:9,fontSize:9,cursor:"pointer",fontFamily:"var(--mono)",border:insightMoon===m?"1px solid rgba(244,114,182,.3)":"1px solid rgba(255,255,255,.05)",background:insightMoon===m?"rgba(244,114,182,.1)":"transparent",color:insightMoon===m?"#f472b6":"rgba(255,255,255,.3)"}}>{m} ({ct})</button>);})}</div>)}
          <div style={{fontSize:9,fontFamily:"var(--mono)",color:"rgba(255,255,255,.2)",textAlign:"center",marginBottom:12,letterSpacing:2}}>{insightEntries.length} DAYS ANALYZED</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}><Ring score={Math.round(insights.avgEnergy/4*100)} size={70} sw={5} label="Energy" small/><Ring score={insights.kriyaRate} size={70} sw={5} label="Kriya" small/><Ring score={insights.digestScore} size={70} sw={5} label="Digestion" small/></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12}}><Stat l="Avg Energy" v={insights.avgEnergy} s="/4" c="#818cf8"/><Stat l="E4 Days" v={insights.e4Days} c="#818cf8"/><Stat l="E0 Days" v={insights.e0Days} c="#f87171"/><Stat l="Streak" v={insights.currentStreak} s="d" c="#34d399"/></div>
          <div className="cd" style={{marginBottom:9}}><div style={{fontSize:8,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,.2)",textTransform:"uppercase",marginBottom:8}}>🕉️ Kriya × Energy</div>{Object.entries(insights.kriyaEnergy).filter(([k,d])=>d.c>0).map(([k,d])=>(<div key={k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{width:50,fontSize:10,color:k==="Yes"?"#34d399":k==="Partial"?"#fbbf24":"#f87171",fontFamily:"var(--mono)",fontWeight:600}}>{k}</span><div style={{flex:1,height:8,background:"rgba(255,255,255,.03)",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${(d.sum/d.c/4)*100}%`,background:k==="Yes"?"rgba(52,211,153,.5)":k==="Partial"?"rgba(251,191,36,.5)":"rgba(248,113,113,.4)",borderRadius:4}}/></div><span style={{fontSize:10,color:"rgba(255,255,255,.4)",fontFamily:"var(--mono)",width:40,textAlign:"right"}}>{(d.sum/d.c).toFixed(1)}/4</span><span style={{fontSize:8,color:"rgba(255,255,255,.2)",fontFamily:"var(--mono)"}}>{d.c}d</span></div>))}</div>
          <div className="cd" style={{marginBottom:9}}><div style={{fontSize:8,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,.2)",textTransform:"uppercase",marginBottom:8}}>🌙 Energy by Moon</div>{insights.moonEnergyAvg.map(m=>(<div key={m.moon} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}><span style={{width:90,fontSize:9,color:"rgba(255,255,255,.4)",fontFamily:"var(--mono)"}}>{m.moon}</span><div style={{flex:1,height:6,background:"rgba(255,255,255,.03)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(m.avg/4)*100}%`,background:"rgba(129,140,248,.4)",borderRadius:3}}/></div><span style={{fontSize:9,color:"#818cf8",fontFamily:"var(--mono)",width:28}}>{m.avg}</span><span style={{fontSize:7,color:"rgba(255,255,255,.15)",fontFamily:"var(--mono)"}}>{m.count}d</span></div>))}</div>
          <div className="cd" style={{marginBottom:9}}><div style={{fontSize:8,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,.2)",textTransform:"uppercase",marginBottom:8}}>🧠 Moods</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{insights.topMoods.map(([m,c])=>(<div key={m} style={{background:"rgba(255,255,255,.03)",padding:"5px 10px",borderRadius:8}}><span style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>{m} </span><span style={{fontSize:9,color:"#fbbf24",fontFamily:"var(--mono)",fontWeight:700}}>{c}</span></div>))}</div></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:9}}>
            <div className="cd"><div style={{fontSize:8,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,.2)",textTransform:"uppercase",marginBottom:8}}>💚 Digestion</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>{[["Smooth",insights.smoothDays,"#34d399"],["Pelleted",insights.pelletDays,"#fbbf24"],["Hurting",insights.hurtDays,"#f87171"]].map(([l,v,c])=>(<div key={l} style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:7,color:"rgba(255,255,255,.2)",fontFamily:"var(--mono)"}}>{l}</div></div>))}</div></div>
            <div className="cd"><div style={{fontSize:8,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,.2)",textTransform:"uppercase",marginBottom:8}}>📈 Quick Stats</div>{[["Early Wake",insights.earlyWakes,"#34d399"],["Late Wake",insights.lateWakes,"#f87171"],["Periods",insights.periodDays,"#f472b6"],["Max Streak",`${insights.maxStreak}d`,"#a855f7"]].map(([l,v,c])=>(<div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,.03)"}}><span style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>{l}</span><span style={{fontSize:9,color:c,fontFamily:"var(--mono)",fontWeight:600}}>{v}</span></div>))}</div>
          </div>
          <div className="cd" style={{marginBottom:9}}><div style={{fontSize:8,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,.2)",textTransform:"uppercase",marginBottom:8}}>🥤 Drinks</div>{insights.topDrinks.slice(0,6).map(([d,c])=>(<div key={d} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><div style={{flex:1,height:4,background:"rgba(255,255,255,.03)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${(c/(insights.topDrinks[0]?.[1]||1))*100}%`,background:"rgba(52,211,153,.35)",borderRadius:2}}/></div><span style={{fontSize:8,color:"rgba(255,255,255,.3)",fontFamily:"var(--mono)",minWidth:80,textAlign:"right"}}>{d}</span><span style={{fontSize:8,color:"#34d399",fontFamily:"var(--mono)",width:16}}>{c}</span></div>))}</div>
        </div>)}

        {mainView==="data"&&(<div style={{animation:"fadeUp .4s ease-out"}}>
          <div className="cd" style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.5)"}}>Export Data</div><div style={{fontSize:9,color:"rgba(255,255,255,.2)",marginTop:2}}>{entries.length} entries</div></div><button onClick={()=>exportCSV(entries,`soul-clarity-${new Date().toISOString().split("T")[0]}.csv`)} style={{padding:"10px 18px",borderRadius:10,background:"rgba(52,211,153,.1)",border:"1px solid rgba(52,211,153,.25)",color:"#34d399",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"var(--mono)"}}>📥 CSV</button></div>
          <div className="cd" style={{marginBottom:10}}><div style={{fontSize:8,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,.2)",textTransform:"uppercase",marginBottom:8}}>Connected Sheets</div>{[{n:"Soul Clarity 2026",c:entries.filter(e=>e.date>="2026").length},{n:"Soul Clarity 2025",c:entries.filter(e=>e.date<"2026").length},...Object.entries(extraTabs).map(([k,d])=>({n:k,c:d?.length||0}))].map(x=>(<div key={x.n} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,.03)"}}><span style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>{x.n}</span><span style={{fontSize:10,color:x.c?"#34d399":"#f87171",fontFamily:"var(--mono)"}}>{x.c} rows</span></div>))}</div>
          <div className="cd"><div style={{fontSize:8,fontFamily:"var(--mono)",letterSpacing:1.5,color:"rgba(255,255,255,.2)",textTransform:"uppercase",marginBottom:8}}>Recent Entries</div><div style={{maxHeight:350,overflowY:"auto"}}>{entries.slice(-30).reverse().map(e=>(<div key={e.date} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.03)"}}><div style={{width:68,fontSize:9,fontFamily:"var(--mono)",color:"rgba(255,255,255,.3)"}}>{e.date}</div><div style={{width:12,height:12,borderRadius:3,background:ECOLS[e.energy]||"#64748b"}} title={e.energy}/><div style={{flex:1,fontSize:9,color:"rgba(255,255,255,.35)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.kriya==="Yes"?"✅":e.kriya==="Partial"?"🟡":"⬜"} {(e.sadhana||[]).slice(0,3).join(", ")}</div><div style={{fontSize:8,color:"rgba(255,255,255,.2)"}}>{e.moon}</div></div>))}</div></div>
          <div style={{textAlign:"center",marginTop:12}}><a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#818cf8",fontFamily:"var(--mono)"}}>Open Sheet ↗</a></div>
        </div>)}
      </div>
    </div>
  );
}
