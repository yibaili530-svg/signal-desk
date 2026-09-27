import {parseHTML} from '../test-deps/node_modules/linkedom/esm/index.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../extension/content.js',import.meta.url),'utf8');
function setup(){
  const {document,Event}=parseHTML('<html><body><article data-testid="tweet"><div role="group"></div></article></body></html>');
  let resolve,calls=0;const pending=new Promise(r=>resolve=r);const timers=[];
  vm.runInNewContext(source,{document,MutationObserver:class{observe(){}},setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},SignalExtract:{own:(a,s)=>[...a.querySelectorAll(s)],extract:()=>({text:'Example post'})},chrome:{runtime:{sendMessage(){calls++;return pending;}}}});
  const button=document.querySelector('.signal-save-button');
  return {document,button,resolve,timers,click:()=>button.dispatchEvent(new Event('click')),calls:()=>calls};
}
test('save shows immediate loading, prevents duplicate saves, and displays returned score',async()=>{
  const x=setup();x.click();x.click();
  assert.equal(x.calls(),1);assert.equal(x.button.dataset.state,'loading');assert.ok(x.button.querySelector('.signal-spinner'));assert.equal(x.button.disabled,true);
  x.resolve({ok:true,relevance:87});await new Promise(setImmediate);
  assert.equal(x.button.dataset.state,'success');
  assert.equal(x.document.querySelector('.signal-notification').dataset.state,'success');
  assert.match(x.document.querySelector('.signal-score-line').textContent,/87\/100/);
  x.timers.at(-1)();assert.equal(x.button.disabled,false);assert.equal(x.button.dataset.state,'idle');
});
test('failure removes loading, keeps feedback English, and allows retry',async()=>{
  const x=setup();x.click();x.resolve({ok:false,error:'保存失败'});await new Promise(setImmediate);
  assert.equal(x.button.dataset.state,'error');
  assert.equal(x.document.querySelector('.signal-notification').dataset.state,'error');
  assert.equal(x.document.querySelector('.signal-notification .signal-spinner'),null);
  assert.match(x.document.querySelector('.signal-notification-detail').textContent,/Could not complete/);
  x.timers.at(-1)();assert.equal(x.button.disabled,false);
});
