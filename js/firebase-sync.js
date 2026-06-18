/* =====================================================================
   BugBuster Pro — js/firebase-sync.js
   Thin Firebase Realtime Database mirror over localStorage.
   - Mirrors every key in SYNC_KEYS to store/<key>
   - Listens for remote changes and writes them back to localStorage,
     then dispatches a 'bb:sync' event so open pages re-render.
   - GRACEFUL FALLBACK: if FIREBASE_CONFIG is blank or the SDK is absent,
     the app runs entirely on localStorage. Nothing here throws.
   ===================================================================== */

/* 1) PASTE YOUR FIREBASE CONFIG HERE to enable cross-device sync.
      Leave the values blank to run in localStorage-only mode. */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA3rDamiKJrubkLN--ce8yw18B6BDzlBXI",
  authDomain: "bugbuster-3a7bd.firebaseapp.com",
  databaseURL: "https://bugbuster-3a7bd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bugbuster-3a7bd",
  storageBucket: "bugbuster-3a7bd.firebasestorage.app",
  messagingSenderId: "1004242517621",
  appId: "1:1004242517621:web:620fbc770f5659cd6dc23c"
};

/* 2) The keys mirrored to Firebase (all use the bb_ prefix). */
const SYNC_KEYS = [
  "bb_customers",
  "bb_bookings",
  "bb_appointments",
  "bb_reports",
  "bb_feedback",
  "bb_technicians",
  "bb_inventory",
  "bb_ledger",
  "bb_notifs",
  "bb_store_status"
];

const Sync = (() => {
  let db = null;
  let enabled = false;
  let applyingRemote = false; // guard so remote writes don't echo back

  function configured() {
    return !!(FIREBASE_CONFIG.databaseURL && FIREBASE_CONFIG.apiKey);
  }

  function init() {
    if (!configured()) {
      console.info("[BugBuster] Firebase not configured — running localStorage-only.");
      return false;
    }
    if (typeof firebase === "undefined" || !firebase.initializeApp) {
      console.warn("[BugBuster] Firebase SDK not loaded — running localStorage-only.");
      return false;
    }
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.database();
      enabled = true;
      pushAllLocalToCloud();   // seed cloud from this device if it has data
      listenAll();             // then keep both directions in sync
      console.info("[BugBuster] Firebase sync ON.");
      return true;
    } catch (e) {
      console.warn("[BugBuster] Firebase init failed — localStorage-only.", e);
      enabled = false;
      return false;
    }
  }

  /* Push one key's value up to store/<key>. Called by Storage._set. */
  function push(key, value) {
    if (!enabled || applyingRemote || SYNC_KEYS.indexOf(key) === -1) return;
    try {
      db.ref("store/" + key).set(value);
    } catch (e) {
      console.warn("[BugBuster] push failed for " + key, e);
    }
  }

  function pushAllLocalToCloud() {
    SYNC_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { db.ref("store/" + key).set(JSON.parse(raw)); } catch (_) {}
      }
    });
  }

  function listenAll() {
    SYNC_KEYS.forEach((key) => {
      db.ref("store/" + key).on("value", (snap) => {
        const val = snap.val();
        if (val === null) return;
        applyingRemote = true;
        try {
          localStorage.setItem(key, JSON.stringify(val));
          window.dispatchEvent(new CustomEvent("bb:sync", { detail: { key } }));
        } finally {
          applyingRemote = false;
        }
      });
    });
  }

  return { init, push, configured, get enabled() { return enabled; } };
})();

window.Sync = Sync;
document.addEventListener("DOMContentLoaded", Sync.init);
