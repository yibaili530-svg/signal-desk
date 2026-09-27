(() => {
  function own(article, selector) {
    return [...article.querySelectorAll(selector)].filter(n => n.closest('article') === article && !n.closest('[data-testid="quoteTweet"], [role="link"][tabindex="0"]'));
  }
  function extract(article) {
    const time = own(article, 'time')[0];
    const link = time?.closest('a[href*="/status/"]');
    const match = link?.getAttribute('href')?.match(/^\/(\w+)\/status\/(\d+)/);
    if (!match) throw new Error('Could not identify the original post. Open the post and try again.');
    const nodes = own(article, '[data-testid="tweetText"]');
    if (own(article, '[data-testid="tweet-text-show-more-link"]').length) throw new Error('This post is truncated. Click Show more before saving.');
    const text = nodes[0]?.innerText?.trim() || nodes[0]?.textContent?.trim();
    if (!text || text.length < 3) throw new Error('Not enough post text. Text inside images or videos is not supported yet.');
    if (text.length > 16000) throw new Error('This post exceeds the 16,000-character limit.');
    const user = own(article, '[data-testid="User-Name"]')[0];
    const display = user?.innerText?.split('\n')[0]?.trim() || user?.textContent?.trim() || '';
    return {text, author: display ? `${display} (@${match[1]})` : `@${match[1]}`,url:`https://x.com/${match[1]}/status/${match[2]}`,publishedAt:time.getAttribute('datetime')||'',kind:'post',source:'X · Signal extension'};
  }
  globalThis.SignalExtract = {extract, own};
})();
