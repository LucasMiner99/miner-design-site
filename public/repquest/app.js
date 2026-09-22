const STORAGE_KEY = 'repquest-v1';

const EXERCISES = {
  pushups: { name:'Push-ups', icon:'⚔️', color:'#8d66ff', xp:2, base:200 },
  pullups: { name:'Pull-ups', icon:'🪝', color:'#b46cff', xp:5, base:100 },
  abs: { name:'Abs', icon:'🛡️', color:'#d5a7ff', xp:1.5, base:200 },
  squats: { name:'Squats', icon:'🦵', color:'#6f56ff', xp:1, base:250 }
};

function blankState(){ return { version:3, days:{}, actions:[], createdAt:new Date().toISOString() }; }
function loadState(){
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return {
      ...blankState(),
      ...parsed,
      days: parsed.days || {},
      actions: Array.isArray(parsed.actions) ? parsed.actions : []
    };
  } catch {
    return blankState();
  }
}
let state = loadState();
let selectedExercise = null;

const ACHIEVEMENTS = [
  {id:'first-reps', icon:'✨', title:'First Blood', desc:'Registrá tus primeras reps.', test:s=>totalReps(s)>=1},
  {id:'reps-100', icon:'💯', title:'Triple Digits', desc:'Llegá a 100 reps totales.', test:s=>totalReps(s)>=100},
  {id:'reps-500', icon:'📈', title:'Momentum', desc:'Llegá a 500 reps totales.', test:s=>totalReps(s)>=500},
  {id:'reps-1000', icon:'🚀', title:'One Thousand Strong', desc:'Llegá a 1.000 reps totales.', test:s=>totalReps(s)>=1000},
  {id:'reps-5000', icon:'🌌', title:'Grind Never Stops', desc:'Llegá a 5.000 reps totales.', test:s=>totalReps(s)>=5000},

  {id:'day-50', icon:'📅', title:'Daily Warmup', desc:'Hacé 50 reps en un solo día.', test:s=>bestDay(s)>=50},
  {id:'day-100', icon:'🔥', title:'Centurion', desc:'Hacé 100 reps en un solo día.', test:s=>bestDay(s)>=100},
  {id:'day-200', icon:'⚡', title:'Beast Mode', desc:'Hacé 200 reps en un solo día.', test:s=>bestDay(s)>=200},
  {id:'day-300', icon:'👹', title:'Raid Boss', desc:'Hacé 300 reps en un solo día.', test:s=>bestDay(s)>=300},

  {id:'streak-3', icon:'🔥', title:'On Fire', desc:'Mantené una racha de 3 días.', test:s=>calcStreak(s)>=3},
  {id:'streak-7', icon:'🔥', title:'No Days Off', desc:'Mantené una racha de 7 días.', test:s=>calcStreak(s)>=7},
  {id:'streak-14', icon:'📆', title:'Unstoppable', desc:'Mantené una racha de 14 días.', test:s=>calcStreak(s)>=14},
  {id:'streak-30', icon:'👑', title:'Monthly Monster', desc:'Mantené una racha de 30 días.', test:s=>calcStreak(s)>=30},

  {id:'level-5', icon:'🧭', title:'Adventurer', desc:'Alcanzá nivel general 5.', test:s=>playerProgress(s).level>=5},
  {id:'level-10', icon:'🏆', title:'Champion', desc:'Alcanzá nivel general 10.', test:s=>playerProgress(s).level>=10},
  {id:'level-20', icon:'💎', title:'Elite', desc:'Alcanzá nivel general 20.', test:s=>playerProgress(s).level>=20},
  {id:'level-30', icon:'🛸', title:'Legend', desc:'Alcanzá nivel general 30.', test:s=>playerProgress(s).level>=30},

  {id:'push-100', icon:'⚔️', title:'Push Initiate', desc:'Llegá a 100 push-ups totales.', test:s=>exerciseTotal(s,'pushups')>=100},
  {id:'push-500', icon:'⚔️', title:'Chest Day', desc:'Llegá a 500 push-ups totales.', test:s=>exerciseTotal(s,'pushups')>=500},
  {id:'push-1000', icon:'⚔️', title:'Iron Chest', desc:'Llegá a 1.000 push-ups totales.', test:s=>exerciseTotal(s,'pushups')>=1000},

  {id:'pull-25', icon:'🪝', title:'Off the Ground', desc:'Llegá a 25 pull-ups totales.', test:s=>exerciseTotal(s,'pullups')>=25},
  {id:'pull-100', icon:'🪝', title:'Sky Hook', desc:'Llegá a 100 pull-ups totales.', test:s=>exerciseTotal(s,'pullups')>=100},
  {id:'pull-300', icon:'🪝', title:'Bar Master', desc:'Llegá a 300 pull-ups totales.', test:s=>exerciseTotal(s,'pullups')>=300},

  {id:'abs-100', icon:'🛡️', title:'Core Online', desc:'Llegá a 100 abs totales.', test:s=>exerciseTotal(s,'abs')>=100},
  {id:'abs-500', icon:'🛡️', title:'Steel Core', desc:'Llegá a 500 abs totales.', test:s=>exerciseTotal(s,'abs')>=500},
  {id:'abs-1000', icon:'🛡️', title:'Granite Core', desc:'Llegá a 1.000 abs totales.', test:s=>exerciseTotal(s,'abs')>=1000},

  {id:'squats-100', icon:'🦵', title:'Leg Day Started', desc:'Llegá a 100 squats totales.', test:s=>exerciseTotal(s,'squats')>=100},
  {id:'squats-500', icon:'🦵', title:'Leg Day Enjoyer', desc:'Llegá a 500 squats totales.', test:s=>exerciseTotal(s,'squats')>=500},
  {id:'squats-1000', icon:'🦵', title:'Thunder Legs', desc:'Llegá a 1.000 squats totales.', test:s=>exerciseTotal(s,'squats')>=1000},

  {id:'push-lvl-5', icon:'🟣', title:'Push Specialist', desc:'Llevá Push-ups a nivel 5.', test:s=>exerciseProgress(s,'pushups').level>=5},
  {id:'pull-lvl-5', icon:'🟣', title:'Pull Specialist', desc:'Llevá Pull-ups a nivel 5.', test:s=>exerciseProgress(s,'pullups').level>=5},
  {id:'abs-lvl-5', icon:'🟣', title:'Core Specialist', desc:'Llevá Abs a nivel 5.', test:s=>exerciseProgress(s,'abs').level>=5},
  {id:'squats-lvl-5', icon:'🟣', title:'Leg Specialist', desc:'Llevá Squats a nivel 5.', test:s=>exerciseProgress(s,'squats').level>=5},

  {id:'all-lvl-3', icon:'⚖️', title:'Balanced Build', desc:'Llevá los 4 ejercicios a nivel 3.', test:s=>Object.keys(EXERCISES).every(k=>exerciseProgress(s,k).level>=3)},
  {id:'all-lvl-5', icon:'👑', title:'Full Build', desc:'Llevá los 4 ejercicios a nivel 5.', test:s=>Object.keys(EXERCISES).every(k=>exerciseProgress(s,k).level>=5)},

  {id:'all-today', icon:'🎯', title:'Full Body Day', desc:'Registrá al menos 1 rep en los 4 ejercicios el mismo día.', test:s=>Object.values(s.days).some(d=>Object.keys(EXERCISES).every(k=>Number(d[k]||0)>0))},
  {id:'pull-day-20', icon:'🧗', title:'Monkey Grip', desc:'Hacé 20 pull-ups en un solo día.', test:s=>bestExerciseDay(s,'pullups')>=20},
  {id:'push-day-50', icon:'💪', title:'Pump Session', desc:'Hacé 50 push-ups en un solo día.', test:s=>bestExerciseDay(s,'pushups')>=50},
  {id:'abs-day-80', icon:'🌀', title:'Ab Storm', desc:'Hacé 80 abs en un solo día.', test:s=>bestExerciseDay(s,'abs')>=80},
  {id:'squats-day-100', icon:'🏔️', title:'Leg Furnace', desc:'Hacé 100 squats en un solo día.', test:s=>bestExerciseDay(s,'squats')>=100}
];

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function dateKey(date=new Date()){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function emptyDay(){ return {pushups:0,pullups:0,abs:0,squats:0}; }
function getDay(key=dateKey()){ return {...emptyDay(), ...(state.days[key]||{})}; }
function dayTotal(day){ return Object.keys(EXERCISES).reduce((a,key)=>a + Number(day[key]||0),0); }
function totalReps(s=state){ return Object.values(s.days).reduce((sum,d)=>sum+dayTotal(d),0); }
function bestDay(s=state){ return Math.max(0, ...Object.values(s.days).map(dayTotal)); }
function bestExerciseDay(s,key){ return Math.max(0, ...Object.values(s.days).map(d => Number(d[key] || 0))); }
function exerciseTotal(s,key){ return Object.values(s.days).reduce((sum,d)=>sum+Number(d[key]||0),0); }
function totalXp(s=state){ return Object.entries(EXERCISES).reduce((sum,[k,e])=>sum+exerciseTotal(s,k)*e.xp,0); }
function xpForLevel(level){ return Math.round(100 * Math.pow(1.26, level-1)); }
function playerProgress(s=state){
  let xp=totalXp(s), level=1, spent=0, need=xpForLevel(level);
  while(xp-spent>=need){ spent+=need; level++; need=xpForLevel(level); }
  return {level,current:Math.floor(xp-spent),need,total:Math.floor(xp)};
}
function exerciseNeed(base, level){ return Math.round(base * Math.pow(1.45, level-1)); }
function exerciseProgress(s,key){
  const total=exerciseTotal(s,key); const base=EXERCISES[key].base;
  let level=1, spent=0, need=exerciseNeed(base,level);
  while(total-spent>=need){ spent+=need; level++; need=exerciseNeed(base,level); }
  return {level,current:total-spent,need,total};
}
function todayXpValue(){ const d=getDay(); return Math.floor(Object.entries(EXERCISES).reduce((sum,[k,e])=>sum+Number(d[k]||0)*e.xp,0)); }
function calcStreak(s=state){
  let streak=0; let d=new Date();
  if(dayTotal(getDay(dateKey(d)))===0) d.setDate(d.getDate()-1);
  while(true){
    const key=dateKey(d);
    if(dayTotal({...emptyDay(),...(s.days[key]||{})})>0){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}
function unlockedAchievements(){ return ACHIEVEMENTS.filter(a=>a.test(state)); }
function getLastAction(){ return Array.isArray(state.actions) && state.actions.length ? state.actions[state.actions.length - 1] : null; }

function addReps(key, amount){
  amount = Math.floor(Number(amount));
  if(!amount || amount<1) return;

  const beforePlayer = playerProgress(state).level;
  const beforeExercise = exerciseProgress(state,key).level;
  const k = dateKey();
  state.days[k] = getDay(k);
  state.days[k][key] += amount;
  state.actions.push({ id: `${Date.now()}-${Math.random()}`, day:k, key, amount, at:new Date().toISOString() });
  if(state.actions.length > 100) state.actions = state.actions.slice(-100);
  save();

  const afterPlayer = playerProgress(state).level;
  const afterExercise = exerciseProgress(state,key).level;
  render();
  closeModal('addModal');
  if(afterPlayer>beforePlayer) showLevelToast(`Nivel general ${afterPlayer}`);
  else if(afterExercise>beforeExercise) showLevelToast(`${EXERCISES[key].name} llegó a Lv. ${afterExercise}`);
  if(navigator.vibrate) navigator.vibrate(35);
}

function undoLast(){
  const last = getLastAction();
  if(!last) return;
  state.actions.pop();
  const day = getDay(last.day);
  day[last.key] = Math.max(0, Number(day[last.key] || 0) - Number(last.amount || 0));
  if(dayTotal(day) <= 0) delete state.days[last.day];
  else state.days[last.day] = day;
  save();
  render();
  showLevelToast(`Deshecho: -${last.amount} ${EXERCISES[last.key].name}`);
  if(navigator.vibrate) navigator.vibrate([20, 35, 20]);
}

function render(){
  const today=getDay();
  const pp=playerProgress();
  document.getElementById('playerLevel').textContent=pp.level;
  document.getElementById('streak').textContent=calcStreak();
  document.getElementById('xpText').textContent=`${pp.current.toLocaleString('es-AR')} / ${pp.need.toLocaleString('es-AR')} XP`;
  document.getElementById('todayXp').textContent=`+${todayXpValue().toLocaleString('es-AR')} hoy`;
  document.getElementById('xpBar').style.width=`${Math.min(100,pp.current/pp.need*100)}%`;
  document.getElementById('todayTotal').textContent=dayTotal(today).toLocaleString('es-AR');
  document.getElementById('allTimeTotal').textContent=totalReps().toLocaleString('es-AR');
  document.getElementById('achievementCount').textContent=`${unlockedAchievements().length}/${ACHIEVEMENTS.length}`;
  document.getElementById('todayDate').textContent=new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'numeric',month:'short'}).format(new Date());

  const last = getLastAction();
  const undoBtn = document.getElementById('undoBtn');
  const modalUndoBtn = document.getElementById('modalUndoBtn');
  [undoBtn, modalUndoBtn].forEach(btn => {
    btn.disabled = !last;
    btn.textContent = last ? `↶ Undo ${EXERCISES[last.key].name} +${last.amount}` : '↶ Undo';
  });

  renderExercises(today);
  renderWeek();
  renderAchievements();
  renderHistory();
}

function renderExercises(today){
  const grid=document.getElementById('exerciseGrid');
  grid.innerHTML='';
  Object.entries(EXERCISES).forEach(([key,e])=>{
    const p=exerciseProgress(state,key);
    const card=document.createElement('article');
    card.className='exercise-card card';
    card.style.setProperty('--exercise-color',e.color);
    card.innerHTML=`
      <div class="exercise-top">
        <span class="exercise-icon">${e.icon}</span>
        <span class="exercise-level">LVL ${p.level}</span>
      </div>
      <h3>${e.name}</h3>
      <div class="today-count">${Number(today[key]||0)} <small>hoy</small></div>
      <div class="exercise-progress-meta"><span>${p.current.toLocaleString('es-AR')} / ${p.need.toLocaleString('es-AR')}</span><span>${p.total.toLocaleString('es-AR')} total</span></div>
      <div class="progress"><div class="progress-fill" style="width:${Math.min(100,p.current/p.need*100)}%"></div></div>
      <div class="add-hint">Añadir reps</div>`;
    card.addEventListener('click',()=>openAdd(key));
    grid.appendChild(card);
  });
}

function renderWeek(){
  const el=document.getElementById('weekChart');
  el.innerHTML='';
  const days=[];
  let max=1;
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-i);
    const total=dayTotal(getDay(dateKey(d)));
    max=Math.max(max,total);
    days.push({d,total});
  }
  days.forEach(({d,total})=>{
    const col=document.createElement('div');
    col.className='day-col';
    const pct=total?Math.max(8,total/max*100):3;
    col.innerHTML=`<span class="day-value">${total||''}</span><div class="day-bar-wrap"><div class="day-bar" style="height:${pct}%"></div></div><span class="day-label">${new Intl.DateTimeFormat('es-AR',{weekday:'short'}).format(d).replace('.','')}</span>`;
    el.appendChild(col);
  });
}

