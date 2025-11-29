// // List of URLs or domains to skip alerting
// const skipAlertFor = [
//   "google.com",
//   "youtube.com",
//   "gmail.com",
//   "microsoft.com",
//   "live.com",
//   "outlook.com",
//   "office.com",
//   "apple.com",
//   "icloud.com",
//   "yahoo.com",
//   "bing.com",
//   "mozilla.org",
//   "github.com",
//   "gitlab.com",
//   "stackoverflow.com",
//   "amazon.com",
//   "aws.amazon.com",
//   "facebook.com",
//   "instagram.com",
//   "whatsapp.com",
//   "twitter.com",
//   "linkedin.com",
//   "reddit.com",
//   "netflix.com",
//   "spotify.com"
// ];

// // Check if current page should skip alert
// function shouldSkipBase() {
//   const url = window.location.href;
//   return skipAlertFor.some(s => url.includes(s));
// }

// // Simple modal creation (isolated using shadow DOM)
// function createBlockModal(message, onOverride) {
//   const host = document.createElement('div');
//   host.id = 'secureauth-modal-host';
//   host.style.position = 'fixed';
//   host.style.zIndex = 999999;
//   host.style.inset = '12px';
//   document.body.appendChild(host);

//   const shadow = host.attachShadow({mode: 'closed'});
//   const wrapper = document.createElement('div');
//   wrapper.style.position = 'fixed';
//   wrapper.style.left = '50%';
//   wrapper.style.top = '20%';
//   wrapper.style.transform = 'translateX(-50%)';
//   wrapper.style.maxWidth = '420px';
//   wrapper.style.padding = '18px';
//   wrapper.style.background = 'white';
//   wrapper.style.border = '2px solid #d33';
//   wrapper.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
//   wrapper.style.borderRadius = '8px';
//   wrapper.style.fontFamily = 'Arial, sans-serif';
//   wrapper.style.color = '#111';

//   const text = document.createElement('div');
//   text.textContent = message;
//   text.style.marginBottom = '12px';

//   const btnOverride = document.createElement('button');
//   btnOverride.textContent = 'Proceed anyway';
//   btnOverride.style.marginRight = '8px';
//   btnOverride.style.padding = '8px 12px';
//   btnOverride.style.cursor = 'pointer';

//   const btnCancel = document.createElement('button');
//   btnCancel.textContent = 'Cancel';
//   btnCancel.style.padding = '8px 12px';
//   btnCancel.style.cursor = 'pointer';

//   btnOverride.addEventListener('click', () => {
//     document.body.removeChild(host);
//     onOverride(true);
//   });
//   btnCancel.addEventListener('click', () => {
//     document.body.removeChild(host);
//     onOverride(false);
//   });

//   wrapper.appendChild(text);
//   wrapper.appendChild(btnOverride);
//   wrapper.appendChild(btnCancel);
//   shadow.appendChild(wrapper);

//   return host;
// }

// // Web Crypto SHA-1 helper -> returns uppercase hex string
// async function sha1Hex(str) {
//   const enc = new TextEncoder();
//   const data = enc.encode(str);
//   const hashBuffer = await crypto.subtle.digest('SHA-1', data);
//   const hashArray = Array.from(new Uint8Array(hashBuffer));
//   return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
// }

// // Parse HIBP range response (text) into a Set of suffixes (uppercase)
// function parseRangeTextToSet(text) {
//   // Each line: "XYZ...:count"
//   const lines = text.split(/\r?\n/);
//   const s = new Set();
//   for (const line of lines) {
//     const parts = line.split(':');
//     if (parts[0]) {
//       s.add(parts[0].trim().toUpperCase());
//     }
//   }
//   return s;
// }

// // Ask background to get cached/fetched HIBP range for a prefix
// function queryHIBPRange(prefix) {
//   return new Promise((resolve) => {
//     chrome.runtime.sendMessage({ action: 'fetchHIBPRange', prefix }, (response) => {
//       // response: { success: true, rangeText: "..." } or { success: false, error: "..." }
//       resolve(response);
//     });
//   });
// }

