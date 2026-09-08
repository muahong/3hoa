const { chromium } = require('playwright');
const fs = require('fs');
const out = 'tests/e2e/out/gauntlet/review-shared';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser = await chromium.launch({headless:true});
 try {
 for (const viewport of (process.env.REVIEW_MATRIX?[{width:844,height:390},{width:768,height:1024},{width:1440,height:900}]:[{width:390,height:844}]))
 for (const slug of ['math-ninja','cuu-chuong','thap-dong-ho','xe-tang-thoi-gian','cuoi-ho']) {
  const context = await browser.newContext({viewport,hasTouch:true,isMobile:viewport.width<900});
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8787/');
  await page.locator(`a[href="${slug}/"]`).last().tap();
  await page.waitForLoadState('load');
  await page.waitForTimeout(500);
  const size=`${viewport.width}x${viewport.height}`;
  await page.screenshot({path:`${out}/${slug}-menu-${size}.png`,fullPage:true});
  console.log('MENU_TARGET',slug,size,await page.getByRole('link',{name:'← Trang chủ 3hoa',exact:true}).boundingBox());
  console.log(slug, await page.locator('body').innerText());
  await page.getByRole('link',{name:'← Trang chủ 3hoa',exact:true}).tap();
  await page.waitForURL('http://127.0.0.1:8787/');
  if(page.url()!=='http://127.0.0.1:8787/' || context.pages().length!==1) throw Error('menu home failed '+slug);
  await page.locator(`a[href="${slug}/"]`).last().tap();
  await page.waitForLoadState('load');
  await page.waitForTimeout(500);
  await page.getByRole('button',{name:'▶ CHƠI NGAY',exact:true}).tap();
  await page.waitForTimeout(500);
  await page.screenshot({path:`${out}/${slug}-select-mobile.png`,fullPage:true});
  console.log('AFTER PLAY',slug,await page.locator('body').innerText());
  if(process.env.REVIEW_CLOSURE&&slug==='cuu-chuong') {
   await page.waitForTimeout(800);
   const back=await page.locator('#btn-levels-back').boundingBox();
   console.log('SH-02 CLOSURE',back);
   if(back.width<44||back.height<44)throw Error('SH-02 still open');
   await page.locator('#btn-levels-back').tap();
   await page.getByRole('button',{name:'▶ CHƠI NGAY',exact:true}).tap();
  }
  const stageLabel = slug==='math-ninja'?'Cộng trừ đến 10':slug==='cuu-chuong'?'Bảng 2 👉 Gợi ý':slug==='xe-tang-thoi-gian'?'Giờ đúng':'Màn 1: Giờ đúng';
  await page.getByText(stageLabel,{exact:true}).first().tap();
  await page.waitForTimeout(500);
  console.log('AFTER STAGE',slug,await page.locator('body').innerText());
  await page.screenshot({path:`${out}/${slug}-stage-mobile.png`,fullPage:true});
  const start=page.getByRole('button',{name:'▶ Bắt đầu chơi',exact:true});
  if(slug==='cuoi-ho') {
   for(let step=0;step<5;step++) {
    const next=page.getByRole('button',{name:'Tiếp ▶',exact:true});
    if(await next.isVisible()) {await next.tap();await page.waitForTimeout(200);}
   }
   console.log('TIGER LESSON END',await page.locator('body').innerText());
   await page.getByRole('button',{name:'🐯 Lên hổ thôi!',exact:true}).tap();
  }
  if(await start.isVisible()) await start.tap();
  console.log('STARTED',slug,await page.locator('body').innerText());
  await page.waitForTimeout(3600);
  await page.getByRole('button',{name:'Tạm dừng',exact:true}).tap();
  await page.waitForTimeout(500);
  await page.screenshot({path:`${out}/${slug}-pause-${size}.png`,fullPage:true});
  console.log('PAUSE_TARGETS',slug,size,await page.getByRole('link',{name:/Trang chủ 3hoa/}).boundingBox(),await page.getByRole('button',{name:'☰ Menu trò chơi',exact:true}).boundingBox());
  console.log('PAUSE',slug,await page.locator('body').innerText());
  if(process.env.REVIEW_CLOSURE) {
   const resume=await page.getByRole('button',{name:'▶ Chơi tiếp',exact:true}).boundingBox();
   const point={x:resume.x+resume.width/2,y:resume.y+resume.height/2};
   await page.touchscreen.tap(point.x,point.y);
   const hit=await page.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y);return{tag:e.tagName,id:e.id,hidden:!!e.closest('.screen.hidden')}},point);
   console.log('SH-01 CLOSURE',slug,hit);
   if(hit.hidden)throw Error('SH-01 still open '+slug);
   await page.evaluate(()=>{window.reviewPointerTargets=[];document.addEventListener('pointerdown',e=>window.reviewPointerTargets.push({tag:e.target.tagName,id:e.target.id,hidden:!!e.target.closest('.screen.hidden')}),{once:true,capture:true})});
   await page.touchscreen.tap(point.x,point.y);
   console.log('IMMEDIATE INPUT',slug,await page.evaluate(()=>window.reviewPointerTargets));
   await page.getByRole('button',{name:'Tạm dừng',exact:true}).tap();
   await page.getByRole('button',{name:'☰ Menu trò chơi',exact:true}).tap();
   await page.getByRole('button',{name:'▶ CHƠI NGAY',exact:true}).waitFor({state:'visible'});
   if(!page.url().includes('/'+slug+'/'))throw Error('game menu changed URL '+slug);
   await page.screenshot({path:`${out}/${slug}-menu-closure.png`});
  }
  await (process.env.REVIEW_CLOSURE?page.locator('a.hub-home:not(#pause-home)'):page.locator('#pause-home')).tap();
  await page.waitForURL('http://127.0.0.1:8787/');
  if(context.pages().length!==1) throw Error('pause opened tab '+slug);
  await context.close();
 }
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
