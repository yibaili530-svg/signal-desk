import {authorized,denied} from '@/lib/access';
export const maxDuration = 300;
import {store,sameOrigin} from '@/lib/store';
import {defaultProfile,rules,type Entry} from '@/lib/signal';
import {reviewWithJev} from '@/lib/jev';
export async function POST(req:Request){if(!await authorized())return denied();try{sameOrigin(req);const b:any=await req.json();if(!Array.isArray(b.ids)||!b.ids.length||b.ids.length>20||b.ids.some((x:any)=>typeof x!=='string'))throw new Error('Review 1–20 materials at a time');if(b.engine!=='rules'&&b.engine!=='jev')throw new Error('Choose a review method');if(b.engine==='jev'&&(!b.key||typeof b.key!=='string'||b.key.length>1000))throw new Error('Enter your TypeSafe API key first');const pr=await store().prepare('SELECT value FROM settings WHERE key=?').bind('profile').first<{value:string}>();const p=pr?JSON.parse(pr.value):defaultProfile;let count=0;const errors=[];
for(const id of [...new Set(b.ids)]){const r=await store().prepare('SELECT payload FROM entries WHERE id=?').bind(id).first<{payload:string}>();if(!r)continue;const e=JSON.parse(r.payload);try{let analysis:NonNullable<Entry['analysis']>=rules(e,p);if(b.engine==='jev')analysis=await reviewWithJev(e,p,b.key);
await store().prepare("UPDATE entries SET payload=jsonb_set(payload::jsonb,'{analysis}',?::jsonb)::text WHERE id=?").bind(JSON.stringify(analysis),id).run();count++;}catch(err){errors.push(err instanceof Error?err.message:'Review failed');break;}}
return Response.json({count,errors});}catch(err){return Response.json({error:err instanceof Error?err.message:'Review failed'},{status:400});}}