// // Helper: get nearest password input elements on the page
// function findPasswordFields() {
//   return Array.from(document.querySelectorAll('input[type="password"]'));
// }

// // Main form-intercept logic: attach listeners to forms containing password inputs
// function attachInterceptors() {
//   const pwFields = findPasswordFields();
//   if (pwFields.length === 0) return;

//   // For each password field, find its form (or fallback to document)
//   const forms = new Set();
//   pwFields.forEach(f => {
//     if (f.form) forms.add(f.form);
//     else forms.add(document);
//   });

//   forms.forEach(formOrDoc => {
//     const onSubmit = async (evt) => {
//       // locate password value(s)
//       let pwd = '';
//       if (formOrDoc instanceof HTMLFormElement) {
//         const input = formOrDoc.querySelector('input[type="password"]');
//         if (input) pwd = input.value;
//       } else {
//         // document-level catch: first password field
//         const input = document.querySelector('input[type="password"]');
//         if (input) pwd = input.value;
//       }

//       if (!pwd) return; // nothing to check

//       // Prevent submit until check completes
//       evt.preventDefault();
//       evt.stopPropagation();

//       try {
//         // compute hash and prefix/suffix
//         const fullHash = await sha1Hex(pwd); // uppercase hex
//         const prefix = fullHash.slice(0, 5);
//         const suffix = fullHash.slice(5);

//         // ask background for HIBP range text
//         const resp = await queryHIBPRange(prefix);
//         if (!resp || !resp.success) {
//           // On failure: show a warning but allow user decision
//           createBlockModal('Could not check password safety (network or service error). Proceed cautiously.', (override) => {
//             if (override) {
//               // re-submit
//               if (formOrDoc instanceof HTMLFormElement) formOrDoc.submit();
//               else {
//                 const button = document.querySelector('button[type=submit], input[type=submit]');
//                 if (button) button.click();
//               }
//             } else {
//               // user cancelled; do nothing
//             }
//           });
//           return;
//         }

//         // parse range & check suffix locally (suffix is uppercase hex)
//         const suffixSet = parseRangeTextToSet(resp.rangeText || '');
//         const found = suffixSet.has(suffix.toUpperCase());
//         if (found) {
//           // pwned -> block and show modal with details & override option
//           createBlockModal('This password has been seen in known data breaches. To protect you, submission is blocked. If you understand the risk, you may proceed.', (override) => {
//             if (override) {
//               if (formOrDoc instanceof HTMLFormElement) formOrDoc.submit();
//               else {
//                 const button = document.querySelector('button[type=submit], input[type=submit]');
//                 if (button) button.click();
//               }
//             } else {
//               // cancelled by user; do nothing
//             }
//           });
//         } else {
//           // not found -> allow submission
//           if (formOrDoc instanceof HTMLFormElement) formOrDoc.submit();
//           else {
//             const button = document.querySelector('button[type=submit], input[type=submit]');
//             if (button) button.click();
//           }
//         }
//       } catch (err) {
//         console.error('SecureAuth: error during HIBP check', err);
//         // fallback: let user decide
//         createBlockModal('Error while checking password safety. Proceed with caution.', (override) => {
//           if (override) {
//             if (formOrDoc instanceof HTMLFormElement) formOrDoc.submit();
//             else {
//               const button = document.querySelector('button[type=submit], input[type=submit]');
//               if (button) button.click();
//             }
//           }
//         });
//       }
//     };

//     // attach submit listener
//     if (formOrDoc instanceof HTMLFormElement) {
//       formOrDoc.addEventListener('submit', onSubmit, true);
//     } else {
//       // document fallback: listen for clicks on submit buttons
//       document.addEventListener('click', (e) => {
//         const target = e.target;
//         if (!target) return;
//         if (target.matches('button[type="submit"], input[type="submit"]')) {
//           // create synthetic submit event
//           onSubmit(new Event('submit', { bubbles: true, cancelable: true }));
//         }
//       }, true);

