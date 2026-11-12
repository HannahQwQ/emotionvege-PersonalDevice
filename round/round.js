/* =====================================================
 * 圆屏模式：整个流程画进一块圆形屏幕（设备屏幕是圆的）
 *
 *   ?screen=round   圆屏（默认）        ?screen=phone   原来的手机竖屏版
 *   右上角「手机版 / 圆屏」按钮可随时切换，选择会记住。
 *
 * 这里只负责「每一页怎么摆」：第 2 步的情绪圆圈本来就是圆的，直接铺满整块屏幕；
 * 相机、特殊状态、确认、地图这几页重新排版成圆形窗口的样子。
 * 所有 id（cam / ef / b-next / b-save …）和手机版保持一致，所以识别、音乐、动效、保存的逻辑一点没动。
 * 样式在 round/round.css。圆外的进度条 / 语言 / 切换按钮是调试工具，真机不需要。
 * 提示页（notice/）的圆屏版式在 notice/notice.js 里，也用这里的 Round.shell 套进圆里。
 * ===================================================== */
(function(){
'use strict';
const KEY='eg-screen';
const persist=v=>{try{localStorage.setItem(KEY,v)}catch(e){}};
// 只在加载时决定一次：链接参数 > 上次的选择 > 默认圆屏。切换按钮改的是 cur，不会被链接参数顶回去
let cur=(()=>{
  const q=new URLSearchParams(location.search).get('screen');
  if(q==='phone'||q==='round'){persist(q);return q==='round'}
  try{const v=localStorage.getItem(KEY);if(v)return v==='round'}catch(e){}
  return true;
})();
const on=()=>cur;
const sync=()=>document.body.classList.toggle('rs-mode',cur);
function setOn(v){
  cur=v;persist(v?'round':'phone');
  try{const u=new URL(location.href);u.searchParams.delete('screen');history.replaceState(null,'',u)}catch(e){}
  render();
}

/* 圆屏外壳：上面一条调试工具，中间圆屏，下面可放额外内容（o.foot）。
 * o.left / o.right 可以替换工具条两侧的内容（提示页用来放「返回」）。 */
function shell(inner,o={}){
  const left=o.left!=null?o.left:`<div class="rs-dots">${[1,2,3,4].map(i=>`<i class="${S.step<5&&i<=Math.min(S.step,4)?'on':''}"></i>`).join('')}</div>`;
  const right=o.right!=null?o.right:`<button id="b-notice">🌱 ${T('互动提示','Notices')}</button><button id="b-shape">${T('手机版','Phone')}</button><button class="lang" id="b-lang">${EN()?'中文':'EN'}</button>`;
  return `<div class="rs-tools">${left}${right}</div><div class="rs-dev"><div class="rs" id="rs">${inner}</div></div>${o.foot||''}`;
}

/* ---------- 第 1 页：摄像头 —— 视频铺满圆屏，进度是沿屏幕边缘走的一圈 ---------- */
function p1(){
  return `<div class="rp">
    <div class="rs-cam"><video id="cam" playsinline muted autoplay></video><div class="vph" id="vph">📷</div><div class="guide" id="guide"></div></div>
    <div class="rs-ring" id="rsring"><i id="bar"></i></div>
    <div class="rp-shade"></div>
    <div class="rp-top">
      <button class="zpill" id="b-zone" aria-label="${T('调整地点','Change location')}">📍 <span id="zname">${znm(zoneOf(S.zone))}</span> · ${T('调整','Change')}</button>
      <div class="rp-lock">🔒 ${T('只在本机识别 · 不保存不上传','Analysed on-device · never saved')}</div>
    </div>
    <div class="vtip" id="vtip">${T('正在开启摄像头…','Starting the camera…')}</div>
    <div class="rp-bot">
      <button id="b-detect" style="display:none">${T('重新识别','Try again')}</button>
      <button class="ghost" id="b-manual">${T('跳过，直接选表情','Skip · pick by hand')}</button>
      ${DEBUG?`<button class="ghost" id="b-sim">${T('模拟识别（调试）','Simulate (debug)')}</button>`:''}
    </div>
  </div>`;
}

/* ---------- 第 2 页：情绪圆圈 —— 本来就是圆的，直接铺满；选中的名字在上，按钮在下 ---------- */
function p2(){
  return `<div class="rp rp2">
    <div class="ef" id="ef"></div>
    <div class="rp-sel"><span id="ee"></span><b id="ezh"></b></div>
    <div class="rp-acts">
      <button class="rc ghost" id="b-back" aria-label="${T('返回','Back')}">‹</button>
      <button class="pbtn" id="pbtn" data-state="idle" aria-label="${T('试听','Preview')}"></button>
      <button class="rc ok" id="b-next" disabled aria-label="${T('就是它，下一步','This one, next')}">✓</button>
    </div>
    <div class="rp-hide"><div id="pstage"><div class="pw" id="pw"></div></div><small id="een"></small><small id="ecat"></small><i id="pfill"></i></div>
  </div>`;
}

/* ---------- 第 3 页：特殊状态 —— 5 个图标钮沿上半圈，植物在正中 ---------- */
function p3(){
  const e=emoOf(S.emotion),cur=SPECIALS.find(x=>x.id===S.special);
  const chips=SPECIALS.map((s,i)=>{
    const a=(200+i*35)*Math.PI/180,x=50+Math.cos(a)*38.5,y=50+Math.sin(a)*38.5;
    return `<div class="rs-sp ${S.special===s.id?'sel':''}" data-sp="${s.id}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%" role="button" aria-label="${spName(s.id)}"><b>${s.icon}</b><small>${spx(s,'name')}</small></div>`;
  }).join('');
  return `<div class="rp" style="background:radial-gradient(circle at 50% 52%,${e.color}77 0%,#10161a 78%)">
    ${chips}
    <div class="rs-plant">${stageHTML(S.level)}</div>
    <div class="rs-cap">${cur?T(`${spName(S.special)} · 音乐：${spx(cur,'tech')}`,`${spName(S.special)} · played as ${spx(cur,'tech')}`):T('可选 · 点一下加上，再点取消','Optional · tap to add, tap again to undo')}</div>
    <div class="rp-acts">
      <button class="rc ghost" id="b-back" aria-label="${T('返回','Back')}">‹</button>
      <button class="pbtn" id="pbtn" data-state="idle" aria-label="${T('试听','Preview')}"></button>
      <button id="b-next">${S.special?T('添加并继续','Add & next'):T('跳过','Skip')} ›</button>
    </div>
    <div class="rp-hide"><i id="pfill"></i></div>
  </div>`;
}

/* ---------- 第 4 页：确认并保存 ---------- */
function p4(){
  const e=emoOf(S.emotion),m=S.emoji&&moodOf(S.emoji),ins=instOf();
  const facts=[`${nmEmo(e)} · ${plN(e.plant)}`,stg(e,S.level-1),S.special?spName(S.special):T('无特殊状态','No special state'),`${ins.icon} ${inm(ins)}`];
  return `<div class="rp" style="background:radial-gradient(circle at 50% 40%,${e.color}77 0%,#10161a 78%)">
    <div class="rp-top"><div class="rp-t">${T('确认并保存','Confirm & save')}</div></div>
    <div class="rs-plant sm">${stageHTML(S.level)}</div>
    <div class="rs-facts"><div class="rs-name">${m?`${vegTag(m)} ${EN()?m.en:m.zh}`:nmEmo(e)}</div>
      <div class="rs-chips">${facts.map(f=>`<span>${f}</span>`).join('')}</div></div>
    <div class="rp-acts">
      <button class="rc ghost" id="b-back" aria-label="${T('返回修改','Back to edit')}">‹</button>
      <button class="ok" id="b-save" style="background:#2f8f6b">${T('种进校园地图','Plant it')}</button>
    </div>
  </div>`;
}

/* ---------- 第 5 页：校园菜地 —— 地图铺满圆屏 ---------- */
function p5(){
  return `<div class="rp rp5">
    <div class="rs-map mapwrap" id="mapwrap">${mapSVG(true)}<div class="pin" id="pin">📍</div></div>
    <div class="rp-top"><div class="rp-t" style="color:#1d2433;text-shadow:none">${T('校园菜地','Campus garden')}</div></div>
    <div class="rs-msgs"><div class="small" id="mapmsg">${T('定位中…','Locating…')}</div><div class="small" id="syncmsg"></div></div>
    <div class="rp-acts"><button id="b-again">${T('再记录一次','Record again')}</button></div>
  </div>`;
}

function draw(){
  sync();
  $app.innerHTML=shell([null,p1,p2,p3,p4,p5][S.step]());
}
// 圆外按钮（render 之后调用）：手机版 / 圆屏切换
function bind(){
  const b=document.getElementById('b-shape');
  if(b)b.onclick=()=>setOn(!cur);
}

window.Round={on,sync,setOn,shell,draw,bind};
})();
