'use strict';
// Independent gauntlet reviewer. Read-only state/geometry drives real mouse,
// CDP touch and keyboard events; no debug mutation/completion/answer handlers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { withGame, assertClean } = require('./lib/browser');
const OUT = path.resolve('out/gauntlet/review-three-games'); fs.mkdirSync(OUT,{recursive:true});
const results=[];
async function tower(viewport,label) {
 const log=await withGame('thap-dong-ho',async({page,context})=>{
  const record={game:'thap-dong-ho',label,viewport,checks:[]};
  const note=(s)=>record.checks.push(s);
  const shot=async(s)=>{await page.waitForTimeout(160);await page.screenshot({path:path.join(OUT,`${label}-${s}.png`)});};
  const read=()=>page.evaluate(()=>{let g=window.__ThapDongHo.G;return {state:g.state,board:g.board,piece:g.piece,score:g.score,correct:g.correct,wrong:g.wrong,quiz:g.quiz,time:g.time,drag:g.drag,cols:g.cols.map(c=>({t:c.t,n:c.stack.filter(r=>!r.dead).length}))};});
  const ready=()=>page.waitForFunction(()=>{let g=window.__ThapDongHo.G;return g.state==='playing'&&g.piece&&g.piece.mode==='fall';});
  const point=(s,col=s.piece.col)=>({x:s.board.x+(col+.5)*s.board.cell,y:s.board.y+s.board.cell*1.5});
  const tap=async(p)=>label==='desktop'?page.mouse.click(p.x,p.y):page.touchscreen.tap(p.x,p.y);
  const cdp=await context.newCDPSession(page);
  const touch=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[p]:[]});
  await page.locator('#btn-play').click();await page.getByText('Màn 1: Giờ đúng',{exact:true}).click();await shot('lesson');
  await page.locator('#btn-lesson-start').click();await ready();await shot('gameplay');
  let a=await read();await tap(point(a));let b=await read();assert.equal(b.piece.id,a.piece.id);assert.equal(b.piece.mode,'fall');assert.equal(b.piece.selected,true);note('First tap selects current column without dropping');await shot('selected');
  a=await read();let p=point(a);await touch('touchStart',p);await touch('touchMove',{x:Math.max(2,a.board.x-60),y:p.y});await touch('touchEnd');b=await read();assert.equal(b.piece.id,a.piece.id);assert.equal(b.piece.mode,'fall');assert.equal(b.piece.selected,false);note('CDP touch release outside board does not drop');
  a=await read();p=point(a);await touch('touchStart',p);await touch('touchCancel');b=await read();assert.equal(b.piece.id,a.piece.id);assert.equal(b.piece.mode,'fall');assert.equal(b.piece.selected,false);note('CDP touchcancel does not drop');
  a=await read();p=point(a);let destination=point(a,(a.piece.col+1)%4);await touch('touchStart',p);await touch('touchMove',destination);await touch('touchEnd');b=await read();assert.equal(b.piece.id,a.piece.id);assert.equal(b.piece.mode,'fall');assert.equal(b.piece.col,(a.piece.col+1)%4);note('Drag changes column and previews landing without dropping');
  await page.keyboard.down('ArrowDown');await page.keyboard.press('Escape');a=await read();assert.equal(a.state,'paused');await page.waitForTimeout(400);b=await read();assert.equal(b.time,a.time);assert.equal(b.piece.row,a.piece.row);await page.keyboard.up('ArrowDown');await shot('paused');await page.locator('#btn-resume').click();note('Escape pause freezes time/piece; resume works and releases soft drop');
  if(label==='portrait'){
   a=await read();p=point(a);await touch('touchStart',p);await page.setViewportSize({width:844,height:390});await touch('touchEnd');await page.waitForTimeout(180);b=await read();assert.equal(b.piece.id,a.piece.id);assert.equal(b.piece.mode,'fall');await shot('rotate-during-touch');await page.setViewportSize(viewport);await page.waitForTimeout(180);note('Portrait-to-landscape resize during touch does not drop');
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await read()).state,'paused');await page.locator('#btn-resume').click();note('SYNTHETIC blur handler pauses; this is not actual tab visibility coverage');
  }
  // Deliberately choose one wrong column through keyboard, then correct normally.
  a=await read();await page.keyboard.press(String(((a.piece.target+1)%4)+1));await page.keyboard.press('Space');await page.waitForFunction(()=>window.__ThapDongHo.G.wrong===1);await shot('wrong-feedback');assert.match(await page.locator('body').innerText(),/Kim dài số 12/);note('Wrong drop keeps score 0, adds rubble, explains hour and points to right column');assert.equal((await read()).score,0);
  for(let i=0;i<8;i++){
   await ready();a=await read();p=point(a,a.piece.target);
   if(i%2===0){await tap(p);await tap(p);}else{for(let j=0;j<Math.abs(a.piece.target-a.piece.col);j++)await page.keyboard.press(a.piece.target>a.piece.col?'ArrowRight':'ArrowLeft');await page.keyboard.press('Space');}
   await page.waitForFunction(n=>window.__ThapDongHo.G.correct===n,i+1);
   if(i===0){await shot('correct-feedback');assert.ok((await read()).score>0);}
  }
  await page.waitForFunction(()=>window.__ThapDongHo.G.state==='summary');await shot('summary');let completed=await read();assert.equal(completed.correct,8);assert.equal(completed.wrong,1);note('Eight real correct drops complete level; summary records 8 correct/1 wrong');
  await page.locator('#btn-quiz').click();await shot('quiz');let q=(await read()).quiz;await page.getByRole('button',{name:q.qs[q.i].choices[1],exact:true}).click();await shot('quiz-wrong');assert.match(await page.locator('body').innerText(),/Chưa đúng/);await page.locator('#btn-quiz-retry').click();
  for(let i=0;i<3;i++){q=(await read()).quiz;await page.getByRole('button',{name:q.qs[q.i].choices[0],exact:true}).click();if(i===0)await shot('quiz-correct');await page.locator('#btn-quiz-next').click();}
  await shot('quiz-result');assert.match(await page.locator('body').innerText(),/2\/3/);assert.match(await page.locator('body').innerText(),/Mở khóa màn 2/);note('Quiz wrong/retry/three real answers → 2/3 first-try and level 2 unlock');
  await page.locator('#btn-quiz-replay').click();await ready();assert.equal((await read()).correct,0);assert.equal((await read()).score,0);note('Result replay starts a fresh playable level');await page.locator('#btn-pause').click();await page.locator('#btn-quit').click();await page.reload();await page.locator('#btn-play').click();await shot('persisted-levels');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('thap-dong-ho-v1')));assert.equal(saved.players.p1.unlocked,2);assert.equal(saved.players.p1.levels.L1.stars,2);assert.equal(saved.players.p1.levels.L1.best,completed.score);note('Home/reload preserves level 2 unlock, 2 stars and actual best score');
  await page.getByText('Màn 2: Giờ rưỡi',{exact:true}).click();assert.equal((await read()).state,'lesson');await shot('unlocked-lesson');note('Persisted level 2 is actually selectable');
  record.final={score:completed.score,correct:completed.correct,wrong:completed.wrong,stars:saved.players.p1.levels.L1.stars};results.push(record);
 },{viewport}); assert.equal(assertClean(log,`review tower ${label}`),true);
}
(async()=>{if(process.argv.includes('--rotation')){await ninjaRotation();return;}if(process.argv.includes('--cc')){await cuuChuong();return;} if(process.argv.includes('--ninja')){await ninja();return;} for(const [label,width,height]of[['portrait',390,844],['landscape',844,390],['tablet',820,1180],['desktop',1180,820]]){await tower({width,height},label);fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(results,null,2));}console.log(JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});

