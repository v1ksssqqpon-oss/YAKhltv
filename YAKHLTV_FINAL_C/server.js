
/*
Simple Express API for YAKhltv demo
- SQLite (better-sqlite3)
- JWT auth for admin actions (simple)
Run:
  npm install
  npm run initdb   # create demo data
  npm start
*/
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.sqlite');
const db = new Database(DB_FILE, { verbose: console.log });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Config
const ADMIN_PASS = process.env.ADMIN_PASS || '111';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const TOKEN_EXP = '12h';

// Multer for uploads (avatars/logos)
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// Helper: generate token
function genToken(role='admin'){
  return jwt.sign({ role }, JWT_SECRET, { expiresIn: TOKEN_EXP });
}

// Middleware: verify admin token
function requireAdmin(req, res, next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:'no auth'});
  const parts = auth.split(' ');
  if(parts.length!==2) return res.status(401).json({error:'bad auth'});
  const token = parts[1];
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    if(payload.role==='admin' || payload.role==='editor') { req.user = payload; return next(); }
    return res.status(403).json({error:'forbidden'});
  }catch(e){ return res.status(401).json({error:'invalid token'}); }
}

/* Auth */
app.post('/api/login', async (req,res)=>{
  const { password } = req.body;
  if(!password) return res.status(400).json({error:'no password'});
  // simple check (password stored in env or default)
  if(password === ADMIN_PASS){
    const token = genToken('admin');
    return res.json({ token, role:'admin' });
  }
  // otherwise reject
  return res.status(401).json({ error: 'invalid password' });
});

/* Teams CRUD */
app.get('/api/teams', (req,res)=>{
  const rows = db.prepare('SELECT * FROM teams ORDER BY name').all();
  res.json(rows);
});
app.get('/api/teams/:id', (req,res)=>{
  const row = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({error:'not found'});
  res.json(row);
});
app.post('/api/teams', requireAdmin, (req,res)=>{
  const { id, name, country } = req.body;
  const tid = id || name;
  db.prepare('INSERT INTO teams(id,name,country) VALUES(?,?,?)').run(tid, name, country||'');
  res.json({ok:true, id:tid});
});
app.put('/api/teams/:id', requireAdmin, (req,res)=>{
  const { name, country } = req.body;
  db.prepare('UPDATE teams SET name=?,country=? WHERE id=?').run(name,country,req.params.id);
  res.json({ok:true});
});
app.delete('/api/teams/:id', requireAdmin, (req,res)=>{
  db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
  res.json({ok:true});
});

/* Players CRUD */
app.get('/api/players', (req,res)=>{
  const rows = db.prepare('SELECT * FROM players ORDER BY rating DESC').all();
  res.json(rows);
});
app.post('/api/players', requireAdmin, (req,res)=>{
  const { name, team, rating } = req.body;
  const id = Date.now().toString(36);
  db.prepare('INSERT INTO players(id,name,team,rating,kd) VALUES(?,?,?,?,?)').run(id,name,team||'',rating||1.0,1.0);
  res.json({ok:true,id});
});
app.put('/api/players/:id', requireAdmin, (req,res)=>{
  const { name, team, rating } = req.body;
  db.prepare('UPDATE players SET name=?,team=?,rating=? WHERE id=?').run(name,team,rating,req.params.id);
  res.json({ok:true});
});
app.delete('/api/players/:id', requireAdmin, (req,res)=>{
  db.prepare('DELETE FROM players WHERE id=?').run(req.params.id);
  res.json({ok:true});
});

/* Tournaments CRUD */
app.get('/api/tournaments', (req,res)=>{
  const rows = db.prepare('SELECT * FROM tournaments ORDER BY date').all();
  res.json(rows);
});
app.get('/api/tournaments/:id', (req,res)=>{
  const t = db.prepare('SELECT * FROM tournaments WHERE id=?').get(req.params.id);
  if(!t) return res.status(404).json({error:'not found'});
  // parse teams JSON
  t.teams = JSON.parse(t.teams_json || '[]');
  res.json(t);
});
app.post('/api/tournaments', requireAdmin, (req,res)=>{
  const { name, date, format } = req.body;
  const id = Date.now().toString(36);
  db.prepare('INSERT INTO tournaments(id,name,date,format,teams_json) VALUES(?,?,?,?,?)').run(id,name,date||'',format||'single','[]');
  res.json({ok:true,id});
});
app.put('/api/tournaments/:id', requireAdmin, (req,res)=>{
  const { name, date, format, teams } = req.body;
  db.prepare('UPDATE tournaments SET name=?,date=?,format=?,teams_json=? WHERE id=?').run(name,date,format,JSON.stringify(teams||[]),req.params.id);
  res.json({ok:true});
});
app.delete('/api/tournaments/:id', requireAdmin, (req,res)=>{
  db.prepare('DELETE FROM tournaments WHERE id=?').run(req.params.id);
  db.prepare('DELETE FROM matches WHERE tournament_id=?').run(req.params.id);
  res.json({ok:true});
});

