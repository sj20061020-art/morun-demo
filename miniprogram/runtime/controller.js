const M=require('../lib/model'),B=require('../lib/brush'),I=require('../lib/ink-reveal');
const titles={splash:'墨润心源',home:'首页',write:'正念书法书写',paint:'水墨情绪创作',test:'情绪自测',result:'情绪参考报告',chat:'AI情绪陪伴',library:'情绪作品库',booking:'预约服务',experts:'专家库',profile:'个人中心','admin-risk':'高危工单队列','admin-booking':'预约工单管理','admin-experts':'专家库管理','admin-works':'学员授权作品'};
function removeMediaCache(id){try{const f=wx.getFileSystemManager();if(f.unlink)f.unlink({filePath:wx.env.USER_DATA_PATH+'/morun-v2-cache-'+id+'.jpg',fail:()=>{}})}catch(e){}}
const date=t=>M.dateLabel(t),toast=text=>wx.showToast({title:String(text),icon:'none',duration:2800});
const ask=(title,content)=>new Promise(resolve=>wx.showModal({title,content,success:r=>resolve(r.confirm),fail:()=>resolve(false)}));
function mediaPath(id,image){if(!image||!image.startsWith('data:image/'))return image;const filepath=wx.env.USER_DATA_PATH+'/morun-v2-cache-'+id+'.jpg';try{wx.getFileSystemManager().writeFileSync(filepath,image.split(',')[1],'base64');return filepath}catch(e){return image}}
module.exports=function(route){return{
 data:{inkPresentation:false,inkComplete:false,inkCaption:'一滴墨，慢慢展开。',assessmentId:'awareness',assessmentTitle:'美育情绪觉察',questionCount:12,period:'最近一周',assessmentDescription:M.assessment('awareness').description,phqSupport:M.phqSupport,route,isAdmin:route.indexOf('admin-')===0,title:titles[route],sheet:'',loading:true,form:{},moods:M.moods,options:['几乎没有','偶尔','经常','总是'],greeting:'',guide:M.guides[0],disclaimer:M.disclaimer,riskNotice:M.riskNotice,questionIndex:0,answers:Array(12).fill(-1),answered:0,brushIndex:route==='write'?1:0,brushes:route==='write'?M.calligraphyBrushes:M.paintingBrushes,colorIndex:0,colors:route==='write'?['浓墨','中墨','淡墨']:['纯墨黑','青灰','赭石','黛蓝'],size:route==='write'?11:14,grids:['米字格','田字格','无格'],gridIndex:0,scrollMode:false,eraser:false,materials:['远山','竹叶','云朵','月影'],filter:'all',workPage:0,chatText:'',chatPaused:false,musicPlaying:false,slots:[],slotIndex:0,selectedMood:0,privacy:true,recordMode:false},
 async onLoad(options){this.options=options||{};if(this.options.filter)this.setData({filter:this.options.filter});this.app=getApp();if(!['experts','booking'].includes(route))this.app.assistCase=null;this.repo=this.app.repo;try{await this.app.ready;await this.refresh();if(route==='write'||route==='paint')this.setData({sheet:'gallery',artReferences:M.artReferences[route]});if(route==='chat'){const sessions=this.repo.snapshot().sessions;const s=this.options.id?sessions.find(s=>s.id===this.options.id):sessions[0];this.chatId=s?s.id:(await this.repo.newSession()).id;await this.refresh()}}catch(e){this.fail(e)}},
 onReady(){this.viewReady=true;if(route==='write'||route==='paint')this.initCanvas();if(route==='result')this.initRadar()},
 onShow(){if(this.repo&&this.repo.state)this.refresh().catch(e=>this.fail(e));if(this.inkScene&&this.data.inkPresentation&&!this.data.inkComplete)this.runInkAnimation()},
 onHide(){this.stopInkAnimation();if(this.music){this.music.pause();this.setData({musicPlaying:false})}},
 onUnload(){this.stopInkAnimation();this.inkScene=null;this.inkSource=null;if(this.engine)this.engine.destroy();if(this.music)this.music.destroy()},
 fail(e){this.setData({loading:false});wx.showModal({title:'操作未完成',content:e.message||String(e),showCancel:false})},
 async refresh(){const s=this.repo.snapshot(),experts=s.experts.map(e=>Object.assign({},e,{slotsText:e.slots.join(' / ')})),activities=s.activities.map(a=>Object.assign({},a,{remaining:this.repo.remaining(a.id)}));
 const cases=s.cases.slice().sort((a,b)=>(a.status==='处理完成')-(b.status==='处理完成')||Number(a.demo)-Number(b.demo)||new Date(b.time)-new Date(a.time)).map(c=>Object.assign({},c,{date:date(c.time),last:c.transcript[c.transcript.length-1]?.text||''}));
 const session=s.sessions.find(x=>x.id===this.chatId);let works=route==='admin-works'?this.repo.authorizedWorks():s.works.filter(w=>this.data.filter==='all'||w.type===this.data.filter);works=await Promise.all(works.map(async w=>Object.assign({},w,{date:date(w.time),image:mediaPath(w.id,await this.repo.media(w)),kind:w.type==='write'?'正念书法':'水墨画作'})));
 const totalPages=Math.max(1,Math.ceil(works.length/4)),workPage=Math.min(this.data.workPage,totalPages-1),report=s.reports.find(r=>r.id===this.options.id)||s.reports[0];
 this.setData({loading:false,profile:s.profile,privacy:s.profile.privateByDefault,activities,experts:route==='admin-experts'?experts:experts.filter(e=>e.active),allExperts:experts,cases,ownCases:cases.filter(c=>c.userId===s.profile.id),works:route==='admin-works'?works:works.slice(workPage*4,workPage*4+4),workPage,totalPages,reports:s.reports.map(r=>Object.assign({},r,{date:date(r.time)})),report:report?Object.assign({},report,{date:date(report.time)}):null,sessions:s.sessions.map(c=>Object.assign({},c,{date:date(c.time),count:c.messages.length})),bookings:s.bookings.map(b=>Object.assign({},b,{date:date(b.time)})),ownBookings:s.bookings.filter(b=>b.userId===s.profile.id),workCount:s.works.length,reportCount:s.reports.length,bookingCount:s.bookings.length,greeting:M.greetings[Math.floor(Date.now()/60000)%M.greetings.length],messages:session?session.messages.map(m=>Object.assign({},m,{date:date(m.time)})):[],chatPaused:session?session.paused:false,chatBottom:'message-'+(session?session.messages.length-1:0),question:M.assessment(this.data.assessmentId).questions[this.data.questionIndex].text});
 if(route==='result'&&this.viewReady)this.initRadar();
 },
 go(e){const p=e.currentTarget.dataset.route,id=e.currentTarget.dataset.id;wx.redirectTo({url:'/pages/'+p+'/'+p+(id?'?id='+encodeURIComponent(id):'')})},
 close(){this.setData({sheet:''})},noop(){},
 input(e){const field=e.currentTarget.dataset.field;this.setData({['form.'+field]:e.detail.value})},
 async act(e){const a=e.currentTarget.dataset.action,id=e.currentTarget.dataset.id;try{switch(a){
 case'ink-replay':this.runInkAnimation(true);break;case'ink-continue':this.closeInkPresentation();break;case'ink-library':this.closeInkPresentation();wx.redirectTo({url:'/pages/library/library?filter=write'});break;
 case'enter':wx.redirectTo({url:'/pages/home/home'});break;
 case'art-reference':this.setData({sheet:'gallery',artReferences:M.artReferences[route]});break;
 case'reference-preview':{const urls=M.artReferences[route].filter(r=>r.image).map(r=>'/assets/'+r.image);wx.previewImage({urls,current:'/assets/'+id});break}
 case'assessment':{const a=M.assessment(id);this.setData({assessmentId:a.id,assessmentTitle:a.title,period:a.period,assessmentDescription:a.description,questionCount:a.questions.length,options:a.options,questionIndex:0,answers:Array(a.questions.length).fill(-1),answered:0,question:a.questions[0].text});break}
 case'about':this.setData({sheet:'about'});break;
 case'brush-settings':this.setData({sheet:'brush'});break;
 case'scroll':this.setData({scrollMode:!this.data.scrollMode});break;
 case'undo':this.engine.undo();break;case'redo':this.engine.redo();break;
 case'clear':if(await ask('清空画布？','未保存的笔迹会被移除。'))this.engine.clear();break;
 case'eraser':this.setData({eraser:!this.data.eraser});this.engine.configure({eraser:this.data.eraser});break;
 case'material':this.engine.addMaterial(id);toast('在画布上拖动并松手放置素材');break;
 case'stamp':this.setData({sheet:'stamp'});break;case'stamp-pick':this.engine.seal(id);this.close();toast('已盖印，可滚动到纸尾查看');break;
 case'art-save':if(!this.engine.hasInk())throw Error('请先落下一笔');if(this.engine.drag)throw Error('请先在画布上放置素材');this.setData({sheet:'save-art',form:{note:''},selectedMood:0});break;
 case'art-confirm':await this.saveArt();break;
 case'music':this.toggleMusic();break;
 case'quiz-prev':if(this.data.questionIndex>0)this.setData({questionIndex:this.data.questionIndex-1,question:M.assessment(this.data.assessmentId).questions[this.data.questionIndex-1].text});break;
 case'quiz-next':await this.nextQuestion();break;
 case'report-delete':if(await ask('删除本地报告？','自测记录将被删除。')){await this.repo.deleteReport(this.data.report.id);wx.redirectTo({url:'/pages/library/library?filter=report'})}break;
 case'chat-new':this.chatId=(await this.repo.newSession()).id;this.setData({chatText:''});await this.refresh();break;
 case'chat-send':await this.sendChat(this.data.chatText);break;
 case'filter':this.setData({filter:id,workPage:0});await this.refresh();break;
 case'works-prev':this.setData({workPage:Math.max(0,this.data.workPage-1)});await this.refresh();break;
 case'works-next':this.setData({workPage:Math.min(this.data.totalPages-1,this.data.workPage+1)});await this.refresh();break;
 case'work':await this.openWork(id,false);break;case'mentor-work':await this.openWork(id,true);break;
 case'work-delete':if(await ask('删除作品？','图片、授权与美育评语将被删除。')){await this.repo.deleteWork(id);removeMediaCache(id);this.close();await this.refresh();toast('作品已删除')}break;
 case'preview-image':wx.previewImage({urls:[this.data.selectedWork.image],current:this.data.selectedWork.image});break;
 case'album':wx.saveImageToPhotosAlbum({filePath:this.data.selectedWork.image,success:()=>toast('已保存到相册'),fail:()=>toast('未保存到相册，可检查相册权限')});break;
 case'comment-save':await this.repo.comment(this.data.selectedWork.id,this.data.form.comment||'');await this.openWork(this.data.selectedWork.id,true);toast('美育评语已保存');break;
 case'book-activity':this.bookingForm('activity',id);break;case'book-expert':this.bookingForm('expert',id);break;
 case'book-confirm':await this.submitBooking();break;
 case'profile-edit':this.setData({sheet:'profile',form:Object.assign({},this.data.profile)});break;
 case'profile-save':await this.repo.updateProfile(this.data.form);this.close();await this.refresh();toast('个人信息已保存');break;
 case'my-chats':this.setData({sheet:'chats'});break;case'my-bookings':this.setData({sheet:'bookings'});break;case'my-reports':this.setData({filter:'report',workPage:0});wx.redirectTo({url:'/pages/library/library?filter=report'});break;
 case'open-chat':wx.redirectTo({url:'/pages/chat/chat?id='+id});break;
 case'delete-chat':if(await ask('删除本地会话？','关联的工单也会移除。')){await this.repo.deleteSession(id);await this.refresh()}break;
 case'my-messages':this.setData({sheet:'messages'});break;
 case'privacy':this.setData({sheet:'privacy'});break;
 case'reset':if(await ask('清空 V2 记录？','作品、自测、对话、预约与工单会删除，演示数据会恢复。V1 不受影响。')){const oldWorks=this.repo.snapshot().works;await this.repo.reset();oldWorks.forEach(w=>removeMediaCache(w.id));this.close();await this.refresh();toast('V2 已重置')}break;
 case'case':this.openCase(id);break;
 case'case-progress':await this.repo.caseStatus(id,'跟进中');await this.refresh();this.openCase(id);break;
 case'case-done':await this.repo.caseStatus(id,'处理完成');await this.refresh();this.openCase(id);break;
 case'case-note':await this.repo.caseNote(this.data.selectedCase.id,this.data.form.caseNote||'');await this.refresh();this.openCase(this.data.selectedCase.id);toast('留言已保存');break;
 case'assist':this.app.assistCase=id;wx.redirectTo({url:'/pages/experts/experts'});break;
 case'booking-confirm':await this.repo.bookingStatus(id,'已确认');await this.refresh();break;
 case'booking-done':await this.repo.bookingStatus(id,'已完成');await this.refresh();break;
 case'booking-cancel':await this.repo.bookingStatus(id,'已取消');await this.refresh();break;
 case'new-expert':this.expertForm();break;case'edit-expert':this.expertForm(id);break;
 case'expert-save':await this.repo.saveExpert(Object.assign({},this.data.form,{id:this.data.editExpertId||null,active:this.data.expertActive}));this.close();await this.refresh();toast('专家已保存');break;
 case'expert-toggle':await this.repo.toggleExpert(id);await this.refresh();break;
 }}catch(err){this.fail(err)}},
 brushChange(e){const brushIndex=+e.detail.value;this.setData({brushIndex,eraser:false});this.engine.configure({brush:brushIndex,eraser:false})},
 colorChange(e){const colorIndex=+e.detail.value;this.setData({colorIndex});this.engine.configure({color:(route==='write'?M.inkColors:M.paintingColors)[colorIndex]})},
 sizeChange(e){this.setData({size:+e.detail.value});this.engine.configure({size:+e.detail.value})},
 gridChange(e){this.setData({gridIndex:+e.detail.value});this.engine.grid=this.data.grids[this.data.gridIndex];this.engine.render()},
 moodChange(e){this.setData({selectedMood:+e.detail.value})},slotChange(e){const slotIndex=+e.detail.value;this.setData({slotIndex,'form.slot':this.data.slots[slotIndex]})},
 consentChange(e){this.setData({'form.consent':e.detail.value.includes('yes')})},
 expertActiveChange(e){this.setData({expertActive:e.detail.value})},
 async privacyChange(e){try{await this.repo.privacy(e.detail.value);this.setData({privacy:e.detail.value});toast('默认隐私设置已保存')}catch(err){this.fail(err)}},
 async authorizeChange(e){try{await this.repo.authorize(this.data.selectedWork.id,e.detail.value);await this.openWork(this.data.selectedWork.id,false);toast(e.detail.value?'已授权导师':'已撤回授权')}catch(err){const id=this.data.selectedWork.id;await this.openWork(id,false);this.fail(err)}},
 answerChange(e){const answers=this.data.answers.slice();answers[this.data.questionIndex]=+e.detail.value;this.setData({answers,answered:answers.filter(v=>v>=0).length});if(this.data.assessmentId==='phq9'&&this.data.questionIndex===8&&answers[8]>0)wx.showModal({title:'请让身边的人陪伴你',content:M.phqSupport,showCancel:false})},
 async nextQuestion(){if(this.data.answers[this.data.questionIndex]<0)throw Error('请先选择当前题的答案');if(this.data.questionIndex<this.data.questionCount-1){const i=this.data.questionIndex+1;this.setData({questionIndex:i,question:M.assessment(this.data.assessmentId).questions[i].text})}else{const report=await (this.data.assessmentId==='phq9'?this.repo.addPhqReport(this.data.answers):this.repo.addReport(this.data.answers));wx.redirectTo({url:'/pages/result/result?id='+report.id})}},
 async initCanvas(){try{if(!this.repo||!this.repo.state)await this.app.ready;const query=this.createSelectorQuery();query.select('#artCanvas').fields({node:true,size:true}).exec(res=>{if(!res[0]||!res[0].node){this.fail(Error('Canvas 2D 不可用，请使用支持的微信基础库与开发者工具'));return}const item=res[0],canvas=item.node,width=route==='paint'?Math.floor(Math.min(item.width,(wx.getWindowInfo?wx.getWindowInfo().windowHeight:wx.getSystemInfoSync().windowHeight)*(wx.getWindowInfo?(wx.getWindowInfo().windowHeight<720?.32:.43):(wx.getSystemInfoSync().windowHeight<720?.32:.43)))):Math.floor(item.width),height=route==='write'?Math.round(width*3.2):width;const dpr=Math.min(2,wx.getWindowInfo?wx.getWindowInfo().pixelRatio:wx.getSystemInfoSync().pixelRatio);canvas.width=width*dpr;canvas.height=height*dpr;canvas.getContext('2d').scale(dpr,dpr);this.canvas=canvas;this.setData({canvasHeight:height,canvasSide:width});
 this.engine=new B.Brush(canvas,{kind:route,width,height,makeCanvas:(w,h)=>{if(!wx.createOffscreenCanvas)throw Error('当前基础库不支持离屏 Canvas 2D，请升级微信 / 开发者工具');return wx.createOffscreenCanvas({type:'2d',width:w,height:h})},raf:fn=>canvas.requestAnimationFrame(fn),cancel:id=>canvas.cancelAnimationFrame(id)});this.engine.configure({brush:this.data.brushIndex,size:this.data.size});});}catch(e){this.fail(e)}},
 touchPoint(e){const t=e.touches&&e.touches[0]||e.changedTouches&&e.changedTouches[0];return{x:t.x===undefined?t.clientX:t.x,y:t.y===undefined?t.clientY:t.y,t:Date.now(),pressure:t.force&&t.force!==1?t.force:0}},
 touchStart(e){if(this.data.scrollMode||!this.engine)return;this.touchDown=true;this.dragging=!!this.engine.drag;if(this.dragging){const p=this.touchPoint(e);this.engine.drag.x=p.x;this.engine.drag.y=p.y;this.engine.render()}else this.engine.begin(this.touchPoint(e))},
 touchMove(e){if(!this.touchDown||this.data.scrollMode||!this.engine)return;if(this.dragging){const p=this.touchPoint(e);this.engine.drag.x=p.x;this.engine.drag.y=p.y;this.engine.render()}else this.engine.move(this.touchPoint(e))},
 touchEnd(e){if(!this.touchDown||!this.engine)return;this.touchDown=false;if(this.dragging){const p=this.touchPoint(e);this.engine.placeMaterial(p.x,p.y)}else this.engine.end()},
 async saveArt(){if(this.saving)return;this.saving=true;try{const out=this.engine.exportCanvas(),x=this.canvas.getContext('2d');x.clearRect(0,0,this.engine.width,this.engine.height);x.drawImage(out,0,0);
 const temp=await new Promise((resolve,reject)=>wx.canvasToTempFilePath({canvas:this.canvas,fileType:'jpg',quality:.8,destWidth:Math.min(720,this.engine.width*2),destHeight:Math.min(720,this.engine.width*2)*this.engine.height/this.engine.width,success:r=>resolve(r.tempFilePath),fail:reject},this));
 const bytes=await new Promise((resolve,reject)=>wx.getFileSystemManager().readFile({filePath:temp,encoding:'base64',success:r=>resolve(r.data),fail:reject}));if(bytes.length>800000)throw Error('图片过大，当前单图缓存限制约 600KB。请减少长幅细节或缩小输出后重试。');
 await this.repo.addWork({type:route,emotion:this.data.moods[this.data.selectedMood],note:this.data.form.note||''},'data:image/jpeg;base64,'+bytes);this.close();if(route==='write')this.openInkPresentation();else{toast('作品已保存到作品库');wx.redirectTo({url:'/pages/library/library'})}
 }catch(e){this.fail(e)}finally{this.saving=false;this.engine.render()}},

 openInkPresentation(){this.inkSource=this.engine.base;this.inkCrop=I.findInkBounds(this.inkSource);this.setData({inkPresentation:true,inkComplete:false,sheet:'',inkCaption:'一滴墨，慢慢展开。'},()=>this.initInkPresentation())},
 initInkPresentation(){const query=this.createSelectorQuery();query.select('#inkRevealCanvas').fields({node:true,size:true}).exec(res=>{if(!this.data.inkPresentation)return;if(!res[0]||!res[0].node){this.setData({inkComplete:true,inkCaption:'作品已收藏'});return}const item=res[0],c=item.node,w=item.width,h=item.height,dpr=Math.min(2,wx.getWindowInfo?wx.getWindowInfo().pixelRatio:wx.getSystemInfoSync().pixelRatio);c.width=w*dpr;c.height=h*dpr;const ctx=c.getContext('2d');ctx.scale(dpr,dpr);this.inkCanvas=c;this.inkScene=new I.Scene({ctx,width:w,height:h,work:this.inkSource,crop:this.inkCrop});if(c.createImage){const image=c.createImage();image.onload=()=>{if(this.inkScene&&this.data.inkPresentation)this.inkScene.landscape=image};image.src='/assets/home-landscape.jpg'}this.runInkAnimation(true)})},
 runInkAnimation(replay=false){if(!this.inkScene||!this.data.inkPresentation)return;this.stopInkAnimation();if(replay){this.inkElapsed=0;this.setData({inkComplete:false})}this.inkStarted=Date.now()-(this.inkElapsed||0);const tick=()=>{if(!this.data.inkPresentation||!this.inkScene)return;this.inkElapsed=Math.min(I.duration,Date.now()-this.inkStarted);const done=this.inkScene.draw(this.inkElapsed),caption=done?'让这一刻，慢慢沉淀。':this.inkElapsed<2200?'一滴墨，慢慢展开。':'你的笔墨，正在成境。';if(caption!==this.data.inkCaption||done!==this.data.inkComplete)this.setData({inkComplete:done,inkCaption:caption});if(!done)this.inkFrame=this.inkCanvas.requestAnimationFrame(tick)};tick()},
 stopInkAnimation(){if(this.inkCanvas&&this.inkFrame)this.inkCanvas.cancelAnimationFrame(this.inkFrame);this.inkFrame=0},
 closeInkPresentation(){this.stopInkAnimation();this.setData({inkPresentation:false});this.inkScene=null;this.inkCanvas=null;this.inkSource=null},
 toggleMusic(){if(!this.music){this.music=wx.createInnerAudioContext();this.music.src='/assets/calm.wav';this.music.loop=true;this.music.onError(()=>toast('音乐暂无法播放'))}const on=!this.data.musicPlaying;if(on)this.music.play();else this.music.pause();this.setData({musicPlaying:on})},
 async initRadar(){if(!this.data.report||this.data.report.scaleId==='phq9')return;const query=this.createSelectorQuery();query.select('#radarCanvas').fields({node:true,size:true}).exec(res=>{if(!res[0]||!res[0].node)return;const c=res[0].node,w=res[0].width,h=250;c.width=w;c.height=h;B.radar(c.getContext('2d'),w,h,this.data.report.values)})},
 chatInput(e){this.setData({chatText:e.detail.value});if(!this.data.chatPaused&&M.matchRisk(e.detail.value).length)this.sendChat(e.detail.value).catch(err=>this.fail(err))},
 async sendChat(text){if(this.chatBusy||this.data.chatPaused)return;this.chatBusy=true;try{const out=await this.repo.chat(this.chatId,text);this.setData({chatText:''});await this.refresh();if(out.risk){this.setData({chatPaused:true});wx.showModal({title:'先照顾好此刻的自己',content:M.riskNotice,confirmText:'预约记录',cancelText:'暂不',success:r=>{if(r.confirm)wx.redirectTo({url:'/pages/booking/booking'})}})}}finally{this.chatBusy=false}},
 async openWork(id,mentor){const w=this.repo.snapshot().works.find(w=>w.id===id);if(!w||mentor&&!w.authorized)throw Error('作品不存在或未授权');this.setData({sheet:'work',mentorView:mentor,selectedWork:Object.assign({},w,{image:mediaPath(w.id,await this.repo.media(w)),date:date(w.time)}),form:{comment:''}})},
 bookingForm(kind,id){const s=this.repo.snapshot(),target=kind==='activity'?s.activities.find(a=>a.id===id):s.experts.find(e=>e.id===id&&e.active);if(!target)throw Error('内容已不可用');const occupied=s.bookings.filter(b=>b.expertId===id&&b.status!=='已取消').map(b=>b.slot),slots=kind==='expert'?target.slots.filter(t=>!occupied.includes(t)):[];this.setData({sheet:'booking',bookingKind:kind,target,slots,slotIndex:0,form:{name:this.app.assistCase?(s.cases.find(c=>c.id===this.app.assistCase)?.userId||s.profile.nickname):s.profile.nickname,grade:s.profile.grade,contact:'',request:'',slot:slots[0]||target.time||'',consent:false}})},
 async submitBooking(){const b=await this.repo.book(Object.assign({},this.data.form,{kind:this.data.bookingKind,caseId:this.app.assistCase||null,activityId:this.data.bookingKind==='activity'?this.data.target.id:null,expertId:this.data.bookingKind==='expert'?this.data.target.id:null}));if(this.app.assistCase){await this.repo.caseNote(this.app.assistCase,'预约记录回执号：'+b.id);this.app.assistCase=null}this.setData({sheet:'receipt',receipt:b});await this.refresh()},
 openCase(id){const c=this.repo.snapshot().cases.find(c=>c.id===id);if(!c)throw Error('工单不存在');this.setData({sheet:'case',selectedCase:Object.assign({},c,{date:date(c.time)}),form:{caseNote:''}})},
 expertForm(id){const e=this.repo.snapshot().experts.find(e=>e.id===id)||{name:'',title:'书画美育',specialty:'',bio:'请填写服务方向与预约说明。',slots:[],active:true};this.setData({sheet:'expert',editExpertId:id||null,expertActive:e.active,form:Object.assign({},e,{slots:e.slots.join('\n')})})}
}};
