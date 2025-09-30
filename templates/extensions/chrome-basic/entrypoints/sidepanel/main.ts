type ElementInfo = {
  url: string;
  title?: string;
  xpath?: string;
  cssSelector?: string;
  outerHTMLSnippet?: string;
  attributes?: Record<string, string>;
  textSnippet?: string;
  timestamp: number;
};

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;

const statusEl = $('#status');
const urlEl = $('#url');
const titleEl = $('#title');
const timeEl = $('#timestamp');
const xpathEl = $('#xpath');
const cssEl = $('#css');
const attrsTbody = $('#attrs');
const outerPre = $('#outer');
const textPre = $('#text');

function fmtTime(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function render(info?: ElementInfo | null) {
  if (!info) {
    statusEl.textContent = 'データがありません。DevTools で要素を選択してください。';
    urlEl.textContent = '';
    titleEl.textContent = '';
    timeEl.textContent = '';
    xpathEl.textContent = '';
    cssEl.textContent = '';
    attrsTbody.innerHTML = '';
    outerPre.textContent = '';
    textPre.textContent = '';
    return;
  }
  statusEl.textContent = '';
  urlEl.textContent = info.url || '';
  titleEl.textContent = info.title || '';
  timeEl.textContent = fmtTime(info.timestamp);
  xpathEl.textContent = info.xpath || '';
  cssEl.textContent = info.cssSelector || '';
  // attributes
  const attrs = info.attributes || {};
  attrsTbody.innerHTML = Object.keys(attrs).map(name => {
    const val = attrs[name];
    return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(val)}</td></tr>`;
  }).join('');
  outerPre.textContent = info.outerHTMLSnippet || '';
  textPre.textContent = info.textSnippet || '';
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function loadInitial() {
  try {
    const data = await chrome.storage?.session?.get?.('lastElementInfo');
    render(data?.lastElementInfo as ElementInfo | undefined);
  } catch (e) {
    console.warn('Failed to load lastElementInfo:', e);
  }
}

function setupCopyButtons() {
  document.querySelectorAll<HTMLButtonElement>('button.copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.copy;
      let text = '';
      if (target === 'xpath') text = xpathEl.textContent || '';
      else if (target === 'css') text = cssEl.textContent || '';
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'コピー済み';
        setTimeout(() => (btn.textContent = 'コピー'), 1000);
      } catch (e) {
        console.warn('Clipboard write failed:', e);
      }
    });
  });
}

function listenMessages() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === 'ELEMENT_INFO') {
      render(message.payload as ElementInfo);
    }
  });
}

loadInitial();
setupCopyButtons();
listenMessages();
