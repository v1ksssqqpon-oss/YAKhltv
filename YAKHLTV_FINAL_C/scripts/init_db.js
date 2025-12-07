
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const dbpath = path.join(__dirname,'..','data');
if(!fs.existsSync(dbpath)) fs.mkdirSync(dbpath, { recursive:true });
const db = new Database(path.join(dbpath,'db.sqlite'));

db.exec(`
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT,
  country TEXT
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT,
  team TEXT,
  rating REAL,
  kd REAL
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT,
  date TEXT,
  format TEXT,
  teams_json TEXT
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT,
  team1 TEXT,
  team2 TEXT,
  stage TEXT,
  time TEXT,
  status TEXT,
  score TEXT,
  maps_json TEXT
);

CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT,
  summary TEXT,
  date TEXT
);
`);

// seed some demo data
const uid = ()=> Date.now().toString(36) + Math.random().toString(36).slice(2,6);

db.prepare('INSERT OR IGNORE INTO teams(id,name,country) VALUES(?,?,?)').run('Team A','Team A','RU');
db.prepare('INSERT OR IGNORE INTO teams(id,name,country) VALUES(?,?,?)').run('Team B','Team B','US');
db.prepare('INSERT OR IGNORE INTO teams(id,name,country) VALUES(?,?,?)').run('Team C','Team C','SE');
db.prepare('INSERT OR IGNORE INTO players(id,name,team,rating,kd) VALUES(?,?,?,?,?)').run(uid(),'s1mple','Team A',1.78,1.35);
db.prepare('INSERT OR IGNORE INTO tournaments(id,name,date,format,teams_json) VALUES(?,?,?,?,?)').run(uid(),'YAK Cup 2025','2025-12-10','single',JSON.stringify(['Team A','Team B','Team C']));
console.log('DB initialized at', path.join(dbpath,'db.sqlite'));
