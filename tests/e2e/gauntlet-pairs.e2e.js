'use strict';
// Reproducible starting-state images only. No claimed game completion or performance measurement.
const { chromium } = require('playwright');
const { serve, ROOT } = require('./lib/browser');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const phase = process.argv[2];
assert.ok(['before', 'after'].includes(phase), 'usage: before|after [game...]');
const games = process.argv.slice(3).length ? process.argv.slice(3) : ['math-ninja','cuu-chuong','thap-dong-ho','xe-tang-thoi-gian','cuoi-ho'];
const out = path.join(__dirname, 'out/gauntlet/pairs');
const cache = new Map();
const oldFile = rel => {
  if (!cache.has(rel)) cache.set(rel, execFileSync('git', ['show','a1f0458:'+rel], {cwd:ROOT,stdio:['ignore','pipe','ignore']}));
  return cache.get(rel);
};
(async()=>{
  fs.mkdirSync(out,{recursive:true}); const {server,port}=await serve(); const browser=await chromium.launch(); const results=[];
  try {for(const game of games) for(const width of [390,1180]) {
    const viewport={width,height:width===390?844:820};
    const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:width===390,locale:'vi-VN',serviceWorkers:'block'});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.clock.install({time:new Date('2026-09-06T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-09-06T12:00:01Z'));
    await context.addInitScript(()=>{let s=360906;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};});
    if(phase==='before') await page.route(`**/${game}/**`,async route=>{
      const url=new URL(route.request().url());let rel=url.pathname.slice(1);if(rel.endsWith('/'))rel+='index.html';
      try {const type=({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'})[path.extname(rel)]||'application/octet-stream';await route.fulfill({status:200,contentType:type,body:oldFile(rel)});}catch{await route.fulfill({status:404,body:'missing baseline resource'});}
    });
    await page.goto(`http://127.0.0.1:${port}/${game}/`);await page.clock.runFor(500);
    const snap=async state=>page.screenshot({path:path.join(out,`${phase}-${game}-${width}-${state}.png`)});
    await snap('menu');
    const click=async sel=>{await page.locator(sel).click();await page.clock.runFor(450);};
    const sound=page.locator('#menu .toggle[data-set="sound"]');
    if(await sound.getAttribute('aria-pressed')==='true')await click('#menu .toggle[data-set="sound"]');
    await click('#btn-play');await click('.level-card:first-child');
    if(game==='cuoi-ho'){
      for(let i=0;i<10&&!(await page.locator('#btn-lesson-start').isVisible());i++)await click('#btn-slide-next');
      await click('#btn-lesson-start');
    }else if(game==='thap-dong-ho')await click('#btn-lesson-start');
    else if(game==='xe-tang-thoi-gian')await click('#btn-lesson-play');
    await page.clock.runFor(4200);
    const state=await page.evaluate(()=>{
      const X=window.__NinjaToan||window.__CuuChuong||window.__ThapDongHo||window.__XeTang||window.__CuoiHo,g=X.G;
      return {state:g.state,phase:g.phase,time:g.time,score:g.score,question:g.question||g.q||(g.piece&&g.piece.t)||(g.meteors&&g.meteors.map(m=>m.q))||(g.gates&&g.gates[g.gateIdx]&&g.gates[g.gateIdx].q)};
    });
    assert.equal(state.state,'playing');assert.deepEqual(errors,[]);await snap('gameplay');
    results.push({game,phase,viewport,dpr:1,seed:360906,controlledTime:true,state});console.log(game,width,phase,state.state);
    await context.close();
  }}finally{await browser.close();server.close();fs.writeFileSync(path.join(out,phase+'.json'),JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});
