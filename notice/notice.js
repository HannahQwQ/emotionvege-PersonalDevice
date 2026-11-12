/* =====================================================
 * 「植物被互动了」提示页
 *
 * 公共装置上有人和我们的蔬菜互动后，个人设备收到一条通知，点开看到这一次互动的结果 + 一份心情安抚。
 * 5 种互动（顺序即演示切换条的顺序）：
 *   water  水管阀门  开水淹灭着火的愤怒辣椒
 *   sun    阳光滑块  照射悲伤茄子，让它变成气球飞走
 *   poke   手指戳戳  戳平静的蘑菇
 *   heat   加热火    开心玉米变成爆米花
 *   hammer 锤子      敲放松卷心菜木鱼，收获安静与平静
 *
 * 用法（index.html 里已接好）：
 *   openNotice('water')            // 进入提示页（先是锁屏通知，点通知看详情）
 *   ?notice=water|sun|poke|heat|hammer   // 链接直达
 *   以后接真实事件：收到公共装置的消息时调用 showPlantNotice(kind) 即可
 *
 * 动画全部是 CSS / SVG，没有额外图片，也不联网。每个场景是一条「时间轴」：
 * 下面每个 build 函数里的秒数就是这一幕发生的时间，想调节奏直接改数字。
 * 蔬菜图用 assets/veges/ 里现有的（有这位用户自己种过的同类蔬菜就用 TA 的那一张）。
 * ===================================================== */
