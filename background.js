// // background.js
// const HIBP_BASE = 'https://api.pwnedpasswords.com/range/';
// const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// // Helper: get whitelist and cache from storage
// function getStorage(keys) {
//   return new Promise(resolve => {
//     chrome.storage.local.get(keys, (items) => resolve(items));
//   });
// }

// function setStorage(obj) {
//   return new Promise(resolve => {
//     chrome.storage.local.set(obj, () => resolve());
//   });
// }

// // Ensure defaults on install
// chrome.runtime.onInstalled.addListener(async () => {
//   const items = await getStorage(['whitelist', 'hibpCache', 'enabled']);
//   if (!items.whitelist) {
//     await setStorage({ whitelist: [] });
//   }
//   if (!items.hibpCache) {
//     await setStorage({ hibpCache: {} });
//   }
//   if (typeof items.enabled === 'undefined') {
//     await setStorage({ enabled: true });
//   }
// });

// // fetch HIBP range for a prefix with caching
// async function fetchHIBPRangeWithCache(prefix) {
//   const storage = await getStorage(['hibpCache']);
//   const cache = storage.hibpCache || {};

//   const entry = cache[prefix];
//   const now = Date.now();

//   if (entry && (now - entry.fetchedAt) < CACHE_TTL_MS) {
//     // cache hit
//     return { success: true, rangeText: entry.rangeText, cached: true };
//   }

//   // fetch from HIBP
//   try {
//     const url = HIBP_BASE + encodeURIComponent(prefix);
//     const res = await fetch(url, { method: 'GET', cache: 'no-store' });
//     if (!res.ok) {
//       return { success: false, error: `HIBP returned ${res.status}` };
//     }
//     const text = await res.text();

//     // store in cache
//     cache[prefix] = { rangeText: text, fetchedAt: now };
//     await setStorage({ hibpCache: cache });

//     return { success: true, rangeText: text, cached: false };
//   } catch (err) {
//     return { success: false, error: err.message || String(err) };
//   }
// }

// // Message listener
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   (async () => {
//     if (request.action === 'getWhitelist') {
//       const items = await getStorage(['whitelist']);
//       sendResponse({ whitelist: items.whitelist || [] });
//       return;
//     }

//     if (request.action === 'addToWhitelist') {
//       const domain = request.domain;
//       const items = await getStorage(['whitelist']);
//       const list = items.whitelist || [];
//       if (!list.includes(domain)) {
//         list.push(domain);
//         await setStorage({ whitelist: list });
//         sendResponse({ success: true, whitelist: list });
//       } else {
//         sendResponse({ success: false, message: 'Already present', whitelist: list });
//       }
//       return;
//     }

//     if (request.action === 'removeFromWhitelist') {
//       const domain = request.domain;
//       const items = await getStorage(['whitelist']);
//       let list = items.whitelist || [];
//       list = list.filter(d => d !== domain);
//       await setStorage({ whitelist: list });
//       sendResponse({ success: true, whitelist: list });
//       return;
//     }

//     if (request.action === 'toggleExtension') {
//       await setStorage({ enabled: !!request.enabled });
//       sendResponse({ enabled: !!request.enabled });
//       return;
//     }

//     if (request.action === 'fetchHIBPRange') {
//       const prefix = request.prefix;
//       if (!prefix || prefix.length < 1) {
//         sendResponse({ success: false, error: 'Invalid prefix' });
//         return;
//       }
//       const items = await getStorage(['enabled']);
//       if (typeof items.enabled !== 'undefined' && items.enabled === false) {
//         sendResponse({ success: false, error: 'Extension disabled' });
//         return;
//       }
//       const result = await fetchHIBPRangeWithCache(prefix);
//       sendResponse(result);
//       return;
//     }

//     // unknown action
//     sendResponse({ success: false, error: 'unknown action' });
//   })();

//   // Return true to indicate async response
//   return true;
// });

// background.js
const HIBP_BASE = 'https://api.pwnedpasswords.com/range/';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper: get from storage
function getStorage(keys) {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, items => resolve(items));
  });
}

// Helper: save to storage
function setStorage(obj) {
  return new Promise(resolve => {
    chrome.storage.local.set(obj, () => resolve());
  });
}

// Ensure defaults on extension install
chrome.runtime.onInstalled.addListener(async () => {
  const items = await getStorage(['whitelist', 'hibpCache', 'enabled']);
  if (!items.whitelist) await setStorage({ whitelist: [] });
  if (!items.hibpCache) await setStorage({ hibpCache: {} });
  if (typeof items.enabled === 'undefined') await setStorage({ enabled: true });
});

// Cached HIBP prefix lookup
async function fetchHIBPRangeWithCache(prefix) {
  const storage = await getStorage(['hibpCache']);
  const cache = storage.hibpCache || {};
  const now = Date.now();

  const entry = cache[prefix];
  if (entry && (now - entry.fetchedAt) < CACHE_TTL_MS) {
    return { success: true, rangeText: entry.rangeText, cached: true };
  }

  try {
    const url = HIBP_BASE + encodeURIComponent(prefix);
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });

    if (!res.ok) {
      return { success: false, error: `HIBP returned ${res.status}` };
    }

    const text = await res.text();

    cache[prefix] = { rangeText: text, fetchedAt: now };
    await setStorage({ hibpCache: cache });

    return { success: true, rangeText: text, cached: false };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

// Message Handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {

    // Request whitelist
    if (request.action === "getWhitelist") {
      const items = await getStorage(["whitelist"]);
      sendResponse({ whitelist: items.whitelist || [] });
      return;
    }

    // Add domain to whitelist
    if (request.action === "addToWhitelist") {
      const domain = request.domain;
      const items = await getStorage(['whitelist']);
      let list = items.whitelist || [];

      if (!list.includes(domain)) {
        list.push(domain);
        await setStorage({ whitelist: list });
      }

      sendResponse({ success: true, whitelist: list });
      return;
    }

    // Remove domain
    if (request.action === "removeFromWhitelist") {
      const domain = request.domain;
      const items = await getStorage(['whitelist']);
      let list = items.whitelist || [];

      list = list.filter(d => d !== domain);

      await setStorage({ whitelist: list });
      sendResponse({ success: true, whitelist: list });
      return;
    }

    // Toggle whole extension
    if (request.action === "toggleExtension") {
      await setStorage({ enabled: !!request.enabled });
      sendResponse({ enabled: !!request.enabled });
      return;
    }

    // HIBP lookup
    if (request.action === "fetchHIBPRange") {
      const prefix = request.prefix;

      const items = await getStorage(['enabled']);
      if (items.enabled === false) {
        sendResponse({ success: false, error: "Extension disabled" });
        return;
      }

      const result = await fetchHIBPRangeWithCache(prefix);
      sendResponse(result);
      return;
    }

    // NEW: Return hostname to popup/content
    if (request.action === "getHostname") {
      try {
        const url = new URL(request.tabUrl);
        sendResponse({ hostname: url.hostname });
      } catch (e) {
        sendResponse({ hostname: null });
      }
      return;
    }

    // Default
    sendResponse({ success: false, error: "unknown action" });

  })();

  return true; // keep message channel open
});
