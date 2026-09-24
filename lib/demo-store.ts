import {defaultProfile, normalize, rules, type Entry, type Profile} from './signal';

export const DEMO_STORAGE_KEY = 'signal.public-demo.v1';
type DemoState = {version:1; entries:Entry[]; profile:Profile};
const empty = ():DemoState => ({version:1, entries:[], profile:{...defaultProfile}});

function read():DemoState {
  let raw:string|null;
  try { raw=window.localStorage.getItem(DEMO_STORAGE_KEY); }
  catch { throw new Error('Enable browser storage to use Signal.'); }
  if(!raw)return empty();
  try {
    const data=JSON.parse(raw);
    if(data.version!==1 || !Array.isArray(data.entries) || !data.profile || data.entries.some((e:Entry)=>!e || typeof e.id!=='string' || typeof e.text!=='string' || typeof e.source!=='string' || !['post','project'].includes(e.kind)))throw new Error();
    return {...data,profile:{...defaultProfile,...data.profile}};
  } catch { throw new Error('Saved data could not be read. Export a backup before resetting browser data.'); }
}
function write(state:DemoState) {
  try { window.localStorage.setItem(DEMO_STORAGE_KEY,JSON.stringify(state)); window.dispatchEvent(new Event('signal-local-change')); }
  catch { throw new Error('Browser storage is full or unavailable. Export your materials before clearing browser data. Changes were not saved.'); }
}
function fingerprint(e:Entry) {
  const u=e.url.match(/(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/);
  return u?'x:'+u[1]:'text:'+e.text.trim();
}

// Demo operations are deliberately local: never call private APIs, even when
// the same browser already has an authenticated owner session.
export async function demoApi(path:string,method='GET',body?:unknown):Promise<any> {
  if(!navigator.locks)throw new Error('Use a current Chrome, Edge, Firefox, or Safari browser.');
  return navigator.locks.request('signal-local-store',()=>operate(path,method,body));
}
async function operate(path:string,method='GET',body?:unknown):Promise<any> {
  const state=read();
  const b=body as any;
  if(path==='entries' && method==='GET')return {entries:state.entries};
  if(path==='profile' && method==='GET')return {profile:state.profile};
  if((path==='entries'||path==='backup') && method==='POST') {
    if(!Array.isArray(b?.entries)||(path!=='backup'&&!b.entries.length)||b.entries.length>2000)throw new Error('Import 1–2,000 materials at a time');
    const incoming:Entry[]=b.entries.map(restoreEntry);
    const seen=new Set(state.entries.map(fingerprint));
    const added=incoming.filter(e=>{const fp=fingerprint(e);if(seen.has(fp))return false;seen.add(fp);return true;});
    if(added.some(e=>e.kind==='post') && state.entries.filter(e=>e.kind==='post').length+added.filter(e=>e.kind==='post').length>100)throw new Error('Collector holds up to 100 posts. Export and delete posts to make room. Nothing was imported.');
    if(state.entries.length+added.length>2000)throw new Error('This browser holds up to 2,000 materials. Export and remove older materials first.');
    state.entries=[...added,...state.entries];
    if(path==='backup' && b.profile)state.profile=cleanProfile(b.profile);
    write(state);
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
    const p=cleanProfile(b);
    state.profile=p;write(state);return {profile:p};
  }
  if(path==='evaluate' && method==='POST') {
    if(!['rules','jev'].includes(b?.engine))throw new Error('Choose a review method');
    if(!Array.isArray(b.ids)||!b.ids.length||b.ids.length>20||b.ids.some((id:unknown)=>typeof id!=='string'))throw new Error('Review 1–20 materials at a time');
    const ids=new Set(b.ids);let count=0;const errors:string[]=[];
    for(const entry of state.entries){
      if(!ids.has(entry.id))continue;
      try{
        if(b.engine==='jev'){
          const key=b.key||localStorage.getItem('signal.jev-key')||'';
          if(!key)throw new Error('Enter your JEV API Key in Settings first');
          const response=await fetch('/api/local/evaluate',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({entry:{text:entry.text,kind:entry.kind},profile:state.profile,key}),signal:AbortSignal.timeout(35000)});
          const data=await response.json();if(!response.ok)throw new Error(data.error||'JEV review failed');
          entry.analysis=data.analysis;
        }else entry.analysis=rules(entry,state.profile);
        write(state);count++;
      }catch(error){errors.push(error instanceof Error?error.message:'Review failed');break;}
    }
    return {count,errors};
  }
  if(path==='resolve')throw new Error('Use the Signal extension on X to collect a post, or paste its text with the link.');
  throw new Error('This operation is not available in local mode.');
}


function cleanProfile(raw:any):Profile{
  const p={...defaultProfile};
  for(const k of ['handle','focus','projects','audience','style','topics'] as const)if(typeof raw?.[k]==='string')p[k]=raw[k].slice(0,4000);
  p.minutes=Math.max(5,Math.min(180,Number(raw?.minutes)||20));return p;
}
function restoreEntry(raw:any):Entry{
  const e=normalize(raw);
  if(['inbox','planned','later','done','archived'].includes(raw.status))e.status=raw.status;
  if(typeof raw.draft==='string')e.draft=raw.draft.slice(0,16000);
  if(typeof raw.feedback==='string')e.feedback=raw.feedback.slice(0,500);
  if(typeof raw.createdAt==='string'&&Number.isFinite(Date.parse(raw.createdAt)))e.createdAt=new Date(raw.createdAt).toISOString();
  const a=raw.analysis;
  if(a){
    if(!['JEV','Rule-based'].includes(a.engine)||!(['score','relevance',...(a.metricVersion===2?['discussion','contribution']:['audience','unique'])].every(k=>Number.isFinite(a[k])&&a[k]>=0&&a[k]<=100))||typeof a.action!=='string'||typeof a.topic!=='string')throw new Error('Invalid review scores in backup. Nothing was imported.');
    e.analysis=a.metricVersion===2?{engine:a.engine,metricVersion:2,score:a.score,relevance:a.relevance,discussion:a.discussion,contribution:a.contribution,action:a.action.slice(0,100),topic:a.topic.slice(0,100)}:{engine:a.engine,score:a.score,relevance:a.relevance,audience:a.audience,unique:a.unique,action:a.action.slice(0,100),topic:a.topic.slice(0,100)};
  }
  return e;
}
