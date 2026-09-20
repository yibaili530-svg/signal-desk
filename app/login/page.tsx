import {accessKey,authorized} from '@/lib/access';
import {redirect} from 'next/navigation';
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}) {
  if(await authorized())redirect('/');
  const {error}=await searchParams;
  return <main style={{maxWidth:440,margin:'12vh auto',padding:24}}><h1>Signal</h1><p>Your private workspace.</p>{accessKey()?<form action="/api/session" method="post" className="form-stack"><label>Access key<input type="password" name="key" required autoComplete="current-password" maxLength={512}/></label>{error&&<p role="alert">Access key not recognized. Try again.</p>}<button className="btn primary" type="submit">Open workspace</button></form>:<p>Workspace setup is not complete. Configure the private access key before signing in.</p>}</main>;
}
