/* Vege Motion: original plant art plus dedicated integrated-helmet work variants; individually measured landmarks. */
(function(global){
'use strict';
const TAU=Math.PI*2,DURATION={crazy:.54,luck:2.56,wave:1.6,tired:2.04,brick:1.68};
const FOAM_Y=[427,392,367,335,316,350,389,407,431,421,407,378,389,383,401,403];
function foamY(time){const t=((time%1.6)+1.6)%1.6/1.6*16,i=Math.floor(t),f=t-i,a=FOAM_Y[(i+15)%16],b=FOAM_Y[i%16],d=FOAM_Y[(i+1)%16],e=FOAM_Y[(i+2)%16];return .5*((2*b)+(-a+d)*f+(2*a-5*b+4*d-e)*f*f+(-a+3*b-3*d+e)*f*f*f);}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const image=async url=>{const im=new Image();const src=new URL(url,location.href);src.searchParams.set('v','motion8');im.src=src.href;await im.decode();return im;};
const surface=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function fit(im,maxW,maxH){const s=Math.min(maxW/im.width,maxH/im.height);return [im.width*s,im.height*s];}
function point(p,x,y){const u=(x-.5)*p.w*p.sx,v=(y-.5)*p.h*p.sy,cs=Math.cos(p.angle),sn=Math.sin(p.angle);return {x:p.x+u*cs-v*sn,y:p.y+u*sn+v*cs};}
function bounds(p){const pts=[[0,0],[1,0],[1,1],[0,1]].map(v=>point(p,...v));return {left:Math.min(...pts.map(v=>v.x)),right:Math.max(...pts.map(v=>v.x)),top:Math.min(...pts.map(v=>v.y)),bottom:Math.max(...pts.map(v=>v.y))};}
function localPoint(p,x,y){const dx=x-p.x,dy=y-p.y,cs=Math.cos(p.angle),sn=Math.sin(p.angle);return {x:(dx*cs+dy*sn)/(p.w*p.sx)+.5,y:(-dx*sn+dy*cs)/(p.h*p.sy)+.5};}
const REFERENCE_CURVES={"workX":[0.0,5.66402,11.73081,12.84485,13.20377,7.49191,6.31242,2.66817,0.18742,-0.19139,-0.08233,1.63049],"workY":[0.0,8.96202,27.18739,43.8191,45.58554,39.64226,29.39321,16.24495,6.92463,1.96449,0.96778,0.49641],"workAngle":[0.0,0.07075,0.17994,0.21546,0.289,0.2434,0.17724,0.10975,0.02925,0.00065,0.00697,0.00733],"tiredAngle":[0.0,0.11177,0.21348,0.38849,0.49097,0.64405,0.80529,0.90105,0.93979,0.98128,1.00733,1.00788]};
function referenceAt(values,phase,loop=false){
 const n=values.length,t=phase*n,i=Math.floor(t),u=t-i;if(!loop&&i>=n-1)return values[n-1];const get=k=>values[loop?(k+n)%n:clamp(k,0,n-1)],a=get(i-1),b=get(i),c=get(i+1),d=get(i+2);return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u);
}
function alphaHull(raw,w,h){
 const pts=[];for(let y=0;y<h;y++){let first=-1,last=-1;for(let x=0;x<w;x++)if(raw[(y*w+x)*4+3]>80){if(first<0)first=x;last=x;}if(first>=0){pts.push([first/w,y/h]);pts.push([last/w,y/h]);}}
 pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),lower=[],upper=[];for(const v of pts){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),v)<=0)lower.pop();lower.push(v);}for(let i=pts.length-1;i>=0;i--){const v=pts[i];while(upper.length>1&&cross(upper.at(-2),upper.at(-1),v)<=0)upper.pop();upper.push(v);}lower.pop();upper.pop();return lower.concat(upper);
}
function poseFor(im,profile,state,time){
 const q=TAU*(((time%DURATION[state])+DURATION[state])%DURATION[state])/DURATION[state];
 let [w,h]=fit(im,302,342),p={x:240,y:246,w,h,angle:0,sx:1,sy:1};
 if(state==='crazy'){
  [w,h]=fit(im,282,306);Object.assign(p,{w,h,x:240+23*Math.sin(q*3)+6*Math.sin(q*5),y:245+12*Math.sin(q*4)+4*Math.sin(q*7),angle:.33*Math.sin(q*2)+.1*Math.sin(q*5),sx:1+.075*Math.sin(q*2),sy:1-.07*Math.sin(q*2)});
 }else if(state==='luck'){[w,h]=fit(im,306,368);Object.assign(p,{w,h,y:246+4*Math.sin(q),angle:.025*Math.sin(q)});
 }else if(state==='wave'){
  [w,h]=fit(im,300,342);Object.assign(p,{w,h,angle:.07*Math.sin(q)});const base=profile.base||[.5,.98],v=point({...p,x:0,y:0},...base);p.x=240+7*Math.sin(q)-v.x;const surf=foamY(time),depth=Math.min(26+.35*(427-surf),profile.waveImmersionMax||72);p.y=surf+depth-v.y;
 }else if(state==='tired'){
  [w,h]=fit(im,280,310);const phase=((time%DURATION.tired)+DURATION.tired)%DURATION.tired/DURATION.tired,tilt=clamp(referenceAt(REFERENCE_CURVES.tiredAngle,phase),0,1.02),collapse=clamp(tilt/1.008,0,1),deform=smooth(collapse);
  Object.assign(p,{w,h,angle:.02+tilt*(profile.tiredAngleScale??1),sx:1-(profile.tiredNarrow??.04)*deform-.0007*Math.sin(q*2),sy:1+(profile.tiredStretch??.02)*deform+.0015*Math.sin(q*2),collapse});
  // Support the real painted contour, rather than an empty corner of the image rectangle.
  const hull=profile.supportHull||[[0,0],[1,0],[1,1],[0,1]],support=Math.max(...hull.map(v=>point({...p,x:0,y:0},...v).y));p.y=422-support+.35*Math.sin(q);p.x=240;
 }else if(state==='brick'){
  [w,h]=fit(im,280,profile.workHeight||302);const eyes=profile.eyes,ex=(eyes[0][0]+eyes[1][0])/2;
  const phase=((time%DURATION.brick)+DURATION.brick)%DURATION.brick/DURATION.brick;
  const dx=referenceAt(REFERENCE_CURVES.workX,phase,true),dy=referenceAt(REFERENCE_CURVES.workY,phase,true),tilt=referenceAt(REFERENCE_CURVES.workAngle,phase,true),slump=clamp(dy/45.6,0,1);
  Object.assign(p,{w,h,x:clamp(225-(ex-.5)*w,w/2+18,480-w/2-18),y:392-h/2,angle:0});
  // Rigid forward slip: preserve body and helmet proportions throughout the movement.
  const restHead=point(p,...profile.head);p.angle=tilt+.005*Math.sin(q);p.sx=p.sy=1;
  const headOffset=point({...p,x:0,y:0},...profile.head);p.x=restHead.x-headOffset.x+dx*h/269+.35*Math.sin(q);p.y=restHead.y-headOffset.y+dy*h/269+.8*Math.sin(q*2);p.slump=slump;


 }
 return p;
}
function opacity(state,time){if(state!=='luck')return 1;const p=((time%DURATION.luck)+DURATION.luck)%DURATION.luck/DURATION.luck;return smooth(p/.28)*(1-smooth((p-.80)/.20));}
function faceLayers(im,p){
 const w=im.width,h=im.height,src=surface(w,h),z=src.getContext('2d');z.drawImage(im,0,0);const raw=z.getImageData(0,0,w,h).data;
 const shadow=surface(w,h),s=shadow.getContext('2d'),off=p.shadowOffset||[0,.045],rad=p.shadowRadius||[.062,.024],alpha=p.shadowOpacity||.43;
 const specs=p.eyeShadows||p.eyes.map(eye=>({center:[eye[0]+off[0],eye[1]+off[1]],radius:rad,angle:p.shadowAngle||0,opacity:alpha}));
 for(const spec of specs){s.save();if(spec.minY!==undefined){s.beginPath();s.rect(0,spec.minY*h,w,h);s.clip();}s.translate(spec.center[0]*w,spec.center[1]*h);s.rotate(spec.angle||0);s.scale(spec.radius[0]*w,spec.radius[1]*h);const a=spec.opacity??alpha,g=s.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(31,28,39,${a})`);g.addColorStop(.5,`rgba(31,28,39,${a*.66})`);g.addColorStop(1,'rgba(31,28,39,0)');s.fillStyle=g;s.beginPath();s.arc(0,0,1,0,TAU);s.fill();s.restore();}
 if(p.shadowClip!==false){s.globalCompositeOperation='destination-in';s.drawImage(im,0,0);}
 {const pixels=s.getImageData(0,0,w,h);for(let j=0;j<raw.length;j+=4){const r=raw[j],g=raw[j+1],b=raw[j+2],blue=p.protectBlue!==false&&b>r*1.12&&g>r*.85,feature=p.protectEyes&&((r<150&&r>g*1.35&&b<g*.85)||(r<80&&g<110&&b<80)),whiteEye=(p.protectWhiteEyes||p.shadowProtectWhites)&&Math.min(r,g,b)>190&&Math.max(r,g,b)-Math.min(r,g,b)<40;if(blue||feature||whiteEye||(p.shadowProtectPink&&r>150&&r>g*1.2&&b>g*.9))pixels.data[j+3]=0;}s.putImageData(pixels,0,0);}
 const light=surface(w,h),l=light.getContext('2d'),xs=p.eyes.map(e=>e[0]),ys=p.eyes.map(e=>e[1]);
 const quad=p.screenQuad||[[Math.min(...xs)-.11,Math.min(...ys)-.065],[Math.max(...xs)+.14,Math.min(...ys)-.04],[Math.max(...xs)+.125,Math.max(...ys)+.245],[Math.min(...xs)-.125,Math.max(...ys)+.22]],strength=p.screenStrength||.44;
 // A screen is an area light: broad penumbra, brighter toward its lower-right source,
 // modulated by the existing material. Keep a soft rectangular footprint without a pasted tile.
 const mask=surface(w,h),mz=mask.getContext('2d'),feather=Math.max(3,h/302*9);
 mz.filter=`blur(${feather}px)`;mz.beginPath();quad.forEach(([x,y],i)=>i?mz.lineTo(x*w,y*h):mz.moveTo(x*w,y*h));mz.closePath();mz.fillStyle='white';mz.fill();
 const ma=mz.getImageData(0,0,w,h).data,lit=l.createImageData(w,h),minX=Math.min(...quad.map(v=>v[0])),maxX=Math.max(...quad.map(v=>v[0])),minY=Math.min(...quad.map(v=>v[1])),maxY=Math.max(...quad.map(v=>v[1]));
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
  const j=(yy*w+xx)*4,u=clamp((xx/w-minX)/(maxX-minX),0,1),v=clamp((yy/h-minY)/(maxY-minY),0,1),lum=(raw[j]*.2126+raw[j+1]*.7152+raw[j+2]*.0722)/255;
  const direction=.28+.72*(.28*u+.72*v),material=.22+.78*smooth(lum/.62),falloff=.78+.22*Math.sqrt(Math.max(0,1-Math.pow((u-.62)/.8,2)));
  lit.data[j]=225;lit.data[j+1]=237;lit.data[j+2]=255;lit.data[j+3]=ma[j+3]*(raw[j+3]/255)*strength*.88*direction*material*falloff;
 }
 l.putImageData(lit,0,0);

 const foreground=surface(w,h),f=foreground.getContext('2d');
 if(p.foreground){f.drawImage(im,0,0);const px=f.getImageData(0,0,w,h);for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const j=(yy*w+xx)*4,r=raw[j],g=raw[j+1],b=raw[j+2];let keep=false;if(p.foreground==='blue')keep=b>r*1.12&&b>g*1.02&&g>r*.85;if(p.foreground==='pink')keep=r>g*1.1&&b>g*1.02;if(p.foreground==='explosion')keep=yy/h<.40&&((Math.min(r,g,b)>160&&Math.max(r,g,b)-Math.min(r,g,b)<65)||(r>180&&g>r*.38&&g<r*.85&&b<120));if(!keep)px.data[j+3]=0;}f.putImageData(px,0,0);}
 return {shadow,light,foreground,raw};
}
const ZZZ_BOUNDS=[null,null,null,[3,224,28,247],[15,150,62,202],[10,123,71,185],[6,90,105,177],[2,80,99,172],[6,51,107,151],[13,42,114,140],[18,21,117,126],[13,2,121,108]];
function zzzGeometry(im,index){
 const box=ZZZ_BOUNDS[index];if(!box)return null;const [x0,y0,x1,y1]=box,c=surface(im.width,im.height),z=c.getContext('2d');z.drawImage(im,0,0);const px=z.getImageData(0,0,im.width,im.height).data,scale=112/108,w=(x1-x0)*scale,h=(y1-y0)*scale,ink=[[0,0]];
 for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2)if(px[(y*im.width+x)*4+3]>96)ink.push([(x-x0)*scale-w/2,(y-y0)*scale-h/2]);return {box,w,h,ink};
}
function closeZzz(p,profile,shape,phase){
 const poly=profile.supportHull.map(v=>point(p,...v)),eyes=profile.eyes.map(v=>point(p,...v)),head={x:(eyes[0].x+eyes[1].x)/2,y:(eyes[0].y+eyes[1].y)/2},float=6*smooth((phase-.25)/.75),directions=[[-.64,-.7683749085],[-.92,-.3919183588],[-.22,-.9754998719],[.64,-.7683749085]],choices=[];
 // Exploding crown fragments leave a wide empty wedge above the face; use the closer side slot.
 if(profile.foreground==='explosion')directions.unshift(directions.splice(1,1)[0]);
 for(let direction=0;direction<directions.length;direction++){
  const [dx,dy]=directions[direction];let exit=0;
  for(const [ox,oy] of shape.ink){let lo=-Infinity,hi=Infinity,valid=true;const x=head.x+ox,y=head.y+oy;
   for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],ex=b.x-a.x,ey=b.y-a.y,A=ex*(y-a.y)-ey*(x-a.x),B=ex*dy-ey*dx;if(Math.abs(B)<1e-8){if(A<0){valid=false;break;}}else if(B>0)lo=Math.max(lo,-A/B);else hi=Math.min(hi,-A/B);if(lo>hi){valid=false;break;}}
   if(valid&&hi>=Math.max(0,lo)&&Number.isFinite(hi))exit=Math.max(exit,hi);
  }
  const distance=exit+8+float-(profile.zzzInset||0)*smooth((phase-.5)/.3),cx=head.x+dx*distance,cy=head.y+dy*distance,rect={x:cx-shape.w/2,y:cy-shape.h/2,width:shape.w,height:shape.h};choices.push({...rect,direction,float,head,contactGap:8+float});
  if(rect.x>=6&&rect.y>=6&&rect.x+rect.width<=474&&rect.y+rect.height<=474)return choices.at(-1);
 }
 const best=choices.reduce((a,b)=>{const overflow=r=>Math.max(0,6-r.x,6-r.y,r.x+r.width-474,r.y+r.height-474);return overflow(b)<overflow(a)?b:a;});best.x=clamp(best.x,6,474-best.width);best.y=clamp(best.y,6,474-best.height);return best;
}
class Renderer{
 constructor(canvas,base){this.canvas=canvas;this.ctx=canvas.getContext('2d',{willReadFrequently:true});this.base=base;this.cache=new Map();this.selected=null;}
 async init(){
  const [catalog,profiles,meta,brickRigs]=await Promise.all(['catalog.json','profiles.json','fx/metadata.json','brick-rigs.json'].map(f=>fetch(new URL(f,this.base),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Missing '+f);return r.json();})));this.catalog=catalog;this.profiles=profiles;this.meta=meta;this.brickRigs=brickRigs;this.fx={};
  await Promise.all(['hat','monitor','star','clover','luck-rays'].map(async n=>{this.fx[n]=await image(new URL('fx/'+n+'.png',this.base));}));
  await Promise.all([['ocean',16],['zzz',12],['sweat',12]].map(async([name,n])=>{this.fx[name]=await Promise.all(Array.from({length:n},(_,i)=>image(new URL('fx/'+name+'-'+i+'.png',this.base))));}));this.zzzShapes=this.fx.zzz.map(zzzGeometry);return this;
 }
 async select(id){if(!this.profiles[id])throw Error('Unknown plant '+id);if(!this.cache.has(id)){const row=this.catalog.find(r=>r.id===id),im=await image(new URL(row.image,this.base)),profile=this.profiles[id];const layers=faceLayers(im,profile),item={im,profile:{...profile,supportHull:alphaHull(layers.raw,im.width,im.height)},...layers};if(this.brickRigs[id]){const rig=this.brickRigs[id],workIm=await image(new URL(rig.image,this.base)),workProfile={...profile,...rig};item.work={im:workIm,profile:workProfile,...faceLayers(workIm,workProfile)};}this.cache.set(id,item);}this.selected=id;return this;}
 activeItem(state){const item=this.cache.get(this.selected);return state==='brick'&&item.work?item.work:item;}
 actor(p,state,time,alpha=1){const c=this.ctx,item=this.activeItem(state),im=item.im;c.save();c.globalAlpha=alpha;c.translate(p.x,p.y);c.rotate(p.angle);c.scale(p.sx,p.sy);c.translate(-p.w/2,-p.h/2);
  if(state==='crazy'){const slice=Math.max(2,Math.round(im.height/180));for(let yy=0;yy<im.height;yy+=slice){const hh=Math.min(slice,im.height-yy),shift=p.w*.032*Math.sin(yy/im.height*TAU*2.7+time*TAU/.54*3);c.drawImage(im,0,yy,im.width,hh,shift,yy/im.height*p.h,p.w,hh/im.height*p.h+.5);}}
  else{c.drawImage(im,0,0,p.w,p.h);if(state==='tired')c.drawImage(item.shadow,0,0,p.w,p.h);if(state==='brick'){c.save();c.globalCompositeOperation='screen';c.globalAlpha*=.96+.04*Math.sin(time*TAU/1.68);c.drawImage(item.light,0,0,p.w,p.h);c.restore();}}c.restore();
 }
 collides(x,y,r,p){const item=this.cache.get(this.selected),w=item.im.width,h=item.im.height;let n=0,active=0;for(let yy=y-r;yy<=y+r;yy+=6)for(let xx=x-r;xx<=x+r;xx+=6){n++;const v=localPoint(p,xx,yy);if(v.x>=0&&v.x<=1&&v.y>=0&&v.y<=1){const j=(Math.min(h-1,Math.floor(v.y*h))*w+Math.min(w-1,Math.floor(v.x*w)))*4;if(item.raw[j+3]>120)active++;}}return active/Math.max(n,1);}
 place(candidates,r,p){let best=candidates[0],score=Infinity;for(const pos of candidates){const x=clamp(pos[0],r+6,474-r),y=clamp(pos[1],r+6,474-r),s=this.collides(x,y,r,p);if(s<score){score=s;best=[x,y];}if(score===0)break;}return best;}
 tex(im,x,y,w,h,angle=0,alpha=1){const c=this.ctx;c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(angle);c.drawImage(im,-w/2,-h/2,w,h);c.restore();}
 rays(time,alpha){if(alpha<=0)return;const c=this.ctx,phase=((time%DURATION.luck)+DURATION.luck)%DURATION.luck/DURATION.luck,q=phase*TAU,scale=(.64+.36*smooth(phase/.28))*(.995+.005*Math.sin(q));c.save();c.globalAlpha=alpha;c.translate(240,246);c.rotate(.015*Math.sin(q));c.scale(scale,scale);c.drawImage(this.fx['luck-rays'],-240,-246,480,480);c.restore();}

 draw(state,time,{guides=false}={}){
  if(!this.selected)throw Error('Select a plant first');if(!(state in DURATION))throw Error('Unknown motion');const c=this.ctx,item=this.activeItem(state),profile=item.profile,p=poseFor(item.im,profile,state,time),bb=bounds(p),phase=((time%DURATION[state])+DURATION[state])%DURATION[state]/DURATION[state],q=phase*TAU,eyes=profile.eyes.map(e=>point(p,...e));c.clearRect(0,0,480,480);
  if(state==='luck')this.rays(time,opacity(state,time));

  if(state==='tired'){c.save();c.globalAlpha=.09;c.fillStyle='#647060';c.beginPath();c.ellipse(240,427,83+25*(1-Math.cos(q))/2,9,0,0,TAU);c.fill();c.restore();}
  if(state==='crazy')for(const [lag,alpha]of [[.026,.055],[.014,.10]])this.actor(poseFor(item.im,profile,state,time-lag),state,time-lag,alpha);
  this.actor(p,state,time);
  let hatInfo=null,monitorInfo=null,zzzInfo=null;
  if(state==='crazy'){
   const a=this.place([[bb.left-29,bb.top+32],[63,96],[50,150],[85,52]],28,p);c.save();c.translate(a[0]+3*Math.sin(q*4),a[1]+2*Math.cos(q*4));c.strokeStyle='#dc7e9d';c.lineWidth=6;c.lineCap='round';for(let i=0;i<4;i++){c.save();c.rotate(i*TAU/4);c.beginPath();c.moveTo(-17,-24);c.quadraticCurveTo(0,-5,17,-24);c.stroke();c.restore();}c.restore();
   const wind=this.place([[bb.left-20,p.y+20],[42,250],[45,300],[55,200]],18,p);c.save();c.translate(wind[0]+3.5*Math.sin(q*4),wind[1]+2*Math.cos(q*4));c.globalAlpha=.55+.45*(.5+.5*Math.sin(q*2));c.strokeStyle='#98b95b';c.lineWidth=5;c.lineCap='round';for(let i=0;i<2;i++){c.beginPath();c.moveTo(-2+i*12,-16);c.quadraticCurveTo(-17+i*12,0,-14+i*12,16);c.stroke();}c.restore();
   const spiral=this.place([[bb.right+22,bb.bottom-25],[435,391],[429,341],[400,438]],24,p);c.save();c.translate(spiral[0],spiral[1]);c.rotate(.16*Math.sin(q));c.strokeStyle='#a47ecb';c.lineWidth=5;c.lineCap='round';c.beginPath();for(let i=0;i<=90;i++){const a=i/90*TAU*1.6,r=2+i*.24;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();c.restore();
  }else if(state==='luck'){
   // Reference composition: one large upper-left star, its small companion, and a lower-right star.
   const mainY=p.y-p.h*.18,main=this.place([[bb.left+8,mainY],[bb.left-42,mainY],[57,mainY]],40,p),small=this.place([[main[0]+55,main[1]-52],[main[0]+48,main[1]-65],[85,87]],17,p),lower=this.place([[bb.right-10,p.y+p.h*.31],[bb.right+32,p.y+p.h*.28],[426,367]],29,p);
   [[main,84],[small,35],[lower,60]].forEach(([pos,size],i)=>{const pulse=.94+.06*Math.sin(q*2+i*.8);this.tex(this.fx.star,pos[0],pos[1],size*pulse,size*pulse*this.fx.star.height/this.fx.star.width,0,.94+.06*Math.cos(q*2+i));});
   const face={left:Math.min(...eyes.map(e=>e.x))-24,right:Math.max(...eyes.map(e=>e.x))+24,top:Math.min(...eyes.map(e=>e.y))-24,bottom:Math.max(...eyes.map(e=>e.y))+65};
   [{birth:.025,life:.915,side:1},{birth:.20,life:.74,side:-1},{birth:.40,life:.56,side:1}].forEach((leaf,i)=>{const f=(phase-leaf.birth)/leaf.life;if(f<=0||f>=1)return;let travel=i===0?clamp((phase-leaf.birth)/.80,0,1):f,progress=i===0?.3*travel+.7*travel*travel:travel*(1.25-.25*travel),size=(i===2?36:86)*(.30+.70*Math.sin(Math.PI*travel)),alpha=smooth(f/.12)*(1-smooth((f-.86)/.14)),x,y;
    if(i===0){x=240+154*progress+16*Math.sin(Math.PI*travel)-155*smooth((travel-.64)/.36);y=Math.max(15,480-530*progress);}else if(i===1){x=200-108*f;y=480-250*progress;}else{x=402+10*Math.sin(Math.PI*f);y=200-215*f;}
    if(y+size*.6>face.top&&y-size*.6<face.bottom){if(leaf.side>0)x=Math.max(x,face.right+size*.48);else x=Math.min(x,face.left-size*.48);}
    x=clamp(x,size*.55+5,475-size*.55);this.tex(this.fx.clover,x,y,size,size*this.fx.clover.height/this.fx.clover.width,leaf.side*(-.18+.26*Math.sin(q+i)),alpha);
   });

  }else if(state==='wave'){
   c.drawImage(this.fx.ocean[Math.floor(phase*16)%16],0,0,480,480);
   for(let i=0;i<3;i++){const f=(phase+i/3)%1,alpha=Math.sin(Math.PI*f),x=i===1?84:62+i*176,y=435-245*f;if(i===1)this.glasses(x+7*Math.sin(q),y,.85,-.25,alpha);else{c.save();c.globalAlpha=alpha;c.font='bold 43px Arial';c.fillStyle='#ad8bdc';c.textAlign='center';c.fillText('♫',x+4*Math.sin(q),y);c.restore();}}
  }else if(state==='tired'){
   const frame=Math.floor(phase*12)%12,shape=this.zzzShapes[frame];if(shape){zzzInfo={...closeZzz(p,profile,shape,phase),frame};const [x0,y0,x1,y1]=shape.box;c.drawImage(this.fx.zzz[frame],x0,y0,x1-x0,y1-y0,zzzInfo.x,zzzInfo.y,zzzInfo.width,zzzInfo.height);}
  }else if(state==='brick'){
   const anchor=point(p,...profile.head),w=p.w*profile.hatWidth,h=w*this.meta.hat.ratio,angle=p.angle+(profile.hatAngle||0);if(!profile.hatBaked){c.save();c.translate(anchor.x,anchor.y);c.rotate(angle);c.drawImage(this.fx.hat,-w/2,-h*.90,w,h);c.restore();}hatInfo={anchor,width:w,height:h,angle,baked:!!profile.hatBaked};
   if(profile.foreground){c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.scale(p.sx,p.sy);c.drawImage(item.foreground,-p.w/2,-p.h/2,p.w,p.h);c.restore();}
   const resting=poseFor(item.im,profile,'brick',0),restEyes=profile.eyes.map(e=>point(resting,...e)),monitorY=Math.max(258,Math.max(...restEyes.map(e=>e.y))+10),monitorW=Math.min(286,(466-monitorY)/this.meta.monitor.ratio);c.drawImage(this.fx.monitor,426-monitorW,monitorY,monitorW,monitorW*this.meta.monitor.ratio);monitorInfo={x:426-monitorW,y:monitorY,width:monitorW,height:monitorW*this.meta.monitor.ratio};
   const sx=clamp(anchor.x+w*.57+9,315,385),sy=clamp(anchor.y-145,4,150);c.drawImage(this.fx.sweat[Math.floor(phase*12)%12],sx,sy,90,90*this.meta.sweat.ratio);
  }
  const shadows=profile.eyeShadows?profile.eyeShadows.map(e=>point(p,...e.center)):profile.eyes.map(e=>point(p,e[0]+profile.shadowOffset[0],e[1]+profile.shadowOffset[1]));this.last={id:this.selected,state,time,phase,pose:p,bounds:bb,eyes,shadows,zzz:zzzInfo,hat:hatInfo,monitor:monitorInfo,waveSurface:state==='wave'?{foamY:foamY(time),baseY:point(p,...profile.base).y,layer:'foreground'}:null,workSlump:state==='brick'?p.slump:0,tiredCollapse:state==='tired'?p.collapse:0,glowOpacity:opacity(state,time)};
  if(guides)this.guides(this.last);return this.last;
 }
 glasses(x,y,scale,angle,alpha){const c=this.ctx;c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(angle);c.scale(scale,scale);c.lineCap='round';c.strokeStyle='#555f62';c.lineWidth=3;c.beginPath();c.moveTo(-25,-2);c.quadraticCurveTo(0,-15,25,-3);c.stroke();const g=c.createLinearGradient(-25,-8,25,12);g.addColorStop(0,'#a8b3b6');g.addColorStop(.45,'#6c777e');g.addColorStop(1,'#343a40');c.fillStyle=g;for(const xx of [-14,14]){c.beginPath();c.ellipse(xx,2,12,8,-.15,0,TAU);c.fill();c.strokeStyle='#bac5c9';c.lineWidth=1.4;c.stroke();c.beginPath();c.moveTo(xx-4,-3);c.lineTo(xx+1,6);c.stroke();}c.restore();}
 guides(data){const c=this.ctx;c.save();c.lineWidth=1.5;for(const e of data.eyes){c.strokeStyle='#f13d54';c.beginPath();c.arc(e.x,e.y,5,0,TAU);c.stroke();}for(const e of data.shadows){c.strokeStyle='#008cf0';c.beginPath();c.arc(e.x,e.y,7,0,TAU);c.stroke();}if(data.hat){c.strokeStyle='#15a267';c.beginPath();c.moveTo(data.hat.anchor.x-30,data.hat.anchor.y);c.lineTo(data.hat.anchor.x+30,data.hat.anchor.y);c.stroke();}c.restore();}
}
global.VegeMotion={durations:DURATION,poseFor,point,bounds,async create(canvas,{base='./'}={}){return new Renderer(canvas,new URL(base,location.href)).init();}};
})(window);
