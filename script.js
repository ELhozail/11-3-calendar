
const MONTHS=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const TYPE_LABELS={exam:"امتحان",magen:"مِגן",bagrut:"بجروت",holiday:"عطلة / مناسبة",activity:"فعالية",parents:"أهالٍ / شهادات"};
let events=[],activeType="all",query="",view="calendar";
let current=new Date(2026,8,1); // September 2026
const schoolStart=new Date(2026,7,1), schoolEnd=new Date(2027,6,31);

function localDate(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d,12);}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function fmt(s,end){
  const d=localDate(s);
  let t=`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if(end){const e=localDate(end);t+=` – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;}
  return t;
}
function eventMatches(e){
  const typeOK=activeType==="all"||e.type===activeType;
  const q=query.trim().toLowerCase();
  const text=(e.title+" "+(e.original||"")).toLowerCase();
  return typeOK && (!q||text.includes(q));
}
function eventCovers(e,ds){
  return e.date<=ds && (e.end?e.end>=ds:e.date===ds);
}
function eventsForDay(ds){return events.filter(e=>eventMatches(e)&&eventCovers(e,ds));}

function renderCalendar(){
  const y=current.getFullYear(),m=current.getMonth();
  document.querySelector("#monthTitle").textContent=`${MONTHS[m]} ${y}`;
  const first=new Date(y,m,1), last=new Date(y,m+1,0);
  // JS Sunday=0, matching our Sunday-first header
  const start=new Date(y,m,1-first.getDay());
  const grid=document.querySelector("#monthGrid");grid.innerHTML="";
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    const ds=iso(d), dayEvents=eventsForDay(ds);
    const cell=document.createElement("div");
    cell.className="day"+(d.getMonth()!==m?" outside":"")+(iso(new Date())===ds?" today":"");
    const visible=dayEvents.slice(0,3);
    cell.innerHTML=`<div class="day-num">${d.getDate()}</div><div class="events">${
      visible.map(e=>`<button class="event ${e.type}" data-id="${e.id}">${e.title}</button>`).join("")
    }${dayEvents.length>3?`<div class="more">+${dayEvents.length-3} مواعيد</div>`:""}</div>`;
    grid.appendChild(cell);
  }
  bindEventButtons();
}

function renderList(){
  const filtered=events.filter(eventMatches);
  const groups={};
  filtered.forEach(e=>{
    const d=localDate(e.date), k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    (groups[k] ||= []).push(e);
  });
  const box=document.querySelector("#eventList");box.innerHTML="";
  Object.keys(groups).sort().forEach(k=>{
    const [y,m]=k.split("-").map(Number);
    const sec=document.createElement("article");sec.className="list-month";
    sec.innerHTML=`<h3>${MONTHS[m-1]} ${y}</h3>`+groups[k].map(e=>`
      <div class="list-item event ${e.type}" data-id="${e.id}">
        <div class="list-date">${localDate(e.date).getDate()}${e.end?`–${localDate(e.end).getDate()}`:""}</div>
        <div><div class="list-title">${e.title}</div><div class="list-original">${TYPE_LABELS[e.type]}</div></div>
        <div class="typebar"></div>
      </div>`).join("");
    box.appendChild(sec);
  });
  document.querySelectorAll(".list-item").forEach(el=>el.addEventListener("click",()=>openModal(Number(el.dataset.id))));
}

function updateNext(){
  const today=new Date();today.setHours(0,0,0,0);
  const upcoming=events.map(e=>({...e,_d:localDate(e.date)})).filter(e=>e._d>=today).sort((a,b)=>a._d-b._d)[0];
  const t=document.querySelector("#nextTitle"),d=document.querySelector("#nextDate"),c=document.querySelector("#countdown");
  if(!upcoming){t.textContent="لا توجد مواعيد قادمة";d.textContent="";c.textContent="انتهى البرنامج";return;}
  t.textContent=upcoming.title; d.textContent=fmt(upcoming.date,upcoming.end);
  const diff=Math.round((upcoming._d-today)/86400000);
  c.textContent=diff===0?"اليوم":diff===1?"غدًا":`بقي ${diff} يوم`;
}
function openModal(id){
  const e=events.find(x=>x.id===id);if(!e)return;
  document.querySelector("#modalType").textContent=TYPE_LABELS[e.type];
  document.querySelector("#modalTitle").textContent=e.title;
  document.querySelector("#modalDate").textContent=fmt(e.date,e.end);
  const original=document.querySelector("#modalOriginal");
  original.textContent=e.original&&e.original!==e.title?`النص في ملف Excel: ${e.original}`:"";
  original.style.display=original.textContent?"block":"none";
  document.querySelector("#shareEvent").onclick=()=>shareText(`${e.title}\n${fmt(e.date,e.end)}\nالحادي عشر 3`);
  document.querySelector("#modal").classList.remove("hidden");
}
function bindEventButtons(){
  document.querySelectorAll(".event[data-id]").forEach(b=>b.addEventListener("click",()=>openModal(Number(b.dataset.id))));
}
function shareText(text){
  const u=`https://wa.me/?text=${encodeURIComponent(text+(location.protocol.startsWith("http")?`\n${location.href}`:""))}`;
  window.open(u,"_blank");
}
function renderAll(){renderCalendar();renderList();}

document.addEventListener("DOMContentLoaded",async()=>{
  events=await fetch("events.json").then(r=>r.json());
  events.forEach((e,i)=>e.id=i+1);
  updateNext();renderAll();

  document.querySelectorAll("#filters button").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("#filters button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");activeType=b.dataset.type;renderAll();
  });
  document.querySelector("#search").oninput=e=>{query=e.target.value;renderAll();};

  document.querySelector("#prevMonth").onclick=()=>{
    current=new Date(current.getFullYear(),current.getMonth()-1,1);
    if(current<schoolStart)current=new Date(2026,7,1);
    renderCalendar();
  };
  document.querySelector("#nextMonth").onclick=()=>{
    current=new Date(current.getFullYear(),current.getMonth()+1,1);
    if(current>schoolEnd)current=new Date(2027,6,1);
    renderCalendar();
  };
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    view=b.dataset.view;
    document.querySelector("#calendarView").classList.toggle("hidden",view!=="calendar");
    document.querySelector("#listView").classList.toggle("hidden",view!=="list");
  });
  document.querySelector("#closeModal").onclick=()=>document.querySelector("#modal").classList.add("hidden");
  document.querySelector("#modal").onclick=e=>{if(e.target.id==="modal")e.currentTarget.classList.add("hidden");};
  document.querySelector("#shareSite").onclick=()=>shareText("البرنامج السنوي لطلاب وأهالي الحادي عشر 3");
});
