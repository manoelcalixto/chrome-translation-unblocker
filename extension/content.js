(() => {
  "use strict";

  // Internal browser pages, local files and other schemes are outside our scope.
  if (location.protocol !== "https:" && location.protocol !== "http:") return;

  const CANDIDATES = "[translate],.notranslate,meta[name]";
  const PRESERVE = "script,style,noscript,template,pre,code,kbd,samp,input,textarea,select,option";
  const changes = new Map();
  const removedHints = new Map();
  const pending = new Map();
  let enabled = false;
  let initialized = false;
  let configRevision = 0;
  let flushQueued = false;
  let needsPruning = false;
  let settingsError = false;

  const normalize = (value) => (value || "").trim().toLowerCase();

  function remember(element) {
    if (!changes.has(element)) changes.set(element, {});
    return changes.get(element);
  }

  function isPageHint(element) {
    return element.tagName === "META" &&
      normalize(element.getAttribute("name")) === "google" &&
      normalize(element.getAttribute("content")) === "notranslate";
  }

  function processElement(element) {
    if (!element.isConnected) return;

    if (isPageHint(element)) {
      removedHints.set(element, {
        parent: element.parentNode,
        nextSibling: element.nextSibling
      });
      element.remove();
      return;
    }

    // Keep explicit exclusions for code samples and editable answer fields.
    if (element.closest(PRESERVE) || element.isContentEditable) return;

    const original = element.getAttribute("translate");
    if (normalize(original) === "no") {
      remember(element).translate = original;
      element.setAttribute("translate", "yes");
    }
    if (element.classList.contains("notranslate")) {
      remember(element).notranslate = true;
      element.classList.remove("notranslate");
    }
  }

  function scan(root) {
    if (root.nodeType === Node.ELEMENT_NODE) processElement(root);
    root.querySelectorAll?.(CANDIDATES).forEach(processElement);
  }

  function pruneDetachedNodes() {
    for (const element of changes.keys()) {
      if (!element.isConnected) changes.delete(element);
    }
    for (const [element, saved] of removedHints) {
      if (!saved.parent.isConnected) removedHints.delete(element);
    }
  }

  function flush() {
    flushQueued = false;
    if (!enabled) {
      pending.clear();
      return;
    }
    const batch = Array.from(pending);
    pending.clear();
    for (const [node, subtree] of batch) {
      if (!node.isConnected) continue;
      if (subtree) scan(node);
      else processElement(node);
    }
    if (needsPruning) {
      needsPruning = false;
      pruneDetachedNodes();
    }
  }

  function queueFlush() {
    if (flushQueued) return;
    flushQueued = true;
    queueMicrotask(flush);
  }

  const observer = new MutationObserver((mutations) => {
    if (!enabled) return;
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        // An attribute change only needs a shallow check of its own element.
        if (!pending.has(mutation.target)) pending.set(mutation.target, false);
      } else {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) pending.set(node, true);
        }
        if (mutation.removedNodes.length) needsPruning = true;
      }
    }
    if (pending.size || needsPruning) queueFlush();
  });

  function restore() {
    observer.disconnect();
    pending.clear();
    needsPruning = false;
    for (const [element, saved] of changes) {
      if (!element.isConnected) continue;
      // Do not overwrite a newer value explicitly set by the website.
      if (saved.translate !== undefined && element.getAttribute("translate") === "yes") {
        element.setAttribute("translate", saved.translate);
      }
      if (saved.notranslate) element.classList.add("notranslate");
    }
    changes.clear();

    for (const [element, saved] of removedHints) {
      if (element.isConnected || !saved.parent.isConnected) continue;
      // The site may have created a replacement while the adjustment was active.
      if (Array.from(saved.parent.querySelectorAll("meta[name]")).some(isPageHint)) continue;
      const before = saved.nextSibling?.parentNode === saved.parent ? saved.nextSibling : null;
      saved.parent.insertBefore(element, before);
    }
    removedHints.clear();
  }

  function applySetting(value) {
    initialized = true;
    settingsError = false;
    const next = value !== false;
    if (next === enabled) return;
    enabled = next;
    if (!enabled) {
      restore();
      return;
    }
    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["translate", "class", "name", "content"]
    });
    scan(document);
  }

  async function readSetting() {
    const revision = configRevision;
    try {
      const saved = await chrome.storage.local.get({ enabled: true });
      // A newer onChanged notification takes priority over an older read.
      if (configRevision === revision) applySetting(saved.enabled);
    } catch {
      settingsError = true;
    }
  }

  function status() {
    pruneDetachedNodes();
    return {
      initialized,
      enabled,
      settingsError,
      adjustedElements: changes.size,
      removedPageHints: removedHints.size
    };
  }

  chrome.storage.onChanged.addListener((updated, area) => {
    if (area !== "local" || !Object.hasOwn(updated, "enabled")) return;
    configRevision += 1;
    applySetting(updated.enabled.newValue);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "liberar-traducao/status") return false;
    readSetting().then(() => sendResponse(status()));
    return true;
  });

  void readSetting();
})();
