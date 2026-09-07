'use strict';
// before/after workload: real UI input, fixed RNG seed; debug object read only.
const { withGame, assertClean } = require('./lib/browser');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const mode = process.argv[2] || 'before';
const active = process.argv.includes('--active');
const compareTiger = process.argv.includes('--compare-tiger');
const ablateTigerDom = process.argv.includes('--ablate-tiger-dom');
if (!['before', 'after'].includes(mode)) throw Error('Usage: node tests/e2e/gauntlet-action-refresh.e2e.js before|after');
const tag = process.env.PERF_TAG || (active ? mode + '-active' : compareTiger ? mode + '-tiger-check' : mode);
if (!/^[a-z0-9_-]+$/i.test(tag)) throw Error('Invalid PERF_TAG');
const out = path.join(__dirname, 'out/gauntlet/action-refresh', tag);
fs.mkdirSync(out, { recursive: true });
const seed = 3060906;
const initScript = `(() => { let s=${seed}; Math.random=()=>{s=(Math.imul(1664525,s)+1013904223)>>>0; return s/4294967296;}; window.__gauntletLongTasks=[]; try { new PerformanceObserver(l=>window.__gauntletLongTasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true}); } catch(e){} })();`;
const env = { date: new Date().toISOString(), mode, seed, node: process.version, platform:process.platform,
  release:os.release(), cpu:os.cpus()[0].model, logicalCPUs:os.cpus().length, memoryGB:Math.round(os.totalmem()/2**30),
  git:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), dpr:1,
  note:'Local Chromium headless, no CPU/network throttling, one run per viewport. RAF interval is scheduling/render cadence, not an isolated GPU benchmark. Concurrent host work may affect timings. RNG seed fixed; visual RNG consumption depends on frame cadence.' };