(function(){
'use strict';

/* ---------- 小工具：把「第几秒发生什么」写成 CSS 关键帧 ---------- */
const EZ='cubic-bezier(.3,1.5,.5,1)';      // 弹跳（和主页面 pop 动画同一条曲线）
const EO='cubic-bezier(.2,.7,.3,1)';       // 先快后慢
const EI='cubic-bezier(.5,0,.8,.4)';       // 先慢后快（下落）
const EIO='ease-in-out';
const pc=(t,D)=>(+(t/D*100).toFixed(3))+'%';
// stops: [[秒, 'css 属性', 可选：从这一帧到下一帧用的缓动], ...]
function kf(name,D,stops){
  stops=stops.slice().sort((a,b)=>a[0]-b[0]);
  if(stops[0][0]>0)stops.unshift([0,stops[0][1]]);
  if(stops[stops.length-1][0]<D)stops.push([D,stops[stops.length-1][1]]);
  return '@keyframes '+name+'{'+stops.map(([t,c,e])=>pc(t,D)+'{'+c+(e?';animation-timing-function:'+e:'')+'}').join('')+'}';
}
const A=(name,D,delay=0)=>`animation:${name} ${D}s linear ${delay}s both`;
const fade=(name,D,a,b,fi=.35,fo=.45)=>kf(name,D,b==null?[[0,'opacity:0'],[a,'opacity:0'],[a+fi,'opacity:1']]:[[0,'opacity:0'],[a,'opacity:0'],[a+fi,'opacity:1'],[b,'opacity:1'],[b+fo,'opacity:0']]);
const rnd=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};   // 固定的伪随机，每次播放一样
let uid=0;
// 拟声词（“滋~”“啪!”）：在 t 秒弹出、上飘、消失
function sfx(D,css,t,text,x,y,color,rot=0,size=22){
  const n='nx-sfx'+(++uid);
  css.push(kf(n,D,[[0,'opacity:0'],[t,`opacity:0;transform:scale(.3) rotate(${rot}deg)`,EZ],[t+.18,`opacity:1;transform:scale(1.15) rotate(${rot}deg)`],[t+.4,`opacity:1;transform:scale(1) rotate(${rot}deg)`],[t+1.0,`opacity:1;transform:translateY(-14px) rotate(${rot}deg)`],[t+1.35,`opacity:0;transform:translateY(-22px) rotate(${rot}deg)`]]));
  return `<div class="nx-sfx" style="left:${x}px;top:${y}px;font-size:${size}px;--sfx:${color};${A(n,D)}">${text}</div>`;
}
const starSVG='<svg viewBox="0 0 16 16"><path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z" fill="#ffd45a"/></svg>';
const star=(x,y,t,s=1)=>`<div class="nx-star" style="left:${x}px;top:${y}px;transform:scale(${s});animation:nx-twinkle 1.1s ease-out ${t}s both">${starSVG}</div>`;
const plantImg=(m)=>`<img src="${m.img}" alt="${m.zh}" draggable="false">`;

/* ---------- 火苗（水管、加热两幕共用）---------- */
const FP='M0 0C-15 -10 -17 -30 -4 -52C-2 -40 4 -36 7 -46C17 -32 18 -10 0 0Z';
const flame=(x,y,s,outer,i)=>`<g transform="translate(${x} ${y}) scale(${s})"><g style="${outer}"><g class="nx-flame" style="animation-delay:${-(rnd(i+3)*.4).toFixed(2)}s"><path d="${FP}" fill="#ff7a1a"/><path d="${FP}" fill="#ffd23f" transform="translate(0 -2) scale(.5 .55)"/></g></g></g>`;
const WAVE=(c,o)=>`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='26' viewBox='0 0 150 26'%3E%3Cpath d='M0 13Q37.5 0 75 13T150 13V26H0Z' fill='%23${c}' fill-opacity='${o}'/%3E%3C/svg%3E")`;

/* =====================================================
 * 5 个场景。每个返回 {D:总时长秒, css:关键帧, html:舞台内容}
 * 舞台 = 300px 高；.nx-box 是居中的 300×300 画布，坐标都是这块画布上的 px；
 * 蔬菜站在 .nx-pl 里（--ph 是图高，--pb 是离底边的距离）。
 * ===================================================== */
const BUILD={

/* ① 水管阀门：着火的愤怒辣椒 → 开水 → 淹灭 */
water(m){
  const D=7.2,css=[];
  css.push('@keyframes nw-out{to{transform:scale(0,0);opacity:0}}');
  css.push('@keyframes nw-spl{0%{transform:translate(0,0);opacity:1}45%{transform:translate(calc(var(--dx)*.6),-26px)}100%{transform:translate(var(--dx),10px);opacity:0}}');
  css.push(kf('nw-b0',D,[[0,'opacity:1'],[2.1,'opacity:1'],[3.8,'opacity:0']]));                         // 暖色背景 → 淡掉露出凉色
  css.push(kf('nw-pipe',D,[[0,'transform:translateY(-84px)'],[.4,'transform:translateY(-84px)',EZ],[1.1,'transform:none']]));
  css.push(kf('nw-wheel',D,[[0,'transform:rotate(0)'],[1.3,'transform:rotate(0)',EIO],[2.1,'transform:rotate(540deg)'],[4.9,'transform:rotate(540deg)',EIO],[5.7,'transform:rotate(0deg)']]));   // 拧开 → 拧回
  css.push(kf('nw-stream',D,[[0,'transform:scaleY(0);opacity:1'],[2.0,'transform:scaleY(0);opacity:1',EO],[2.4,'transform:scaleY(1);opacity:1'],[4.9,'transform:scaleY(1) scaleX(1);opacity:1',EIO],[5.4,'transform:scaleY(1) scaleX(.15);opacity:0']]));
  css.push(fade('nw-splash',D,2.4,4.9,.2,.4));
  css.push(kf('nw-rise',D,[[0,'transform:translateY(210px)'],[2.2,'transform:translateY(210px)',EIO],[4.1,'transform:translateY(80px)'],[5.1,'transform:translateY(80px)',EIO],[7.2,'transform:translateY(150px)']]));   // 水位：涨上来 → 退下去留一洼
  css.push(kf('nw-vein',D,[[0,'transform:scale(0)'],[.5,'transform:scale(0)',EZ],[.85,'transform:scale(1.15)'],[1.15,'transform:scale(.92)'],[1.45,'transform:scale(1.15)'],[1.8,'transform:scale(1)'],[2.5,'transform:scale(1)',EI],[2.8,'transform:scale(0)']]));
  const sh=[];for(let t=0;t<2.4;t+=.1){const a=((Math.round(t*10))%2?-1:1)*(1.4+Math.min(t,1.2));sh.push([+t.toFixed(2),`transform:rotate(${a}deg) translateX(${(a*.7).toFixed(2)}px)`])}
  sh.push([2.6,'transform:none']);
  css.push(kf('nw-rage',D,sh));                                                                           // 气得发抖
  css.push(kf('nw-float',D,[[0,'transform:none'],[2.3,'transform:none',EIO],[4.0,'transform:translateY(-20px) rotate(-2deg)'],[5.1,'transform:translateY(-18px) rotate(2deg)',EIO],[7.2,'transform:none']]));   // 被水托起
  const puffs=[[112,176],[135,120],[188,128],[178,196],[100,150]];
  css.push('@keyframes nw-puff{0%{opacity:0;transform:translateY(0) scale(.5)}20%{opacity:.85}100%{opacity:0;transform:translateY(-70px) scale(2.2)}}');
  const out=d=>`animation:nw-out .55s ease-in ${d}s both`;
  const back=[[100,160,1.1,0],[135,112,1,1],[190,126,.9,2],[206,200,1,3]].map(([x,y,s,i])=>flame(x,y,s,out(2.55+i*.16),i)).join('');
  const front=[[118,204,.9,4],[176,172,1,5],[150,238,.8,6]].map(([x,y,s,i])=>flame(x,y,s,out(2.6+(i-4)*.2),i)).join('');
  const html=`
  <div class="nx-bg" style="background:linear-gradient(#d9f0ff,#b3dbf4)"></div>
  <div class="nx-bg" style="background:linear-gradient(#ffd8bd,#ffa779);${A('nw-b0',D)}"></div>
  <div class="nx-bg" style="background:radial-gradient(circle at 50% 70%,#ff5a2a66,transparent 62%);${A('nw-b0',D)}"></div>
  <div class="nx-box">
    <svg viewBox="0 0 300 300" style="left:0;top:0;width:300px;height:300px;z-index:1;overflow:visible">${back}</svg>
    <div class="nx-pl" style="--ph:200px;--pb:40px"><div style="${A('nw-float',D)}"><div class="nx-pa" style="${A('nw-rage',D)}">${plantImg(m)}</div></div></div>
    <svg viewBox="0 0 300 300" style="left:0;top:0;width:300px;height:300px;z-index:4;overflow:visible">${front}</svg>
    <svg viewBox="0 0 40 40" style="left:196px;top:44px;width:34px;height:34px;z-index:6;overflow:visible"><g style="transform-origin:20px 20px;${A('nw-vein',D)}"><path d="M5 14Q14 14 14 5M35 14Q26 14 26 5M5 26Q14 26 14 35M35 26Q26 26 26 35" fill="none" stroke="#e0402a" stroke-width="4.5" stroke-linecap="round"/></g></svg>
    ${puffs.map(([x,y],i)=>`<div style="left:${x-14}px;top:${y-14}px;width:28px;height:28px;border-radius:50%;background:#fff;filter:blur(3px);z-index:6;animation:nw-puff 1.7s ease-out ${2.65+i*.17}s both"></div>`).join('')}
    ${sfx(D,css,2.7,T('滋——','Sssh!'),170,84,'#4aa3e0',8)}
    <svg viewBox="0 0 300 80" style="left:0;top:0;width:300px;height:80px;z-index:8;overflow:visible;${A('nw-pipe',D)}">
      <rect x="-10" y="28" width="128" height="20" rx="6" fill="#8fa6bd"/><rect x="-10" y="31" width="128" height="5" rx="2.5" fill="#fff" opacity=".35"/>
      <rect x="108" y="28" width="20" height="40" rx="6" fill="#8fa6bd"/><rect x="104" y="62" width="28" height="9" rx="4" fill="#6f869d"/>
      <rect x="30" y="22" width="8" height="8" fill="#6f869d"/><rect x="44" y="14" width="8" height="16" fill="#6f869d"/>
      <g style="transform-origin:48px 12px;${A('nw-wheel',D)}"><circle cx="48" cy="12" r="12" fill="#e85a4f"/><circle cx="48" cy="12" r="12" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><path d="M48 2V22M38 12H58" stroke="#fff" stroke-opacity=".8" stroke-width="3" stroke-linecap="round"/><circle cx="48" cy="12" r="3.2" fill="#b83a30"/></g>
    </svg>
    <div style="left:111px;top:70px;width:14px;height:58px;z-index:7;border-radius:7px 7px 3px 3px;transform-origin:50% 0;background:repeating-linear-gradient(180deg,#8fd0ff 0 9px,#5db4f0 9px 18px);${A('nw-stream',D)}"></div>
    <div style="left:118px;top:126px;width:0;height:0;z-index:7;${A('nw-splash',D)}">${[-34,-20,-9,9,20,34].map((dx,i)=>`<i style="position:absolute;left:-3px;top:-3px;width:7px;height:7px;border-radius:50%;background:#8fd0ff;--dx:${dx}px;animation:nw-spl .6s ease-out ${i*.1}s infinite"></i>`).join('')}</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:210px;z-index:5;pointer-events:none;${A('nw-rise',D)}">
    <div class="nx-wave" style="top:-20px;background-image:${WAVE('5db4f0','.55')}"></div>
    <div class="nx-wave" style="top:-14px;background-image:${WAVE('9bd2f7','.5')};animation-duration:3.1s;animation-direction:reverse"></div>
    <div style="position:absolute;left:0;right:0;top:0;bottom:0;background:linear-gradient(#5db4f08c,#2f86d6a6)"></div>
    ${[[18,60],[44,110],[72,40],[88,90]].map(([l,d],i)=>`<i style="position:absolute;left:${l}%;top:${d}px;width:9px;height:9px;border-radius:50%;border:2px solid #ffffffaa;animation:nx-drift 2.6s ease-out ${3+i*.6}s infinite"></i>`).join('')}
  </div>`;
  return{D,css:css.join(''),html};
},

/* ② 阳光滑块：悲伤茄子 → 太阳升起 → 变成气球 → 飞走 */
sun(m){
  const D=8.4,css=[];
  css.push(kf('ns-b0',D,[[0,'opacity:1'],[1.3,'opacity:1'],[3.5,'opacity:0']]));
  css.push(kf('ns-knob',D,[[0,'transform:translateX(0)'],[.9,'transform:translateX(0)',EIO],[3.1,'transform:translateX(178px)']]));
  css.push(kf('ns-fill',D,[[0,'transform:scaleX(.02)'],[.9,'transform:scaleX(.02)',EIO],[3.1,'transform:scaleX(1)']]));
  css.push(kf('ns-sun',D,[[0,'transform:scale(0);opacity:0'],[.9,'transform:scale(0);opacity:0',EO],[3.1,'transform:scale(1);opacity:1']]));
  css.push(kf('ns-glow',D,[[0,'opacity:0'],[.9,'opacity:0'],[3.1,'opacity:1'],[5.0,'opacity:1'],[8.4,'opacity:.7']]));
  css.push(kf('ns-beam',D,[[0,'opacity:0'],[2.0,'opacity:0'],[3.4,'opacity:.9'],[4.9,'opacity:.9'],[6.0,'opacity:0']]));
  css.push(kf('ns-cloud',D,[[0,'transform:translateX(0);opacity:1'],[1.4,'transform:translateX(0);opacity:1',EIO],[3.6,'transform:translateX(230px);opacity:0']]));
  css.push(kf('ns-rain',D,[[0,'opacity:1'],[1.3,'opacity:1'],[2.4,'opacity:0']]));
  css.push(kf('ns-inf',D,[[0,'transform:none;filter:none'],[3.7,'transform:none;filter:none',EO],[4.0,'transform:scale(1.2,.88);filter:brightness(1.05)',EIO],[4.35,'transform:scale(.97,1.12);filter:brightness(1.07) saturate(1.1)',EIO],[4.8,'transform:scale(1.1,1.08);filter:brightness(1.08) saturate(1.1)']]));
  css.push(fade('ns-gloss',D,3.9,null,.5));
  css.push(fade('ns-str',D,3.9,null,.6));
  css.push(kf('ns-lift',D,[[0,'transform:none'],[5.0,'transform:none',EIO],[5.7,'transform:translate(-8px,-40px) rotate(-3deg)'],[6.5,'transform:translate(-6px,-100px) rotate(4deg) scale(.8)',EIO],[7.4,'transform:translate(-48px,-128px) rotate(-4deg) scale(.45)',EIO],[8.4,'transform:translate(-78px,-114px) rotate(3deg) scale(.27)']]));
  css.push('@keyframes ns-sway{from{transform:rotate(-1.6deg) translateY(0)}to{transform:rotate(1.6deg) translateY(-3px)}}');
  css.push(kf('ns-hint',D,[[0,'opacity:1'],[5.2,'opacity:1'],[6.0,'opacity:0']]));
  const rays=Array.from({length:12},(_,i)=>`<path d="M-4 -34L0 -50L4 -34Z" fill="#ffc83a" transform="rotate(${i*30})"/>`).join('');
  const drops=Array.from({length:13},(_,i)=>`<i style="position:absolute;left:${74+rnd(i)*152|0}px;top:${60+rnd(i+9)*40|0}px;width:2px;height:14px;border-radius:2px;background:#6f86a3;transform:rotate(8deg);animation:nx-fall ${(.75+rnd(i+5)*.3).toFixed(2)}s linear ${(-rnd(i+2)).toFixed(2)}s infinite"></i>`).join('');
  const html=`
  <div class="nx-bg" style="background:linear-gradient(#cfeaff,#fff1c9)"></div>
  <div class="nx-bg" style="background:linear-gradient(#b9c6d6,#8fa3b8);${A('ns-b0',D)}"></div>
  <div class="nx-bg" style="background:radial-gradient(circle at 80% 22%,#ffe58a99,transparent 60%);${A('ns-glow',D)}"></div>
  <div class="nx-box">
    <svg viewBox="0 0 300 300" style="left:0;top:0;width:300px;height:300px;z-index:1;overflow:visible;${A('ns-beam',D)}"><defs><linearGradient id="nsb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a8" stop-opacity=".8"/><stop offset="1" stop-color="#fff2a8" stop-opacity=".05"/></linearGradient></defs><polygon points="222,84 254,84 212,262 92,262" fill="url(#nsb)"/></svg>
    <div class="nx-pl" style="--ph:200px;--pb:40px"><div style="${A('ns-lift',D)}"><div style="animation:ns-sway 2.6s ease-in-out infinite alternate"><div class="nx-pa" style="${A('ns-inf',D)}">${plantImg(m)}
      <span style="position:absolute;inset:0;-webkit-mask:url('${m.img}') center/100% 100% no-repeat;mask:url('${m.img}') center/100% 100% no-repeat;background:radial-gradient(ellipse 26% 18% at 30% 56%,#fffffff2,#fff0 75%),linear-gradient(135deg,#ffffff4d,#fff0 42%);${A('ns-gloss',D)}"></span>
      <svg viewBox="0 0 30 70" style="position:absolute;left:50%;top:99%;width:30px;height:70px;margin-left:-15px;overflow:visible;${A('ns-str',D)}"><path d="M10 0L15 7L20 0Z" fill="#7a4a8c"/><path d="M15 6C4 18 26 28 15 40S6 58 15 68" fill="none" stroke="#7a6b8a" stroke-width="1.6" stroke-linecap="round"/></svg>
    </div></div></div></div>
    <div style="left:30px;top:-6px;width:150px;height:76px;z-index:6;${A('ns-cloud',D)}"><svg viewBox="0 0 150 76" style="width:100%;height:100%"><g fill="#8493a6"><circle cx="46" cy="46" r="26"/><circle cx="78" cy="34" r="30"/><circle cx="108" cy="48" r="24"/><rect x="30" y="46" width="94" height="24" rx="12"/></g><g fill="#9eacbd"><circle cx="70" cy="26" r="16"/></g></svg></div>
    <div style="left:0;top:0;width:300px;height:300px;z-index:5;overflow:hidden;${A('ns-rain',D)}">${drops}</div>
    <div style="left:206px;top:30px;width:64px;height:64px;z-index:2;${A('ns-sun',D)}"><svg viewBox="-64 -64 128 128" style="width:128px;height:128px;margin:-32px 0 0 -32px;overflow:visible" class="nx-sunspin"><g>${rays}</g><circle r="30" fill="#ffd54a"/><circle r="30" fill="url(#nsg)"/><defs><radialGradient id="nsg"><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#ff9f1c" stop-opacity=".45"/></radialGradient></defs></svg></div>
    <div style="left:50px;top:276px;width:200px;height:8px;border-radius:4px;background:#ffffffaa;z-index:9;${A('ns-hint',D)}">
      <div style="position:absolute;inset:0;border-radius:4px;background:linear-gradient(90deg,#ffe58a,#ffb52e);transform-origin:0 50%;${A('ns-fill',D)}"></div>
      <div style="position:absolute;left:-4px;top:-8px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 6px #0003;display:flex;align-items:center;justify-content:center;${A('ns-knob',D)}"><svg viewBox="-8 -8 16 16" style="width:14px"><circle r="4" fill="#ffb52e"/>${Array.from({length:8},(_,i)=>`<path d="M-.8 -5.6L0 -7.6L.8 -5.6Z" fill="#ffb52e" transform="rotate(${i*45})"/>`).join('')}</svg></div>
    </div>
    ${star(112,206,5.0)}${star(186,150,5.5,1.2)}${star(106,112,6.0)}${star(196,78,6.5,1.1)}${star(138,40,7.0)}${star(212,66,7.5,.8)}
    ${sfx(D,css,7.3,T('飞走啦~','Bye~'),34,88,'#f0a23a',-6)}
  </div>`;
  return{D,css:css.join(''),html};
},

/* ③ 手指戳戳：平静的蘑菇被戳三下 */
poke(m){
  const D=7.6,css=[],C=[1.6,3.3,5.0];            // 三次碰到的时间
  // 蘑菇被戳：每次 压扁 → 反弹 → 回稳
  const sq=[[0,'transform:none']];
  [['translateX(-12px) scale(.88,1.05)','translateX(4px) scale(1.05,.97)','translateX(-2px) scale(.99,1.01)'],
   ['translateX(12px) scale(.88,1.05)','translateX(-4px) scale(1.05,.97)','translateX(2px) scale(.99,1.01)'],
   ['translateY(7px) scale(1.1,.84)','translateY(-9px) scale(.93,1.1)','translateY(2px) scale(1.03,.97)']].forEach(([a,b,c],i)=>{
    const t=C[i];sq.push([t-.03,'transform:none',EO],[t+.08,'transform:'+a,EO],[t+.24,'transform:'+b,EIO],[t+.4,'transform:'+c,EIO],[t+.75,'transform:none']);
  });
  css.push(kf('np-sq',D,sq));
  // 手指：从远处伸过来 → 碰到 → 顶一下 → 缩回
  const fing=(n,away,axis,t)=>css.push(kf(n,D,[[0,`transform:translate${axis}(${away}px)`],[t-.55,`transform:translate${axis}(${away}px)`,EO],[t,`transform:translate${axis}(0)`],[t+.08,`transform:translate${axis}(${away>0?-14:14}px)`,EIO],[t+.32,`transform:translate${axis}(0)`,EIO],[t+.95,`transform:translate${axis}(${away}px)`]]));
  fing('np-f1',150,'X',C[0]);fing('np-f2',-150,'X',C[1]);fing('np-f3',-150,'Y',C[2]);
  css.push('@keyframes np-ripple{0%{opacity:0;transform:scale(.3)}8%{opacity:.9}100%{opacity:0;transform:scale(1.9)}}');
  css.push('@keyframes np-tick{0%{opacity:0;transform:scale(.4)}8%{opacity:1}100%{opacity:0;transform:scale(1.4)}}');
  css.push('@keyframes np-hr{0%{opacity:0;transform:translate(0,0) scale(.4)}25%{opacity:1}100%{opacity:0;transform:translate(var(--hx),-80px) scale(1.05)}}');
  css.push(fade('np-blush',D,5.2,null,.7));
  css.push(kf('np-pink',D,[[0,'opacity:0'],[5.0,'opacity:0'],[6.6,'opacity:1']]));
  const finger=`<svg viewBox="0 0 120 44" width="120" height="44" style="display:block;overflow:visible"><defs><linearGradient id="npf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe0c4"/><stop offset="1" stop-color="#f2b690"/></linearGradient></defs><path d="M13 9H72C84 9 90 3 104 3C113 3 119 11 119 22C119 33 113 41 104 41C90 41 84 35 72 35H13C5 35 0 29 0 22C0 15 5 9 13 9Z" fill="url(#npf)" stroke="#e3a47c" stroke-width="1.4"/><ellipse cx="17" cy="15" rx="10" ry="4.6" fill="#fff" opacity=".5"/><path d="M52 14Q54 22 52 30M68 14Q70 22 68 30" stroke="#d9966c" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".6"/></svg>`;
  const burst=(x,y,t)=>`<div style="left:${x-18}px;top:${y-18}px;width:36px;height:36px;border-radius:50%;border:3px solid #fff;z-index:9;animation:np-ripple .6s ease-out ${t}s both"></div><svg viewBox="-20 -20 40 40" style="left:${x-20}px;top:${y-20}px;width:40px;height:40px;z-index:9;animation:np-tick .5s ease-out ${t}s both">${[0,60,120,180,240,300].map(a=>`<path d="M0 -12V-18" stroke="#e58a5a" stroke-width="3" stroke-linecap="round" transform="rotate(${a+15})"/>`).join('')}</svg>`;
  const html=`
  <div class="nx-bg" style="background:linear-gradient(#fbf6ea,#eadfc6)"></div>
  <div class="nx-bg" style="background:radial-gradient(circle at 50% 55%,#ffc2d266,transparent 65%);${A('np-pink',D)}"></div>
  <div class="nx-box">
    <div class="nx-pl" style="--ph:200px;--pb:40px"><div style="animation:nx-breathe 3.4s ease-in-out infinite;transform-origin:50% 100%"><div class="nx-pa" style="${A('np-sq',D)}">${plantImg(m)}
      <i style="position:absolute;left:15%;top:55%;width:24px;height:13px;border-radius:50%;background:#ff9fb0;filter:blur(2px);${A('np-blush',D)}"></i>
      <i style="position:absolute;right:15%;top:55%;width:24px;height:13px;border-radius:50%;background:#ff9fb0;filter:blur(2px);${A('np-blush',D)}"></i>
    </div></div></div>
    <div style="left:-48px;top:143px;width:120px;height:44px;z-index:8;${A('np-f2',D)}"><div style="transform:scaleX(-1)">${finger}</div></div>
    <div style="left:228px;top:143px;width:120px;height:44px;z-index:8;${A('np-f1',D)}">${finger}</div>
    <div style="left:90px;top:-18px;width:120px;height:44px;z-index:8;${A('np-f3',D)}"><div style="transform:rotate(-90deg)">${finger}</div></div>
    ${burst(228,165,C[0])}${burst(72,165,C[1])}${burst(150,64,C[2])}
    ${sfx(D,css,C[0]+.05,T('戳!','Poke!'),232,108,'#e58a5a',8)}
    ${sfx(D,css,C[1]+.05,T('戳戳!','Poke!'),14,108,'#e58a5a',-8)}
    ${sfx(D,css,C[2]+.05,T('戳戳戳!','Poke!!'),176,26,'#e58a5a',6,24)}
    ${[[118,74,-18,0],[176,60,16,.35],[148,50,2,.7]].map(([x,y,hx,d])=>`<svg viewBox="0 0 24 22" style="left:${x}px;top:${y}px;width:20px;height:18px;z-index:10;--hx:${hx}px;animation:np-hr 1.9s ease-out ${5.6+d}s both"><path d="M12 21C-6 8 4 -3 12 5C20 -3 30 8 12 21Z" fill="#ff7f9a"/></svg>`).join('')}
  </div>`;
  return{D,css:css.join(''),html};
},

/* ④ 加热火：开心玉米 → 烤热 → 啪！变成爆米花 */
heat(m){
  const D=8.2,css=[];
  css.push(kf('nh-fire',D,[[0,'transform:scale(1,.12)'],[.5,'transform:scale(1,.12)',EO],[1.8,'transform:scale(1,1)'],[5.7,'transform:scale(1,1)',EIO],[6.4,'transform:scale(1,0)']]));
  css.push(kf('nh-dial',D,[[0,'transform:rotate(0)'],[.4,'transform:rotate(0)',EIO],[1.1,'transform:rotate(130deg)'],[5.7,'transform:rotate(130deg)',EIO],[6.3,'transform:rotate(0)']]));
  css.push(kf('nh-heat',D,[[0,'opacity:0'],[1.0,'opacity:0'],[3.6,'opacity:.95'],[4.8,'opacity:.95'],[6.6,'opacity:0']]));
  css.push(kf('nh-corn',D,[[0,'transform:none;filter:none;opacity:1'],[1.0,'transform:none;filter:none;opacity:1',EIO],[4.3,'transform:scale(1.12);filter:sepia(.45) saturate(1.7) brightness(1.1);opacity:1',EIO],[4.52,'transform:scale(1.38);filter:sepia(.5) saturate(1.8) brightness(1.2);opacity:1',EI],[4.7,'transform:scale(.1);opacity:0'],[D,'transform:scale(.1);opacity:0']]));
  css.push('@keyframes nh-sh1{from{transform:rotate(-1.6deg)}to{transform:rotate(1.6deg)}}@keyframes nh-sh2{from{transform:rotate(-3.4deg) translateX(-1.5px)}to{transform:rotate(3.4deg) translateX(1.5px)}}');
  css.push(kf('nh-flash',D,[[0,'opacity:0;transform:scale(.2)'],[4.5,'opacity:0;transform:scale(.2)',EO],[4.6,'opacity:1;transform:scale(1.2)'],[5.3,'opacity:0;transform:scale(2.6)']]));
  css.push(kf('nh-pc',D,[[0,'transform:scale(0);opacity:0'],[4.55,'transform:scale(0);opacity:0',EZ],[5.25,'transform:scale(1);opacity:1']]));
  css.push('@keyframes nh-bounce{0%,100%{transform:translateY(0) scale(1,1)}40%{transform:translateY(-10px) scale(.97,1.04)}70%{transform:translateY(0) scale(1.05,.95)}}');
  css.push('@keyframes nh-fly{0%{opacity:0;transform:translate(0,0) scale(.2) rotate(0);animation-timing-function:cubic-bezier(.1,.6,.3,1)}8%{opacity:1}45%{transform:translate(var(--x1),var(--y1)) scale(1) rotate(calc(var(--r)*.5));animation-timing-function:cubic-bezier(.5,0,.9,.6)}100%{opacity:1;transform:translate(var(--x2),var(--y2)) scale(1) rotate(var(--r))}}');
  const fl=[0,1,2,3,4].map(i=>flame(88+i*31,266,.75,`transform-origin:0 0;${A('nh-fire',D)}`,i+10)).join('');
  // 爆米花粒：从玉米中心飞出去，落在地上（落点固定，每次一样）
  const piece=i=>{
    const side=i%2?1:-1,x2=side*(34+rnd(i)*104),x1=x2*.55,y1=-(70+rnd(i+4)*70),y2=104+rnd(i+8)*20,r=(rnd(i+2)-.5)*520,s=20+rnd(i+6)*12,t=3.1+i*.12+(i>9?1.0:0);
    return `<div style="left:${150-s/2}px;top:${150-s/2}px;width:${s}px;height:${s}px;z-index:7;--x1:${x1|0}px;--y1:${y1|0}px;--x2:${x2|0}px;--y2:${y2|0}px;--r:${r|0}deg;animation:nh-fly 1.5s linear ${t.toFixed(2)}s both"><svg viewBox="0 0 28 28" width="100%" height="100%"><circle cx="10" cy="14" r="8" fill="#fff8e6"/><circle cx="18" cy="11" r="8" fill="#fffdf4"/><circle cx="16" cy="19" r="7" fill="#fff0cc"/><path d="M11 25L14 19L17 25Z" fill="#f2b83a"/></svg></div>`;
  };
  const pcorn=`<svg viewBox="0 0 160 150" style="width:100%;height:100%;overflow:visible"><defs><radialGradient id="nhp" cx=".4" cy=".35"><stop offset="0" stop-color="#fffdf5"/><stop offset="1" stop-color="#ffe3a6"/></radialGradient></defs>
    <g fill="url(#nhp)" stroke="#efc778" stroke-width="2.2"><circle cx="46" cy="84" r="28"/><circle cx="114" cy="82" r="30"/><circle cx="64" cy="52" r="30"/><circle cx="102" cy="50" r="28"/><circle cx="80" cy="30" r="24"/></g><circle cx="80" cy="96" r="42" fill="url(#nhp)" stroke="#efc778" stroke-width="2.2"/><g fill="url(#nhp)"><circle cx="46" cy="84" r="25"/><circle cx="114" cy="82" r="27"/><circle cx="80" cy="96" r="39"/></g>
    <path d="M62 140L72 124L80 140L90 124L100 140Z" fill="#f2b83a"/>
    <path d="M58 86Q66 76 74 86M86 86Q94 76 102 86" stroke="#b86a1a" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M70 100Q80 112 92 100" stroke="#b86a1a" stroke-width="3.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="54" cy="98" rx="7" ry="4.2" fill="#ff9aa8" opacity=".7"/><ellipse cx="106" cy="98" rx="7" ry="4.2" fill="#ff9aa8" opacity=".7"/></svg>`;
  const html=`
  <div class="nx-bg" style="background:linear-gradient(#ffeebd,#ffd27e)"></div>
  <div class="nx-bg" style="background:linear-gradient(#ffc27a,#ff8f4f);${A('nh-heat',D)}"></div>
  <div class="nx-bg" style="background:radial-gradient(circle at 50% 100%,#ff5a2a88,transparent 60%);${A('nh-heat',D)}"></div>
  <div class="nx-box">
    <svg viewBox="0 0 300 300" style="left:0;top:0;width:300px;height:300px;z-index:1;overflow:visible">
      <rect x="70" y="266" width="160" height="16" rx="6" fill="#5b6270"/><rect x="74" y="268" width="152" height="4" rx="2" fill="#fff" opacity=".2"/>
      <g style="transform-origin:246px 274px;${A('nh-dial',D)}"><circle cx="246" cy="274" r="9" fill="#e9eef7"/><path d="M246 267V274" stroke="#5b6270" stroke-width="2.5" stroke-linecap="round"/></g></svg>
    <div class="nx-pl" style="--ph:196px;--pb:48px"><div style="${A('nh-corn',D)}"><div class="nx-pa" style="animation:nh-sh1 .13s linear 1s 15 alternate,nh-sh2 .06s linear 3s 24 alternate">${plantImg(m)}</div></div></div>
    <svg viewBox="0 0 300 300" style="left:0;top:0;width:300px;height:300px;z-index:5;overflow:visible">${fl}</svg>
    <div style="left:30px;top:30px;width:240px;height:240px;border-radius:50%;z-index:6;background:radial-gradient(circle,#fff 0,#fff6c8 35%,#fff0 70%);${A('nh-flash',D)}"></div>
    <div style="left:70px;top:104px;width:160px;height:150px;z-index:4;${A('nh-pc',D)}"><div style="width:100%;height:100%;animation:nh-bounce 1.5s ease-in-out 5.7s infinite;transform-origin:50% 100%;filter:drop-shadow(0 5px 6px #c9852f66)">${pcorn}</div></div>
    ${Array.from({length:15},(_,i)=>piece(i)).join('')}
    ${sfx(D,css,3.45,T('啪!','Pop!'),84,96,'#f08a24',-10)}${sfx(D,css,3.95,T('啵!','Pop!'),204,118,'#f08a24',9)}${sfx(D,css,4.55,T('啪啪!','POP!'),118,52,'#e0502a',-5,28)}
    ${star(70,150,5.0)}${star(228,160,5.2,1.2)}${star(120,62,5.5)}${star(190,70,5.8,.9)}${star(44,220,6.0,.8)}${star(250,226,6.2)}
  </div>`;
  return{D,css:css.join(''),html};
},

/* ⑤ 锤子：敲放松卷心菜木鱼 → 收获安静与平静 */
hammer(m,E){
  const D=8.8,css=[],S=[1.5,3.0,4.6,6.4];       // 四次敲击，越敲越慢
  const HI=210,HIT=152,REB=170;                 // 锤子角度：抬起 / 敲到 / 反弹
  const mk=[[0,`transform:rotate(${HI+6}deg)`]];
  S.forEach(s=>mk.push([s-.62,`transform:rotate(${HI-4}deg)`,EI],[s,`transform:rotate(${HIT}deg)`,EO],[s+.22,`transform:rotate(${REB}deg)`,EIO],[s+.82,`transform:rotate(${HI}deg)`,EIO]));
  mk.push([S[3]+1.0,`transform:rotate(${HI+6}deg)`]);
  css.push(kf('nm-mal',D,mk));
  css.push(kf('nm-malin',D,[[0,'transform:translate(130px,-100px)'],[.5,'transform:translate(130px,-100px)',EO],[1.05,'transform:none'],[S[3]+1.5,'transform:none',EI],[S[3]+2.2,'transform:translate(130px,-100px)']]));
  const sq=[[0,'transform:none']];
  S.forEach(s=>sq.push([s-.02,'transform:none',EO],[s+.06,'transform:scale(1.07,.9)',EO],[s+.22,'transform:scale(.98,1.03)',EIO],[s+.5,'transform:none']));
  css.push(kf('nm-sq',D,sq));
  css.push('@keyframes nm-ring{0%{opacity:0;transform:scale(.5)}12%{opacity:.9}100%{opacity:0;transform:scale(2.4)}}');
  css.push('@keyframes nm-word{0%{opacity:0;transform:translateY(18px) scale(.9)}100%{opacity:1;transform:none}}');
  css.push(kf('nm-b0',D,[[0,'opacity:1'],[1.4,'opacity:1'],[7.4,'opacity:0']]));
  const rings=S.map((s,i)=>[0,1].map(k=>`<div style="left:90px;top:96px;width:120px;height:120px;border-radius:50%;border:2.5px solid ${k?'#ffffffcc':'#bfd58f'};z-index:2;animation:nm-ring 1.9s ease-out ${(s+.04+k*.3).toFixed(2)}s both"></div>`).join('')).join('');
  const dots=Array.from({length:7},(_,i)=>`<i style="position:absolute;left:${48+rnd(i)*204|0}px;top:${200+rnd(i+3)*50|0}px;width:${5+rnd(i+1)*5|0}px;height:${5+rnd(i+1)*5|0}px;border-radius:50%;background:#ffffffcc;box-shadow:0 0 8px #fff;z-index:6;animation:nx-drift 3.4s ease-out ${(6.9+i*.45).toFixed(2)}s infinite both"></i>`).join('');
  const html=`
  <div class="nx-bg" style="background:linear-gradient(#f1f6e2,#d9e6c4)"></div>
  <div class="nx-bg" style="background:linear-gradient(#dbe3c4,#c2cfa4);${A('nm-b0',D)}"></div>
  <div class="nx-box">
    <svg viewBox="0 0 180 60" style="left:60px;top:226px;width:180px;height:60px;z-index:1;overflow:visible"><path d="M3 26Q2 58 90 58T177 26Z" fill="#9c4a35"/><ellipse cx="90" cy="26" rx="87" ry="22" fill="#c97b62"/><ellipse cx="90" cy="25" rx="68" ry="15" fill="#d99278" opacity=".75"/><path d="M90 26Q40 24 18 34M90 26Q140 24 162 34M90 26Q70 40 46 46M90 26Q110 40 134 46" stroke="#a9573f" stroke-width="1.6" fill="none" opacity=".55"/><circle cx="90" cy="26" r="5" fill="#9c4a35"/><circle cx="89" cy="25" r="2" fill="#d99278"/></svg>
    ${rings}
    <div class="nx-pl" style="--ph:180px;--pb:54px"><div class="nx-pa" style="${A('nm-sq',D)}">${plantImg(m)}</div></div>
    <div style="left:0;top:0;width:0;height:0;z-index:8;${A('nm-malin',D)}"><div style="left:265px;top:20px;position:absolute;width:0;height:0;transform-origin:0 0;${A('nm-mal',D)}"><svg viewBox="0 0 150 28" style="position:absolute;left:0;top:-14px;width:150px;height:28px;overflow:visible"><rect x="0" y="10" width="118" height="9" rx="4.5" fill="#b88a55"/><rect x="0" y="11" width="118" height="2.5" rx="1.2" fill="#fff" opacity=".3"/><ellipse cx="130" cy="14.5" rx="15" ry="13" fill="#d9a05b"/><ellipse cx="126" cy="10" rx="7" ry="4" fill="#fff" opacity=".4"/></svg></div></div>
    ${[[158,30,26],[112,36,24],[166,26,22],[120,32,20]].map(([x,y,sz],i)=>sfx(D,css,S[i]+.04,T('咚','Dong'),x,y,'#9bb25f',(i%2?-6:6),sz)).join('')}
    ${[[E.w1,26,34,6.9],[E.w2,206,44,7.3]].map(([w,x,y,t])=>`<div style="left:${x}px;top:${y}px;z-index:9;padding:6px 14px;border-radius:999px;background:#ffffffe6;color:#4f6a2c;font-weight:800;font-size:15px;box-shadow:0 3px 10px #4f6a2c26;animation:nm-word 1.1s ${EO} ${t}s both">${w}</div>`).join('')}
    <div style="left:90px;top:96px;width:120px;height:120px;border-radius:50%;border:2px solid #ffffffbb;z-index:2;animation:nx-ringloop 3.6s ease-out 7.4s infinite both"></div>
    ${dots}
  </div>`;
  return{D,css:css.join(''),html};
}
};

/* =====================================================
 * 文案（中 / English）。gains = 「收获」小标签；w1/w2 = 木鱼那一幕飘出来的字。
 * 安抚话语刻意只做陪伴，不判断、不承诺（符合项目「不做诊断、不替代人」的原则）。
 * ===================================================== */
const KINDS={
  water:{emo:'angry',def:'😠',tint:'#dff1ff',ok:'#2f86d6',
    veg:['愤怒辣椒','Angry chili'],act:['水管阀门 · 开水','Water valve · opened'],
    title:['你的愤怒辣椒被浇水了','Your angry chili got watered'],
    ring:['有人打开水管，浇灭了它身上的火','Someone opened the water and put out its fire'],
    ct:['火灭了，先喘口气','The fire’s out — take a breath'],
    cb:['有人替你的怒气降了温。生气不用被说服，只需要被接住；水慢慢流过的时候，你也可以慢慢呼一口气。','Someone cooled your anger down for you. Anger doesn’t need to be argued with, only held. While the water runs, you can let out a slow breath too.'],
    gains:[['降温','Cooled down'],['被接住','Held']]},
  sun:{emo:'miserable',def:'😔',tint:'#fff1c9',ok:'#e0952c',
    veg:['悲伤茄子','Sad eggplant'],act:['阳光滑块 · 照射','Sunshine slider · shone'],
    title:['你的悲伤茄子被阳光照到了','Your sad eggplant got some sunshine'],
    ring:['它变成了一个气球，轻轻飞走了','It turned into a balloon and floated away'],
    ct:['难过被轻轻托起','The sadness was lifted, gently'],
    cb:['有人把阳光推到了你的茄子身上。它变成气球飞向天空：重量被托起了一会儿。它不需要消失，只是可以先飞一飞。','Someone slid the sunshine over your eggplant. It became a balloon and drifted up — the weight was lifted for a while. It doesn’t have to disappear; it can just float for now.'],
    gains:[['变轻','Lighter'],['被照亮','Lit up']]},
  poke:{emo:'calm',def:'😐',tint:'#fbe9ee',ok:'#d9708a',
    veg:['平静蘑菇','Calm mushroom'],act:['手指戳戳 · 轻戳','Finger poke · gentle poke'],
    title:['你的平静蘑菇被戳了戳','Your calm mushroom got a gentle poke'],
    ring:['有人路过，轻轻戳了它三下','Someone passing by gave it three gentle pokes'],
    ct:['有人路过，注意到了你','Someone passed by and noticed you'],
    cb:['不用说话也没关系。一根手指轻轻戳了戳你的蘑菇，意思是：我看见你了，你不是一个人在这里。','No need to say anything. A finger gently poked your mushroom, which means: I see you — you’re not here alone.'],
    gains:[['被注意到','Noticed'],['有人陪','Company']]},
  heat:{emo:'optimistic',def:'😄',tint:'#ffe9b8',ok:'#e07a1f',
    veg:['开心玉米','Happy corn'],act:['加热火 · 加热','Heater · heated up'],
    title:['你的开心玉米被加热了','Your happy corn got heated up'],
    ring:['“啪！”它爆成了一朵爆米花','“Pop!” It burst into popcorn'],
    ct:['开心被放大了','Your joy got bigger'],
    cb:['有人给你的好心情加了把火，啪的一声炸开了花。开心可以更大、更蓬松，也可以分给路过的人。','Someone added a little fire to your good mood and — pop! — it burst into bloom. Joy can get bigger and fluffier, and it can be shared with whoever passes by.'],
    gains:[['开心翻倍','Joy ×2'],['被分享','Shared']]},
  hammer:{emo:'relaxed',def:'😌',tint:'#e4edd0',ok:'#5f8a3c',
    veg:['放松卷心菜','Relaxed cabbage'],act:['锤子 · 敲木鱼','Hammer · tapped the wooden fish'],
    title:['你的放松卷心菜被敲响了','Your relaxed cabbage was struck'],
    ring:['咚——有人敲了敲它的木鱼','Dong — someone tapped its wooden fish'],
    ct:['收获安静与平静','You received quiet and calm'],
    cb:['一声一声，慢下来。有人替你敲响了木鱼，这份安静和平静送给你，不用做什么，收下就好。','One tap at a time, slowing down. Someone struck the wooden fish for you — this quiet and calm are yours. Nothing to do; just take them in.'],
    gains:[['安静','Quiet'],['平静','Calm']]}
};
const ORDER=['water','sun','poke','heat','hammer'];
const pick=(k,i)=>KINDS[k][i][EN()?1:0];

// 这位用户自己种过的同类蔬菜（最近一次）；没有就用默认那张
function myMood(k){
  const K=KINDS[k];let r=null;
  try{const all=load();for(let i=all.length-1;i>=0;i--){if(all[i].emotion===K.emo&&all[i].emoji&&moodOf(all[i].emoji)){r=all[i];break}}}catch(e){}
  return moodOf(r?r.emoji:K.def);
}

/* =====================================================
 * 渲染
 * st = {kind, phase:'ring'|'view', got, t}；api = {render, close, lang}
 * ===================================================== */
const hm=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
const chips=st=>`<div class="nx-demo">${ORDER.map(k=>`<button data-k="${k}" class="${k===st.kind?'on':''}" aria-label="${pick(k,'veg')}"><img src="${myMood(k).img}" alt="">${pick(k,'act').split(' · ')[0]}</button>`).join('')}</div>`;
const top=()=>`<div class="topbar"><button class="nx-back" id="nx-back">‹ ${T('返回','Back')}</button><div style="flex:1"></div><button class="lang" id="b-lang">${EN()?'中文':'EN'}</button></div>`;

function drawRing(st){
  const k=st.kind,d=new Date(st.t);
  return `${top()}${chips(st)}
  <div class="nx-lock">
    <div class="lk-date">${d.toLocaleDateString(EN()?'en-US':'zh-CN',{month:'long',day:'numeric',weekday:'long'})}</div>
    <div class="lk-time">${hm(d)}</div>
    <div class="nx-banner" id="nx-banner" role="button" tabindex="0">
      <img class="ic" src="icon-192.png" alt="">
      <div class="tx"><div class="hd"><span>${T('情绪菜园','Emotion Garden')}</span><span>${T('现在','now')}</span></div>
        <b>${pick(k,'title')}</b><small>${T('公共装置 · ','Public installation · ')}${pick(k,'ring')}</small></div>
    </div>
    <div class="lk-hint">${T('点一下通知，看看发生了什么','Tap the notification to see what happened')}</div>
    <div class="lk-veg"><img src="${myMood(k).img}" alt=""></div>
  </div>`;
}

function stageHTML(k,m){
  const b=BUILD[k](m,{w1:T('安静','Quiet'),w2:T('平静','Calm')});
  return `<div class="nx-stage" id="nx-stage" data-k="${k}"><style>${b.css}</style>${b.html}<button class="nx-replay" id="nx-replay">↻ ${T('重播','Replay')}</button></div>`;
}

function drawView(st){
  const k=st.kind,K=KINDS[k],m=myMood(k),d=new Date(st.t);
  return `${top()}${chips(st)}
  <div class="nx-view" style="--tint:${K.tint};--ok:${K.ok}">
    <h1>${pick(k,'title')}</h1>
    <div class="nx-who"><i></i>${T('公共装置','Public installation')} · ${T('刚刚','just now')}</div>
    ${stageHTML(k,m)}
    <div style="height:14px"></div>
    <div class="nx-card"><div class="nx-gift"><div class="gi">💌</div><div><small class="small" style="text-align:left;display:block;margin:0 0 2px">${T('你收到了一份心情的安抚','You received a little comfort')}</small><b>${pick(k,'ct')}</b><p>${pick(k,'cb')}</p></div></div>
      <div class="nx-gains">${K.gains.map(g=>`<span>${g[EN()?1:0]}</span>`).join('')}</div></div>
    <div class="nx-card">
      <div class="kv"><span>${T('互动','Interaction')}</span><b>${pick(k,'act')}</b></div>
      <div class="kv"><span>${T('你的植物','Your plant')}</span><b>${vegTag(m)} ${EN()?m.en:m.zh}</b></div>
      <div class="kv"><span>${T('来自','From')}</span><b>${T('一位路过的人','Someone passing by')}</b></div>
      <div class="kv"><span>${T('时间','Time')}</span><b>${hm(d)}</b></div>
    </div>
    <button class="nx-take ${st.got?'got':''}" id="nx-take">${st.got?T('已收进心情盒 ✓','Kept in your mood box ✓'):T('收下这份安抚','Take this comfort')}</button>
    <button class="ghost" id="nx-back2">${T('返回','Back')}</button>
  </div>`;
}

function hearts(btn){
  for(let i=0;i<7;i++){const h=document.createElement('span');h.className='nx-heart';h.textContent=['💚','💛','🤍','💗'][i%4];
    h.style.cssText=`--hx:${(rnd(i)-.5)*160|0}px;--hr:${(rnd(i+5)-.5)*50|0}deg;animation-delay:${i*.07}s;left:${20+rnd(i+2)*60}%`;btn.appendChild(h);setTimeout(()=>h.remove(),1800)}
}

window.Notice={
  kinds:ORDER,
  draw(root,st,api){
    if(!KINDS[st.kind])st.kind='water';
    if(!st.phase)st.phase='ring';
    if(!st.t)st.t=Date.now();
    root.innerHTML=st.phase==='ring'?drawRing(st):drawView(st);
    const $=id=>document.getElementById(id);
    $('b-lang').onclick=api.lang;
    $('nx-back').onclick=api.close;
    root.querySelectorAll('.nx-demo [data-k]').forEach(b=>b.onclick=()=>{st.kind=b.dataset.k;st.phase='ring';st.got=false;st.t=Date.now();api.render()});
    if(st.phase==='ring'){
      const go=()=>{st.phase='view';api.render()};
      $('nx-banner').onclick=go;
      $('nx-banner').onkeydown=e=>{if(e.key==='Enter'||e.key===' ')go()};
      try{if(navigator.vibrate&&navigator.userActivation&&navigator.userActivation.hasBeenActive)navigator.vibrate([60,50,60])}catch(e){}
    }else{
      $('nx-back2').onclick=api.close;
      const replay=()=>{const tmp=document.createElement('div');tmp.innerHTML=stageHTML(st.kind,myMood(st.kind));$('nx-stage').replaceWith(tmp.firstElementChild);$('nx-replay').onclick=replay};   // 整块舞台重建 = 动画从头播
      $('nx-replay').onclick=replay;
      $('nx-take').onclick=function(){if(st.got)return;st.got=true;hearts(this);setTimeout(()=>{this.classList.add('got');this.textContent=T('已收进心情盒 ✓','Kept in your mood box ✓')},500)};
    }
  }
};
})();