function achievementHTML(a){
  const unlocked=a.test(state);
  return `<div class="achievement ${unlocked?'':'locked'}"><div class="achievement-icon">${unlocked?a.icon:'🔒'}</div><div><strong>${a.title}</strong><p>${a.desc}</p></div><span class="achievement-status">${unlocked?'✓':''}</span></div>`;
}
function renderAchievements(){
  document.getElementById('achievementPreview').innerHTML=ACHIEVEMENTS.slice(0,4).map(achievementHTML).join('');
  document.getElementById('allAchievements').innerHTML=ACHIEVEMENTS.map(achievementHTML).join('');
}
function renderHistory(){
  const list=document.getElementById('historyList');
  list.innerHTML='';
  const keys=Object.keys(state.days).filter(k=>dayTotal(getDay(k))>0).sort().reverse().slice(0,7);
  if(!keys.length){
    list.innerHTML='<div class="history-item"><span class="muted">Todavía no hay entrenamientos. Sumá tus primeras reps 👆</span></div>';
    return;
  }
  keys.forEach(k=>{
    const d=getDay(k), date=new Date(`${k}T12:00:00`);
    const item=document.createElement('div');
    item.className='history-item';
    const chips=Object.entries(EXERCISES).filter(([key])=>d[key]>0).map(([key,e])=>`<span class="rep-chip">${e.icon} ${d[key]}</span>`).join('');
    item.innerHTML=`<div class="history-top"><span class="history-date">${new Intl.DateTimeFormat('es-AR',{weekday:'long',day:'numeric',month:'short'}).format(date)}</span><span class="history-total">${dayTotal(d)} reps</span></div><div class="history-reps">${chips}</div>`;
    list.appendChild(item);
  });
}

