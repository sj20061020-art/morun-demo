/* Local Canvas 2D presentation: real saved handwriting over an ink landscape.
 * No generated text or remote media. Shared by browser and WeChat Canvas 2D.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MorunInkReveal=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)};
function findInkBounds(canvas){const w=canvas.width,h=canvas.height;try{const d=canvas.getContext('2d').getImageData(0,0,w,h).data,step=w*h>1200000?3:2;let left=w,top=h,right=0,bottom=0;for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){const i=(y*w+x)*4;if(d[i+3]>20){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}if(right>=left){const pad=Math.max(12,Math.round(w*.04));left=Math.max(0,left-pad);top=Math.max(0,top-pad);return{x:left,y:top,w:Math.min(w-left,right-left+pad+step),h:Math.min(h-top,bottom-top+pad+step)}}}catch(e){}return{x:0,y:0,w,h}}
function rand(seed){return function(){seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296}}
class Scene{
 constructor(options){Object.assign(this,options);this.crop=this.crop||{x:0,y:0,w:this.work.width,h:this.work.height};const random=rand(52);this.grains=Array.from({length:340},()=>({x:random(),y:random(),a:.018+random()*.028}));this.drops=Array.from({length:11},(_,i)=>({x:.08+random()*.84,y:.66+random()*.25,r:.05+random()*.15,delay:i*.08,seed:Math.floor(random()*1000)}))}
 bloom(x,y,r,alpha,seed){if(alpha<=0||r<=0)return;const c=this.ctx,n=rand(seed);c.save();c.translate(x,y);c.beginPath();for(let i=0;i<=40;i++){const a=i*Math.PI/20,k=.86+n()*.17,px=Math.cos(a)*r*k,py=Math.sin(a)*r*k*.45;if(!i)c.moveTo(px,py);else c.lineTo(px,py)}c.closePath();const g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(61,83,72,'+alpha+')');g.addColorStop(.65,'rgba(101,123,109,'+alpha*.55+')');g.addColorStop(1,'rgba(140,155,141,0)');c.fillStyle=g;c.fill();c.restore()}
 mountain(y,size,alpha,seed,t){const c=this.ctx,w=this.width,h=this.height,n=rand(seed);c.save();c.globalAlpha=alpha;c.beginPath();c.moveTo(-w*.1,h);c.lineTo(-w*.1,h*y);let x=-w*.1;while(x<w*1.1){const next=x+w*(.12+n()*.12),peak=h*y-h*size*(.3+n()*.7);c.quadraticCurveTo(x+w*.04,peak,next,h*y+h*.025*(n()-.5));x=next}c.lineTo(w*1.1,h);c.closePath();c.fillStyle='#718579';c.fill();c.restore()}
 draw(elapsed){const c=this.ctx,w=this.width,h=this.height,t=clamp(elapsed/6400);c.clearRect(0,0,w,h);c.fillStyle='#F8F5EE';c.fillRect(0,0,w,h);for(const g of this.grains){c.fillStyle='rgba(97,83,63,'+g.a+')';c.fillRect(g.x*w,g.y*h,1,1)}
  // A soft ink bloom opens into mountains. Motion settles into a still composition.
  for(const d of this.drops){const p=ease((t-d.delay*.18)/.48);this.bloom(d.x*w,d.y*h,w*d.r*(.12+p),(.12+Math.sin(p*Math.PI)*.08)*p*(1-ease((t-.45)/.4)*.9),d.seed)}
  const mountains=ease((t-.07)/.4);if(!this.landscape){this.mountain(.76,.17,.1*mountains,16,t);this.mountain(.87,.12,.16*mountains,23,t);this.mountain(.97,.08,.17*mountains,81,t)}
  if(this.landscape){c.save();c.globalAlpha=.72*mountains;const ih=w*this.landscape.height/this.landscape.width;c.drawImage(this.landscape,0,h*.57,w,ih);c.restore()}
  const sun=ease((t-.16)/.28);c.save();c.globalAlpha=this.landscape?0:.13*sun;c.fillStyle='#A82020';c.beginPath();c.arc(w*.78,h*.2,w*.09,0,Math.PI*2);c.fill();c.restore();
  // Drifting translucent mist leaves ample blank paper around the handwriting.
  for(let i=0;i<3;i++){const drift=Math.sin(t*3+i)*w*.04;this.bloom(w*(.22+i*.3)+drift,h*(.76+i*.025),w*.35,.04*mountains,700+i)}
  const reveal=ease((t-.3)/.5),k=this.crop,availableW=w*.78,availableH=h*.57,scale=Math.min(availableW/k.w,availableH/k.h),dw=k.w*scale,dh=k.h*scale,x=(w-dw)/2,y=h*.12+(availableH-dh)/2;
  if(reveal>0){c.save();c.globalAlpha=ease(reveal*2);c.translate(w/2,h*.4);const settle=1+(1-reveal)*.035;c.scale(settle,settle);c.translate(-w/2,-h*.4);c.beginPath();const edge=y+(dh+32)*reveal-16;c.moveTo(x-8,y-12);c.lineTo(x+dw+8,y-12);c.lineTo(x+dw+8,edge);for(let i=20;i>=0;i--){const xx=x-8+(dw+16)*i/20,yy=edge+Math.sin(i*1.7)*6*(1-reveal);c.lineTo(xx,yy)}c.closePath();c.clip();c.drawImage(this.work,k.x,k.y,k.w,k.h,x,y,dw,dh);c.restore()}
  // The final seal marks the end without changing the stored original artwork.
  const seal=ease((t-.82)/.14);c.save();c.globalAlpha=seal*.75;c.fillStyle='#A82020';c.fillRect(w*.8,h*.68,17,23);c.strokeStyle='#F8F5EE';c.lineWidth=1;c.strokeRect(w*.8+3,h*.68+3,11,17);c.beginPath();c.moveTo(w*.8+8.5,h*.68+5);c.lineTo(w*.8+8.5,h*.68+18);c.moveTo(w*.8+5,h*.68+10);c.lineTo(w*.8+12,h*.68+10);c.stroke();c.restore();return t>=1
 }
}
return{Scene,findInkBounds,duration:6400};
});
