
const MONTHS=["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const TYPE_LABELS={exam:"מבחן",magen:"מגן",bagrut:"בגרות",holiday:"חופשה / מועד",activity:"פעילות",parents:"הורים / תעודות"};
let events=[], activeType="all", query="";
let current=new Date(2026,8,1);

function localDate(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d,12)}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function fmt(s,end){
  const d=localDate(s); let t=`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if(end){const e=localDate(end); t+=` – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;}
  return t;
}
function matches(e){
  const q=query.trim().toLowerCase();
  return (activeType==="all"||e.type===activeType) && (!q || (e.title+" "+e.original).toLowerCase().includes(q));
}
function covers(e,ds){return e.date<=ds && (e.end?e.end>=ds:e.date===ds)}
function dayEvents(ds){return events.filter(e=>matches(e)&&covers(e,ds))}

function renderCalendar(){
  const y=current.getFullYear(),m=current.getMonth();
  document.querySelector("#monthTitle").textContent=`${MONTHS[m]} ${y}`;
  const first=new Date(y,m,1);
  const start=new Date(y,m,1-first.getDay());
  const grid=document.querySelector("#monthGrid"); grid.innerHTML="";
  for(let i=0;i<42;i++){
    const d=new Date(start); d.setDate(start.getDate()+i);
    const ds=iso(d), es=dayEvents(ds);
    const cell=document.createElement("div");
    cell.className="day"+(d.getMonth()!==m?" outside":"")+(iso(new Date())===ds?" today":"");
    cell.innerHTML=`<div class="day-num">${d.getDate()}</div><div class="events">${
      es.slice(0,4).map(e=>`<button class="event ${e.type}" data-id="${e.id}">${e.title}</button>`).join("")
    }${es.length>4?`<div class="more">+${es.length-4}</div>`:""}</div>`;
    grid.appendChild(cell);
  }
  document.querySelectorAll(".event[data-id]").forEach(b=>b.onclick=()=>openModal(Number(b.dataset.id)));
}
function renderNext(){
  const now=new Date(); now.setHours(0,0,0,0);
  const next=events.map(e=>({...e,_d:localDate(e.date)})).filter(e=>e._d>=now).sort((a,b)=>a._d-b._d)[0];
  if(!next){document.querySelector("#nextTitle").textContent="אין אירועים קרובים";document.querySelector("#nextDate").textContent="";document.querySelector("#countdown").textContent="0";return;}
  document.querySelector("#nextTitle").textContent=next.title;
  document.querySelector("#nextDate").textContent=fmt(next.date,next.end);
  const diff=Math.round((next._d-now)/86400000);
  document.querySelector("#countdown").textContent=diff;
}
function renderYearList(){
  const box=document.querySelector("#yearList"); box.innerHTML="";
  const groups={};
  events.filter(matches).forEach(e=>{
    const d=localDate(e.date); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    (groups[k] ||= []).push(e);
  });
  Object.keys(groups).sort().forEach(k=>{
    const [y,m]=k.split("-").map(Number);
    const sec=document.createElement("section"); sec.className="year-month";
    sec.innerHTML=`<h4>${MONTHS[m-1]} ${y}</h4>`+groups[k].map(e=>`
      <div class="year-item"><i class="dot ${e.type}"></i><time>${localDate(e.date).getDate()}</time><div>${e.title}</div></div>`).join("");
    box.appendChild(sec);
  });
}
function setFilter(type){
  activeType=type;
  const r=document.querySelector(`input[name="filter"][value="${type}"]`); if(r) r.checked=true;
  renderCalendar();renderYearList();
}
function openModal(id){
  const e=events.find(x=>x.id===id); if(!e)return;
  document.querySelector("#modalType").textContent=TYPE_LABELS[e.type];
  document.querySelector("#modalTitle").textContent=e.title;
  document.querySelector("#modalDate").textContent=fmt(e.date,e.end);
  document.querySelector("#shareEvent").onclick=()=>share(`${e.title}\n${fmt(e.date,e.end)}\nי״א 3`);
  document.querySelector("#modal").classList.remove("hidden");
}
function share(text){window.open(`https://wa.me/?text=${encodeURIComponent(text+(location.protocol.startsWith("http")?`\n${location.href}`:""))}`,"_blank")}

document.addEventListener("DOMContentLoaded",async()=>{
  events=await fetch("events.json").then(r=>r.json()); events.forEach((e,i)=>e.id=i+1);
  renderNext();renderCalendar();renderYearList();

  document.querySelector("#search").oninput=e=>{query=e.target.value;renderCalendar();renderYearList()};
  document.querySelectorAll('input[name="filter"]').forEach(r=>r.onchange=()=>setFilter(r.value));
  document.querySelectorAll(".category-list button").forEach(b=>b.onclick=()=>setFilter(b.dataset.filter));

  document.querySelector("#prevMonth").onclick=()=>{current=new Date(current.getFullYear(),current.getMonth()-1,1);renderCalendar()};
  document.querySelector("#nextMonth").onclick=()=>{current=new Date(current.getFullYear(),current.getMonth()+1,1);renderCalendar()};
  document.querySelector("#todayBtn").onclick=()=>{current=new Date();renderCalendar()};
  document.querySelector("#nextBtn").onclick=()=>document.querySelector(".next-panel").scrollIntoView({behavior:"smooth"});
  document.querySelector("#yearBtn").onclick=()=>document.querySelector("#eventsDrawer").classList.add("open");
  document.querySelector("#closeDrawer").onclick=()=>document.querySelector("#eventsDrawer").classList.remove("open");
  document.querySelector("#announcementsBtn").onclick=()=>alert("ניתן להוסיף כאן בהמשך הודעות כיתה.");
  document.querySelector("#shareSite").onclick=()=>share("התוכנית השנתית – י״א 3");
  document.querySelector("#closeModal").onclick=()=>document.querySelector("#modal").classList.add("hidden");
  document.querySelector("#modal").onclick=e=>{if(e.target.id==="modal")e.currentTarget.classList.add("hidden")};
});
