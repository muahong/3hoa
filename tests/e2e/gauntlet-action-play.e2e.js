'use strict';
// Legitimate UI playthrough; state reads select a known answer, never mutate gameplay.
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {withGame,assertClean}=require('./lib/browser');
const out=path.join(__dirname,'out/gauntlet/action-refresh/play');fs.mkdirSync(out,{recursive:true});
const widths=process.env.WIDTH?[Number(process.env.WIDTH)]:[390,1180,820,844];
const size={390:844,1180:820,820:1180,844:390,640:360};
const games=process.env.GAME?[process.env.GAME]:['xe-tang-thoi-gian','cuoi-ho'];
const initScript=`(()=>{let s=3060906;Math.random=()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};})();`;
const read=(page,game)=>page.evaluate(game=>{const X=game==='cuoi-ho'?window.__CuoiHo:window.__XeTang,g=X.G;return {s:g.state,p:g.phase,i:game==='cuoi-ho'?g.gateIdx:g.qIndex,time:g.time,score:g.score,hearts:g.hearts,wrong:g.wrong,correct:g.correct,zoom:g.clockZoom,learnT:g.learnT,q:game==='cuoi-ho'?(g.gates[g.gateIdx]||{}).q:g.q,tank:g.tank?{x:g.tank.x,vx:g.tank.vx,trackPh:g.tank.trackPh,angle:g.tank.angle,recoil:g.tank.recoil,aim:g.tank.aimRobot&&g.tank.aimRobot.idx}:null,robots:game==='cuoi-ho'?[]:g.robots.map(r=>({x:r.x,y:r.y,idx:r.idx,ok:r.opt.ok,state:r.state,dead:r.dead})),ring:game==='cuoi-ho'&&g.gates[g.gateIdx]?{x:g.gates[g.gateIdx].wx-g.scroll,ys:g.laneY}:null};},game);
async function start(page,game){await page.locator('#btn-play').click();await page.getByText(game==='cuoi-ho'?'Màn 1: Giờ đúng':'Giờ đúng',{exact:true}).first().click();if(game==='cuoi-ho'){for(let n=0;n<8&&!(await page.locator('#btn-lesson-start').isVisible());n++)await page.locator('#btn-slide-next').click();await page.locator('#btn-lesson-start').click();}else await page.locator('#btn-lesson-play').click();await page.waitForFunction(game=>{const g=(game==='cuoi-ho'?window.__CuoiHo:window.__XeTang).G;return g.state==='playing'&&g.phase===(game==='cuoi-ho'?'choose':'ask');},game);}
async function choose(page,game,st,wrong,touch){if(game==='cuoi-ho'){const idx=wrong?(st.q.answer+1)%3:st.q.answer;if(touch)await page.touchscreen.tap(st.ring.x,st.ring.ys[idx]);else await page.keyboard.press(String(idx+1));}else{const r=st.robots.find(r=>!r.dead&&r.state!=='wrong'&&r.ok===!wrong);assert.ok(r);if(touch)await page.touchscreen.tap(r.x,r.y);else await page.keyboard.press(String(r.idx+1));}}
(async()=>{for(const game of games)for(const width of widths){const key=`${game}-${width}`;const evidence=[];const log=await withGame(game,async({page,context})=>{
 const shot=async name=>page.screenshot({path:path.join(out,`${key}-${name}.png`)});
 await start(page,game);await shot('gameplay');
 let st=await read(page,game);evidence.push({event:'start',st});
 // Pause is a user action; phase and learning progress must survive.
 await page.locator('#btn-pause').click();const pause=await read(page,game);await page.waitForTimeout(400);const held=await read(page,game);assert.equal(held.time,pause.time);await page.keyboard.press('Escape');
 let zoomed=false,wrongDone=false,learnChecked=false;
 for(let guard=0;guard<180;guard++){
  st=await read(page,game);if(st.s==='over')break;
  if(game==='xe-tang-thoi-gian'&&await page.evaluate(()=>window.__XeTang.G.readingHold)){await page.locator('#btn-clock-close').click();continue;}
  if(game==='cuoi-ho'&&st.p==='learn'){
   if(!learnChecked){const snapshot=st;await shot('learn');await page.waitForTimeout(10200);const held=await read(page,game);assert.equal(held.i,snapshot.i);assert.equal(held.hearts,snapshot.hearts);assert.equal(held.score,snapshot.score);assert.equal(held.p,'learn');await page.touchscreen.tap(15,Math.min(size[width]-55,300));assert.equal((await read(page,game)).p,'learn','outside touch must not dismiss learning');
    const original=page.viewportSize();await page.setViewportSize({width:640,height:360});await page.waitForTimeout(200);const b=await page.locator('#btn-learn-continue').boundingBox();assert.ok(b&&b.height>=44&&b.y>=0&&b.y+b.height<=360);await shot('learn-360');await page.setViewportSize(original);await page.waitForTimeout(200);learnChecked=true;evidence.push({event:'learn-held-10s',st:held});
   }
   if(width===390)await page.locator('#btn-learn-continue').tap();else await page.keyboard.press('Enter');await page.waitForTimeout(250);continue;
  }
  if(st.p!==(game==='cuoi-ho'?'choose':'ask')){await page.waitForTimeout(100);continue;}
  if(game==='xe-tang-thoi-gian'&&!zoomed&&await page.locator('#btn-clock-zoom').isVisible()){
   await page.keyboard.down('d');await page.waitForTimeout(100);await page.locator('#btn-clock-zoom').tap();await page.keyboard.up('d');const frozen=await read(page,game);await page.waitForTimeout(600);const frozen2=await read(page,game);assert.equal(frozen2.time,frozen.time);assert.deepEqual(frozen2.robots,frozen.robots);assert.equal(frozen2.hearts,frozen.hearts);assert.equal(frozen2.score,frozen.score);await shot('zoom');
   const face=await page.locator('#clock-zoom-visual canvas').first().boundingBox();assert.ok(face&&face.width>=160&&face.height>=160);await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.getElementById('clock-zoom').contains(document.activeElement)),true);await page.keyboard.press('Escape');assert.equal((await read(page,game)).zoom,false);
   await page.keyboard.press('z');await page.locator('#btn-clock-close').tap();assert.equal((await read(page,game)).zoom,false);
   await page.keyboard.press('z');await page.mouse.click(2,2);assert.equal((await read(page,game)).zoom,false);
   const old=page.viewportSize();await page.keyboard.press('z');await page.setViewportSize({width:844,height:390});await page.waitForTimeout(150);assert.equal((await read(page,game)).time,(await read(page,game)).time);await shot('zoom-landscape');await page.locator('#btn-clock-close').click();await page.setViewportSize(old);await page.waitForTimeout(200);zoomed=true;
  }
  st=await read(page,game);
  if(!wrongDone){await choose(page,game,st,true,width===390);wrongDone=true;await page.waitForTimeout(game==='cuoi-ho'?180:50);await shot('motion-start');await page.waitForTimeout(game==='cuoi-ho'?220:100);await shot('motion-air-or-shot');await page.waitForTimeout(game==='cuoi-ho'?260:300);await shot('motion-landing-or-hit');await page.waitForTimeout(500);continue;}
  await choose(page,game,st,false,width===390||width===820);await page.waitForTimeout(game==='cuoi-ho'?1000:700);
 }
 st=await read(page,game);assert.equal(st.s,'over','legitimate round completed');assert.ok(st.wrong>=1);assert.ok(st.correct>=7);if(game==='xe-tang-thoi-gian')assert.ok(zoomed);
 await page.locator('#btn-quiz').waitFor({state:'visible'});await shot('result');evidence.push({event:'result',st});await page.locator('#btn-quiz').click();
 let quizWrong=false;
 for(let n=0;n<18;n++){
  if(await page.locator('#quiz-done').isVisible())break;
  const q=await page.evaluate(game=>game==='cuoi-ho'?{i:window.__CuoiHo.Quiz.i,answer:window.__CuoiHo.Quiz.list[window.__CuoiHo.Quiz.i].answer}: {i:window.__XeTang.G.quiz.i,answer:window.__XeTang.G.quiz.cur.options.findIndex(o=>o.ok)},game);
  if(!quizWrong){await page.keyboard.press(String((q.answer+1)%3+1));quizWrong=true;await shot('quiz-wrong');if(game==='cuoi-ho'){await page.locator('#btn-quiz-retry').click();const corrected=await page.evaluate(()=>window.__CuoiHo.Quiz.list[window.__CuoiHo.Quiz.i].answer);await page.keyboard.press(String(corrected+1));}}
  else await page.keyboard.press(String(q.answer+1));
  await page.locator('#btn-quiz-next').click();
 }
 assert.equal(await page.locator('#quiz-done').isVisible(),true);await shot('quiz-done');
 const saved=await page.evaluate(game=>JSON.parse(localStorage.getItem(game+'-v1')),game);fs.writeFileSync(path.join(out,`${key}-saved.json`),JSON.stringify(saved,null,2));
 await page.reload();const reloaded=await page.evaluate(game=>JSON.parse(localStorage.getItem(game+'-v1')),game);assert.deepEqual(reloaded.players,saved.players,'progress survives reload');
 await start(page,game);assert.equal((await read(page,game)).s,'playing','replay through UI');await page.locator('#btn-pause').click();await shot('retry-paused');
 evidence.push({event:'persist-and-retry',saved});fs.writeFileSync(path.join(out,`${key}-evidence.json`),JSON.stringify(evidence,null,2));
},{viewport:{width,height:size[width]},initScript,reducedMotion:width===820?'reduce':'no-preference'});assertClean(log,key);console.log('UI COMPLETE',key);}})().catch(e=>{console.error(e);process.exitCode=1;});