async function cuuChuong(){
const log=await withGame('cuu-chuong',async({page,context})=>{
 const record={game:'cuu-chuong',checks:[],viewports:[]};const note=s=>record.checks.push(s);
 const read=()=>page.evaluate(()=>{let g=window.__CuuChuong.G;return{state:g.state,typed:g.typed,targetId:g.targetId,score:g.score,shields:g.shields,correct:g.correct,wrong:g.wrong,timeLeft:g.timeLeft,attemptsWrong:g.attemptsWrong,meteors:g.meteors.filter(m=>!m.dead&&m.q&&m.popping<=0).map(m=>({id:m.id,x:m.x,y:m.y,r:m.r,q:m.q}))};});
 const shot=async(s)=>{await page.waitForTimeout(700);await page.screenshot({path:path.join(OUT,'cc-'+s+'.png')});};
 const ready=()=>page.waitForFunction(()=>{let g=window.__CuuChuong.G;return g.state==='playing'&&g.meteors.some(m=>m.q&&!m.dead&&m.popping<=0);});
 const enter=async(answer,touch)=>{for(const n of String(answer)){if(touch)await page.locator(`[data-key="${n}"]`).tap();else await page.keyboard.press(n);}};
 const fire=async(touch)=>{if(touch){let b=await page.getByRole('button',{name:'Bắn',exact:true}).boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}else await page.keyboard.press('Enter');};
 await page.getByRole('button',{name:'1 phút',exact:true}).click();await page.locator('#btn-play').click();await page.getByText('Bảng 2 👉 Gợi ý',{exact:true}).click();await ready();await shot('portrait-gameplay');
 await fire(true);assert.equal((await read()).attemptsWrong,0);note('Empty fire prompts entry and does not count wrong');
 await enter(99,true);assert.equal((await read()).typed,'99');await page.locator('[data-key="del"]').tap();assert.equal((await read()).typed,'9');await page.keyboard.press('Backspace');assert.equal((await read()).typed,'');note('Touch digits/backspace and keyboard backspace edit visibly');
 await enter(99,true);await fire(true);assert.equal((await read()).attemptsWrong,1);assert.equal((await read()).shields,3);await shot('deliberate-wrong-feedback');assert.match(await page.locator('body').innerText(),/Chưa đúng/);note('Deliberate wrong answer shows reasoning, resets input, preserves 3 shields for correction');
 let a=await read();let t=a.meteors.find(m=>m.id===a.targetId);await enter(t.q.answer,true);await fire(true);await page.waitForFunction(()=>window.__CuuChuong.G.correct===1);await shot('correct-feedback');assert.ok((await read()).score>0);note('Corrected touch answer scores and destroys meteor');
 await ready();await enter(1,false);await page.locator('#btn-pause').click();a=await read();await page.waitForTimeout(450);assert.equal((await read()).timeLeft,a.timeLeft);await shot('paused');await page.locator('#btn-resume').click();await page.keyboard.press('Backspace');note('Pause freezes countdown; resume remains editable');
 // Let the second meteor become selectable; no game-time or state mutation.
 await page.waitForFunction(()=>window.__CuuChuong.G.meteors.filter(m=>m.q&&!m.dead&&m.popping<=0).length>=2,null,{timeout:20000});
 a=await read();let other=a.meteors.find(m=>m.id!==a.targetId);await enter(1,true);await page.touchscreen.tap(other.x,other.y);assert.equal((await read()).targetId,other.id);assert.equal((await read()).typed,'');await shot('tap-retarget');note('Real touch selects another visible meteor and clears previous target input');
 for(const [label,width,height]of[['landscape',844,390],['tablet',820,1180],['desktop',1180,820],['portrait',390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);if((await read()).state==='paused')await page.locator('#btn-resume').click();await ready();a=await read();t=a.meteors.find(m=>m.id===a.targetId);await enter(t.q.answer,label!=='desktop');await shot(label+'-typed');await fire(label!=='desktop');await page.waitForFunction(n=>window.__CuuChuong.G.correct>n,a.correct);record.viewports.push({label,width,height,answer:t.q.full});
 }
 note('Touch works portrait/landscape/tablet; desktop keyboard works after live resizes');
 const until=Date.now()+100000;
 while((await read()).state==='playing'&&Date.now()<until){a=await read();t=a.meteors.find(m=>m.id===a.targetId);if(t){await enter(t.q.answer,false);await fire(false);}await page.waitForTimeout(500);}
 await page.waitForFunction(()=>window.__CuuChuong.G.state==='over',null,{timeout:15000});await page.locator('#btn-again').waitFor({state:'visible'});await shot('timed-result');a=await read();assert.ok(a.correct>=5);assert.equal(a.shields,3);assert.equal(a.timeLeft,0);record.final=a;note('Real one-minute round ends by countdown with 3 shields and correct/wrong result');
 await page.locator('#btn-again').click();await ready();assert.equal((await read()).score,0);await page.locator('#btn-pause').click();await page.locator('#btn-quit').click();await page.reload();await page.locator('#btn-report-menu').click();await shot('persisted-report');let text=await page.locator('body').innerText();assert.match(text,/Bảng 2/);record.storage=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes('cuu-chuong'))));note('Result replay is playable; Home/reload report retains played table results');
 results.push(record);fs.writeFileSync(path.join(OUT,'cc-results.json'),JSON.stringify(record,null,2));
},{viewport:{width:390,height:844}});assert.equal(assertClean(log,'review CC'),true);
}





