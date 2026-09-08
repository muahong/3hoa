'use strict';
// Fresh contexts; real pointer/keyboard inputs. Debug objects are read only.
const fs = require('fs'), path = require('path'), http = require('http');
let pw; try { pw = require('playwright'); } catch { pw = require('C:/Users/son.nguyen/AppData/Roaming/Python/Python312/site-packages/playwright/driver/package'); }
const root = path.resolve(__dirname, '../..');
const out = path.join(__dirname, 'out/gauntlet/baseline-three'); fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req,res) => { let p = decodeURIComponent(req.url.split('?')[0]); if(p.endsWith('/')) p+='index.html'; const f=path.join(root,p); fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type': ({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'})[path.extname(f)] || 'application/octet-stream'});res.end(e?'Not found':b);}); });
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r)); const browser=await pw.chromium.launch(); const results=[];
 try { for(const game of ['math-ninja','cuu-chuong','thap-dong-ho']) for(const mode of ['desktop','mobile']) {
 const context=await browser.newContext({viewport: mode==='mobile'?{width:390,height:844}:{width:1180,height:820},hasTouch:mode==='mobile',isMobile:mode==='mobile',locale:'vi-VN'});
 const page=await context.newPage(); const record={game,mode,errors:[],actions:[]}; results.push(record); page.on('pageerror',e=>record.errors.push(String(e)));
 const shot=async name=>page.screenshot({path:path.join(out,`${game}-${mode}-${name}.png`)});
 try {
 await page.goto(`http://127.0.0.1:${server.address().port}/${game}/`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(700); await shot('menu');
 await page.locator('#btn-play').click(); await page.waitForTimeout(250);
 record.cards=await page.locator('.level-card').allTextContents();
 await page.locator('.level-card').first().click();
 if(game==='thap-dong-ho') {await page.waitForTimeout(300);await shot('lesson');await page.locator('#btn-lesson-start').click();}
 await page.waitForTimeout(4100);
 record.text=await page.locator('body').innerText(); await shot('gameplay');
 record.geometry=await page.evaluate(()=>({w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,small:[...document.querySelectorAll('button,a')].filter(e=>e.getClientRects().length && getComputedStyle(e).visibility!=='hidden').map(e=>{const r=e.getBoundingClientRect();return {id:e.id,text:e.textContent.trim().slice(0,40),w:r.width,h:r.height}}).filter(x=>x.w<44||x.h<44)}));
 if(game==='math-ninja') {
  for(let i=0;i<3;i++) {
   await page.waitForFunction(()=>{const g=window.__NinjaToan.G;return g.fruits.some(f=>f.kind==='fruit'&&f.launched&&!f.dead&&f.y>180&&f.y<g.H-80)},null,{timeout:8000});
   const f=await page.evaluate(()=>{const g=window.__NinjaToan.G;return g.fruits.find(f=>f.kind==='fruit'&&f.launched&&!f.dead&&f.y>180&&f.y<g.H-80)});
   if(mode==='mobile') {const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:f.x-20,y:f.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:f.x+20,y:f.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();} else {await page.mouse.move(f.x-20,f.y);await page.mouse.down();await page.mouse.move(f.x+20,f.y,{steps:3});await page.mouse.up();}record.actions.push(mode==='mobile'?'touch swipe visible fruit':'mouse swipe visible fruit');await page.waitForTimeout(1400);
  }
 } else if(game==='cuu-chuong') {
  await page.locator('[data-key="1"]')[mode==='mobile'?'tap':'click']();await page.locator('[data-key="fire"]')[mode==='mobile'?'tap':'click']();record.actions.push('1 then fire');await page.waitForTimeout(350);await shot('wrong');
  await page.locator('#btn-hint')[mode==='mobile'?'tap':'click']();record.actions.push('hint');await page.waitForTimeout(500);
 } else {
  if(mode==='mobile'){const b=await page.evaluate(()=>window.__ThapDongHo.G.board);await page.touchscreen.tap(b.x+b.cell/2,b.y+b.cell*3);await page.touchscreen.tap(b.x+b.cell/2,b.y+b.cell*3);record.actions.push('touch column 1 twice');}else{await page.keyboard.press('1');await page.keyboard.press('Space');record.actions.push('keyboard column 1 and drop');}await page.waitForTimeout(650);await shot('feedback');
 }
 await shot('after-input');record.end=await page.evaluate(()=>{const x=window.__NinjaToan||window.__CuuChuong||window.__ThapDongHo;return {state:x.G.state,score:x.G.score,correct:x.G.correct,wrong:x.G.wrong}});
 }catch(e){record.failure=String(e);await shot('failure');} finally {console.log(JSON.stringify(record));await context.close();fs.writeFileSync(path.join(out,'observations.json'),JSON.stringify(results,null,2));}
 } }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
