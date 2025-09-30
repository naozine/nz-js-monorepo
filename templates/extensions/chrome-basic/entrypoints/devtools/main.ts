// DevTools page script: observes selection in Elements panel and sends info to the extension

interface ElementInfo {
  url: string;
  title?: string;
  xpath?: string;
  cssSelector?: string;
  outerHTMLSnippet?: string;
  attributes?: Record<string, string>;
  textSnippet?: string;
  timestamp: number;
}

const tabId = chrome.devtools?.inspectedWindow?.tabId;

function buildEvalCode(maxLen = 600): string {
  // This code runs in the inspected page context and can access $0 (selected element)
  return `(() => {
    try {
      const el = $0;
      if (!el) return null;

      function getXPath(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return '';
        if (node.id && typeof node.id === 'string') {
          // Use id shortcut if it likely unique
          return "//*[@id='" + node.id.replace(/'/g, "\\'") + "']";
        }
        const parts = [];
        let cur = node;
        while (cur && cur.nodeType === Node.ELEMENT_NODE) {
          let index = 1;
          let sib = cur.previousElementSibling;
          while (sib) {
            if (sib.tagName === cur.tagName) index++;
            sib = sib.previousElementSibling;
          }
          const tag = cur.tagName.toLowerCase();
          parts.unshift(index > 1 ? (tag + '[' + index + ']') : tag);
          cur = cur.parentElement;
        }
        return '/' + parts.join('/');
      }

      function getCssSelector(el) {
        if (!(el instanceof Element)) return '';
        if (el.id) return '#' + CSS.escape(el.id);
        const path = [];
        let cur = el;
        while (cur && cur.nodeType === Node.ELEMENT_NODE) {
          let sel = cur.tagName.toLowerCase();
          if (cur.classList && cur.classList.length) {
            sel += '.' + Array.from(cur.classList).map(c => CSS.escape(c)).join('.');
          }
          const parent = cur.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(n => n.tagName === cur.tagName);
            if (siblings.length > 1) {
              const idx = siblings.indexOf(cur) + 1;
              sel += ':nth-of-type(' + idx + ')';
            }
          }
          path.unshift(sel);
          // Stop early if likely unique
          if (cur.id) break;
          cur = parent;
        }
        return path.join(' > ');
      }

      function collectAttributes(el) {
        const obj = {};
        if (!el || !el.attributes) return obj;
        for (const attr of Array.from(el.attributes)) {
          obj[attr.name] = attr.value;
        }
        return obj;
      }

      const outer = el.outerHTML || '';
      const text = (el.textContent || '').trim();

      return {
        url: location.href,
        title: document.title,
        xpath: getXPath(el),
        cssSelector: getCssSelector(el),
        outerHTMLSnippet: outer.slice(0, ${maxLen}),
        attributes: collectAttributes(el),
        textSnippet: text.slice(0, ${Math.floor(maxLen/2)}),
        timestamp: Date.now(),
      };
    } catch (e) {
      return { error: String(e) };
    }
  })()`;
}

function sendSelectedElementInfo() {
  const code = buildEvalCode();
  chrome.devtools.inspectedWindow.eval(
    code,
    { useContentScriptContext: false },
    (result: any, exceptionInfo) => {
      if (exceptionInfo && exceptionInfo.isException) {
        console.warn('Eval exception:', exceptionInfo);
        return;
      }
      if (!result) return;
      const payload: ElementInfo | any = result;
      chrome.runtime.sendMessage({ type: 'ELEMENT_INFO', tabId, payload }).catch(() => {});
    },
  );
}

// Fallback trigger: on selection change in Elements panel
chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
  sendSelectedElementInfo();
});

// Also send once when DevTools opens for this tab
sendSelectedElementInfo();
