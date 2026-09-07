'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {withGame,assertClean}=require('./lib/browser');
const out=path.join(__dirname,'out/gauntlet/action-refresh/motion');fs.mkdirSync(out,{recursive:true});
(async()=>{for(const game of ['xe-tang-thoi-gian','cuoi-ho'])for(const width of [390,1180]){
 const key=`${game}-${width}`;const log=await withGame(game,async({page})=>{
 await page.locator('#btn-play').click();await page.getByText(game==='cuoi-ho'?'Màn 1: Giờ đúng':'Giờ đúng',{exact:true}).first().click();
 if(game==='cuoi-ho'){for(let n=0;n<8&&!(await page.locator('#btn-lesson-start').isVisible());n++)await page.locator('#btn-slide-next').click();await page.locator('#btn-lesson-start').click();}else await page.locator('#btn-lesson-play').click();
 await page.waitForFunction(game=>{const g=(game==='cuoi-ho'?window.__CuoiHo:window.__XeTang).G;return g.state==='playing'&&g.phase===(game==='cuoi-ho'?'choose':'ask');},game);
 await page.waitForTimeout(350);
 const input=await page.evaluate(game=>{if(game==='cuoi-ho'){const g=window.__CuoiHo.G;return {key:String(g.gates[g.gateIdx].q.answer+1),i:g.gateIdx};}const g=window.__XeTang.G,r=g.robots.find(r=>r.opt.ok);return {key:String(r.idx+1),i:g.qIndex,target:{x:r.x,y:r.y,idx:r.idx}};},game);
 const tracePromise=page.evaluate(game=>new Promise(resolve=>{const samples=[];function frame(t){const g=(game==='cuoi-ho'?window.__CuoiHo:window.__XeTang).G;samples.push({t,phase:g.phase,score:g.score,hearts:g.hearts,tank:g.tank?{x:g.tank.x,y:g.tank.y,size:g.tank.size,angle:g.tank.angle,recoil:g.tank.recoil,track:g.tank.trackPh,aim:g.tank.aimRobot&&g.tank.aimRobot.idx}:null,shells:g.shells?g.shells.map(s=>({x:s.x,y:s.y,x0:s.x0,y0:s.y0,target:s.robot.idx})):null,tiger:g.tiger?{y:g.tiger.y,tilt:g.tiger.tilt,land:g.tiger.land,phase:g.tiger.phase,jumpT:g.jumpT}:null});if(samples.length<121)requestAnimationFrame(frame);else resolve(samples);}requestAnimationFrame(frame);}),game);
 if(game==='xe-tang-thoi-gian'){await page.keyboard.down('a');await page.waitForTimeout(180);await page.keyboard.up('a');}
 await page.keyboard.press(input.key);
 if(game==='xe-tang-thoi-gian')await page.keyboard.press(input.key); // rapid duplicate must not award twice
 for(const [name,delay] of [['takeoff-or-aim',50],['air-or-projectile',250],['landing-or-hit',580]]){await page.waitForTimeout(delay);await page.screenshot({path:path.join(out,`${key}-${name}.png`)});}
 const samples=await tracePromise;
 if(game==='xe-tang-thoi-gian'){assert.ok(samples.some(s=>s.shells.length===1));assert.ok(samples.every(s=>s.shells.length<=1));assert.ok(samples.some(s=>s.tank.recoil>0));assert.ok(samples[120].tank.track!==samples[0].tank.track);}else{assert.ok(samples.some(s=>s.phase==='jump'&&s.tiger.y<0));assert.ok(samples.some(s=>s.tiger.land>0));}
 fs.writeFileSync(path.join(out,`${key}-trace.json`),JSON.stringify({input,samples,note:'121 live RAF samples; keyboard input only; no game-state writes. Screenshots have capture latency and are illustrative; trace is authoritative phase evidence.'},null,2));
 },{viewport:{width,height:width===390?844:820}});assertClean(log,key);console.log('MOTION',key);
}})().catch(e=>{console.error(e);process.exitCode=1;});
