// Independent gauntlet: real browser input only; __MeCung is read for geometry and assertions.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const out = path.join(__dirname, 'out/gauntlet/review-maze');
fs.mkdirSync(out, { recursive: true });
const log = [];
const record = (name, detail) => { log.push({ name, detail }); console.log(name, JSON.stringify(detail)); };
const state = p => p.evaluate(() => { const g = window.__MeCung.G; return { state:g.state, level:g.levelIdx, round:g.round, found:g.found, lives:g.lives, wrong:g.wrong, reading:g.reading, time:g.time, player:g.player, ghosts:g.ghosts, items:g.items, route:g.route, destination:g.destination, cell:g.cell, ox:g.ox, oy:g.oy, maze:g.maze, quiz:g.quiz }; });
async function shot(p,name){await p.screenshot({path:path.join(out,name+'.png')});}
async function enter(p){await p.goto('http://127.0.0.1:8787/me-cung-dong-ho/');await p.locator('#btn-play').click();await p.waitForTimeout(350);await p.getByText('Giờ đúng',{exact:true}).click();await p.waitForTimeout(350);await p.locator('#btn-lesson-play').click();await p.waitForFunction(()=>window.__MeCung.G.state==='playing');}
async function tapCell(p,s,q){await p.touchscreen.tap(s.ox+(q.c+.5)*s.cell,s.oy+(q.r+.5)*s.cell);}
function seedAudit(){
 const sandbox={window:{}};require('vm').runInNewContext(fs.readFileSync(path.join(__dirname,'../../me-cung-dong-ho/js/mazes.js'),'utf8'),sandbox);const m=sandbox.window.Mazes;
 let count=0,placements=0;const structures={};
 function reachable(board,start,target,blocked){const key=p=>p.r+','+p.c;const avoid=new Set(blocked.filter(p=>key(p)!==key(target)&&key(p)!==key(start)).map(key));const seen=new Set([key(start)]),q=[start];for(let i=0;i<q.length;i++){const p=q[i];if(key(p)===key(target))return true;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const n={r:p.r+dr,c:p.c+dc};if(n.r<0||n.c<0||n.r>=board.rows||n.c>=board.cols||board.wall[n.r][n.c]||seen.has(key(n))||avoid.has(key(n)))continue;seen.add(key(n));q.push(n);}}return false;}
 for(const id of ['A','B','C'])for(const compact of [true,false]){
  const hashes=new Set();for(let seed=1;seed<=250;seed++)for(const transposed of [false,true]){
   const board=m.build(id,transposed,seed,compact);count++;hashes.add(JSON.stringify(board.wall));const rotated=m.build(id,!transposed,seed,compact);assert(board.wall.every((row,r)=>row.every((v,c)=>v===rotated.wall[c][r])),'rotation same topology');
   assert(board.ghosts.every(g=>Math.abs(g.r-board.player.r)+Math.abs(g.c-board.player.c)>=6),'spawn separated');
   let rndState=seed;const rnd=()=>((rndState=(Math.imul(rndState,1664525)+1013904223)>>>0)/4294967296);
   for(const start of [board.player,board.spots[Math.floor(board.spots.length/3)],board.spots[Math.floor(board.spots.length*2/3)]])for(const n of [4,5,6]){
    const spots=m.fairSpots(board,start,n,rnd);assert(spots&&spots.length===n,`no safe placement ${id}/${compact}/${transposed}/${seed}/${n}`);placements++;
    assert(new Set(spots.map(s=>s.r+','+s.c)).size===n);for(const target of spots){assert(reachable(board,start,target,spots),'independent BFS reaches every answer');const route=m.path(board,start,target,spots);assert(route&&route.every(p=>!board.wall[p.r][p.c]));assert(route.every(p=>!spots.some(i=>(i.r!==target.r||i.c!==target.c)&&i.r===p.r&&i.c===p.c)),'route crosses answer');}
   }
  }structures[id+'-'+compact]=hashes.size;
 }
 const result={boards:count,placements,structures,failures:0};fs.writeFileSync(path.join(out,'seed-audit.json'),JSON.stringify(result,null,2));console.log(result);
}
if(process.argv.includes('--seeds')){seedAudit();process.exit(0);}
async function edgeAudit(){
 const b=await chromium.launch();const findings=[];
 for(const input of (process.argv.includes('--landscape')||process.argv.includes('--power-only')?[]:['keyboard','dpad','swipe'])){
  const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true});await enter(p);const before=await state(p);
  if(input==='keyboard')await p.keyboard.press('ArrowUp');
  if(input==='dpad')await p.locator('#dpad [data-dir="up"]').tap();
  if(input==='swipe'){
   const client=await p.context().newCDPSession(p),x=before.ox+before.player.x*before.cell,y=before.oy+before.player.y*before.cell;
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-50}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await p.waitForTimeout(6500);const after=await state(p);const passed=after.reading&&JSON.stringify(after.player.from)===JSON.stringify(before.player.from)&&JSON.stringify(after.ghosts.map(g=>g.from))===JSON.stringify(before.ghosts.map(g=>g.from));findings.push({name:'blocked-'+input,passed,before:{player:before.player.from,ghosts:before.ghosts.map(g=>g.from)},after:{reading:after.reading,player:after.player.from,ghosts:after.ghosts.map(g=>g.from)}});await shot(p,'edge-blocked-'+input);
  if(input==='keyboard')await p.keyboard.press('ArrowDown');
  if(input==='dpad')await p.locator('#dpad [data-dir="down"]').tap();
  if(input==='swipe'){
   const client=await p.context().newCDPSession(p),x=after.ox+after.player.x*after.cell,y=after.oy+after.player.y*after.cell;
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+50}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await p.waitForTimeout(100);const viable=await p.evaluate(()=>{const g=window.__MeCung.G;return{reading:g.reading,x:g.player.x,y:g.player.y,time:g.time,invuln:g.invuln,ghosts:g.ghosts.map(v=>({from:v.from,releaseAt:v.releaseAt,state:v.state}))};});findings.push({name:'viable-'+input,passed:!viable.reading&&(viable.x!==after.player.x||viable.y!==after.player.y)&&viable.invuln>=3.5&&viable.ghosts.every((g,i)=>g.releaseAt-viable.time>=3.5&&JSON.stringify(g.from)===JSON.stringify(after.ghosts[i].from)),...viable});await shot(p,'edge-viable-'+input);await p.close();
 }
 for(const level of (process.argv.includes('--extended-layout')?[7,8]:[7]))for(const [w,h] of (process.argv.includes('--extended-layout')?[[390,844],[844,390],[820,1180],[1180,820],[780,360]]:[[390,844],[844,390],[820,1180],[1180,820]])){
  if(process.argv.includes('--landscape')&&w!==844)continue;
  if(process.argv.includes('--power-only')&&!(w>h&&h<=390))continue;
  const p=await b.newPage({viewport:{width:w,height:h},hasTouch:true});await p.goto('http://127.0.0.1:8787/me-cung-dong-ho/');await p.locator('#btn-play').click();await p.waitForTimeout(350);await p.locator('#btn-unlock-all').click();const nums=(await p.locator('#parent-gate-q').innerText()).match(/(\d+) × (\d+)/);await p.locator('#parent-gate-input').fill(String(Number(nums[1])*Number(nums[2])));await p.locator('#parent-gate-input').press('Enter');await p.waitForTimeout(350);await p.getByText(level===7?'Đồng hồ điện tử':'Thời gian trôi',{exact:true}).click();await p.locator('#btn-lesson-play').click();await p.waitForFunction(()=>window.__MeCung.G.state==='playing');await p.waitForTimeout(1000);
  for(const phase of ['reading','route','stopped']){
   if(phase==='route'){let s=await state(p);await tapCell(p,s,s.items.find(i=>i.correct));}
   if(phase==='stopped')await p.keyboard.press(' ');
   await p.waitForTimeout(300);let g=await p.evaluate(()=>{const h=document.querySelector('.hud-top').getBoundingClientRect(),g=window.__MeCung.G;return{hudBottom:h.bottom,hudRight:h.right,boardX:g.ox,boardY:g.oy,cell:g.cell,controls:['hud-target','btn-hud-hint','btn-hud-speak'].map(id=>({id,...document.getElementById(id).getBoundingClientRect().toJSON()}))};});const separated=w>h&&h<=500?g.boardX>g.hudRight:g.boardY>g.hudBottom;const bounded=g.controls.every(c=>c.top>=0&&c.left>=0&&c.bottom<=h&&c.right<=w);findings.push({name:`l${level}-${w}x${h}-${phase}`,passed:separated&&bounded,separated,bounded,...g});await shot(p,`edge-l${level}-${w}x${h}-${phase}`);
  }
  if(process.argv.includes('--power-only')){
   const dest=await p.evaluate(()=>{const g=window.__MeCung.G;return g.powers.filter(t=>!t.taken).map(t=>({target:t,route:window.Mazes.path(g.maze,g.player.from,t,g.items.filter(i=>!i.taken&&!i.wrongAt))})).filter(p=>p.route).sort((a,b)=>a.route.length-b.route.length)[0]?.target;});assert(dest,'reachable power by real input');await tapCell(p,await state(p),dest);await p.waitForFunction(()=>window.__MeCung.G.fright>0,null,{timeout:15000});await p.keyboard.press(' ');await p.waitForTimeout(300);
   const data=await p.evaluate(()=>({fright:window.__MeCung.G.fright,controls:['hud-target','btn-hud-hint','btn-hud-speak','hud-power'].map(id=>({id,...document.getElementById(id).getBoundingClientRect().toJSON()})),clock:document.querySelector('#hud-target-clock svg')?.getBoundingClientRect().toJSON(),targetText:document.querySelector('#hud-target-text').innerText}));findings.push({name:`l${level}-${w}x${h}-powered`,passed:data.fright>0&&data.controls.every(c=>c.width>0&&c.height>0&&c.top>=0&&c.left>=0&&c.bottom<=h&&c.right<=w)&&data.controls.filter(c=>c.id.startsWith('btn-')).every(c=>c.width>=44&&c.height>=44)&&(!data.clock||(data.clock.width>=80&&data.clock.height>=80)),...data});await shot(p,`edge-l${level}-${w}x${h}-powered`);
  }
  const beforeRotate=await state(p);await p.setViewportSize({width:h,height:w});await p.waitForTimeout(500);const afterRotate=await state(p);const geo=await p.evaluate(()=>{const h=document.querySelector('.hud-top').getBoundingClientRect(),g=window.__MeCung.G;return{hudBottom:h.bottom,hudRight:h.right,boardX:g.ox,boardY:g.oy,cell:g.cell,controls:['hud-target','btn-hud-hint','btn-hud-speak'].map(id=>({id,...document.getElementById(id).getBoundingClientRect().toJSON()}))};});findings.push({name:`l${level}-${w}x${h}-rotated`,passed:beforeRotate.maze.seed===afterRotate.maze.seed&&beforeRotate.maze.wall.every((row,r)=>row.every((v,c)=>v===afterRotate.maze.wall[c][r]))&&(h>w&&w<=500?geo.boardX>geo.hudRight:geo.boardY>geo.hudBottom)&&geo.controls.every(c=>c.top>=0&&c.left>=0&&c.bottom<=w&&c.right<=h),...geo});await shot(p,`edge-l${level}-${w}x${h}-rotated`);await p.close();
 }
 await b.close();fs.writeFileSync(path.join(out,process.argv.includes('--power-only')?'power-audit.json':process.argv.includes('--landscape')?'landscape-audit.json':'edge-audit.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));assert(findings.every(f=>f.passed),'edge regressions must all pass');
}
if(process.argv.includes('--edges')){edgeAudit().catch(e=>{console.error(e);process.exitCode=1;});}else{
(async()=>{
 const b=await chromium.launch({headless:true});
 const context=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const p=await context.newPage();p.on('pageerror',e=>record('pageerror',e.message));
 await enter(p);await shot(p,'ready');
 let s=await state(p);const idle0={lives:s.lives,pos:s.player.from,ghost:s.ghosts.map(g=>g.from)};
 await p.waitForTimeout(8000);s=await state(p);record('read-before-input',{before:idle0,after:{lives:s.lives,pos:s.player.from,ghost:s.ghosts.map(g=>g.from)},reading:s.reading});
 let target=s.items.find(i=>i.correct);await tapCell(p,s,target);await p.waitForTimeout(100);s=await state(p);record('route-correct',{route:s.route,destination:s.destination,items:s.items});await shot(p,'route-correct');
 const oldDest=s.destination;let other=s.items.find(i=>!i.correct);await tapCell(p,s,other);await p.waitForTimeout(80);s=await state(p);record('change-destination',{oldDest,destination:s.destination,route:s.route});await shot(p,'change-destination');
 // The visible owl control is the stop button.
 await p.touchscreen.tap(s.ox+s.player.x*s.cell,s.oy+s.player.y*s.cell);await p.waitForTimeout(400);record('tap-owl-stop',await state(p));await shot(p,'stop');
 await p.locator('#btn-pause').tap();await p.waitForTimeout(350);await shot(p,'pause');const paused=await state(p);await p.waitForTimeout(1500);record('pause-stable',{before:paused.player,after:(await state(p)).player});await p.locator('#btn-resume').tap();await p.waitForTimeout(350);
 s=await state(p);other=s.items.find(i=>!i.correct&&!i.taken);await tapCell(p,s,other);
 await p.waitForFunction(()=>window.__MeCung.G.wrong>0,{},{timeout:20000}).catch(e=>record('wrong-timeout',e.message));
 record('wrong-feedback',{state:await state(p),text:await p.locator('body').innerText()});await shot(p,'wrong-feedback');await p.waitForFunction(()=>window.__MeCung.G.state==='playing');
 for(let n=0;n<12;n++){
  s=await state(p);if(s.state==='ready'){await p.waitForFunction(()=>window.__MeCung.G.state==='playing');s=await state(p);}if(s.state!=='playing'){record('game-nonplaying',s);break;}
  target=s.items.find(i=>i.correct&&!i.taken);if(!target){await p.waitForTimeout(1400);continue;}
  const found=s.found;await tapCell(p,s,target);
  await p.waitForFunction(v=>{let g=window.__MeCung.G;return g.found>v||g.state!=='playing'||(!g.route&&!g.player.moving&&!g.reading);},found,{timeout:25000}).catch(e=>record('route-timeout',e.message));
  record('correct-progress',{iteration:n,state:await state(p),text:await p.locator('body').innerText()});await shot(p,'correct-'+n);await p.waitForTimeout(1500);
 }
 record('after-play',{state:await state(p),text:await p.locator('body').innerText()});await shot(p,'after-play');
 await p.waitForFunction(()=>window.__MeCung.G.state==='quiz');
 for(let n=0;n<8&&(await state(p)).state==='quiz';n++){
  const answer=await p.evaluate(()=>window.__MeCung.G.quiz.current.answer);
  await p.locator(`#quiz-options .opt[data-i="${answer}"]`).tap();await p.locator('#btn-quiz-next').tap();
 }
 await p.waitForFunction(()=>window.__MeCung.G.state==='result');await shot(p,'earned-result');
 record('earned-result',{text:await p.locator('body').innerText(),record:await p.evaluate(()=>window.__MeCung.Store.p().records.l1)});
 assert(await p.evaluate(()=>window.__MeCung.Store.p().records.l1.passed),'passed from real input');
 // Separate clean contexts make viewport checks independent of earned progress.
 for(const [w,h] of [[844,390],[820,1180],[1180,820]]){
  const c=await b.newContext({viewport:{width:w,height:h},hasTouch:true});const q=await c.newPage();await enter(q);await shot(q,`geometry-${w}x${h}`);record(`geometry-${w}x${h}`,await state(q));
  let st=await state(q);let dest=st.items.find(i=>i.correct);await q.mouse.click(st.ox+(dest.c+.5)*st.cell,st.oy+(dest.r+.5)*st.cell);await q.waitForTimeout(100);st=await state(q);
  const d=st.player.dir;await q.keyboard.press(d.dx?d.dx>0?'ArrowLeft':'ArrowRight':d.dy>0?'ArrowUp':'ArrowDown');let rev=await state(q);assert.equal(rev.route,null);assert.equal(rev.player.want.dx,-d.dx);assert.equal(rev.player.want.dy,-d.dy);await q.keyboard.press(' ');await q.waitForTimeout(400);assert.equal((await state(q)).player.moving,false);record(`keyboard-reverse-stop-${w}`,true);
  await q.setViewportSize({width:h,height:w});await q.waitForTimeout(350);await shot(q,`rotate-${w}x${h}`);record(`rotate-${w}x${h}`,await state(q));await c.close();
 }
 const l7=await b.newPage({viewport:{width:820,height:1180},hasTouch:true});await l7.goto('http://127.0.0.1:8787/me-cung-dong-ho/');await l7.locator('#btn-play').click();await l7.waitForTimeout(350);await l7.locator('#btn-unlock-all').click();let question=await l7.locator('#parent-gate-q').innerText();let nums=question.match(/(\d+) × (\d+)/);await l7.locator('#parent-gate-input').fill(String(Number(nums[1])*Number(nums[2])));await l7.locator('#parent-gate-input').press('Enter');await l7.waitForTimeout(350);await l7.getByText('Đồng hồ điện tử',{exact:true}).click();await l7.locator('#btn-lesson-play').click();await l7.waitForFunction(()=>window.__MeCung.G.state==='playing');await l7.waitForTimeout(1200);await shot(l7,'level7-reading');
 let l7s=await state(l7);await l7.keyboard.press('ArrowDown');await l7.keyboard.press(' ');await l7.waitForTimeout(500);await shot(l7,'level7-after-input');record('level7-geometry',await l7.evaluate(()=>({hud:document.querySelector('.hud-top').getBoundingClientRect().toJSON(),boardY:window.__MeCung.G.oy,cell:window.__MeCung.G.cell,text:document.querySelector('#move-status').innerText})));await l7.close();
 await context.close();await b.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(log,null,2));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(log,null,2));process.exitCode=1;});
}
