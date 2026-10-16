'use strict';
// Layered pigment, paper fibres and a settling water halo. No external assets.
window.InkCanvas=class InkCanvas{
  constructor(canvas){
    this.c=canvas;this.ctx=canvas.getContext('2d');this.strokes=[];this.current=null;this.hasInk=false;this.frame=0;this.drying=null;
    this.W=800;this.H=1000;this.base=this.layer();this.ink=this.layer();this.wash=this.layer();this.paper=this.layer();
    this.tips=[this.makeTip(false,false),this.makeTip(true,false),this.makeTip(false,true)];
    this.resize();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);
    canvas.addEventListener('pointerdown',e=>this.start(e));canvas.addEventListener('pointermove',e=>this.move(e));
    ['pointerup','pointercancel','lostpointercapture'].forEach(n=>canvas.addEventListener(n,e=>this.end(e)));
  }
  layer(){const c=document.createElement('canvas');c.width=this.W;c.height=this.H;return c}
  makeTip(dry,water){
    const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),im=x.createImageData(128,128);
    let seed=37219;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    for(let y=0;y<128;y++)for(let col=0;col<128;col++){
      const u=(col-64)/60,v=(y-64)/60,angle=Math.atan2(v,u),r=Math.hypot(u,v/(water?.85:.68));
      const fringe=1+.055*Math.sin(angle*19)+.035*Math.sin(angle*37+.7)+.025*Math.sin(angle*71);
      const edge=Math.max(0,Math.min(1,(fringe-r)/(water?.48:.16)));
      const fibre=.68+.19*Math.sin(y*1.91)+.13*Math.sin(y*.79+col*.025);
      let alpha=water?Math.pow(edge,1.8)*(.4+random()*.6):edge*(.55+random()*.45)*Math.max(.12,fibre);
      if(dry){const hair=Math.sin(y*1.18+Math.sin(col*.04)*.5);alpha*=hair>.24?.12:.92;if(random()<.08)alpha*=.14;}
      const i=(y*128+col)*4;im.data[i]=water?78:25;im.data[i+1]=water?83:30;im.data[i+2]=water?68:25;im.data[i+3]=Math.round(alpha*255);
    }x.putImageData(im,0,0);return c;
  }
  resize(){
    if(this.current){this.resizePending=true;return}const rect=this.c.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const next=Math.max(200,Math.round(this.W*rect.height/rect.width));if(next===this.H&&this.ready)return;
    const ratio=next/this.H;this.H=next;for(const s of this.strokes)for(const p of s.points)p.y*=ratio;
    this.c.width=this.W;this.c.height=this.H;for(const l of [this.base,this.ink,this.wash,this.paper]){l.width=this.W;l.height=this.H;}
    this.drying=null;this.makePaper();this.rebuild();this.ready=true;
  }
  makePaper(){
    const x=this.paper.getContext('2d'),im=x.createImageData(this.W,this.H);let seed=85;
    for(let i=0;i<im.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/4294967296;im.data[i]=105;im.data[i+1]=99;im.data[i+2]=76;im.data[i+3]=n>.94?14:Math.round(n*6);}
    x.putImageData(im,0,0);x.strokeStyle='rgba(117,111,82,.035)';x.lineWidth=.7;
    for(let i=0;i<650;i++){const px=(i*127.31)%this.W,py=(i*73.79)%this.H;x.beginPath();x.moveTo(px,py);x.lineTo(px+3+Math.sin(i)*9,py+Math.cos(i)*3);x.stroke();}
  }
  point(e){const b=this.c.getBoundingClientRect();return{x:(e.clientX-b.left)*this.W/b.width,y:(e.clientY-b.top)*this.H/b.height,p:e.pointerType==='pen'?Math.max(.05,e.pressure):.55,t:e.timeStamp,pen:e.pointerType==='pen',r:0,a:-.3,v:0,hold:0}}
  start(e){
    if(this.current||e.button>0)return;e.preventDefault();this.finishDrying();this.c.setPointerCapture(e.pointerId);this.pointer=e.pointerId;
    const s={points:[],size:+document.querySelector('#size').value,tone:+document.querySelector('#tone').value/100,wet:+document.querySelector('#wet').value/100};
    const p=this.point(e);p.r=s.size*(p.pen?.4+p.p:.8);s.points.push(p);this.current=s;this.clearLayers();this.stamp(p,s);this.hasInk=true;this.born=performance.now();this.lastMove=this.born;this.tick();
  }
  move(e){
    if(!this.current||e.pointerId!==this.pointer)return;e.preventDefault();const events=e.getCoalescedEvents?.();
    for(const event of events?.length?events:[e]){
      const s=this.current,last=s.points.at(-1),p=this.point(event),dx=p.x-last.x,dy=p.y-last.y,d=Math.hypot(dx,dy);if(d<.35)continue;
      const speed=d/Math.max(5,Math.min(50,p.t-last.t));p.v=last.v*.65+speed*.35;
      const pressure=p.pen?.28+p.p*1.05:1.13/(1+p.v*.46)+.19;
      p.r=last.r*.65+s.size*pressure*.35;const angle=Math.atan2(dy,dx);p.a=last.a+Math.atan2(Math.sin(angle-last.a),Math.cos(angle-last.a))*.35;
      this.segment(last,p,s);s.points.push(p);this.lastMove=performance.now();
    }
  }
  end(e){
    if(!this.current||e.pointerId!==this.pointer)return;const s=this.current;this.current=null;this.strokes.push(s);
    this.renderStroke(s,true);this.drying={stroke:s,start:performance.now()};this.tick();
    if(this.resizePending){this.resizePending=false;this.resize();}
  }
  stamp(p,s,tail=1){
    const r=Math.max(.7,p.r*tail),dry=Math.max(0,Math.min(.85,p.v*.2+(1-s.wet)*.55-.1));
    const x=this.ink.getContext('2d');x.save();x.translate(p.x,p.y);x.rotate(p.a);x.globalAlpha=(.19+s.tone*.48)*(1-dry*.35);
    x.drawImage(this.tips[dry>.28?1:0],-r,-r,2*r,2*r);x.restore();
    if(s.wet>0){const w=this.wash.getContext('2d'),spread=r*(1.25+s.wet*.85);w.save();w.translate(p.x,p.y);w.rotate(p.a+.13);w.globalAlpha=(.055+s.tone*.085)*s.wet;w.drawImage(this.tips[2],-spread,-spread,spread*2,spread*2);w.restore();}
  }
  segment(a,b,s,ta=1,tb=1){const d=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(d/Math.max(1.2,(a.r+b.r)*.16)));for(let i=1;i<=steps;i++){const t=i/steps;this.stamp({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,r:a.r+(b.r-a.r)*t,a:a.a+Math.atan2(Math.sin(b.a-a.a),Math.cos(b.a-a.a))*t,v:a.v+(b.v-a.v)*t},s,ta+(tb-ta)*t)}}
  clearLayers(){for(const c of [this.ink,this.wash])c.getContext('2d').clearRect(0,0,this.W,this.H)}
  renderStroke(s,taper){
    this.clearLayers();const pts=s.points;const remaining=Array(pts.length).fill(0);for(let i=pts.length-2;i>=0;i--)remaining[i]=remaining[i+1]+Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].y-pts[i].y);
    const tail=i=>taper&&pts.length>2?Math.max(.12,Math.min(1,remaining[i]/(s.size*2.3))):1;
    this.stamp(pts[0],s);for(let i=1;i<pts.length;i++)this.segment(pts[i-1],pts[i],s,tail(i-1),tail(i));
    for(const p of pts)if(p.hold>.1){const w=this.wash.getContext('2d'),r=p.r*(1.3+Math.min(1.6,p.hold)*.45)*s.wet;w.save();w.globalAlpha=.14*s.wet;w.drawImage(this.tips[2],p.x-r,p.y-r,r*2,r*2);w.restore();}
  }
  wetLayers(ctx,age,s){
    ctx.save();ctx.globalAlpha=.8;ctx.drawImage(this.wash,0,0);
    if(s.wet>.02){ctx.globalAlpha=.45;ctx.filter=`blur(${1+age*6*s.wet}px)`;ctx.drawImage(this.wash,0,0);ctx.globalAlpha=.18;ctx.filter=`blur(${3+age*15*s.wet}px)`;ctx.drawImage(this.wash,0,0);}
    ctx.restore();ctx.drawImage(this.ink,0,0);
  }
  compose(age=1){const x=this.ctx;x.clearRect(0,0,this.W,this.H);x.drawImage(this.paper,0,0);x.drawImage(this.base,0,0);const s=this.current||this.drying?.stroke;if(s)this.wetLayers(x,age,s)}
  tick(){
    if(this.frame)return;const animate=now=>{this.frame=0;
      if(this.current){const p=this.current.points.at(-1);p.hold=Math.min(1.6,Math.max(p.hold,(now-this.lastMove-100)/1000));this.compose(Math.min(1,(now-this.born)/1100));
        if(p.hold>.1){const x=this.ctx,r=p.r*(1.1+p.hold*.7)*this.current.wet;x.save();x.globalAlpha=.15*this.current.wet;x.drawImage(this.tips[2],p.x-r,p.y-r,r*2,r*2);x.restore();}
      }else if(this.drying){const age=Math.min(1,(now-this.drying.start)/1000);this.compose(age);if(age>=1){this.finishDrying();return;}}
      else return;this.frame=requestAnimationFrame(animate);
    };this.frame=requestAnimationFrame(animate);
  }
  finishDrying(){if(!this.drying)return;this.wetLayers(this.base.getContext('2d'),1,this.drying.stroke);this.drying=null;this.clearLayers();this.compose()}
  rebuild(){this.base.getContext('2d').clearRect(0,0,this.W,this.H);for(const s of this.strokes){this.renderStroke(s,true);this.wetLayers(this.base.getContext('2d'),1,s)}this.clearLayers();this.hasInk=this.strokes.length>0;this.compose()}
  undo(){if(this.current)return;this.drying=null;if(!this.strokes.length)return toast('还没有可以撤销的笔画');this.strokes.pop();this.rebuild()}
  clear(){cancelAnimationFrame(this.frame);this.frame=0;this.drying=null;this.current=null;this.strokes=[];this.hasInk=false;this.clearLayers();this.base.getContext('2d').clearRect(0,0,this.W,this.H);this.compose()}
  export(){this.finishDrying();const c=this.layer(),x=c.getContext('2d');x.fillStyle='#fcf9ef';x.fillRect(0,0,this.W,this.H);x.drawImage(this.paper,0,0);x.drawImage(this.base,0,0);if(this.current)this.wetLayers(x,1,this.current);x.font='18px serif';x.fillStyle='#8d927d';x.fillText('墨润心源 · '+activeEmotion,28,this.H-24);return c.toDataURL('image/png')}
};
