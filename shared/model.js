/* Pure local domain model shared by the web preview and native WeChat pages.
 * No requests, LLM SDK, diagnosis scoring or remote notifications are made.
 * Adapters use localStorage (preview) / wx.setStorage (mini program).
 * Image payloads are separate storage keys so one metadata key does not grow
 * with every picture. Transactions report quota failures and never fake success.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Morun=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
const KEY='morun.v2.state',MEDIA='morun.v2.media.';
const uid=prefix=>(prefix||'id')+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const clone=x=>JSON.parse(JSON.stringify(x));
const moods=['平静','释怀','烦躁','放松'];
const disclaimer='本工具为书画美育情绪辅助 Demo，不做心理诊断，不能替代专业心理咨询与治疗。AI 为本地预设问答模拟，无真人实时值守；预约、工单与导师查看均为同一设备的本地演示，不会发送至真实老师。';
const riskNotice='你此刻可能正在经历很难受的感受。本次模拟对话已暂停，并记录为本机演示工单，未发送给远程导师，没有真人实时值守。如果你正处于危险或难以保证自己的安全，请立即联系身边可信任的成年人或就近急救人员。也可以查看专家预约演示。';
const riskWords=['自伤','自杀','自残','活着没意思','不想活','结束生命','轻生','想死','伤害自己'];
const questions=[
 ['最近一周，我容易烦躁或坐立不安',0],['学习压力让我感到疲惫',1],['我很难说出心里的感受',2],['我会因为小事感到低落',3],
 ['我脑海里想法很多，难以静下来',0],['休息之后，我仍然觉得很累',1],['有情绪时，我习惯独自憋着',2],['我常常缺少做事的兴致',3],
 ['想到学习或未来，我会感到紧张',0],['我的身体常常紧绷、不易放松',1],['我希望找到表达情绪的方式',2],['我很难从日常小事中感到轻松',3]
].map((q,i)=>({id:i,text:q[0],dimension:q[1]}));
const dimensions=['思绪纷扰','身心疲惫','表达受阻','低落感受'];
const calligraphyBrushes=['硬笔楷书','软笔行书','枯笔飞白','浓墨重笔'];
const paintingBrushes=['润水笔','浓墨笔','枯笔刷','淡墨渲染笔','点墨笔'];
const inkColors=['#222222','#555555','#999999'];
const paintingColors=['#222222','#687B78','#936C50','#495D74'];
const guides=['放慢呼吸，让笔尖随心流动。不必追求笔画好看，只需感受此刻。','缓缓落笔，给自己一段安静的时间。每一笔，都可以重新开始。','允许情绪出现，也允许它流动。用线条，为心里的感受留一点空间。'];
const greetings=['今天也辛苦了，给心情留一方素笺。','不用急着变好，先听听此刻的自己。','一呼一吸，一笔一墨，慢慢回到当下。','愿你在这里，找到安放感受的方式。'];
const replyRules=[
 {words:['学习','考试','成绩','压力','作业'],reply:'听起来，学习占用了你不少心力。要不要先画三条缓慢的长线？可以想一想：此刻的压力更像浓墨，还是一片淡淡的雾？'},
 {words:['生气','烦','愤怒','躁'],reply:'这些感受可以先被允许。你可以用枯笔画一些交错的短线，再换成湿笔慢慢覆盖一角。看看哪一处线条最像此刻的你。'},
 {words:['难过','低落','哭','孤独','伤心'],reply:'谢谢你把感受说出来。可以用一块淡墨留出一个安静的角落，给难过取一个颜色或形状。若愿意，也请把感受告诉一位信任的人。'},
 {words:['书法','写字','字','笔画'],reply:'不必写得标准。试着跟着呼吸写“安然”，或者只画一个缓慢的圆。留意笔尖经过纸面时，你的肩膀有没有松一点。'},
 {words:['画','水墨','颜色','创作'],reply:'这里没有画得好不好的标准。选一种接近心情的颜色，从一点、一条线开始。完成后，可以写一句“这幅画让我想到……”'},
 {words:['开心','平静','放松','谢谢'],reply:'这一点轻松很值得被记住。可以把它变成一枚月影、一片留白，或一句简短的书写，收藏在自己的作品库里。'}
];
function matchRisk(text){const s=String(text||'').replace(/\s/g,'');return riskWords.filter(w=>s.indexOf(w)!==-1)}
function reply(text){const rule=replyRules.find(r=>r.words.some(w=>text.indexOf(w)!==-1));return rule?rule.reply:'我会以书画和情绪表达的方式陪你做一点探索。此刻心里的感受，更像一条线、一团墨，还是一片留白？你也可以试试书写，或预约线下活动演示。'}
function dateLabel(time){return new Date(time).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
function nextDate(days){const d=new Date();d.setDate(d.getDate()+days);const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function initial(){const now=new Date().toISOString(),d7=nextDate(7),d14=nextDate(14);return{
 version:2,profile:{id:uid('student'),nickname:'墨友',grade:'初中',contact:'',privateByDefault:true},works:[],reports:[],sessions:[],bookings:[],
 experts:[{id:'expert-zheng',name:'郑红兰老师',title:'示例专家 · 资料待核验',specialty:'青少年情绪表达、书画美育（模拟）',bio:'姓名为项目方案中的示例，不代表真实入驻或服务承诺。身份、擅长方向及排班均为演示资料，正式使用前须核验。',slots:[d7+' 10:00',d7+' 15:00',d14+' 10:00'],active:true,avatar:0},
 {id:'expert-chen',name:'陈林',title:'示例资料 · 非真实入驻',specialty:'音乐艺术疗愈、音乐心理学（模拟）',bio:'方案提供的示例介绍为“马来西亚音乐艺术疗愈、音乐心理学博士”，未经核验。仅用于演示卡片和预约流程，不作资质背书。',slots:[d7+' 14:00',d14+' 15:00'],active:true,avatar:1}],
 activities:[{id:'activity-1',title:'一笔一息 · 线条静心团辅',time:d7+' 14:00',place:'示例美育教室 A',capacity:12,intro:'以呼吸与线条为线索，体验正念书写和感受分享。模拟活动，不实际招生。'},
 {id:'activity-2',title:'以墨为语 · 情绪水墨小组',time:d14+' 10:00',place:'示例书画工作坊',capacity:10,intro:'用湿墨、枯笔与留白表达当下心情。模拟活动，不实际招生。'}],
 cases:[{id:'demo-risk-1',userId:'DEMO-STUDENT-01',sessionId:null,time:now,status:'待跟进',tags:['关键词触发','预置模拟'],demo:true,transcript:[{role:'user',text:'（模拟案例）我压力很大，活着没意思。',time:now}],notes:[]},
 {id:'demo-risk-2',userId:'DEMO-STUDENT-02',sessionId:null,time:now,status:'跟进中',tags:['关键词触发','预置模拟'],demo:true,transcript:[{role:'user',text:'（模拟案例）我有自伤的想法。',time:now}],notes:[{text:'演示：建议联系可信任成年人，并协助了解线下支持渠道。',time:now}]}]
}}
class Repository{
 constructor(adapter){this.adapter=adapter;this.state=null;this.queue=Promise.resolve()}
 async init(){this.state=await this.adapter.get(KEY);if(!this.state||this.state.version!==2){this.state=initial();await this.adapter.set(KEY,this.state)}return this.snapshot()}
 snapshot(){return clone(this.state)}
 transaction(fn){const task=this.queue.then(async()=>{const draft=clone(this.state),result=fn(draft);await this.adapter.set(KEY,draft);this.state=draft;return result});this.queue=task.catch(()=>{});return task}
 async media(work){return work.image||await this.adapter.get(MEDIA+work.id)||''}
 async addWork(data,image){if(!image)throw Error('作品图片为空');const id=uid('work');await this.adapter.set(MEDIA+id,image);try{await this.transaction(s=>{s.works.unshift({id,type:data.type,emotion:data.emotion||'平静',note:String(data.note||'').slice(0,300),time:new Date().toISOString(),authorized:!s.profile.privateByDefault,comments:[],userId:s.profile.id})})}catch(e){await this.adapter.remove(MEDIA+id);throw e}return id}
 async deleteWork(id){await this.transaction(s=>{s.works=s.works.filter(w=>w.id!==id)});await this.adapter.remove(MEDIA+id)}
 authorize(id,value){return this.transaction(s=>{const w=s.works.find(w=>w.id===id);if(!w)throw Error('作品不存在');w.authorized=!!value})}
 authorizedWorks(){return clone(this.state.works.filter(w=>w.authorized))}
 comment(id,text){if(!String(text).trim())return Promise.reject(Error('请填写美育评语'));if(/诊断|抑郁症|焦虑症|双相|确诊|用药|药物|病情|人格障碍|患有/.test(text))return Promise.reject(Error('请仅从美育和艺术表达角度评论，不能使用心理诊断或治疗类文字'));return this.transaction(s=>{const w=s.works.find(w=>w.id===id&&w.authorized);if(!w)throw Error('作品未授权或授权已撤回');w.comments.push({text:String(text).slice(0,300),time:new Date().toISOString()})})}
 addReport(answers){if(answers.length!==12||answers.some(v=>!Number.isInteger(v)||v<0||v>3))return Promise.reject(Error('请完成全部 12 题'));return this.transaction(s=>{const values=dimensions.map((_,j)=>questions.reduce((n,q,i)=>n+(q.dimension===j?answers[i]:0),0));const highest=Math.max(...values);const text=highest<=2?'近期这些感受出现得较少。可以继续用笔墨记录平常的小感受。':highest<=5?'近期有些感受值得你停下来照顾。可以选择书写、创作，或向信任的人表达。':'近期有些感受出现得较频繁。除了书画体验，也可以向可信任的成年人或专业人员寻求支持。';const report={id:uid('report'),time:new Date().toISOString(),answers:answers.slice(),values,dimensions:dimensions.slice(),text,emotion:'情绪参考',note:'自编美育情绪觉察问卷，未经量表信效度验证；仅作自我觉察，不诊断、不定性。'};s.reports.unshift(report);return clone(report)})}
 deleteReport(id){return this.transaction(s=>{s.reports=s.reports.filter(r=>r.id!==id)})}
 newSession(){return this.transaction(s=>{const session={id:uid('chat'),time:new Date().toISOString(),paused:false,messages:[{role:'assistant',text:'你好，我是本地预设问答模拟的笔墨陪伴。今天，你想用怎样的线条或颜色表达心情？',time:new Date().toISOString()}]};s.sessions.unshift(session);return clone(session)})}
 chat(id,text){text=String(text||'').trim().slice(0,600);if(!text)return Promise.reject(Error('请先写下一句话'));return this.transaction(s=>{const session=s.sessions.find(x=>x.id===id);if(!session)throw Error('会话不存在');if(session.paused)throw Error('本次会话已暂停，请查看支持提示或创建新会话');const time=new Date().toISOString();session.messages.push({role:'user',text,time});const matches=matchRisk(text);if(matches.length){session.paused=true;const work={id:uid('risk'),userId:s.profile.id,sessionId:id,time,status:'待跟进',tags:['关键词触发','待人工核验'],demo:false,transcript:clone(session.messages),notes:[]};s.cases.unshift(work);return{risk:true,notice:riskNotice,session:clone(session),caseId:work.id}}session.messages.push({role:'assistant',text:reply(text),time});return{risk:false,session:clone(session)}})}
 deleteSession(id){return this.transaction(s=>{s.sessions=s.sessions.filter(x=>x.id!==id);s.cases=s.cases.filter(x=>x.sessionId!==id)})}
 updateProfile(data){return this.transaction(s=>Object.assign(s.profile,{nickname:String(data.nickname||'墨友').slice(0,20),grade:String(data.grade||'初中').slice(0,20),contact:String(data.contact||'').slice(0,50)}))}
 privacy(value){return this.transaction(s=>{s.profile.privateByDefault=!!value})}
 remaining(activityId){const a=this.state.activities.find(a=>a.id===activityId);return a?Math.max(0,a.capacity-this.state.bookings.filter(b=>b.activityId===activityId&&b.status!=='已取消').length):0}
 book(data){return this.transaction(s=>{if(!String(data.name||'').trim())throw Error('请填写称呼（可用化名）');if(!data.consent)throw Error('请确认这是本地预约演示');const linkedCase=data.caseId?s.cases.find(c=>c.id===data.caseId):null;const ownerId=linkedCase?linkedCase.userId:s.profile.id;let title;
 if(data.kind==='activity'){const a=s.activities.find(a=>a.id===data.activityId);if(!a)throw Error('活动不存在');if(s.bookings.filter(b=>b.activityId===a.id&&b.status!=='已取消').length>=a.capacity)throw Error('本机演示名额已满');if(s.bookings.some(b=>b.activityId===a.id&&b.userId===ownerId&&b.status!=='已取消'))throw Error('你已预约此活动');title=a.title;data.slot=a.time}
 else{const ex=s.experts.find(e=>e.id===data.expertId&&e.active);if(!ex||!ex.slots.includes(data.slot))throw Error('该专家或时段已不可用');if(s.bookings.some(b=>b.expertId===ex.id&&b.slot===data.slot&&b.status!=='已取消'))throw Error('该时段已被本机演示预约占用');title=ex.name}
 const b={id:uid('booking'),userId:ownerId,caseId:linkedCase?linkedCase.id:null,time:new Date().toISOString(),kind:data.kind,title,activityId:data.activityId||null,expertId:data.expertId||null,slot:data.slot,name:String(data.name).slice(0,20),grade:String(data.grade||'').slice(0,20),contact:String(data.contact||'').slice(0,50),request:String(data.request||'').slice(0,300),status:'待确认',demo:true};s.bookings.unshift(b);return clone(b)})}
 bookingStatus(id,status){if(!['待确认','已确认','已完成','已取消'].includes(status))return Promise.reject(Error('无效状态'));return this.transaction(s=>{const b=s.bookings.find(b=>b.id===id);if(!b)throw Error('预约不存在');if(b.status==='已完成'&&status!=='已完成')throw Error('已完成预约不再变更');b.status=status})}
 saveExpert(data){return this.transaction(s=>{if(!String(data.name||'').trim())throw Error('请填写专家姓名');const slots=(Array.isArray(data.slots)?data.slots:String(data.slots||'').split(/\n|，|,/)).map(x=>x.trim()).filter(Boolean);if(!slots.length)throw Error('请至少填写一个演示时段');const ex={id:data.id||uid('expert'),name:String(data.name).slice(0,30),title:String(data.title||'示例专家 · 资料待核验').slice(0,80),specialty:String(data.specialty||'书画美育').slice(0,100),bio:String(data.bio||'模拟资料，未经核验，非真实入驻。').slice(0,400),slots,active:data.active!==false,avatar:data.avatar||0};const i=s.experts.findIndex(e=>e.id===ex.id);if(i<0)s.experts.push(ex);else s.experts[i]=ex;return clone(ex)})}
 toggleExpert(id){return this.transaction(s=>{const e=s.experts.find(e=>e.id===id);if(!e)throw Error('专家不存在');e.active=!e.active})}
 caseStatus(id,status){if(!['待跟进','跟进中','处理完成'].includes(status))return Promise.reject(Error('无效状态'));return this.transaction(s=>{const c=s.cases.find(c=>c.id===id);if(!c)throw Error('工单不存在');c.status=status})}
 caseNote(id,text){if(!String(text).trim())return Promise.reject(Error('留言不能为空'));return this.transaction(s=>{const c=s.cases.find(c=>c.id===id);if(!c)throw Error('工单不存在');c.notes.push({text:String(text).slice(0,400),time:new Date().toISOString()})})}
 async reset(){const previous=this.state.works.slice();await this.adapter.set(KEY,initial());this.state=await this.adapter.get(KEY);for(const w of previous)await this.adapter.remove(MEDIA+w.id)}
}
return{Repository,KEY,MEDIA,uid,clone,moods,disclaimer,riskNotice,riskWords,matchRisk,questions,dimensions,calligraphyBrushes,paintingBrushes,inkColors,paintingColors,guides,greetings,dateLabel,nextDate};
});
