(() => {
  if (globalThis.signalCollectorInstalled) return;
  globalThis.signalCollectorInstalled = true;
  const busy = new WeakSet();
  const english = message => typeof message === 'string' && !/\p{Script=Han}/u.test(message)
    ? message : 'Could not complete this save. Open Signal Collector and retry.';
  function node(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    return el;
  }
  function icon(state) {
    const el = node('span', 'signal-motion-icon');
    el.setAttribute('aria-hidden', 'true');
    if (state === 'loading') el.append(node('span', 'signal-spinner'));
    else if (state === 'success') {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M5 12l4 4L19 6');
      svg.append(path);el.append(svg);
    } else el.textContent = '!';
    return el;
  }
  function notification() {
    let stack = document.getElementById('signal-collector-notifications');
    if (!stack) {
      stack = node('div', 'signal-notification-stack');
      stack.id = 'signal-collector-notifications';
      document.body.append(stack);
    }
    const panel = node('div', 'signal-notification');
    panel.dataset.state = 'loading';
    const symbol = icon('loading');
    const copy = node('div', 'signal-notification-copy');
    const title = node('strong', 'signal-notification-title', 'Saving & reviewing');
    const detail = node('span', 'signal-notification-detail', 'Sending to Collector · JEV will assess relevance.');
    const live = node('div', 'signal-notification-live');
    live.setAttribute('role', 'status');live.setAttribute('aria-live', 'polite');live.setAttribute('aria-atomic', 'true');
    live.append(title, detail);
    const result = node('div', 'signal-result');
    const inner = node('div', 'signal-result-inner');
    result.append(inner);copy.append(live, result);
    const close = node('button', 'signal-notification-close', '×');
    close.type = 'button';close.setAttribute('aria-label', 'Dismiss notification');
    panel.append(symbol, copy, close);stack.prepend(panel);
    let hideTimer, dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;clearTimeout(hideTimer);
      panel.classList.add('signal-leaving');
      setTimeout(() => {panel.remove();if (!stack.children.length) stack.remove();}, 240);
    }
    close.addEventListener('click', dismiss);
    panel.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    panel.addEventListener('mouseleave', () => {if(panel.dataset.state!=='loading'&&!dismissed)hideTimer=setTimeout(dismiss,4000);});
    panel.addEventListener('focusin', () => clearTimeout(hideTimer));
    panel.addEventListener('focusout', () => {if(panel.dataset.state!=='loading'&&!dismissed)hideTimer=setTimeout(dismiss,4000);});
    return (state, message, relevance) => {
      if (dismissed) return;
      panel.dataset.state = state;
      symbol.replaceWith(icon(state));
      title.textContent = state === 'success' ? 'Saved to Collector' : 'Save needs attention';
      detail.textContent = state === 'success' ? 'Fits my topics?' : english(message);
      if (state === 'success' && Number.isFinite(relevance)) {
        const score = Math.max(0, Math.min(100, relevance));
        const line = node('div', 'signal-score-line');
        const value = node('strong', '', String(score));
        value.append(node('small', '', '/100'));
        line.append(value);
        inner.append(line);
        result.setAttribute('aria-label', `Fits my topics? ${score} out of 100`);
      }
      hideTimer = setTimeout(dismiss, state === 'success' ? 6500 : 10000);
    };
  }
  function buttonState(button, state) {
    button.dataset.state = state;
    button.replaceChildren();
    if (state !== 'idle') button.append(icon(state));
    button.append(node('span', '', state === 'loading' ? 'Saving…' : state === 'success' ? 'Saved' : state === 'error' ? 'Retry' : '↗ Signal'));
    button.setAttribute('aria-busy', String(state === 'loading'));
    button.setAttribute('aria-label', state === 'loading' ? 'Saving to Signal and reviewing with JEV' : state === 'success' ? 'Saved to Signal' : 'Save to Signal');
  }
  function scan() {
    document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
      if (article.querySelector('.signal-save-button')) return;
      const group = SignalExtract.own(article, '[role="group"]')[0];
      if (!group) return;
      const button = node('button', 'signal-save-button');button.type = 'button';
      button.title = 'Save to Signal & review with JEV';buttonState(button,'idle');
      button.addEventListener('click', async event => {
        event.preventDefault();event.stopPropagation();if (busy.has(button)) return;
        busy.add(button);button.disabled = true;buttonState(button,'loading');
        const finish = notification();
        let state = 'error';
        try {
          const entry = SignalExtract.extract(article);
          const result = await chrome.runtime.sendMessage({type:'collect',entry});
          if (!result?.ok) throw new Error(result?.error || 'Connection lost. Open the extension to view pending saves.');
          state = 'success';
          finish('success', '', result.relevance);
        } catch (error) {
          finish('error', error.message || 'Save failed. Open the extension for details.');
        } finally {
          buttonState(button,state);
          // Keep the success acknowledgement visible briefly; never delay saving.
          setTimeout(() => {buttonState(button,'idle');button.disabled=false;busy.delete(button);}, state === 'success' ? 1200 : 600);
        }
      });group.append(button);
    });
  }
  let timer;
  new MutationObserver(records => {
    // Our spinner and notification updates never need another timeline scan.
    if (records.every(r => r.target.closest?.('.signal-save-button, #signal-collector-notifications'))) return;
    if (!timer) timer = setTimeout(() => {timer=null;scan();},250);
  }).observe(document.body,{childList:true,subtree:true});
  scan();
})();
