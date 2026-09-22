const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),ts=require('typescript'),crypto=require('node:crypto');
const compile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup(){
  const data=new Map();let tail=Promise.resolve(),calls=[];
  const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const ctx={exports:{},crypto,Event,AbortSignal,Response,window:{localStorage:storage,dispatchEvent(){}},localStorage:storage,navigator:{locks:{request(name,fn){const p=tail.then(fn);tail=p.catch(()=>{});return p;}}},fetch:async(path,options)=>{calls.push({path,options});return Response.json({analysis:{engine:'JEV',relevance:75,audience:50,unique:75,score:66,action:'Reply',topic:'AI / Technology'}});}};
  vm.createContext(ctx);vm.runInContext(compile('lib/signal.ts'),ctx);const signal=ctx.exports;ctx.exports={};ctx.require=()=>signal;vm.runInContext(compile('lib/demo-store.ts'),ctx);
  return {api:ctx.exports.demoApi,ctx,data,calls};
}
const entry=n=>({text:'Test local post '+n,url:'https://x.com/test/status/'+n,kind:'post'});
test('backup preserves draft, review, status and profile without credentials',async()=>{
 const x=setup();await x.api('profile','PUT',{focus:'Creative tools'});
 await x.api('entries','POST',{entries:[{...entry(1),draft:'My saved draft',feedback:'Useful',status:'done',analysis:{engine:'JEV',relevance:80,audience:70,unique:90,score:80,action:'Reply',topic:'Design'}}]});
 const backup=JSON.parse(x.data.get('signal.public-demo.v1'));
 const y=setup();await y.api('backup','POST',backup);
 const restored=await y.api('entries');assert.equal(restored.entries[0].draft,'My saved draft');assert.equal(restored.entries[0].analysis.relevance,80);assert.equal(restored.entries[0].status,'done');assert.equal((await y.api('profile')).profile.focus,'Creative tools');assert.equal(y.calls.length,0);
});
test('parallel saves at capacity admit only one and keep existing posts',async()=>{
 const x=setup();await x.api('entries','POST',{entries:Array.from({length:99},(_,i)=>entry(i+1))});
 const r=await Promise.allSettled([x.api('entries','POST',{entries:[entry(100)]}),x.api('entries','POST',{entries:[entry(101)]})]);
 assert.equal(r.filter(a=>a.status==='fulfilled').length,1);assert.equal((await x.api('entries')).entries.length,100);
});
test('local JEV review uses only supplied key and persists scores',async()=>{
 const x=setup();await x.api('profile','PUT',{focus:'Creative tools'});await x.api('entries','POST',{entries:[entry(1)]});
 const id=(await x.api('entries')).entries[0].id;
 await x.api('evaluate','POST',{ids:[id],engine:'jev',key:'test-key'});
 assert.equal(x.calls[0].path,'/api/local/evaluate');assert.equal(x.calls[0].options.credentials,'omit');assert.equal(JSON.parse(x.calls[0].options.body).key,'test-key');
 assert.equal((await x.api('entries')).entries[0].analysis.engine,'JEV');assert.ok(!x.data.get('signal.public-demo.v1').includes('test-key'));
});
test('failed JEV review retains saved post and draft',async()=>{
 const x=setup();await x.api('entries','POST',{entries:[{...entry(1),draft:'Keep me'}]});
 x.ctx.fetch=async()=>Response.json({error:'Invalid JEV API key'},{status:400});
 const id=(await x.api('entries')).entries[0].id;
 const r=await x.api('evaluate','POST',{ids:[id],engine:'jev',key:'bad-key'});
 assert.equal(r.count,0);assert.match(r.errors[0],/Invalid/);assert.equal((await x.api('entries')).entries[0].draft,'Keep me');
});
test('malformed backup is rejected without changing profile or entries',async()=>{
 const x=setup();await x.api('profile','PUT',{focus:'Original'});
 await assert.rejects(x.api('backup','POST',{profile:{focus:'Changed'},entries:[{...entry(1),analysis:{relevance:200}}]}));
 assert.equal((await x.api('profile')).profile.focus,'Original');assert.equal((await x.api('entries')).entries.length,0);
});
test('profile-only backup works',async()=>{const x=setup();await x.api('backup','POST',{entries:[],profile:{focus:'Design'}});assert.equal((await x.api('profile')).profile.focus,'Design');});
function endpoint(){
 const ctx={exports:{},crypto,AbortSignal,Response,URL,fetch:async(url,options)=>{assert.equal(url,'https://api.typesafe.ai/v1/systemone');assert.equal(options.headers.Authorization,'Bearer test-key');return Response.json({answers:{relevance:{score:3},audience:{score:2},unique:{score:4},action:{choice:'Reply'},topic:{choice:'AI / Technology'}}});}};
 vm.createContext(ctx);vm.runInContext(compile('lib/signal.ts'),ctx);const signal=ctx.exports;
 ctx.exports={};vm.runInContext(compile('lib/jev.ts'),ctx);const jev=ctx.exports;
 ctx.exports={};ctx.require=name=>name==='@/lib/signal'?signal:name==='@/lib/jev'?jev:(()=>{throw new Error('Unexpected dependency '+name)})();
 vm.runInContext(compile('app/api/local/evaluate/route.ts'),ctx);return ctx.exports.POST;
}
test('public endpoint works without cookies using caller key and excludes secrets from response',async()=>{
 const post=endpoint();const req=new Request('https://signal.example/api/local/evaluate',{method:'POST',headers:{origin:'https://signal.example','Content-Type':'application/json'},body:JSON.stringify({entry:entry(1),profile:{focus:'Creative tools'},key:'test-key'})});
 const r=await post(req);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const text=await r.text();assert.ok(!text.includes('test-key'));assert.equal(JSON.parse(text).analysis.relevance,75);
});
test('public endpoint rejects foreign origin and missing caller key',async()=>{
 const post=endpoint();
 const req=(origin,body)=>new Request('https://signal.example/api/local/evaluate',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await post(req('https://other.example',{}))).status,403);
 assert.equal((await post(req('https://signal.example',{entry:entry(1),profile:{focus:'Design'}}))).status,400);
});
