import {parseHTML} from '../test-deps/node_modules/linkedom/esm/index.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const context={};vm.createContext(context);vm.runInContext(readFileSync(new URL('../extension/extract.js',import.meta.url),'utf8'),context);
function article(extra='',text='A spatial interface demo') {const {document}=parseHTML(`<article data-testid="tweet"><div data-testid="User-Name">Designer</div><a href="/designer/status/123"><time datetime="2026-09-22T00:00:00Z"></time></a><div data-testid="tweetText">${text}</div>${extra}<div role="group"></div></article>`);return document.querySelector('article');}
test('extracts canonical URL, author, text and date',()=>{const e=context.SignalExtract.extract(article());assert.equal(e.url,'https://x.com/designer/status/123');assert.equal(e.author,'Designer (@designer)');assert.equal(e.text,'A spatial interface demo');assert.equal(e.publishedAt,'2026-09-22T00:00:00Z');});
test('quoted author and text do not replace primary post',()=>{const e=context.SignalExtract.extract(article('<div role="link" tabindex="0"><div data-testid="User-Name">Wrong author</div><a href="/other/status/999"><time></time></a><div data-testid="tweetText">Quoted text</div></div>'));assert.equal(e.url,'https://x.com/designer/status/123');assert.equal(e.text,'A spatial interface demo');});
test('folded long posts fail explicitly',()=>assert.throws(()=>context.SignalExtract.extract(article('<button data-testid="tweet-text-show-more-link">Show more</button>')),/Show more/));
test('media-only post fails without inventing content',()=>assert.throws(()=>context.SignalExtract.extract(article('','')),/post text/));
test('recycled article is read fresh after its URL changes',()=>{const a=article();context.SignalExtract.extract(a);a.querySelector('a').setAttribute('href','/newauthor/status/456');a.querySelector('[data-testid="tweetText"]').textContent='New content';const e=context.SignalExtract.extract(a);assert.equal(e.url,'https://x.com/newauthor/status/456');assert.equal(e.text,'New content');});
test('missing stable link reports error',()=>{const a=article();a.querySelector('time').remove();assert.throws(()=>context.SignalExtract.extract(a),/original post/);});
