import {bridge} from './bridge.js';
const ORIGIN='https://signal-desk-red-rho.vercel.app';
const ready=chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
let chain=Promise.resolve();
async function siteTab() {
  const tabs=await chrome.tabs.query({url:ORIGIN+'/*'});
  const found=tabs.find(t=>t.status==='complete');
  if(found)return found;
  const tab=tabs[0]||await chrome.tabs.create({url:ORIGIN+'/',active:false});
  // No polling: wait for the normal tab lifecycle event.
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(listener);reject(new Error('Signal took too long to load. Open the website and try again.'));},15000);
    function listener(id,info){if(id===tab.id&&info.status==='complete'){clearTimeout(timeout);chrome.tabs.onUpdated.removeListener(listener);resolve();}}
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tab.id).then(t=>{if(t.status==='complete')listener(tab.id,{status:'complete'});}).catch(reject);
  });return tab;
}
async function run(operation,entry,key) {
  const tab=await siteTab();
  const result=await chrome.scripting.executeScript({target:{tabId:tab.id},world:'ISOLATED',func:bridge,args:[operation,entry||null,key||'',ORIGIN]});
  return result[0]?.result||{ok:false,error:'No response from Signal. Open the website and try again.'};
}
function clean(raw) {
  if(!raw||typeof raw.text!=='string'||raw.text.trim().length<3||raw.text.length>16000)throw new Error('Post text is missing or exceeds the supported length.');
  if(typeof raw.url!=='string'||!/^https:\/\/x\.com\/\w+\/status\/\d+$/.test(raw.url))throw new Error('Invalid post URL.');
  return {text:raw.text.trim(),url:raw.url,author:String(raw.author||'').slice(0,100),publishedAt:String(raw.publishedAt||'').slice(0,40),kind:'post',source:'X · Signal extension'};
}
async function collect(entry) {
  const id=entry.url.split('/').pop();const qid='pending:'+id;
  const config=await chrome.storage.local.get(['apiKey',qid]);
  // Retain failed saves locally across browser restarts, never store secrets in queue.
  await chrome.storage.local.set({[qid]:{entry,at:Date.now(),error:'Waiting to save or analyze'}});
  let result;
  try {result=await run('collect',entry,config.apiKey);}catch{result={ok:false,error:'Signal disconnected. Your post is queued; open the extension to retry.'};}
  if(result.ok)await chrome.storage.local.remove(qid);
  else await chrome.storage.local.set({[qid]:{entry,at:Date.now(),error:result.error}});
  return result;
}
chrome.runtime.onInstalled.addListener(()=>chrome.runtime.openOptionsPage());
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  const extensionPage=sender.id===chrome.runtime.id&&sender.url?.startsWith(chrome.runtime.getURL(''));
  const xPage=sender.id===chrome.runtime.id&&/^https:\/\/(x|twitter)\.com\//.test(sender.url||'');
  if((message.type==='collect'&&!xPage)||(['check','retry'].includes(message.type)&&!extensionPage))return false;
  if(!['collect','check','retry'].includes(message.type))return false;
  const task=async()=>{
    await ready;
    if(message.type==='collect')return collect(clean(message.entry));
    if(message.type==='check')return run('check');
    const all=await chrome.storage.local.get(null);const results=[];
    for(const [id,item] of Object.entries(all))if(id.startsWith('pending:'))results.push(await collect(clean(item.entry)));
    return {ok:results.every(x=>x.ok),count:results.filter(x=>x.ok).length,error:results.find(x=>!x.ok)?.error};
  };
  chain=chain.then(task,task).then(reply,error=>reply({ok:false,error:error.message||'Something went wrong. Please try again.'}));
  return true;
});
