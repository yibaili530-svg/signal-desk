import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL||!process.argv[2])throw new Error('Set DATABASE_URL and provide a Signal JSON export path');
const data=JSON.parse(await readFile(process.argv[2],'utf8'));
const entries=Array.isArray(data)?data:data.entries;
if(!Array.isArray(entries)||entries.length>10000)throw new Error('Expected at most 10000 entries');
const validated=entries.map(e=>{
 if(!e||typeof e.text!=='string'||e.text.length<3||e.text.length>16000)throw new Error('Invalid entry text');
 const id=typeof e.id==='string'&&e.id.length<=200?e.id:randomUUID();
 const createdAt=typeof e.createdAt==='string'&&!Number.isNaN(Date.parse(e.createdAt))?e.createdAt:new Date().toISOString();
 const match=String(e.url||'').match(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/);
 const fingerprint=match?'x:'+match[1]:createHash('sha256').update(e.text.trim()).digest('hex');
 return {id,fingerprint,payload:JSON.stringify({...e,id,createdAt}),createdAt};
});
const sql=neon(process.env.DATABASE_URL,{fullResults:true});
const results=await sql.transaction(validated.map(e=>sql`INSERT INTO entries(id,fingerprint,payload,created_at) VALUES(${e.id},${e.fingerprint},${e.payload},${e.createdAt}) ON CONFLICT DO NOTHING`));
console.log(`Imported ${results.reduce((n,r)=>n+r.rowCount,0)} materials; existing materials retained.`);
