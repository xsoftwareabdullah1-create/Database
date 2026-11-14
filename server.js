'use strict';
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const clean = value => typeof value === 'string' ? value.trim() : '';
const validName = value => /^[a-zA-Z0-9_-]{1,64}$/.test(value);
const sign = user => jwt.sign({ sub: String(user.id), email: user.email }, JWT_SECRET, { expiresIn: '7d' });

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc:["'self'"], styleSrc:["'self'","'unsafe-inline'","https://fonts.googleapis.com"], fontSrc:["'self'","https://fonts.gstatic.com"], scriptSrc:["'self'","'unsafe-inline'"], imgSrc:["'self'","data:"] } } }));
app.use(express.json({ limit: '256kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

async function migrate() {
  if (!DATABASE_URL) throw new Error('DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.');
  if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      name VARCHAR(80) NOT NULL,
      region VARCHAR(40) NOT NULL DEFAULT 'us-central',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS collections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(project_id, name)
    );
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects(owner_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS collections_project_idx ON collections(project_id);
    CREATE INDEX IF NOT EXISTS documents_collection_idx ON documents(collection_id, updated_at DESC);
  `);
}
const auth = asyncRoute(async (req,res,next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\\s+/i,'');
  if (!token) return res.status(401).json({ error:'Authentication required' });
  let payload;
  try { payload = jwt.verify(token, JWT_SECRET); }
  catch (_) { return res.status(401).json({ error:'Invalid or expired session' }); }
  const result = await pool.query('SELECT id,email FROM app_users WHERE id=$1', [payload.sub]);
  if (!result.rowCount) return res.status(401).json({ error:'Account not found' });
  req.user = result.rows[0];
  next();
});
async function ownsProject(userId, projectId) {
  const r = await pool.query('SELECT id,name,region,created_at FROM projects WHERE id=$1 AND owner_id=$2',[projectId,userId]);
  return r.rows[0] || null;
}
app.get('/api/health', asyncRoute(async (_req,res) => {
  await pool.query('SELECT 1');
  res.json({ ok:true, service:'Webbase API', database:'connected', time:new Date().toISOString() });
}));
app.post('/api/auth/register', asyncRoute(async (req,res) => {
  const email=clean(req.body.email).toLowerCase(), password=String(req.body.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:'Enter a valid email address'});
  if (password.length < 8 || password.length > 128) return res.status(400).json({error:'Password must be 8–128 characters'});
  const hash=await bcrypt.hash(password,12);
  try {
    const r=await pool.query('INSERT INTO app_users(email,password_hash) VALUES($1,$2) RETURNING id,email',[email,hash]);
    res.status(201).json({token:sign(r.rows[0]),user:r.rows[0]});
  } catch(e) { if(e.code==='23505') return res.status(409).json({error:'An account with this email already exists'}); throw e; }
}));
app.post('/api/auth/login', asyncRoute(async (req,res) => {
  const email=clean(req.body.email).toLowerCase(), password=String(req.body.password || '');
  const r=await pool.query('SELECT id,email,password_hash FROM app_users WHERE email=$1',[email]);
  if (!r.rowCount || !(await bcrypt.compare(password,r.rows[0].password_hash))) return res.status(401).json({error:'Email or password is incorrect'});
  const user={id:r.rows[0].id,email:r.rows[0].email}; res.json({token:sign(user),user});
}));
app.get('/api/me',auth,(req,res)=>res.json({user:req.user}));
app.get('/api/projects',auth,asyncRoute(async(req,res)=>{
  const r=await pool.query(`SELECT p.id,p.name,p.region,p.created_at,COUNT(DISTINCT c.id)::int AS collections,COUNT(d.id)::int AS documents
  FROM projects p LEFT JOIN collections c ON c.project_id=p.id LEFT JOIN documents d ON d.collection_id=c.id
  WHERE p.owner_id=$1 GROUP BY p.id ORDER BY p.created_at DESC`,[req.user.id]);
  res.json({projects:r.rows});
}));
app.post('/api/projects',auth,asyncRoute(async(req,res)=>{
  const name=clean(req.body.name);
  if(name.length<2 || name.length>80) return res.status(400).json({error:'Project name must be 2–80 characters'});
  const r=await pool.query('INSERT INTO projects(owner_id,name,region) VALUES($1,$2,$3) RETURNING *',[req.user.id,name,clean(req.body.region)||'us-central']);
  res.status(201).json({project:r.rows[0]});
}));
app.delete('/api/projects/:projectId',auth,asyncRoute(async(req,res)=>{
  const r=await pool.query('DELETE FROM projects WHERE id=$1 AND owner_id=$2 RETURNING id',[req.params.projectId,req.user.id]);
  if(!r.rowCount) return res.status(404).json({error:'Project not found'});
  res.json({ok:true});
}));
app.get('/api/projects/:projectId/collections',auth,asyncRoute(async(req,res)=>{
  if(!await ownsProject(req.user.id,req.params.projectId)) return res.status(404).json({error:'Project not found'});
  const r=await pool.query(`SELECT c.id,c.name,c.created_at,COUNT(d.id)::int AS documents FROM collections c LEFT JOIN documents d ON d.collection_id=c.id WHERE c.project_id=$1 GROUP BY c.id ORDER BY c.name`,[req.params.projectId]);
  res.json({collections:r.rows});
}));
app.post('/api/projects/:projectId/collections',auth,asyncRoute(async(req,res)=>{
  if(!await ownsProject(req.user.id,req.params.projectId)) return res.status(404).json({error:'Project not found'});
  const name=clean(req.body.name);
  if(!validName(name)) return res.status(400).json({error:'Collection names may contain letters, numbers, _ and - (max 64)'});
  try { const r=await pool.query('INSERT INTO collections(project_id,name) VALUES($1,$2) RETURNING *',[req.params.projectId,name]); res.status(201).json({collection:r.rows[0]}); }
  catch(e){if(e.code==='23505') return res.status(409).json({error:'Collection already exists'});throw e;}
}));
app.get('/api/collections/:collectionId/documents',auth,asyncRoute(async(req,res)=>{
  const r=await pool.query(`SELECT d.id,d.data,d.created_at,d.updated_at FROM documents d JOIN collections c ON c.id=d.collection_id JOIN projects p ON p.id=c.project_id WHERE c.id=$1 AND p.owner_id=$2 ORDER BY d.updated_at DESC LIMIT 100`,[req.params.collectionId,req.user.id]);
  const check=await pool.query('SELECT c.id FROM collections c JOIN projects p ON p.id=c.project_id WHERE c.id=$1 AND p.owner_id=$2',[req.params.collectionId,req.user.id]);
  if(!check.rowCount) return res.status(404).json({error:'Collection not found'});
  res.json({documents:r.rows});
}));
app.post('/api/collections/:collectionId/documents',auth,asyncRoute(async(req,res)=>{
  const check=await pool.query('SELECT c.id FROM collections c JOIN projects p ON p.id=c.project_id WHERE c.id=$1 AND p.owner_id=$2',[req.params.collectionId,req.user.id]);
  if(!check.rowCount) return res.status(404).json({error:'Collection not found'});
  const data=req.body.data;
  if(!data || typeof data!=='object' || Array.isArray(data)) return res.status(400).json({error:'Document data must be a JSON object'});
  const r=await pool.query('INSERT INTO documents(collection_id,data) VALUES($1,$2) RETURNING *',[req.params.collectionId,JSON.stringify(data)]);
  res.status(201).json({document:r.rows[0]});
}));
app.put('/api/documents/:documentId',auth,asyncRoute(async(req,res)=>{
  const data=req.body.data;
  if(!data || typeof data!=='object' || Array.isArray(data)) return res.status(400).json({error:'Document data must be a JSON object'});
  const r=await pool.query(`UPDATE documents d SET data=$1,updated_at=NOW() FROM collections c,projects p WHERE d.id=$2 AND c.id=d.collection_id AND p.id=c.project_id AND p.owner_id=$3 RETURNING d.*`,[JSON.stringify(data),req.params.documentId,req.user.id]);
  if(!r.rowCount) return res.status(404).json({error:'Document not found'});
  res.json({document:r.rows[0]});
}));
app.delete('/api/documents/:documentId',auth,asyncRoute(async(req,res)=>{
  const r=await pool.query(`DELETE FROM documents d USING collections c,projects p WHERE d.id=$1 AND c.id=d.collection_id AND p.id=c.project_id AND p.owner_id=$2 RETURNING d.id`,[req.params.documentId,req.user.id]);
  if(!r.rowCount) return res.status(404).json({error:'Document not found'});
  res.json({ok:true});
}));
app.use('/api',(_req,res)=>res.status(404).json({error:'API route not found'}));
app.use((err,_req,res,_next)=>{
  console.error(err);
  if(err.code==='22P02') return res.status(400).json({error:'Invalid identifier format'});
  res.status(500).json({error:process.env.NODE_ENV==='production'?'Internal server error':err.message});
});
async function start(){
  await migrate();
  app.listen(PORT,'0.0.0.0',()=>console.log('Webbase is running on port '+PORT));
}
if(require.main===module) start().catch(err=>{console.error('Startup failed:',err);process.exit(1);});
module.exports={app,pool,migrate,start};