const metrics = r => Object.fromEntries(r.metrics.map(x=>[x.name,x.value]));
const quantile = (xs,p) => [...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))];
(async()=>{
 const all=[];
 for(const game of (active ? ['xe-tang-thoi-gian'] : compareTiger ? ['cuoi-ho'] : ['xe-tang-thoi-gian','cuoi-ho'])) for(const viewport of [{width:390,height:844},{width:1180,height:820}].filter(v=>!process.env.PERF_WIDTH||v.width===Number(process.env.PERF_WIDTH))) {
  const key=`${game}-${viewport.width}x${viewport.height}`;
  const result=await withGame(game,async({page,context,log})=>{
   if(active || compareTiger) {
    if(ablateTigerDom) await page.route('**/cuoi-ho/js/game.js',route=>{
     const body=fs.readFileSync(path.join(__dirname,'../../cuoi-ho/js/game.js'),'utf8').replace('ui.learnContinue.disabled = G.learnT < 0.9;', 'if (ui.learnContinue.disabled && G.learnT >= 0.9) ui.learnContinue.disabled = false;');
     return route.fulfill({status:200,contentType:'application/javascript',body});
    });
    if(mode==='before') await page.route(`**/${game}/**`,async route=>{
     let rel=new URL(route.request().url()).pathname.slice(1);if(rel.endsWith('/'))rel+='index.html';
     const type=({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(rel)]||'application/octet-stream';
     await route.fulfill({status:200,contentType:type,body:execFileSync('git',['show','a1f0458:'+rel])});
    });
    await page.reload();await page.waitForTimeout(400);
   }
   const cdp=await context.newCDPSession(page); await cdp.send('Performance.enable');
   const environment={...env,browser:context.browser().version(),viewport};
   const load=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0]; return {domContentLoaded:n.domContentLoadedEventEnd,load:n.loadEventEnd,responseEnd:n.responseEnd,resourceCount:performance.getEntriesByType('resource').length,longTasks:window.__gauntletLongTasks};});
   await page.locator('#btn-play').click();
   await page.getByText(game==='cuoi-ho'?'Màn 1: Giờ đúng':'Giờ đúng',{exact:true}).first().click();
   if(game==='cuoi-ho') {
    for(let n=0;n<8&&!(await page.locator('#btn-lesson-start').isVisible());n++) await page.locator('#btn-slide-next').click();
    await page.locator('#btn-lesson-start').click();
    await page.waitForFunction(()=>window.__CuoiHo.G.state==='playing'&&window.__CuoiHo.G.phase==='choose');
   } else {
    await page.locator('#btn-lesson-play').click();
    await page.waitForFunction(()=>window.__XeTang.G.state==='playing'&&window.__XeTang.G.phase==='ask'&&window.__XeTang.G.robots.length>0);
   }
   await page.screenshot({path:path.join(out,`${key}-ready.png`)});
   const action=await page.evaluate(({game,active})=>{
    if(game==='cuoi-ho'){const g=window.__CuoiHo.G;const q=g.gates[g.gateIdx].q;return {kind:'wrong-ring',key:String((q.answer+1)%3+1),question:q.key,correct:q.answer};}
    const g=window.__XeTang.G;return {kind:active?'drive-and-correct-shot':'drive-and-fire',key:active?String(g.robots.find(r=>r.opt.ok).idx+1):'1',question:g.q&&g.q.key,robotCount:g.robots.length,time:g.time};
   },{game,active});
   await page.evaluate(()=>{window.__disabledWrites=0;const b=document.getElementById('btn-learn-continue');if(b)new MutationObserver(ms=>window.__disabledWrites+=ms.length).observe(b,{attributes:true,attributeFilter:['disabled']});});
   const cpuBefore=metrics(await cdp.send('Performance.getMetrics'));
   const framePromise=page.evaluate(()=>new Promise(resolve=>{const times=[];const start=performance.now();function tick(t){times.push(t);if(times.length<121)requestAnimationFrame(tick);else resolve({start,end:performance.now(),deltas:times.slice(1).map((t,i)=>t-times[i]),longTasks:window.__gauntletLongTasks.filter(x=>x.start>=start)});}requestAnimationFrame(tick);}));
   if(game==='xe-tang-thoi-gian') {await page.keyboard.down('d');await page.waitForTimeout(180);await page.keyboard.up('d');}
   await page.keyboard.press(action.key);
   const frame=await framePromise;
   const cpuAfter=metrics(await cdp.send('Performance.getMetrics'));
   const state=await page.evaluate(game=>{const g=(game==='cuoi-ho'?window.__CuoiHo:window.__XeTang).G;return {state:g.state,phase:g.phase,time:g.time,clockZoom:!!g.clockZoom,readingHold:!!g.readingHold,score:g.score,hearts:g.hearts,correct:g.correct,gateIdx:g.gateIdx,tank:g.tank?{x:g.tank.x,angle:g.tank.angle,trackPh:g.tank.trackPh}:null};},game);
   if(active && (state.clockZoom || state.correct!==1 || state.time<=action.time)) throw Error('Active workload did not advance and score a correct shot');
   const report={environment,load,action,state,ablateTigerDom,disabledWrites:await page.evaluate(()=>window.__disabledWrites),frames:{count:frame.deltas.length,totalMs:frame.end-frame.start,meanMs:frame.deltas.reduce((a,b)=>a+b,0)/frame.deltas.length,p50Ms:quantile(frame.deltas,.5),p95Ms:quantile(frame.deltas,.95),maxMs:Math.max(...frame.deltas),over33ms:frame.deltas.filter(x=>x>33.34).length,intervalsMs:frame.deltas,longTasks:frame.longTasks},cpu:{taskMs:1000*(cpuAfter.TaskDuration-cpuBefore.TaskDuration),scriptMs:1000*(cpuAfter.ScriptDuration-cpuBefore.ScriptDuration),layoutMs:1000*(cpuAfter.LayoutDuration-cpuBefore.LayoutDuration),recalcStyleMs:1000*(cpuAfter.RecalcStyleDuration-cpuBefore.RecalcStyleDuration)},log};
   await page.screenshot({path:path.join(out,`${key}-after-action.png`)});
   fs.writeFileSync(path.join(out,`${key}.json`),JSON.stringify(report,null,2));all.push(report);
   console.log(key,JSON.stringify({load:load.load,meanMs:report.frames.meanMs,p95Ms:report.frames.p95Ms,maxMs:report.frames.maxMs,cpuTaskMs:report.cpu.taskMs,action,state}));
  },{viewport,initScript,contextOptions:{deviceScaleFactor:1,serviceWorkers:'block'}});
  assertClean(result,key);
 }
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(all,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