async function ninja(){
const log=await withGame('math-ninja',async({page,context})=>{
 const record={game:'math-ninja',checks:[],viewports:[]};const note=s=>record.checks.push(s);
 const read=()=>page.evaluate(()=>{let g=window.__NinjaToan.G;return{state:g.state,mode:g.mode,score:g.score,hearts:g.hearts,correct:g.correct,wrong:g.wrong,bombs:g.bombs,timeLeft:g.timeLeft,readLeft:g.readLeft,held:g.held,q:g.question,blades:[...g.blades.values()].map(b=>({active:b.active})),fruits:g.fruits.filter(f=>f.launched&&!f.dead&&f.popping<=0).map(f=>({kind:f.kind,value:f.value,x:f.x,y:f.y,r:f.r}))};});
 const shot=async(s)=>{await page.waitForTimeout(600);await page.screenshot({path:path.join(OUT,'ninja-'+s+'.png')});};
 const cdp=await context.newCDPSession(page);const touch=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[p]:[]});
 const ready=()=>page.waitForFunction(()=>{let g=window.__NinjaToan.G;return g.state==='playing'&&g.readLeft<=0&&g.fruits.some(f=>f.launched&&!f.dead&&f.popping<=0&&f.kind==='fruit'&&f.y>g.hudBottom+f.r&&f.y<g.H-f.r);});
 const swipe=async(f,mouse=false)=>{if(mouse){await page.mouse.move(f.x-12,f.y);await page.mouse.down();await page.mouse.move(f.x+12,f.y);await page.mouse.up();}else{await touch('touchStart',{x:f.x-12,y:f.y});await touch('touchMove',{x:f.x+12,y:f.y});await touch('touchEnd');}};
 const target=async(wrong=false)=>{await ready();return page.evaluate(w=>{let g=window.__NinjaToan.G;let f=g.fruits.find(f=>f.launched&&!f.dead&&f.popping<=0&&f.kind==='fruit'&&(w?f.value!==g.question.answer:f.value===g.question.answer)&&f.y>g.hudBottom+f.r&&f.y<g.H-f.r);return f?{x:f.x,y:f.y,r:f.r,value:f.value}:null;},wrong);};
 const correct=async(mouse=false)=>{for(let i=0;i<80;i++){let a=await read();if(a.state!=='playing')return false;let f=await target();if(f){await swipe(f,mouse);await page.waitForTimeout(100);if((await read()).correct>a.correct)return true;}await page.waitForTimeout(80);}throw Error('No valid correct swipe opportunity');};
 if(!process.argv.includes('--pair-only')){
 await page.getByRole('button',{name:'1 phút',exact:true}).click();await page.locator('#btn-play').click();await page.getByText('Cộng trừ đến 10',{exact:true}).click();await ready();await shot('portrait-gameplay');
 let a=await read();await touch('touchStart',{x:8,y:300});await touch('touchCancel');assert.ok((await read()).blades.every(b=>!b.active));assert.equal((await read()).score,a.score);note('CDP touchcancel clears active blade without score/heart change');
 await touch('touchStart',{x:8,y:300});await page.keyboard.press('Escape');a=await read();assert.equal(a.state,'paused');assert.equal(a.blades.length,0);await touch('touchEnd');await page.waitForTimeout(400);assert.equal((await read()).timeLeft,a.timeLeft);await shot('paused-mid-gesture');await page.locator('#btn-resume').click();note('Pause during held touch clears blade and freezes countdown; resume works');
 let wrong=null;for(let i=0;i<40&&!wrong;i++){wrong=await target(true);if(!wrong)await page.waitForTimeout(100);}assert.ok(wrong);await swipe(wrong);await page.waitForTimeout(150);a=await read();assert.equal(a.wrong,1);assert.equal(a.hearts,2);assert.equal(a.score,0);await shot('wrong-feedback');assert.match(await page.locator('body').innerText(),/=/);let fixed=await read();await touch('touchStart',{x:8,y:320});await touch('touchMove',{x:380,y:320});await touch('touchEnd');assert.equal((await read()).hearts,2);assert.equal((await read()).timeLeft,fixed.timeLeft);note('Wrong fruit costs one heart, explains complete equation, reading interval blocks extra penalty and freezes countdown');
 await correct();await shot('correct-feedback');assert.ok((await read()).score>0);note('Real touch correct slice scores and gives visible success feedback');
 for(const [label,width,height]of[['landscape',844,390],['tablet',820,1180],['desktop',1180,820],['portrait',390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);if((await read()).state==='paused')await page.locator('#btn-resume').click();await ready();await shot(label+'-live');await correct(label==='desktop');record.viewports.push({label,width,height});
 }
 note('Real touch slices portrait/landscape/tablet; desktop mouse slice works after viewport rotations');
 const until=Date.now()+110000;while((await read()).state==='playing'&&Date.now()<until){await correct();await page.waitForTimeout(120);}
 await page.waitForFunction(()=>window.__NinjaToan.G.state==='over',null,{timeout:10000});await page.locator('#btn-again').waitFor({state:'visible'});await shot('answer-result');a=await read();assert.ok(a.correct>=5);assert.equal(a.timeLeft,0);assert.equal(a.wrong,1);record.answerFinal=a;note('Real timed answer round finishes with score, correct/wrong and remaining hearts');
 await page.locator('#btn-again').click();await ready();assert.equal((await read()).score,0);await page.locator('#btn-pause').click();await page.locator('#btn-quit').click();await page.reload();await page.locator('#btn-report-menu').click();await shot('persisted-report');record.storage=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes('ninja'))));assert.match(await page.locator('body').innerText(),/Cộng trừ đến 10/);note('Result replay starts fresh; Home/reload report retains completed answer results');
 fs.writeFileSync(path.join(OUT,'ninja-answer-results.json'),JSON.stringify(record,null,2)); }
 // Second mode: regular level selection and both members selected by touch.
 await page.goto(page.url().split('#')[0]);await page.getByRole('button',{name:'1 phút',exact:true}).click();await page.locator('#btn-play').click();await page.getByRole('tab',{name:'🤝 Ghép đôi',exact:true}).click();await page.getByText('Bạn của 10',{exact:true}).click();await ready();await shot('pair-first-gameplay');
 const pairUntil=Date.now()+95000;
 while((await read()).state==='playing'&&Date.now()<pairUntil){await ready();let a=await read();let want=a.held==null?a.q.pair[0]:a.q.target-a.held;let f=a.fruits.find(f=>f.kind==='fruit'&&f.value===want&&f.y>170&&f.y<800);if(f){await swipe(f);if(a.held==null&&(await read()).held!=null&&!(record.heldCaptured)){await shot('pair-held');record.heldCaptured=true;}}await page.waitForTimeout(120);}
 await page.waitForFunction(()=>window.__NinjaToan.G.state==='over',null,{timeout:10000});await page.locator('#btn-again').waitFor({state:'visible'});await shot('pair-result');record.pairFinal=await read();assert.ok(record.pairFinal.correct>=2);assert.equal(record.pairFinal.wrong,0);assert.equal(record.pairFinal.timeLeft,0);note('Pair mode holds first fruit, completes complementary pair by separate real touch; full timed pair result without wrong answers');
 results.push(record);fs.writeFileSync(path.join(OUT,'ninja-results.json'),JSON.stringify(record,null,2));
},{viewport:{width:390,height:844}});assert.equal(assertClean(log,'review Ninja'),true);
}


