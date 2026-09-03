/* Bộ nạp module thuần (không cần trình duyệt) để kiểm thử logic của từng game bằng Node.
   Dùng: const { loadGame } = require('./lib/load.js');
         const w = loadGame('cuoi-ho', ['js/lessons.js']);   // -> w.Lessons
         const w2 = loadGame('math-ninja', ['js/math.js']);   // -> w2.MathGen
   Mỗi lần gọi tạo một "window" mới có document/localStorage giả, nạp các tệp theo thứ tự. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

function makeCtx2d() {
  const grad = { addColorStop() {} };
  const target = {
    measureText(s) { return { width: String(s).length * 8, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }; },
    createLinearGradient() { return grad; },
    createRadialGradient() { return grad; },
    createPattern() { return {}; },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(0, w * h * 4)), width: w, height: h }; },
    isPointInPath() { return false; }
  };
  return new Proxy(target, {
    get(t, p) { if (p in t) return t[p]; return function () {}; },
    set(t, p, v) { t[p] = v; return true; }
  });
}

function makeElement(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    style: {}, dataset: {}, children: [], childNodes: [], attributes: {},
    classList: { add() {}, remove() {}, toggle() { return false; }, contains() { return false; } },
    hidden: false, disabled: false, textContent: '', innerHTML: '', value: '',
    width: 300, height: 150, offsetWidth: 800, offsetHeight: 600, clientWidth: 800, clientHeight: 600,
    setAttribute(k, v) { this.attributes[k] = String(v); }, getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }, removeAttribute(k) { delete this.attributes[k]; },
    appendChild(c) { this.children.push(c); return c; }, removeChild(c) { return c; }, insertBefore(c) { return c; }, replaceChildren() {}, remove() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    querySelector() { return null; }, querySelectorAll() { return []; }, closest() { return null; }, contains() { return false; },
    getContext() { return makeCtx2d(); }, toDataURL() { return 'data:,'; },
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }; },
    focus() {}, blur() {}, click() {}, select() {}, scrollIntoView() {}
  };
  return el;
}

function makeStorage() {
  const map = new Map();
  return {
    getItem(k) { return map.has(String(k)) ? map.get(String(k)) : null; },
    setItem(k, v) { map.set(String(k), String(v)); },
    removeItem(k) { map.delete(String(k)); },
    clear() { map.clear(); },
    key(i) { return Array.from(map.keys())[i] == null ? null : Array.from(map.keys())[i]; },
    get length() { return map.size; },
    _map: map
  };
}

function makeWindow(opts) {
  opts = opts || {};
  const listeners = {};
  const win = {
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener(t, fn) { if (listeners[t]) listeners[t] = listeners[t].filter((f) => f !== fn); },
    dispatchEvent(ev) { (listeners[ev.type] || []).slice().forEach((fn) => fn(ev)); return true; },
    _listeners: listeners,
    localStorage: opts.localStorage || makeStorage(),
    sessionStorage: makeStorage(),
    navigator: { userAgent: 'node-test', platform: 'node', language: 'vi-VN', languages: ['vi-VN'], maxTouchPoints: 0, onLine: true, serviceWorker: undefined },
    location: { protocol: 'https:', hostname: 'localhost', host: 'localhost', href: 'https://localhost/', origin: 'https://localhost', pathname: '/', search: '', hash: '' },
    innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1, screen: { width: 1024, height: 768 },
    matchMedia() { return { matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }; },
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
    performance: { now: () => Number(process.hrtime.bigint() / 1000000n) },
    console,
    alert() {}, confirm() { return true; }, prompt() { return null; },
    getComputedStyle() { return { getPropertyValue() { return ''; } }; },
    speechSynthesis: undefined, SpeechSynthesisUtterance: undefined, AudioContext: undefined, webkitAudioContext: undefined,
    Image: function () { return makeElement('img'); }, Path2D: function () {}, OffscreenCanvas: undefined, caches: undefined, fetch: undefined
  };
  win.document = {
    createElement: (t) => makeElement(t),
    createElementNS: (ns, t) => makeElement(t),
    createTextNode: (s) => ({ textContent: String(s) }),
    createDocumentFragment: () => makeElement('fragment'),
    getElementById: () => makeElement('div'),
    querySelector: () => makeElement('div'),
    querySelectorAll: () => [],
    body: makeElement('body'), documentElement: makeElement('html'), head: makeElement('head'),
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    readyState: 'complete', hidden: false, visibilityState: 'visible', title: '',
    fonts: { load() { return Promise.resolve([]); }, ready: Promise.resolve() },
    activeElement: null
  };
  win.window = win; win.self = win; win.top = win; win.parent = win;
  return win;
}

/** Nạp các tệp JS của một game vào một window giả và trả về window đó. */
function loadGame(dir, files, opts) {
  const win = makeWindow(opts);
  const ctx = vm.createContext(win);
  (files || []).forEach((f) => {
    const file = path.join(ROOT, dir, f);
    const code = fs.readFileSync(file, 'utf8');
    vm.runInContext(code, ctx, { filename: dir + '/' + f });
  });
  return win;
}

module.exports = { loadGame, makeWindow, makeStorage, ROOT };
