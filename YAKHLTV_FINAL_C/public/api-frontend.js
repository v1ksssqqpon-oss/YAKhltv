
const API = '';
let token = localStorage.getItem('yak_token') || null;
async function apiFetch(path, method='GET', body){
  const headers = { 'Content-Type':'application/json' };
  if(token) headers['Authorization']='Bearer '+token;
  const res = await fetch(API + path, { method, headers, body: body?JSON.stringify(body):undefined });
  if(res.status===401){ localStorage.removeItem('yak_token'); token=null; }
  return res.json();
}

async function loadHome(){
  const tours = await apiFetch('/api/tournaments');
  const tEl = document.getElementById('tournaments'); tEl.innerHTML='';
  tours.forEach(t=>{ const d=document.createElement('div'); d.className='tournament-item'; d.innerHTML = `<div><strong>${t.name}</strong><div class="small">${t.date}</div></div><div><a href="tournament.html?id=${t.id}" class="small">Open</a></div>`; tEl.appendChild(d); });
  const players = await apiFetch('/api/players');
  const pEl = document.getElementById('topPlayers'); pEl.innerHTML=''; players.slice(0,6).forEach(p=>{ const d=document.createElement('div'); d.className='player-row'; d.innerHTML=`<div style="display:flex;align-items:center;gap:8px"><div class="crest">${p.name[0]}</div><div><strong>${p.name}</strong><div class="small">${p.team||''}</div></div></div><div class="small">${p.rating}</div>`; pEl.appendChild(d); });
}

async function apiLogin(){
  const pass = document.getElementById('adminPassword').value;
  const res = await apiFetch('/api/login','POST',{password:pass});
  if(res && res.token){ token = res.token; localStorage.setItem('yak_token', token); closeAdminModal(); alert('Вошли как админ'); window.location='admin.html'; }
  else { document.getElementById('adminError').style.display='block'; }
}

function openAdminModal(){ document.getElementById('adminModal').style.display='flex'; document.getElementById('adminPassword').value=''; document.getElementById('adminError').style.display='none'; }
function closeAdminModal(){ document.getElementById('adminModal').style.display='none'; }

document.addEventListener('DOMContentLoaded', ()=>{ loadHome(); });