function openAdd(key){
  selectedExercise=key;
  const e=EXERCISES[key];
  document.getElementById('modalExerciseName').textContent=e.name;
  document.getElementById('customReps').value='';
  openModal('addModal');
  setTimeout(()=>document.getElementById('customReps').focus({preventScroll:true}),250);
}
function openModal(id){ document.getElementById(id).classList.remove('hidden'); document.body.style.overflow='hidden'; }
function closeModal(id){ document.getElementById(id).classList.add('hidden'); document.body.style.overflow=''; }
function showLevelToast(text){
  const t=document.getElementById('levelToast');
  const burst=document.querySelector('.level-burst');
  burst.textContent = text.startsWith('Deshecho') ? 'UNDO' : 'LEVEL UP';
  document.getElementById('levelToastText').textContent=text;
  t.classList.remove('hidden');
  setTimeout(()=>t.classList.add('hidden'),1900);
}

document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
document.querySelectorAll('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m) closeModal(m.id)}));
document.getElementById('customAddBtn').addEventListener('click',()=>addReps(selectedExercise,document.getElementById('customReps').value));
document.getElementById('customReps').addEventListener('keydown',e=>{if(e.key==='Enter') addReps(selectedExercise,e.target.value)});
document.getElementById('showAllAchievements').addEventListener('click',()=>{renderAchievements();openModal('achievementsModal')});
document.getElementById('settingsBtn').addEventListener('click',()=>openModal('settingsModal'));
document.getElementById('undoBtn').addEventListener('click',undoLast);
document.getElementById('modalUndoBtn').addEventListener('click',undoLast);
document.getElementById('exportBtn').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`repquest-backup-${dateKey()}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
document.getElementById('importInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0];
  if(!file)return;
  try{
    const imported=JSON.parse(await file.text());
    if(!imported.days)throw new Error();
    state={...blankState(),...imported, actions:Array.isArray(imported.actions)? imported.actions:[]};
    save();render();closeModal('settingsModal');alert('Backup importado.');
  }catch{ alert('Ese archivo no parece ser un backup válido de RepQuest.'); }
  e.target.value='';
});
document.getElementById('resetBtn').addEventListener('click',()=>{
  if(confirm('¿Seguro? Esto borra todo tu progreso de este dispositivo.')){
    state=blankState();
    save();
    render();
    closeModal('settingsModal');
  }
});

if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
render();
