'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {withGame,assertClean}=require('./lib/browser');
const out=path.join(__dirname,'out/gauntlet/tank-reading');fs.mkdirSync(out,{recursive:true});
const state=page=>page.evaluate(()=>{const g=window.__XeTang.G;return {state:g.state,phase:g.phase,time:g.time,q:g.q&&g.q.key,i:g.qIndex,wrong:g.qWrongs,score:g.score,hearts:g.hearts,hold:g.readingHold,zoom:g.clockZoom,hint:g.hint,pause:g.readingPause,robots:g.robots.map(r=>({idx:r.idx,x:r.x,y:r.y,state:r.state,dead:r.dead,ok:r.opt.ok,hint:r.hint})),text:document.getElementById('clock-zoom-teaching').textContent};});
async function fire(page,correct,touch){const s=await state(page);const r=s.robots.find(r=>!r.dead&&r.state!=='wrong'&&r.ok===correct);assert.ok(r);if(touch)await page.touchscreen.tap(r.x,r.y);else await page.keyboard.press(String(r.idx+1));}
async function ack(page){await page.locator('#btn-clock-close').click();assert.equal((await state(page)).hold,false);}
(async()=>{for(const viewport of [{width:390,height:844},{width:1180,height:820},{width:820,height:1180},{width:844,height:390}]){
 const key=String(viewport.width);const events=[];const log=await withGame('xe-tang-thoi-gian',async({page})=>{
 const shot=n=>page.screenshot({path:path.join(out,`${key}-${n}.png`)});
 await page.locator('#btn-play').click();await page.getByText('Giờ đúng',{exact:true}).first().click();await page.locator('#btn-lesson-play').click();await page.waitForFunction(()=>window.__XeTang.G.state==='playing'&&window.__XeTang.G.phase==='ask');await page.waitForTimeout(350);
 await fire(page,false,viewport.width===390);await page.waitForFunction(()=>window.__XeTang.G.readingHold);const first=await state(page);assert.equal(first.wrong,1);assert.equal(first.hint,false);assert.ok(first.robots.every(r=>!r.hint),'first wrong never marks the right robot');
 await page.keyboard.down('Enter'); // guard rejects acknowledgement inherited immediately after choice
 await page.waitForTimeout(800);await page.keyboard.down('Enter');await page.keyboard.up('Enter');assert.equal((await state(page)).hold,true,'held Enter repeat cannot acknowledge');
 await page.mouse.click(2,2);assert.equal((await state(page)).hold,true,'backdrop cannot acknowledge feedback');
 await page.waitForTimeout(10200);const held=await state(page);assert.equal(held.time,first.time);assert.equal(held.q,first.q);assert.equal(held.score,first.score);assert.equal(held.hearts,first.hearts);assert.deepEqual(held.robots,first.robots);assert.equal(held.text,first.text);await shot('wrong-held');events.push({event:'first-wrong-held-11s',first,held});
 // Real pause key retains the reading dialog, then routes acknowledgement to the pause panel.
 await page.keyboard.press('Escape');assert.equal((await state(page)).hold,true);assert.equal((await state(page)).pause,true);
 const orig=page.viewportSize();await page.setViewportSize({width:640,height:360});await page.waitForTimeout(200);assert.equal((await state(page)).time,first.time);await shot('reading-360');
 const bounds=await page.locator('#btn-clock-close').boundingBox();assert.ok(bounds&&bounds.height>=44&&bounds.y>=0&&bounds.y+bounds.height<=360,'ack control visible in 360px landscape');events.push({event:'360-bounds',bounds});
 await ack(page);assert.equal((await state(page)).state,'paused');await page.keyboard.press('Escape');await page.setViewportSize(orig);await page.waitForTimeout(200);
 await fire(page,false,false);await page.waitForFunction(()=>window.__XeTang.G.readingHold);const second=await state(page);assert.equal(second.wrong,2);assert.equal(second.hint,true);assert.ok(second.robots.some(r=>r.ok&&r.hint));await shot('second-wrong-hint');await ack(page);
 const before=await state(page);await fire(page,true,false);await page.waitForFunction(()=>window.__XeTang.G.qIndex>0);assert.equal((await state(page)).score-before.score,20,'second-wrong hint keeps 20 point reward');
 await page.waitForFunction(()=>window.__XeTang.G.phase==='ask');await page.locator('#btn-hint').click();const manual=await state(page);assert.equal(manual.hold,true);await page.waitForTimeout(1500);assert.equal((await state(page)).time,manual.time);assert.equal((await state(page)).text,manual.text);await shot('manual-hint-held');await ack(page);const beforeManual=await state(page);await fire(page,true,viewport.width===390);await page.waitForFunction(()=>window.__XeTang.G.qIndex>1);assert.equal((await state(page)).score-beforeManual.score,20,'manual hint keeps 20 point reward');
 // One complete legitimate round/quiz is enough for this bounded fix; all four viewports exercise reading.
 if(viewport.width===390){
  for(let n=0;n<80;n++){const s=await state(page);if(s.state==='over')break;if(s.hold){await ack(page);continue;}if(s.phase==='ask')await fire(page,true,true);await page.waitForTimeout(650);}
  assert.equal((await state(page)).state,'over');await page.locator('#btn-quiz').waitFor({state:'visible'});await shot('result');await page.locator('#btn-quiz').click();
  for(let n=0;n<4;n++){const i=await page.evaluate(()=>window.__XeTang.G.quiz.cur.options.findIndex(o=>o.ok));await page.keyboard.press(String(i+1));await page.locator('#btn-quiz-next').click();}
  assert.equal(await page.locator('#quiz-done').isVisible(),true);await shot('quiz-done');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('xe-tang-thoi-gian-v1')));assert.equal(saved.players.p1.progress.l1.passed,true);assert.equal(saved.players.p1.progress.l1.quizBest,4);await page.reload();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('xe-tang-thoi-gian-v1')).players),saved.players);events.push({event:'full-round-quiz-reload',saved});
 }
 fs.writeFileSync(path.join(out,`${key}-evidence.json`),JSON.stringify(events,null,2));
 },{viewport});assertClean(log,`reading ${key}`);console.log('READING OK',key);
}})().catch(e=>{console.error(e);process.exitCode=1;});
