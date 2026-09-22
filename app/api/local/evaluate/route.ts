import {normalize,defaultProfile} from '@/lib/signal';
import {reviewWithJev} from '@/lib/jev';
export const maxDuration=60;
export async function POST(req:Request){
  const headers={'Cache-Control':'no-store'};
  try{
    if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid request origin'},{status:403,headers});
    if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Error('JSON required');
    const raw=await req.text();if(raw.length>50000)throw new Error('Request is too large');
    const b=JSON.parse(raw);
    if(typeof b.key!=='string'||!b.key.trim()||b.key.length>1000)throw new Error('Enter your JEV API Key in Settings first');
    const profile={...defaultProfile};
    for(const k of ['handle','focus','projects','audience','style','topics'] as const){if(typeof b.profile?.[k]==='string')profile[k]=b.profile[k].slice(0,4000);}
    profile.minutes=Math.max(5,Math.min(180,Number(b.profile?.minutes)||20));
    if(!profile.focus.trim()&&!profile.projects.trim())throw new Error('Add your account direction or projects in Settings first');
    const entry=normalize(b.entry);
    const analysis=await reviewWithJev(entry,profile,b.key.trim());
    return Response.json({analysis},{headers});
  }catch(error){return Response.json({error:error instanceof Error?error.message:'JEV review failed'},{status:400,headers});}
}
