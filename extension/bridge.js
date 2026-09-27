// Runs in the isolated extension world on the fixed Signal origin.
// Website and extension share origin-local storage and the same Web Lock.
export async function bridge(operation, entry, key, expectedOrigin) {
  if(location.origin!==expectedOrigin)return {ok:false,error:'The Signal page has moved. Please reopen Collector.'};
  const storageKey='signal.public-demo.v1';
  try {
    if(!navigator.locks)throw new Error('Update your browser to use local collection.');
    return await navigator.locks.request('signal-local-store',async()=>{
      const raw=localStorage.getItem(storageKey);
      if(!raw)throw new Error('Open Signal and save your account direction in Settings first.');
      const state=JSON.parse(raw);
      if(state.version!==1||!Array.isArray(state.entries)||!state.profile)throw new Error('Local data could not be read. Open Signal to check your backup.');
      const p=state.profile;
      if(!p.focus?.trim()&&!p.projects?.trim())throw new Error('Add your account direction or projects to Signal Settings first.');
      if(operation==='check')return {ok:true};
      const save=()=>{
        try{localStorage.setItem(storageKey,JSON.stringify(state));}
        catch{throw new Error('Browser storage is full or unavailable. Export a backup in Signal to make room.');}
        window.dispatchEvent(new Event('signal-local-change'));
      };
      const id=entry.url.match(/\/status\/(\d+)/)[1];
      let saved=state.entries.find(e=>e.url?.match(/\/status\/(\d+)/)?.[1]===id);
      if(!saved){
        if(state.entries.filter(e=>e.kind==='post').length>=100)throw new Error('Collector is full (100 posts). Export and delete posts in Signal, then retry.');
        if(state.entries.length>=2000)throw new Error('Local storage holds up to 2,000 materials. Export and delete materials first.');
        saved={...entry,id:crypto.randomUUID(),status:'inbox',createdAt:new Date().toISOString(),likes:null,views:null,draft:'',feedback:''};
        state.entries.unshift(saved);save();
      }
      if(saved.analysis?.engine==='JEV'&&saved.analysis.metricVersion===2)return {ok:true,relevance:saved.analysis.relevance};
      const apiKey=key||localStorage.getItem('signal.jev-key')||'';
      if(!apiKey)throw new Error('Saved locally. Add your JEV API Key in Signal Settings or the extension, then retry.');
      const response=await fetch('/api/local/evaluate',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({entry:{text:saved.text,kind:saved.kind},profile:p,key:apiKey}),signal:AbortSignal.timeout(35000)});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error('Saved locally. '+(data.error||'JEV review failed. Please retry.'));
      if(data.analysis?.engine!=='JEV'||!Number.isFinite(data.analysis.relevance))throw new Error('Saved locally, but the JEV result is invalid. Please retry.');
      saved.analysis=data.analysis;save();
      return {ok:true,relevance:saved.analysis.relevance};
    });
  }catch(error){return {ok:false,error:error.message||'Connection failed. Your post can be retried from the extension.'};}
}