async function ninjaRotation(){
 const log=await withGame('math-ninja',async({page,context})=>{
  await page.locator('#btn-play').click();await page.getByText('Cộng trừ đến 10',{exact:true}).click();await page.waitForFunction(()=>window.__NinjaToan.G.state==='playing');
  const observations=[];const cdp=await context.newCDPSession(page);let readingBefore=null;
  const slice=async(wrong)=>{await page.waitForFunction(w=>{let g=window.__NinjaToan.G;return g.state==='playing'&&g.readLeft<=0&&g.fruits.some(f=>f.launched&&!f.dead&&f.kind==='fruit'&&(w?f.value!==g.question.answer:f.value===g.question.answer)&&f.y>g.hudBottom+f.r&&f.y<g.H-f.r);},wrong);let f=await page.evaluate(w=>{let g=window.__NinjaToan.G;let f=g.fruits.find(f=>f.launched&&!f.dead&&f.kind==='fruit'&&(w?f.value!==g.question.answer:f.value===g.question.answer)&&f.y>g.hudBottom+f.r&&f.y<g.H-f.r);return{x:f.x,y:f.y};},wrong);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:f.x-12,y:f.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:f.x+12,y:f.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  for(const [label,width,height] of [['landscape',844,390],['portrait',390,844]]){
   await page.setViewportSize({width,height});await page.waitForFunction(()=>window.__NinjaToan.G.state==='paused');await page.locator('#btn-resume').click();
   const obstruction=()=>page.evaluate(()=>{const q=document.getElementById('hud-question'),t=document.getElementById('toast');let qr=q.getBoundingClientRect(),tr=t.getBoundingClientRect(),cs=getComputedStyle(t);let visible=!t.hidden&&cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)>0;return {state:window.__NinjaToan.G.state,question:q.innerText,toast:t.innerText,visible,overlap:visible&&tr.left<qr.right&&tr.right>qr.left&&tr.top<qr.bottom&&tr.bottom>qr.top};});
   let first=await obstruction();assert.equal(first.state,'playing');assert.equal(first.overlap,false);await page.waitForTimeout(250);let settled=await obstruction();assert.equal(settled.overlap,false);await page.screenshot({path:path.join(OUT,'ninja-rotation-closed-'+label+'.png')});observations.push({label,first,settled});
   if(label==='landscape'){for(let attempt=0;attempt<10;attempt++){await slice(false);await page.waitForTimeout(120);if(await page.evaluate(()=>window.__NinjaToan.G.correct>0))break;}assert.ok(await page.evaluate(()=>window.__NinjaToan.G.correct>0));for(let attempt=0;attempt<12;attempt++){await slice(true);await page.waitForTimeout(120);if(await page.evaluate(()=>window.__NinjaToan.G.wrong>0))break;}assert.equal(await page.evaluate(()=>window.__NinjaToan.G.wrong),1);readingBefore=await page.evaluate(()=>({readLeft:window.__NinjaToan.G.readLeft,question:document.getElementById('hud-question').innerText,body:document.body.innerText}));assert.ok(readingBefore.readLeft>0);}
   else{let after=await page.evaluate(()=>({readLeft:window.__NinjaToan.G.readLeft,question:document.getElementById('hud-question').innerText,body:document.body.innerText}));assert.ok(after.readLeft>0);assert.equal(after.question,readingBefore.question);assert.equal(await page.locator('#hud-hint').isVisible(),true);assert.ok((await page.locator('#hud-hint').innerText()).includes(after.question));observations.push({readingBefore,readingAfter:after});await page.screenshot({path:path.join(OUT,'ninja-reading-preserved-on-rotate.png')});}
  }
  fs.writeFileSync(path.join(OUT,'ninja-rotation-closure.json'),JSON.stringify(observations,null,2));
 },{viewport:{width:390,height:844}});fs.writeFileSync(path.join(OUT,'ninja-rotation-console.json'),JSON.stringify(log,null,2));assert.equal(assertClean(log,'Ninja N1 rotation closure'),true);
}