/* Matches CRUD and result handling */
app.get('/api/matches', (req,res)=>{
  const rows = db.prepare('SELECT * FROM matches ORDER BY time').all();
  res.json(rows);
});
app.get('/api/matches/:id', (req,res)=>{
  const m = db.prepare('SELECT * FROM matches WHERE id=?').get(req.params.id);
  if(!m) return res.status(404).json({error:'not found'});
  res.json(m);
});
app.post('/api/matches', requireAdmin, (req,res)=>{
  const { tournament_id, team1, team2, stage, time } = req.body;
  const id = Date.now().toString(36);
  db.prepare('INSERT INTO matches(id,tournament_id,team1,team2,stage,time,status,score,maps_json) VALUES(?,?,?,?,?,?,?,?,?)')
    .run(id,tournament_id||'',team1,team2,stage||'Round 1',time||new Date().toISOString(),'TBD','', '[]');
  res.json({ok:true,id});
});
app.put('/api/matches/:id', requireAdmin, (req,res)=>{
  const { score, status, maps_json } = req.body;
  db.prepare('UPDATE matches SET score=?,status=?,maps_json=? WHERE id=?').run(score||'',status||'TBD', maps_json?JSON.stringify(maps_json):'[]', req.params.id);
  // advance winner logic if score provided
  if(score){
    const m = db.prepare('SELECT * FROM matches WHERE id=?').get(req.params.id);
    try{ advanceWinnerIfNeeded(m); }catch(e){ console.error(e); }
  }
  res.json({ok:true});
});
app.delete('/api/matches/:id', requireAdmin, (req,res)=>{
  db.prepare('DELETE FROM matches WHERE id=?').run(req.params.id);
  res.json({ok:true});
});

/* News */
app.get('/api/news', (req,res)=>{
  const rows = db.prepare('SELECT * FROM news ORDER BY date DESC').all();
  res.json(rows);
});
app.post('/api/news', requireAdmin, (req,res)=>{
  const { title, summary } = req.body;
  const id = Date.now().toString(36);
  db.prepare('INSERT INTO news(id,title,summary,date) VALUES(?,?,?,?)').run(id,title,summary||'',new Date().toISOString());
  res.json({ok:true,id});
});
app.delete('/api/news/:id', requireAdmin, (req,res)=>{
  db.prepare('DELETE FROM news WHERE id=?').run(req.params.id);
  res.json({ok:true});
});

/* Simple advancement logic (single-elim rounds) */
function advanceWinnerIfNeeded(matchRow){
  if(!matchRow || !matchRow.score) return;
  const parts = matchRow.score.split('-').map(s=>parseInt(s.trim())||0);
  if(parts.length<2) return;
  const winner = parts[0] > parts[1] ? matchRow.team1 : matchRow.team2;
  const order = ['Round 1','Quarterfinals','Semifinals','Final'];
  const idx = order.indexOf(matchRow.stage);
  if(idx === -1) return;
  const nextStage = order[idx+1];
  if(!nextStage) return;
  // find an empty match slot in next stage for same tournament
  let nm = db.prepare('SELECT * FROM matches WHERE tournament_id=? AND stage=? AND (team1 IS NULL OR team1="" OR team1="TBD" OR team2 IS NULL OR team2="" OR team2="TBD") LIMIT 1').get(matchRow.tournament_id, nextStage);
  if(!nm){
    const id = Date.now().toString(36);
    db.prepare('INSERT INTO matches(id,tournament_id,team1,team2,stage,time,status,score,maps_json) VALUES(?,?,?,?,?,?,?,?,?)').run(id, matchRow.tournament_id, winner, 'TBD', nextStage, new Date().toISOString(), 'TBD', '', '[]');
  } else {
    if(!nm.team1 || nm.team1==='TBD') db.prepare('UPDATE matches SET team1=? WHERE id=?').run(winner, nm.id);
    else if(!nm.team2 || nm.team2==='TBD') db.prepare('UPDATE matches SET team2=? WHERE id=?').run(winner, nm.id);
    else {
      const id = Date.now().toString(36);
      db.prepare('INSERT INTO matches(id,tournament_id,team1,team2,stage,time,status,score,maps_json) VALUES(?,?,?,?,?,?,?,?,?)').run(id, matchRow.tournament_id, winner, 'TBD', nextStage, new Date().toISOString(), 'TBD', '', '[]');
    }
  }
}

/* Expose simple health check */
app.get('/api/health', (req,res)=> res.json({ok:true, mode:'api_demo'}));

// Serve frontend public folder if exists
app.use('/', express.static(path.join(__dirname,'public')));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
  console.log('YAKhltv API listening on', PORT);
});
