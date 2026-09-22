import {NextResponse} from 'next/server';
import {accessKey,equal,createSession,cookieName} from '@/lib/access';
import {sameOrigin} from '@/lib/store';
export async function POST(req:Request){
  try{sameOrigin(req);}catch{return Response.json({error:'Invalid origin'},{status:403});}
  const key=accessKey();if(!key)return Response.json({error:'Workspace setup is incomplete'},{status:503});
  const form=await req.formData(),given=form.get('key');
  if(typeof given!=='string'||given.length>512||!equal(given,key))return NextResponse.redirect(new URL('/login?error=1',req.url),303);
  const response=NextResponse.redirect(new URL('/owner',req.url),303);
  response.cookies.set(cookieName,createSession(key),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:604800});
  return response;
}
