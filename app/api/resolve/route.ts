import {authorized,denied} from '@/lib/access';
import {sameOrigin} from '@/lib/store';
import {resolvePost} from '@/lib/x-post';
export async function POST(req:Request) {if(!await authorized())return denied();
  try {
    sameOrigin(req);
    const body = await req.json() as {urls?:unknown};
    if (!Array.isArray(body.urls) || !body.urls.length || body.urls.length > 20 || body.urls.some(u=>typeof u !== 'string' || u.length > 2048)) return Response.json({error:'Paste 1–20 X post links at a time.'},{status:400});
    const entries = [], failed = [];
    const urls = [...new Set(body.urls as string[])];
    for (let i=0;i<urls.length;i+=4) {
      const results = await Promise.all(urls.slice(i,i+4).map(async url=>{
        try { return {entry:await resolvePost(url),url}; }
        catch(e) { return {url,error:e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'X took too long to respond. Try again or paste the post text.'}; }
      }));
      for (const result of results) {if(result.entry) entries.push(result.entry);else failed.push({url:result.url,error:result.error});}
    }
    return Response.json({entries,failed},{headers:{'Cache-Control':'no-store'}});
  } catch {return Response.json({error:'Could not read links. Your input has been kept.'},{status:400});}
}
