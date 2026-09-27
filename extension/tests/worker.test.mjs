import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
function setup() {let listener;const data={apiKey:'private-key'};let result={ok:false,error:'JEV offline'};let calls=0;let restricted=false;
 const chrome={storage:{local:{setAccessLevel:async({accessLevel})=>{restricted=accessLevel==='TRUSTED_CONTEXTS';},get:async keys=>keys===null?{...data}:Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,data[k]])),set:async value=>Object.assign(data,value),remove:async key=>{delete data[key];}}},tabs:{query:async()=>[{id:1,status:'complete'}]},scripting:{executeScript:async options=>{calls++;assert.equal(options.args[2],'private-key');assert.equal(options.world,'ISOLATED');return [{result}];}},runtime:{id:'extension',getURL:path=>'chrome-extension://extension/'+path,onInstalled:{addListener(){}},onMessage:{addListener(fn){listener=fn;}},openOptionsPage:async()=>{}}};
 const context={chrome,bridge:()=>{},console,setTimeout,clearTimeout};vm.createContext(context);vm.runInContext(readFileSync(new URL('../extension/worker.js',import.meta.url),'utf8').replace("import {bridge} from './bridge.js';",''),context);
 const send=(msg,sender={id:'extension',url:'https://x.com/home'})=>new Promise(resolve=>{if(!listener(msg,sender,resolve))resolve('rejected');});
 return {data,send,setResult:r=>result=r,get calls(){return calls;},get restricted(){return restricted;}};
}
const entry={url:'https://x.com/user/status/123',text:'A test post',author:'User'};
test('failed save persists, explicit retry clears it, key never returned',async()=>{const s=setup();let r=await s.send({type:'collect',entry});assert.equal(r.ok,false);assert.ok(s.data['pending:123']);assert.equal(s.restricted,true);assert.ok(!JSON.stringify(s.data['pending:123']).includes('private-key'));s.setResult({ok:true,relevance:90});r=await s.send({type:'retry'},{id:'extension',url:'chrome-extension://extension/popup.html'});assert.equal(r.count,1);assert.equal(s.data['pending:123'],undefined);assert.ok(!JSON.stringify(r).includes('private-key'));});
test('untrusted sender cannot trigger save',async()=>{const s=setup();assert.equal(await s.send({type:'collect',entry},{id:'extension',url:'https://evil.example'}),'rejected');assert.equal(s.calls,0);});
test('X content script cannot ask to retry the private queue',async()=>{const s=setup();assert.equal(await s.send({type:'retry'}),'rejected');});
test('bad URL and empty body are rejected without writes',async()=>{const s=setup();assert.equal((await s.send({type:'collect',entry:{...entry,url:'https://evil.example'}})).ok,false);assert.equal((await s.send({type:'collect',entry:{...entry,text:''}})).ok,false);assert.equal(s.calls,0);});
