'use strict';
const { withGame, assertClean } = require('./lib/browser');
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const out = path.join(__dirname, 'out/gauntlet/maze');
fs.mkdirSync(out, { recursive: true });
const baseline = process.argv.includes('--baseline');
const baselineActive = process.argv.includes('--baseline-active');
const extraOnly = process.argv.includes('--extra-inputs');
const snapshotsOnly = process.argv.includes('--shots');
async function hudAudit() {
  const results=[];
  for(const viewport of [{width:390,height:844},{width:844,height:390},{width:780,height:360},{width:820,height:1180},{width:1180,height:820}]) for(const level of [7,8]) {
    await withGame('me-cung-dong-ho',async({page,log})=>{
      await page.click('#btn-play'); await page.click('#btn-unlock-all');
      const n=(await page.locator('#parent-gate-q').innerText()).match(/(\d+) × (\d+)/);
      await page.fill('#parent-gate-input',String(+n[1]*+n[2])); await page.locator('#parent-gate-input').press('Enter');
      await page.locator(`.level-card[data-id="l${level}"]`).click(); await page.click('#btn-lesson-play');
      await page.waitForFunction(()=>__MeCung.G.state==='playing');
      for(const phase of ['reading','route','stopped','power','rotated']) {
        if(phase==='route') {const p=await page.evaluate(()=>{const G=__MeCung.G,it=G.items[0];return{x:G.ox+(it.c+.5)*G.cell,y:G.oy+(it.r+.5)*G.cell};}); await page.touchscreen.tap(p.x,p.y);}
        if(phase==='stopped') await page.keyboard.press(' ');
        if(phase==='power') {
          const star=await page.evaluate(()=>{const G=__MeCung.G;const a=G.powers.filter(p=>!p.taken).map(p=>({p,route:Mazes.path(G.maze,G.player.from,p,G.items.filter(i=>!i.taken))})).filter(a=>a.route).sort((a,b)=>a.route.length-b.route.length)[0];return a?{x:G.ox+(a.p.c+.5)*G.cell,y:G.oy+(a.p.r+.5)*G.cell}:null;});
          assert.ok(star,'a star is reachable'); await page.touchscreen.tap(star.x,star.y); await page.waitForFunction(()=>__MeCung.G.fright>0,null,{timeout:15000}); await page.keyboard.press(' ');
        }
        if(phase==='rotated') await page.setViewportSize({width:viewport.height,height:viewport.width});
        await page.waitForTimeout(450);
        const geometry=await page.evaluate(()=>{const G=__MeCung.G,h=document.querySelector('.hud-top').getBoundingClientRect();return {w:innerWidth,h:innerHeight,boardX:G.ox,boardY:G.oy,hudRight:h.right,hudBottom:h.bottom,clock:document.querySelector('#hud-target-clock svg').getBoundingClientRect().width,rects:['hud-target','hud-target-text','btn-hud-hint','btn-hud-speak','hud-score','hud-level','move-status'].map(id=>({id,...document.getElementById(id).getBoundingClientRect().toJSON()}))};});
        const landscape=geometry.w>geometry.h&&geometry.h<=500;
        assert.ok(landscape?geometry.boardX>geometry.hudRight:geometry.boardY>geometry.hudBottom,`HUD gap l${level} ${viewport.width} ${phase}`);
        assert.ok(geometry.rects.every(r=>r.top>=0&&r.left>=0&&r.bottom<=geometry.h&&r.right<=geometry.w),`HUD clipped l${level} ${viewport.width} ${phase}: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.rects.filter(r=>r.id.startsWith('btn-')).every(r=>r.width>=44&&r.height>=44));
        assert.ok(!landscape || geometry.clock>=80,'landscape reference clock at least 80px');
        results.push({level,phase,...geometry});
        await page.screenshot({path:path.join(out,`hud-l${level}-${viewport.width}x${viewport.height}-${phase}.png`)});
      }
      assertClean(log,`HUD l${level} ${viewport.width}`);
    },{viewport,initScript:'Math.random = (() => { let s = 4206; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();'});
  }
  fs.writeFileSync(path.join(out,'hud-audit.json'),JSON.stringify(results,null,2));
}
(async () => {
  if(process.argv.includes('--hud')) {await hudAudit(); return;}
  const results = [];
  for (const viewport of [{ width: 1180, height: 820 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 820, height: 1180 }]) {
    if(extraOnly && (viewport.width===1180 || viewport.width===390)) continue;
    await withGame('me-cung-dong-ho', async ({ page, log, context }) => {
      if(baselineActive) {
        const {execFileSync}=require('child_process');
        for(const file of ['js/game.js','js/mazes.js','style.css','index.html']) {
          const body=execFileSync('git',['show',`HEAD:me-cung-dong-ho/${file}`],{cwd:path.join(__dirname,'../..'),encoding:'utf8'});
          await page.route(`**/me-cung-dong-ho/${file}`,route=>route.fulfill({body,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html'}));
        }
        await page.goto(page.url()+'index.html');
        assert.equal(await page.evaluate(()=>__MeCung.G.mazeSeed),undefined,'baseline really loaded HEAD game code');
      }
      const key = `${baselineActive ? 'before-active' : baseline ? 'before' : 'after'}-${viewport.width}`;
      await page.screenshot({ path: path.join(out, `${key}-menu.png`) });
      await page.click('#btn-play'); await page.locator('.level-card').first().click();
      await page.click('#btn-lesson-play');
      await page.waitForFunction(() => __MeCung.G.state === 'playing');
      await page.waitForTimeout(1800);
      await page.screenshot({ path: path.join(out, `${key}-gameplay.png`) });
      const result = await page.evaluate(() => ({ viewport: {w:innerWidth,h:innerHeight,dpr:devicePixelRatio}, perf: __MeCung.G.perf, cell: __MeCung.G.cell, loadMs: performance.getEntriesByType('navigation')[0].loadEventEnd }));
      results.push(result);
      if(baselineActive) {
        result.activeSamples=[];
        for(let step=0;step<10;step++) {
          const key=await page.evaluate(()=>{const G=__MeCung.G,p=G.player,d=Mazes.openDirs(G.maze,p.from.r,p.from.c).find(d=>!p.dir||d.dx!==-p.dir.dx||d.dy!==-p.dir.dy)||Mazes.openDirs(G.maze,p.from.r,p.from.c)[0];return d.dx ? d.dx>0?'ArrowRight':'ArrowLeft' : d.dy>0?'ArrowDown':'ArrowUp';});
          await page.keyboard.press(key); await page.waitForTimeout(170);
          result.activeSamples.push(await page.evaluate(()=>({perf:__MeCung.G.perf.avgFrame,score:__MeCung.G.score,moving:__MeCung.G.player.moving,state:__MeCung.G.state,lives:__MeCung.G.lives})));
        }
        result.activePerf=await page.evaluate(()=>({perf:__MeCung.G.perf,score:__MeCung.G.score,moving:__MeCung.G.player.moving,ghosts:__MeCung.G.ghosts.map(g=>g.state)}));
        await page.screenshot({path:path.join(out,`${key}-moving.png`)});
      }
      if (!baseline && !baselineActive && !snapshotsOnly) {
        const before = await page.evaluate(() => ({ lives:__MeCung.G.lives, seed:__MeCung.G.mazeSeed }));
        await page.waitForTimeout(viewport.width===1180 ? 12000 : 600);
        assert.equal(await page.evaluate(() => __MeCung.G.lives),before.lives,'reading never costs hearts');
        assert.ok(result.cell >= 30,'readable board cells');
        const blockedKey=await page.evaluate(()=>{const G=__MeCung.G,p=G.player.from,d=Mazes.DIRS.find(d=>!Mazes.isOpen(G.maze,p.r+d.dy,p.c+d.dx));return d.dx ? d.dx>0?'ArrowRight':'ArrowLeft' : d.dy>0?'ArrowDown':'ArrowUp';});
        await page.keyboard.press(blockedKey);
        assert.equal(await page.evaluate(()=>__MeCung.G.reading),true,'blocked direction does not end reading safety');
        await page.locator(`#dpad [data-dir="${blockedKey.replace('Arrow','').toLowerCase()}"]`).tap();
        assert.equal(await page.evaluate(()=>__MeCung.G.reading),true,'blocked D-pad stays safe');
        const swipeStart=await page.evaluate(()=>({x:__MeCung.G.ox+__MeCung.G.player.x*__MeCung.G.cell,y:__MeCung.G.oy+__MeCung.G.player.y*__MeCung.G.cell}));
        const delta={ArrowUp:[0,-32],ArrowDown:[0,32],ArrowLeft:[-32,0],ArrowRight:[32,0]}[blockedKey];
        const cdp=await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[swipeStart]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:swipeStart.x+delta[0],y:swipeStart.y+delta[1]}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await cdp.detach();
        assert.equal(await page.evaluate(()=>__MeCung.G.reading),true,'blocked touch swipe stays safe');
        await page.click('#btn-pause');
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.evaluate(() => __MeCung.G.player.want),null,'paused keys ignored');
        await page.click('#btn-resume');
        // Use real canvas pointer input for each answer. Reading the right answer
        // directs the test player; it never changes position, timer, lives or outcome.
        const travel = async correct => {
          const s=await page.evaluate(correct => { const G=__MeCung.G, it=G.items.find(i=>i.correct===correct&&!i.taken&&!i.wrongAt); return {x:G.ox+(it.c+.5)*G.cell,y:G.oy+(it.r+.5)*G.cell,found:G.found,wrong:G.wrong}; },correct);
          if(viewport.width===1180) await page.mouse.click(s.x,s.y); else await page.touchscreen.tap(s.x,s.y);
          if(!result.activePerf) { await page.waitForTimeout(1500); result.activePerf=await page.evaluate(()=>({perf:__MeCung.G.perf,score:__MeCung.G.score,moving:__MeCung.G.player.moving,ghosts:__MeCung.G.ghosts.map(g=>g.state)})); await page.screenshot({path:path.join(out,`${key}-moving.png`)}); }
          await page.waitForFunction(s=>__MeCung.G.found>s.found||__MeCung.G.wrong>s.wrong||__MeCung.G.state==='result',s,{timeout:20000}).catch(async e=>{ console.log('TRAVEL FAILED',await page.evaluate(()=>({state:__MeCung.G.state,p:__MeCung.G.player,route:__MeCung.G.route,reading:__MeCung.G.reading,items:__MeCung.G.items,lives:__MeCung.G.lives}))); await page.screenshot({path:path.join(out,'travel-failed.png')}); throw e; });
          assert.equal(await page.evaluate(() => __MeCung.G.state==='result'),false,'no unintended loss');
          await page.waitForTimeout(2200);
        };
        if(viewport.width===1180 || viewport.width===390) {
          await travel(false);
          assert.equal(await page.evaluate(() => __MeCung.G.wrong),1);
          await page.screenshot({path:path.join(out,`${key}-wrong-feedback.png`)});
          for(let i=0;i<4;i++) await travel(true);
          await page.waitForFunction(()=>__MeCung.G.state==='quiz');
          await page.screenshot({path:path.join(out,`${key}-quiz-after-real-play.png`)});
          result.completedByActualInput = await page.evaluate(()=>({found:__MeCung.G.found,lives:__MeCung.G.lives,wrong:__MeCung.G.wrong}));
          for(let q=0;q<8 && await page.evaluate(()=>__MeCung.G.state==='quiz');q++) {
            const answer=await page.evaluate(()=>__MeCung.G.quiz.current.answer);
            await page.locator(`#quiz-options .opt[data-i="${answer}"]`).click();
            await page.click('#btn-quiz-next');
          }
          await page.waitForFunction(()=>__MeCung.G.state==='result');
          await page.screenshot({path:path.join(out,`${key}-result.png`)});
          assert.ok(await page.evaluate(()=>__MeCung.Store.p().records.l1.passed));
          await page.click('#btn-retry'); await page.waitForFunction(()=>__MeCung.G.state==='playing');
          assert.equal(await page.evaluate(()=>__MeCung.G.lives),3);
          await page.reload();
          assert.ok(await page.evaluate(()=>__MeCung.Store.p().records.l1.passed),'reload preserves earned progress');
        } else {
          const plan=await page.evaluate(()=>{ const G=__MeCung.G,p=G.player.from;
            for(const t of G.maze.spots){const r=Mazes.path(G.maze,p,t,G.items); if(r && r.length>8 && !G.items.some(i=>i.r===t.r&&i.c===t.c)) return {start:{r:p.r,c:p.c},x:G.ox+(t.c+.5)*G.cell,y:G.oy+(t.r+.5)*G.cell};}
          });
          assert.ok(plan,'empty route for input test');
          await page.touchscreen.tap(plan.x,plan.y); await page.waitForTimeout(120);
          assert.ok(await page.evaluate(()=>!__MeCung.G.reading&&__MeCung.G.invuln>3),'viable move starts protected grace');
          const d=await page.evaluate(()=>__MeCung.G.player.dir);
          await page.keyboard.press(d.dx ? d.dx>0?'ArrowLeft':'ArrowRight' : d.dy>0?'ArrowUp':'ArrowDown');
          assert.equal(await page.evaluate(()=>__MeCung.G.route),null,'keyboard overrides tap path');
          const reversed=await page.evaluate(()=>__MeCung.G.player.want);
          assert.equal(reversed.dx+d.dx,0); assert.equal(reversed.dy+d.dy,0);
          await page.keyboard.press(' ');
          await page.touchscreen.tap(plan.x,plan.y); await page.waitForTimeout(100);
          const returnTo=await page.evaluate(p=>({x:__MeCung.G.ox+(p.c+.5)*__MeCung.G.cell,y:__MeCung.G.oy+(p.r+.5)*__MeCung.G.cell}),plan.start);
          await page.touchscreen.tap(returnTo.x,returnTo.y);
          await page.waitForTimeout(500);
          assert.equal(await page.evaluate(()=>__MeCung.G.wrong),0,'changing mind does not cross an answer');
          // Touch cancellation clears a queued destination. Pause removes it too.
          const goal=await page.evaluate(()=>{const G=__MeCung.G,it=G.items[0];return{x:G.ox+(it.c+.5)*G.cell,y:G.oy+(it.r+.5)*G.cell};});
          await page.touchscreen.tap(goal.x,goal.y); await page.waitForTimeout(100);
          await page.locator('#game').dispatchEvent('pointercancel',{pointerId:1,pointerType:'touch'});
          assert.equal(await page.evaluate(()=>__MeCung.G.route),null);
          await page.click('#btn-pause'); await page.click('#btn-resume');
          await page.setViewportSize({width:viewport.height,height:viewport.width}); await page.waitForTimeout(700);
          assert.equal(await page.evaluate(()=>__MeCung.G.mazeSeed),before.seed,'rotation preserves seed');
          await page.screenshot({path:path.join(out,`${key}-rotated.png`)});
        }
      }
      assertClean(log, key);
    }, { viewport, contextOptions:baselineActive?{serviceWorkers:'block'}:{}, initScript: 'Math.random = (() => { let s = 4206; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();' });
  }
  fs.writeFileSync(path.join(out, snapshotsOnly ? 'shots-final.json' : extraOnly ? 'extra-inputs.json' : baselineActive ? 'perf-before-active.json' : baseline ? 'perf-before.json' : 'perf-after.json'), JSON.stringify(results, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