//       // also listen for Enter press in password inputs
//       findPasswordFields().forEach(input => {
//         input.addEventListener('keydown', (ev) => {
//           if (ev.key === 'Enter') {
//             onSubmit(new Event('submit', { bubbles: true, cancelable: true }));
//           }
//         });
//       });
//     }
//   });
// }

// // Dynamic whitelist check before attaching interceptors
// function checkWhitelistThenAttach() {
//   if (shouldSkipBase()) {
//     console.log('SecureAuth: skipping by base rules');
//     return;
//   }

//   chrome.runtime.sendMessage({ action: 'getWhitelist' }, (resp) => {
//     const wl = (resp && resp.whitelist) ? resp.whitelist : [];
//     const host = window.location.hostname;
//     if (wl.includes(host)) {
//       console.log('SecureAuth: domain whitelisted, not attaching interceptors for', host);
//       return;
//     } else {
//       console.log('SecureAuth: domain not whitelisted, attaching interceptors for', host);
//       attachInterceptors();
//     }
//   });
// }

// // kick off
// checkWhitelistThenAttach();


















// ================================================
//  SecureAuth — Content Script (FINAL UPDATED)
//  - Whitelist check
//  - Domain warning toast
//  - Password breach blocking (NO override)
// ================================================

// ------------------------------
// Domains to skip (base whitelist)
// ------------------------------
const skipAlertFor = [
  "google.com",
  "youtube.com",
  "gmail.com",
  "microsoft.com",
  "live.com",
  "outlook.com",
  "office.com",
  "apple.com",
  "icloud.com",
  "yahoo.com",
  "bing.com",
  "mozilla.org",
  "github.com",
  "gitlab.com",
  "stackoverflow.com",
  "amazon.com",
  "aws.amazon.com",
  "facebook.com",
  "instagram.com",
  "whatsapp.com",
  "twitter.com",
  "linkedin.com",
  "reddit.com",
  "netflix.com",
  "spotify.com"
];

// Skip common domains
function shouldSkipBase() {
  const url = window.location.href;
  return skipAlertFor.some(s => url.includes(s));
}

// ------------------------------
//  Toast Popup
// ------------------------------
function showDomainPopup(message) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.top = "20px";
  host.style.right = "20px";
  host.style.zIndex = "99999999";
  host.style.background = "#ff4c4c";
  host.style.color = "white";
  host.style.padding = "14px 18px";
  host.style.borderRadius = "8px";
  host.style.fontFamily = "Arial";
  host.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
  host.style.fontSize = "14px";
  host.style.maxWidth = "260px";
  host.style.opacity = "0";
  host.style.transition = "opacity 0.3s ease";

  host.innerText = message;
  document.body.appendChild(host);

  setTimeout(() => { host.style.opacity = "1"; }, 20);
  setTimeout(() => { host.style.opacity = "0"; }, 3500);
  setTimeout(() => { host.remove(); }, 4000);
}

// ------------------------------
//  Modal — PERMANENT BLOCK (No Override)
// ------------------------------
function createBlockModal(message) {
  const host = document.createElement('div');
  host.id = 'secureauth-modal-host';
  host.style.position = 'fixed';
  host.style.zIndex = 999999;
  host.style.inset = '12px';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '50%';
  wrapper.style.top = '20%';
  wrapper.style.transform = 'translateX(-50%)';
  wrapper.style.maxWidth = '420px';
  wrapper.style.padding = '18px';
  wrapper.style.background = 'white';
  wrapper.style.border = '2px solid #d33';
  wrapper.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
  wrapper.style.borderRadius = '8px';
  wrapper.style.fontFamily = 'Arial, sans-serif';
  wrapper.style.color = '#111';

  const text = document.createElement('div');
  text.textContent = message;
  text.style.marginBottom = '12px';

  const btnOk = document.createElement('button');
  btnOk.textContent = 'OK';
  btnOk.style.padding = '8px 12px';
  btnOk.style.cursor = 'pointer';

  btnOk.addEventListener('click', () => {
    document.body.removeChild(host);
  });

  wrapper.appendChild(text);
  wrapper.appendChild(btnOk);
  shadow.appendChild(wrapper);

  return host;
}

