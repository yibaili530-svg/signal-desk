export function postLink(value: string) {
  const u = new URL(value.trim());
  if (!['https:', 'http:'].includes(u.protocol) || !/^(?:(?:www|mobile)\.)?(?:x|twitter)\.com$/.test(u.hostname) || u.username || u.password) throw new Error('Paste an X post link, not a profile or search link.');
  const m = u.pathname.match(/^\/(?:([A-Za-z0-9_]{1,15})\/status|i\/web\/status)\/(\d{1,25})(?:\/|$)/);
  if (!m) throw new Error('Paste an X post link, not a profile or search link.');
  return {id:m[2], url:`https://x.com/${m[1] || 'i/web'}/status/${m[2]}`};
}
export function plainText(html: string) {
  return html.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, code: string) => {
    const named: Record<string,string> = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
    if (code[0] !== '#') return named[code.toLowerCase()] ?? all;
    const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2),16) : Number(code.slice(1));
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : all;
  }).trim();
}
export async function resolvePost(value: string) {
  const link = postLink(value);
  const endpoint = new URL('https://publish.x.com/oembed');
  endpoint.searchParams.set('url',link.url);
  endpoint.searchParams.set('omit_script','true');
  endpoint.searchParams.set('dnt','true');
  const response = await fetch(endpoint, {signal:AbortSignal.timeout(12000), redirect:'manual',headers:{Accept:'application/json'}});
  if (!response.ok) throw new Error('X could not read this post. It may be private, deleted, or temporarily unavailable.');
  const data = await response.json() as {html?:string;author_url?:string;author_name?:string};
  const paragraph = data.html?.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  const text = paragraph ? plainText(paragraph) : '';
  if (text.length < 3) throw new Error('No readable post text was returned. Paste its text manually.');
  const author = data.author_url?.match(/(?:twitter|x)\.com\/([A-Za-z0-9_]+)/)?.[1];
  return {text,url:link.url,author:author ? '@'+author : (data.author_name || ''),kind:'post',source:'X link · public embed',likes:null,views:null};
}
