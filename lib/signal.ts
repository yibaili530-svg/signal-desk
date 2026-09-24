export type Entry={id:string;text:string;url:string;author:string;kind:'project'|'post';status:string;createdAt:string;publishedAt:string;source:string;likes:number|null;views:number|null;draft:string;feedback:string;analysis?:{engine:string;score:number;relevance:number;discussion?:number;contribution?:number;audience?:number;unique?:number;action:string;topic:string;confidence?:number;metricVersion?:2};};
export const defaultProfile={handle:'',focus:'',projects:'',audience:'',style:'',topics:'',minutes:20};
export type Profile=typeof defaultProfile;
export function safeUrl(value:unknown){if(typeof value!=='string'||!value)return '';try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}}
export function normalize(raw:any):Entry{if(!raw||typeof raw!=='object')throw new Error('Invalid material format');const text=String(raw.text??raw.content??'').trim();if(text.length<3||text.length>16000)throw new Error('Text must be 3–16000 characters. Include the post text, not just a link.');const metric=(v:any)=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;return {id:crypto.randomUUID(),text,url:safeUrl(raw.url),author:String(raw.author??'').slice(0,100),kind:raw.kind==='project'?'project':'post',status:'inbox',createdAt:new Date().toISOString(),publishedAt:typeof raw.publishedAt==='string'&&Number.isFinite(Date.parse(raw.publishedAt))?new Date(raw.publishedAt).toISOString():'',source:String(raw.source??'Manual collection').slice(0,80),likes:metric(raw.likes),views:metric(raw.views),draft:'',feedback:''};}
export function rules(e:Entry,p:Profile){
  const t=e.text.toLowerCase();
  const terms=(value:string)=>value.toLowerCase().split(/[,，、\s]+/).filter(x=>x.length>3);
  const topicMatch=terms(p.focus).some(x=>t.includes(x))||terms(p.topics).some(x=>t.includes(x));
  const projectMatch=terms(p.projects).some(x=>t.includes(x));
  const relevance=e.kind==='project'?95:topicMatch||projectMatch?80:20;
  const discussion=/\?|？|how|why|problem|challenge|tradeoff|should|versus|vs\.|but |however|issue|need |如何|为什么|难题|问题/.test(t)?75:25;
  const contribution=e.kind==='project'?90:projectMatch?80:20;
  return {engine:'Rule-based',metricVersion:2 as const,relevance,discussion,contribution,score:Math.round(relevance*.4+discussion*.3+contribution*.3),action:e.kind==='project'?'Original post':contribution>=70&&discussion>=70?'Reply':'Watch',topic:topicMatch||projectMatch?'Account topic':'Other'};
}
export function writingBrief(e:Entry,p:Profile){return `Suggest two distinct angles for my X account using the source below. Write 1–3 English sentences for each. Do not invent experiments, results, or personal experiences.\nDirection: ${p.focus}\nProjects: ${p.projects}\nAudience: ${p.audience}\nStyle: ${p.style}\nSuggested format: ${e.analysis?.action??(e.kind==='project'?'Original post':'Reply')}\nMaterial: ${e.text}\nSource: ${e.url||'My project update'}\nFirst identify missing facts or claims to verify, then write the drafts.`}

