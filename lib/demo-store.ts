import {defaultProfile, normalize, rules, type Entry, type Profile} from './signal';

export const DEMO_STORAGE_KEY = 'signal.public-demo.v1';
type DemoState = {version:1; entries:Entry[]; profile:Profile};
const empty = ():DemoState => ({version:1, entries:[], profile:{...defaultProfile}});

function read():DemoState {
  let raw:string|null;
  try { raw=window.localStorage.getItem(DEMO_STORAGE_KEY); }
  catch { throw new Error('Enable browser storage to try the demo. Your private workspace is separate.'); }
  if(!raw)return empty();
  try {
    const data=JSON.parse(raw);
    if(data.version!==1 || !Array.isArray(data.entries) || !data.profile || data.entries.some((e:Entry)=>!e || typeof e.id!=='string' || typeof e.text!=='string' || typeof e.source!=='string' || !['post','project'].includes(e.kind)))throw new Error();
    return {...data,profile:{...defaultProfile,...data.profile}};
  } catch { throw new Error('Saved demo data could not be read. Use a fresh browser profile to try again. Your private workspace is unaffected.'); }
}
function write(state:DemoState) {
  try { window.localStorage.setItem(DEMO_STORAGE_KEY,JSON.stringify(state)); }
  catch { throw new Error('Browser storage is full or unavailable. Export your materials before clearing browser data. Changes were not saved.'); }
}
function fingerprint(e:Entry) {
  const u=e.url.match(/(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/);
  return u?'x:'+u[1]:'text:'+e.text.trim();
}

// Demo operations are deliberately local: never call private APIs, even when
// the same browser already has an authenticated owner session.
export async function demoApi(path:string,method='GET',body?:unknown):Promise<any> {
  const state=read();
  const b=body as any;
  if(path==='entries' && method==='GET')return {entries:state.entries};
  if(path==='profile' && method==='GET')return {profile:state.profile};
  if(path==='entries' && method==='POST') {
    if(!Array.isArray(b?.entries)||!b.entries.length||b.entries.length>200)throw new Error('Import 1–200 materials at a time');
    const incoming:Entry[]=b.entries.map(normalize);
    const seen=new Set(state.entries.map(fingerprint));
    const added=incoming.filter(e=>{const fp=fingerprint(e);if(seen.has(fp))return false;seen.add(fp);return true;});
    if(added.some(e=>e.kind==='post') && state.entries.filter(e=>e.kind==='post').length+added.filter(e=>e.kind==='post').length>100)throw new Error('Collector holds up to 100 posts. Export and delete posts to make room. Nothing was imported.');
    if(state.entries.length+added.length>2000)throw new Error('This demo holds up to 2,000 materials. Export and remove older materials first.');
    state.entries=[...added,...state.entries];write(state);
    return {added:added.length,total:incoming.length};
  }
  if(path==='entries' && method==='PATCH') {
    const entry=state.entries.find(e=>e.id===b?.id);
    if(!entry)throw new Error('Material not found');
    if(b.status!==undefined){if(!['inbox','planned','later','done','archived'].includes(b.status))throw new Error('Invalid status');entry.status=b.status;}
    if(typeof b.draft==='string')entry.draft=b.draft.slice(0,16000);
    if(typeof b.feedback==='string')entry.feedback=b.feedback.slice(0,500);
    write(state);return {entry};
  }
  if(path==='entries' && method==='DELETE') {
    if(typeof b?.id!=='string')throw new Error('Material is missing');
    state.entries=state.entries.filter(e=>e.id!==b.id);write(state);return {deleted:true,id:b.id};
  }
  if(path==='profile' && method==='PUT') {
    const p={...defaultProfile};
    for(const k of ['handle','focus','projects','audience','style','topics'] as const){if(typeof b?.[k]==='string')p[k]=b[k].slice(0,4000);}
    p.minutes=Math.max(5,Math.min(180,Number(b?.minutes)||20));
    state.profile=p;write(state);return {profile:p};
  }
  if(path==='evaluate' && method==='POST') {
    if(b?.engine!=='rules')throw new Error('The public demo uses free, local rule-based review. JEV is available in the private workspace.');
    if(!Array.isArray(b.ids)||!b.ids.length||b.ids.length>20||b.ids.some((id:unknown)=>typeof id!=='string'))throw new Error('Review 1–20 materials at a time');
    const ids=new Set(b.ids);let count=0;
    for(const entry of state.entries){if(ids.has(entry.id)){entry.analysis=rules(entry,state.profile);count++;}}
    write(state);return {count,errors:[]};
  }
  if(path==='resolve')throw new Error('In the public demo, paste the post text with its link, or upload JSON. Automatic X link reading is available in the private workspace.');
  throw new Error('This operation is not available in the public demo.');
}