// ------------------------------
// SHA-1 Hash (Web Crypto API)
// ------------------------------
async function sha1Hex(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ------------------------------
// Parse HIBP suffix list
// ------------------------------
function parseRangeTextToSet(text) {
  const lines = text.split(/\r?\n/);
  const s = new Set();
  for (const line of lines) {
    const parts = line.split(':');
    if (parts[0]) s.add(parts[0].trim().toUpperCase());
  }
  return s;
}

// ------------------------------
// Ask background for range prefix
// ------------------------------
function queryHIBPRange(prefix) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: "fetchHIBPRange", prefix }, resolve);
  });
}

// ------------------------------
// Find password inputs
// ------------------------------
function findPasswordFields() {
  return Array.from(document.querySelectorAll('input[type="password"]'));
}

// ------------------------------
// Attach interceptors to forms
// ------------------------------
function attachInterceptors() {
  const pwFields = findPasswordFields();
  if (pwFields.length === 0) return;

  const forms = new Set();
  pwFields.forEach(f => {
    if (f.form) forms.add(f.form);
    else forms.add(document);
  });

  forms.forEach(formOrDoc => {
    const onSubmit = async evt => {
      let pwd = "";
      if (formOrDoc instanceof HTMLFormElement) {
        const input = formOrDoc.querySelector("input[type=password]");
        if (input) pwd = input.value;
      } else {
        const input = document.querySelector("input[type=password]");
        if (input) pwd = input.value;
      }

      if (!pwd) return;

      evt.preventDefault();
      evt.stopPropagation();

      try {
        const fullHash = await sha1Hex(pwd);
        const prefix = fullHash.slice(0, 5);
        const suffix = fullHash.slice(5);

        const resp = await queryHIBPRange(prefix);

        if (!resp || !resp.success) {
          createBlockModal("⚠️ SecureAuth could not verify password safety (network error). Submission BLOCKED.");
          return;
        }

        const suffixSet = parseRangeTextToSet(resp.rangeText || "");
        const found = suffixSet.has(suffix.toUpperCase());

        if (found) {
          createBlockModal(
            "⚠️ Your password is found in known breaches.\nSubmission has been BLOCKED permanently."
          );
          return; // BLOCK permanently
        }

        // Otherwise password is safe → submit
        if (formOrDoc instanceof HTMLFormElement) formOrDoc.submit();
        else {
          const btn = document.querySelector('button[type=submit], input[type=submit]');
          if (btn) btn.click();
        }

      } catch (err) {
        console.error("SecureAuth: Error during password check", err);

        createBlockModal("⚠️ Internal error while checking password.\nSubmission BLOCKED.");
        return;
      }
    };

    if (formOrDoc instanceof HTMLFormElement) {
      formOrDoc.addEventListener("submit", onSubmit, true);
    } else {
      document.addEventListener(
        "click",
        e => {
          if (e.target.matches('button[type="submit"], input[type="submit"]')) {
            onSubmit(new Event("submit", { bubbles: true, cancelable: true }));
          }
        },
        true
      );

      findPasswordFields().forEach(input => {
        input.addEventListener("keydown", ev => {
          if (ev.key === "Enter") 
            {
            formElement.submit(); 
           }
        });
      });
    }
  });
}

// ------------------------------
// Whitelist → Toast → Attach Interceptors
// ------------------------------
function checkWhitelistThenAttach() {
  if (shouldSkipBase()) {
    console.log("SecureAuth: Skipped by base rules.");
    return;
  }

  chrome.runtime.sendMessage({ action: "getWhitelist" }, resp => {
    const wl = resp?.whitelist || [];
    const host = window.location.hostname;

    if (wl.includes(host)) {
      console.log("SecureAuth: Whitelisted domain:", host);
      return;
    }

    console.log("SecureAuth: NOT whitelisted:", host);

    showDomainPopup(`Warning: This domain "${host}" is NOT whitelisted!`);

    attachInterceptors();
  });
}

// ------------------------------
// START
// ------------------------------
checkWhitelistThenAttach();
