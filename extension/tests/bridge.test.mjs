import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=(await readFile(new URL('../extension/bridge.js',import.meta.url),'utf8')).replace('export async function','async function');
const origin='https://signal-desk-red-rho.vercel.app';
const entry={url:'https://x.com/author/status/1234',text:'A new spatial interface',author:'@author',kind:'post'};
function setup({profile=true,existing=false,legacy=false,full=false,failJev=false}={}){
 const state={version:1,profile:{focus:profile?'Post GUI':''},entries:existing?[{...entry,id:'one',analysis:{engine:'JEV',metricVersion:legacy?undefined:2,relevance:88}}]:full?Array.from({length:100},(_,i)=>({...entry,url:'https://x.com/author/status/'+i,id:String(i)})):[]};
 const values=new Map([['signal.public-demo.v1',JSON.stringify(state)]]);const calls=[];
 const ctx={location:{origin},crypto:webcrypto,Event,AbortSignal,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},navigator:{locks:{request:async(n,fn)=>fn()}},window:{dispatchEvent(){}},fetch:async(path,options)=>{calls.push({path,options});return failJev?Response.json({error:'Invalid JEV API key'},{status:400}):Response.json({analysis:{engine:'JEV',metricVersion:2,relevance:75}});}};
 vm.createContext(ctx);vm.runInContext(source,ctx);return {bridge:ctx.bridge,ctx,calls,values,state:()=>JSON.parse(values.get('signal.public-demo.v1'))};
}
test('collect saves locally and calls only stateless JEV endpoint without cookies',async()=>{const s=setup();const r=await s.bridge('collect',entry,'test-secret',origin);assert.equal(r.relevance,75);assert.equal(s.state().entries.length,1);assert.equal(s.calls.length,1);assert.equal(s.calls[0].path,'/api/local/evaluate');assert.equal(s.calls[0].options.credentials,'omit');assert.ok(!s.values.get('signal.public-demo.v1').includes('test-secret'));});
test('existing JEV result is reused without another request',async()=>{const s=setup({existing:true});const r=await s.bridge('collect',entry,'test-secret',origin);assert.equal(r.relevance,88);assert.equal(s.calls.length,0);});
test('legacy JEV result is reviewed with the current questions',async()=>{const s=setup({existing:true,legacy:true});const r=await s.bridge('collect',entry,'test-secret',origin);assert.equal(r.relevance,75);assert.equal(s.calls.length,1);assert.equal(s.state().entries.length,1);});
test('setup checks local profile without any login or request',async()=>{const s=setup();assert.equal((await s.bridge('check',null,'',origin)).ok,true);assert.equal(s.calls.length,0);});
test('empty profile prevents collection and requests',async()=>{const s=setup({profile:false});assert.equal((await s.bridge('collect',entry,'test-secret',origin)).ok,false);assert.equal(s.state().entries.length,0);assert.equal(s.calls.length,0);});
test('failed analysis retains the local saved post',async()=>{const s=setup({failJev:true});const r=await s.bridge('collect',entry,'test-secret',origin);assert.match(r.error,/Saved locally/);assert.equal(s.state().entries.length,1);});
test('missing key saves material locally and allows explicit retry',async()=>{const s=setup();assert.match((await s.bridge('collect',entry,'',origin)).error,/API Key/);assert.equal(s.state().entries.length,1);assert.equal(s.calls.length,0);});
test('website key can be used without copying it to extension or X',async()=>{const s=setup();s.values.set('signal.jev-key','website-key');const r=await s.bridge('collect',entry,'',origin);assert.equal(r.ok,true);assert.equal(JSON.parse(s.calls[0].options.body).key,'website-key');assert.ok(!JSON.stringify(r).includes('website-key'));});
test('capacity rejection performs no network call or write',async()=>{const s=setup({full:true});const r=await s.bridge('collect',entry,'test-secret',origin);assert.match(r.error,/100 posts/);assert.equal(s.state().entries.length,100);assert.equal(s.calls.length,0);});
test('wrong origin prevents access',async()=>{const s=setup();s.ctx.location.origin='https://example.com';assert.equal((await s.bridge('collect',entry,'test-secret',origin)).ok,false);assert.equal(s.calls.length,0);});
