import {cookies} from 'next/headers';
import {createHmac,timingSafeEqual} from 'node:crypto';
export const cookieName='signal_session';
const lifetime=7*24*60*60;
export function accessKey(){const key=process.env.SIGNAL_ACCESS_KEY;return key&&key.length>=32?key:null;}
export function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function createSession(key:string){const expiry=Math.floor(Date.now()/1000)+lifetime;return `${expiry}.${createHmac('sha256',key).update(String(expiry)).digest('hex')}`;}
export async function authorized(){
  const key=accessKey(),value=(await cookies()).get(cookieName)?.value;
  if(!key||!value)return false;
  const [expiry,signature,...extra]=value.split('.');
  if(extra.length||!/^\d+$/.test(expiry)||Number(expiry)<=Date.now()/1000||Number(expiry)>Date.now()/1000+lifetime+60||!signature)return false;
  return equal(signature,createHmac('sha256',key).update(expiry).digest('hex'));
}
export function denied(){return Response.json({error:'Sign in to access your workspace.'},{status:401,headers:{'Cache-Control':'no-store'}});}
