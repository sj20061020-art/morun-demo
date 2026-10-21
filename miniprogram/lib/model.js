/* Pure local domain model shared by the web preview and native WeChat pages.
 * No requests, LLM SDK, diagnosis or remote notifications are made.
 * PHQ-9 is a screening score, kept separate from the self-authored awareness radar.
 * Adapters use localStorage (preview) / wx.setStorage (mini program).
 * Image payloads are separate storage keys so one metadata key does not grow
 * with every picture. Transactions report quota failures and never fake success.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Morun=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
const KEY='morun.v2.state',MEDIA='morun.v2.media.';
const uid=prefix=>(prefix||'id')+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const clone=x=>JSON.parse(JSON.stringify(x));
const moods=['平静','释怀','烦躁','放松'];
const disclaimer='本工具为书画美育情绪辅助，不做心理诊断，不能替代专业心理咨询与治疗。';
const riskNotice='你此刻可能正在经历很难受的感受。本次对话已暂停。请直接联系身边可信任的成年人或专业人员；如果你正处于危险或难以保证自己的安全，请立即联系身边的人或就近急救人员，不必等待页面回应。';
const riskWords=['自伤','自杀','自残','活着没意思','不想活','结束生命','轻生','想死','伤害自己'];
const questions=[
 ['最近一周，我容易烦躁或坐立不安',0],['学习压力让我感到疲惫',1],['我很难说出心里的感受',2],['我会因为小事感到低落',3],
 ['我脑海里想法很多，难以静下来',0],['休息之后，我仍然觉得很累',1],['有情绪时，我习惯独自憋着',2],['我常常缺少做事的兴致',3],
 ['想到学习或未来，我会感到紧张',0],['我的身体常常紧绷、不易放松',1],['我希望找到表达情绪的方式',2],['我很难从日常小事中感到轻松',3]
].map((q,i)=>({id:i,text:q[0],dimension:q[1]}));
const phqQuestions=["做任何事都觉得沉闷或者根本不想做任何事","情绪低落、抑郁或绝望","难于入睡；半夜会醒，或相反，睡觉时间过多","觉得疲倦或没有活力","胃口极差或饮食过量","不喜欢自己——觉得自己做得不好、对自己失望或有负家人期望","难于集中精神做事，例如看报纸或看电视","其它人反映你行动或说话迟缓；或者相反，你比平常活动更多——坐立不安、停不下来","想到自己最好去死或者自残"];
const phqSource='https://www.phqscreeners.com/images/sites/g/files/g10060481/f/201412/PHQ9_Simplified%20Chinese%20for%20Mainland%20China.pdf';
const phqSupport='无论总分多少，如果你有伤害自己的想法，请及时告诉可信任的成年人，并寻求专业人员支持。若此刻难以保证安全，请立即联系身边的人或就近急救人员。';
const artReferences={"write":[{"id":"lanting","title":"王羲之《兰亭序》","image":"lanting.jpg","intro":"行书的连贯与呼吸","observation":"留意字与字之间的呼应，以及同一个字在不同位置的姿态。顺着笔画方向，用目光慢慢走一遍。","practice":"选择一个喜欢的字，先观察，再尝试书写。把注意力放在提按与停顿，不必追求形似。"},{"id":"gaoshen","title":"颜真卿《自书告身帖》","image":"gaoshen.jpg","intro":"楷书的端正与安定","observation":"观察点画的厚薄、字的重心和行列间的空白。感受稳健结构中的力量。","practice":"选择一个字，放慢速度，留意每次起笔和收笔。也可以只练一横一竖。"}],"paint":[{"id":"shitao-1","title":"石涛《山水册页》· 其一","image":"shitao-1.jpg","intro":"远近层次与浓淡变化","observation":"从远近层次、浓淡变化和留白三个角度观察山水。让目光从近处缓缓走向远处，感受画面的疏密。","practice":"试着用淡墨铺远山、浓墨点近景，再留出一片空白。参考是一种启发，画面可以随自己的感受生长。"},{"id":"shitao-2","title":"石涛《山水册页》· 其二","image":"shitao-2.jpg","intro":"山水留白与当下感受","observation":"观察画面中的浓墨与留白。留意人物与周围空间的关系，让目光在空白处停一停，感受安静。","practice":"用浓墨画出近景，再给画面留一片空白。可以在其中点一个小小的人物，也可以只留下此刻的感受。"}]};
function assessment(id){return id==='phq9'?{id:'phq9',title:'PHQ-9 情绪筛查',period:'过去两周',questions:phqQuestions.map(text=>({text})),options:['从来没有','有几天','刚超过一半天数','接近每天'],description:'请回想过去两周受到这些问题困扰的频率。建议在专业人员指导下填写；结果仅作筛查参考，不是诊断。'}:{id:'awareness',title:'美育情绪觉察',period:'最近一周',questions,options:['几乎没有','偶尔','经常','总是'],description:'自编美育觉察问卷，仅作感受参考，不是心理诊断。'}}
function doctorExamples(){const d=nextDate(7);return [{id:'expert-doctor-zhou',name:'周医生',title:'精神心理科',specialty:'青少年情绪困扰、睡眠问题',bio:'可填写青少年情绪困扰、睡眠等相关诉求，实际就医请通过医院正规渠道。',slots:[d+' 09:00',d+' 11:00'],active:true,avatar:0},{id:'expert-doctor-lin',name:'林医生',title:'儿童青少年门诊',specialty:'青少年心理健康、家庭沟通',bio:'可填写青少年心理健康、家庭沟通等相关诉求，具体安排请与机构确认。',slots:[d+' 14:30',d+' 16:00'],active:true,avatar:1}]}
const dimensions=['思绪纷扰','身心疲惫','表达受阻','低落感受'];
const calligraphyBrushes=['硬笔楷书','软笔行书','枯笔飞白','浓墨重笔'];
const paintingBrushes=['润水笔','浓墨笔','枯笔刷','淡墨渲染笔','点墨笔'];
const inkColors=['#222222','#555555','#999999'];
const paintingColors=['#222222','#687B78','#936C50','#495D74'];
const guides=['放慢呼吸，让笔尖随心流动。不必追求笔画好看，只需感受此刻。','缓缓落笔，给自己一段安静的时间。每一笔，都可以重新开始。','允许情绪出现，也允许它流动。用线条，为心里的感受留一点空间。'];
const greetings=['今天也辛苦了，给心情留一方素笺。','不用急着变好，先听听此刻的自己。','一呼一吸，一笔一墨，慢慢回到当下。','愿你在这里，找到安放感受的方式。'];
const demoQuestions=[
 {
  "question": "你好，最近学习压力很大。",
  "answer": "你好，听起来你最近一直在努力，也承担了不少压力。我们可以先给自己留一点空白：放松肩膀，慢慢呼吸，再想一想，今天的心情更像一条紧绷的线，还是一团浓墨？"
 },
 {
  "question": "一想到考试，我就静不下来。",
  "answer": "考试前有些紧张，是可以理解的。此刻不必急着把所有事情都解决。试着跟着呼吸画三条长线：吸气时停一停，呼气时缓缓落笔。你愿意先从一笔开始吗？"
 },
 {
  "question": "我想试试书法，应该怎么开始？",
  "answer": "可以进入“正念书法书写”，选择软笔行书和中墨，先写一个“安”字，或者只画一个圆。不需要写得漂亮，留意笔尖移动时的节奏，以及肩膀和手腕的感觉就好。"
 },
 {
  "question": "可是我不会画画，也能表达情绪吗？",
  "answer": "当然可以。情绪表达不需要绘画基础。你可以在水墨创作里选一种接近心情的颜色，随意画点、线或墨块。画面不必像什么，它只需要承载你此刻的一点感受。"
 },
 {
  "question": "我画了一团乱线，这样可以吗？",
  "answer": "可以，乱线也是一种表达。我们不根据画面判断你是什么样的人，也不作心理诊断。你可以看看：哪一条线最像此刻的心情？也可以在旁边留一点空白，给自己一个可以停下来的地方。"
 },
 {
  "question": "现在轻松一点了，我想把这份感受留下来。",
  "answer": "很高兴你觉察到了这一点变化。可以保存作品，选择情绪标签，再写一句“刚才的我……现在的我……”。作品会保存在这台设备的情绪作品库里，你以后可以回来看看。"
 }
];
const normalizeQuestion=text=>String(text||'').replace(/[\s，。？！、,.?!：:；;‘’“”\"']/g,'');
function demoProgress(messages){let step=0;for(const m of messages||[]){if(step<demoQuestions.length&&m.role==='user'&&normalizeQuestion(m.text)===normalizeQuestion(demoQuestions[step].question))step++}return step}
const replyRules=[
 {words:['学习','考试','成绩','压力','作业'],reply:'听起来，学习占用了你不少心力。要不要先画三条缓慢的长线？可以想一想：此刻的压力更像浓墨，还是一片淡淡的雾？'},
 {words:['生气','烦','愤怒','躁'],reply:'这些感受可以先被允许。你可以用枯笔画一些交错的短线，再换成湿笔慢慢覆盖一角。看看哪一处线条最像此刻的你。'},
 {words:['难过','低落','哭','孤独','伤心'],reply:'谢谢你把感受说出来。可以用一块淡墨留出一个安静的角落，给难过取一个颜色或形状。若愿意，也请把感受告诉一位信任的人。'},
 {words:['书法','写字','字','笔画'],reply:'不必写得标准。试着跟着呼吸写“安然”，或者只画一个缓慢的圆。留意笔尖经过纸面时，你的肩膀有没有松一点。'},
 {words:['画','水墨','颜色','创作'],reply:'这里没有画得好不好的标准。选一种接近心情的颜色，从一点、一条线开始。完成后，可以写一句“这幅画让我想到……”'},
 {words:['开心','平静','放松','谢谢'],reply:'这一点轻松很值得被记住。可以把它变成一枚月影、一片留白，或一句简短的书写，收藏在自己的作品库里。'}
];
function matchRisk(text){const s=String(text||'').replace(/\s/g,'');return riskWords.filter(w=>s.indexOf(w)!==-1)}
function reply(text){const preset=demoQuestions.find(q=>normalizeQuestion(q.question)===normalizeQuestion(text));if(preset)return preset.answer;const rule=replyRules.find(r=>r.words.some(w=>text.indexOf(w)!==-1));return rule?rule.reply:'我会以书画和情绪表达的方式陪你做一点探索。此刻心里的感受，更像一条线、一团墨，还是一片留白？你也可以试试书写，或了解线下活动。'}
function dateLabel(time){return new Date(time).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
function nextDate(days){const d=new Date();d.setDate(d.getDate()+days);const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function initial(){const now=new Date().toISOString(),d7=nextDate(7),d14=nextDate(14);return{
 version:2,artAssessmentRevision:1,profile:{id:uid('student'),nickname:'墨友',grade:'初中',contact:'',privateByDefault:true},works:[],reports:[],sessions:[],bookings:[],
 experts:[{id:'expert-zheng',name:'郑红兰老师',title:'书画美育',specialty:'青少年情绪表达、书画美育',bio:'可围绕书画美育、情绪表达等方向填写预约诉求。',slots:[d7+' 10:00',d7+' 15:00',d14+' 10:00'],active:true,avatar:0},
 {id:'expert-chen',name:'陈琳',title:'音乐艺术疗愈',specialty:'音乐艺术疗愈、音乐心理学',bio:'可围绕音乐、艺术表达与当下感受填写预约诉求。',slots:[d7+' 14:00',d14+' 15:00'],active:true,avatar:1},...doctorExamples()],
 activities:[{id:'activity-1',title:'一笔一息 · 线条静心团辅',time:d7+' 14:00',place:'美育教室 A',capacity:12,intro:'以呼吸与线条为线索，体验正念书写和感受分享。'},
 {id:'activity-2',title:'心栖意境 · 线下书画静心活动',time:d14+' 10:00',place:'书画工作坊',capacity:10,intro:'用湿墨、枯笔与留白表达当下心情。'}],
 cases:[{id:'demo-risk-1',userId:'DEMO-STUDENT-01',sessionId:null,time:now,status:'待跟进',tags:['关键词触发','预置模拟'],demo:true,transcript:[{role:'user',text:'（模拟案例）我压力很大，活着没意思。',time:now}],notes:[]},
 {id:'demo-risk-2',userId:'DEMO-STUDENT-02',sessionId:null,time:now,status:'跟进中',tags:['关键词触发','预置模拟'],demo:true,transcript:[{role:'user',text:'（模拟案例）我有自伤的想法。',time:now}],notes:[{text:'演示：建议联系可信任成年人，并协助了解线下支持渠道。',time:now}]}]
}}
function tidyInterfaceCopy(s){const pairs=[["示例专家 · 资料待核验","书画美育"],["示例资料 · 非真实入驻","音乐艺术疗愈"],["示例医院 · 精神心理科医生","精神心理科"],["示例医院 · 儿童青少年门诊","儿童青少年门诊"],["姓名为项目方案中的示例，不代表真实入驻或服务承诺。身份、擅长方向及排班均为演示资料，正式使用前须核验。","可围绕书画美育、情绪表达等方向填写预约诉求。"],["方案提供的示例介绍为“马来西亚音乐艺术疗愈、音乐心理学博士”，未经核验。仅用于演示卡片和预约流程，不作资质背书。","可围绕音乐、艺术表达与当下感受填写预约诉求。"],["虚构医生资料，仅演示医院医生类型的预约流程，不对应真实医院、医师或资质。实际就医请通过医院正规渠道。","可填写青少年情绪困扰、睡眠等相关诉求，实际就医请通过医院正规渠道。"],["虚构医生资料，未关联真实医疗机构，不提供在线诊疗或处方。仅用于本机预约演示。","可填写青少年心理健康、家庭沟通等相关诉求，具体安排请与机构确认。"],["模拟资料，未经核验，非真实入驻。","请填写服务方向与预约说明。"]];const clean=t=>pairs.reduce((v,p)=>v.split(p[0]).join(p[1]),String(t||'')).replace(/（模拟）/g,'').replace(/模拟活动，不实际招生。/g,'').replace(/示例美育教室 A/g,'美育教室 A').replace(/示例书画工作坊/g,'书画工作坊');for(const e of s.experts)if(['expert-zheng','expert-chen','expert-doctor-zhou','expert-doctor-lin'].includes(e.id))for(const k of ['title','specialty','bio'])e[k]=clean(e[k]);for(const a of s.activities)if(['activity-1','activity-2'].includes(a.id)){a.intro=clean(a.intro);a.place=clean(a.place)}for(const c of s.cases)if(c.demo){c.tags=c.tags.map(t=>t==='预置模拟'?'预置案例':t);for(const m of c.transcript)m.text=m.text.replace('（模拟案例）','');for(const n of c.notes)n.text=n.text.replace('演示：','')}for(const session of s.sessions)for(const m of session.messages)if(m.role==='assistant'&&m.text==="你好，我是本地预设问答模拟的笔墨陪伴。今天，你想用怎样的线条或颜色表达心情？")m.text="你好，我是你的笔墨陪伴。今天，你想用怎样的线条或颜色表达心情？";s.interfaceCopyRevision=1}
class Repository{
 constructor(adapter){this.adapter=adapter;this.state=null;this.queue=Promise.resolve()}
 async init(){this.state=await this.adapter.get(KEY);if(!this.state||this.state.version!==2){this.state=initial();tidyInterfaceCopy(this.state);await this.adapter.set(KEY,this.state)}else if(!this.state.interfaceCopyRevision||this.state.experts.some(e=>['expert-doctor-zhou','expert-doctor-lin'].includes(e.id)&&/（虚构示例）$/.test(e.name))||this.state.bookings.some(b=>['expert-doctor-zhou','expert-doctor-lin'].includes(b.expertId)&&/（虚构示例）$/.test(b.title))||!this.state.artAssessmentRevision||this.state.experts.some(e=>e.id==='expert-chen'&&e.name==='陈林')||this.state.activities.some(a=>a.id==='activity-2'&&a.title==='以墨为语 · 情绪水墨小组')||this.state.bookings.some(b=>b.title==='陈林'&&b.expertId==='expert-chen'||b.title==='以墨为语 · 情绪水墨小组'&&b.activityId==='activity-2')){await this.transaction(s=>{tidyInterfaceCopy(s);for(const e of s.experts)if(e.id==='expert-doctor-zhou'&&e.name==='周医生（虚构示例）'||e.id==='expert-doctor-lin'&&e.name==='林医生（虚构示例）')e.name=e.name.replace('（虚构示例）','');for(const b of s.bookings)if(b.expertId==='expert-doctor-zhou'&&b.title==='周医生（虚构示例）'||b.expertId==='expert-doctor-lin'&&b.title==='林医生（虚构示例）')b.title=b.title.replace('（虚构示例）','');for(const e of s.experts)if(e.id==='expert-chen'&&e.name==='陈林')e.name='陈琳';for(const b of s.bookings){if(b.expertId==='expert-chen'&&b.title==='陈林')b.title='陈琳';if(b.activityId==='activity-2'&&b.title==='以墨为语 · 情绪水墨小组')b.title='心栖意境 · 线下书画静心活动'}for(const a of s.activities)if(a.id==='activity-2'&&a.title==='以墨为语 · 情绪水墨小组')a.title='心栖意境 · 线下书画静心活动';if(!s.artAssessmentRevision){for(const e of doctorExamples())if(!s.experts.some(x=>x.id===e.id))s.experts.push(e);s.artAssessmentRevision=1}})}return this.snapshot()}
 snapshot(){return clone(this.state)}
 transaction(fn){const task=this.queue.then(async()=>{const draft=clone(this.state),result=fn(draft);await this.adapter.set(KEY,draft);this.state=draft;return result});this.queue=task.catch(()=>{});return task}
 async media(work){return work.image||await this.adapter.get(MEDIA+work.id)||''}
 async addWork(data,image){if(!image)throw Error('作品图片为空');const id=uid('work');await this.adapter.set(MEDIA+id,image);try{await this.transaction(s=>{s.works.unshift({id,type:data.type,emotion:data.emotion||'平静',note:String(data.note||'').slice(0,300),time:new Date().toISOString(),authorized:!s.profile.privateByDefault,comments:[],userId:s.profile.id})})}catch(e){await this.adapter.remove(MEDIA+id);throw e}return id}
 async deleteWork(id){await this.transaction(s=>{s.works=s.works.filter(w=>w.id!==id)});await this.adapter.remove(MEDIA+id)}
 authorize(id,value){return this.transaction(s=>{const w=s.works.find(w=>w.id===id);if(!w)throw Error('作品不存在');w.authorized=!!value})}
 authorizedWorks(){return clone(this.state.works.filter(w=>w.authorized))}
 comment(id,text){if(!String(text).trim())return Promise.reject(Error('请填写美育评语'));if(/诊断|抑郁症|焦虑症|双相|确诊|用药|药物|病情|人格障碍|患有/.test(text))return Promise.reject(Error('请仅从美育和艺术表达角度评论，不能使用心理诊断或治疗类文字'));return this.transaction(s=>{const w=s.works.find(w=>w.id===id&&w.authorized);if(!w)throw Error('作品未授权或授权已撤回');w.comments.push({text:String(text).slice(0,300),time:new Date().toISOString()})})}
 addReport(answers){if(answers.length!==12||answers.some(v=>!Number.isInteger(v)||v<0||v>3))return Promise.reject(Error('请完成全部 12 题'));return this.transaction(s=>{const values=dimensions.map((_,j)=>questions.reduce((n,q,i)=>n+(q.dimension===j?answers[i]:0),0));const highest=Math.max(...values);const text=highest<=2?'近期这些感受出现得较少。可以继续用笔墨记录平常的小感受。':highest<=5?'近期有些感受值得你停下来照顾。可以选择书写、创作，或向信任的人表达。':'近期有些感受出现得较频繁。除了书画体验，也可以向可信任的成年人或专业人员寻求支持。';const report={id:uid('report'),time:new Date().toISOString(),answers:answers.slice(),values,dimensions:dimensions.slice(),text,emotion:'情绪参考',note:'自编美育情绪觉察问卷，未经量表信效度验证；仅作自我觉察，不诊断、不定性。'};s.reports.unshift(report);return clone(report)})}
 // PHQ-9 mainland Chinese form: 9 items, 0–3 each, past two weeks. Item 9 is independent of the total.
 addPhqReport(answers){if(answers.length!==9||answers.some(v=>!Number.isInteger(v)||v<0||v>3))return Promise.reject(Error('请完成全部 9 题'));return this.transaction(s=>{const score=answers.reduce((a,b)=>a+b,0),band=score<5?'0–4':score<10?'5–9':score<15?'10–14':score<20?'15–19':'20–27';const safetyFlag=answers[8]>0;const report={id:uid('report'),scaleId:'phq9',title:'PHQ-9 筛查参考',score,maxScore:27,band,safetyFlag,time:new Date().toISOString(),answers:answers.slice(),emotion:'筛查参考',text:score<5?'本次填写中，相关困扰出现得较少。低分也不代表无需关注自己的感受。':score<10?'本次填写提示有一些困扰。可以留意持续时间及日常影响，必要时向专业人员求助。':'本次填写提示有较多困扰，建议向可信任的成年人表达，并由专业人员进一步评估。书画活动不能替代专业支持。',note:'PHQ-9：过去两周，9 题各 0–3 分，总分 0–27。仅作筛查参考，不作疾病诊断或安全风险分级。',source:phqSource};s.reports.unshift(report);return clone(report)})}
 deleteReport(id){return this.transaction(s=>{s.reports=s.reports.filter(r=>r.id!==id)})}
 newSession(){return this.transaction(s=>{const session={id:uid('chat'),time:new Date().toISOString(),paused:false,messages:[{role:'assistant',text:'你好，我是你的笔墨陪伴。今天，你想用怎样的线条或颜色表达心情？',time:new Date().toISOString()}]};s.sessions.unshift(session);return clone(session)})}
 chat(id,text){text=String(text||'').trim().slice(0,600);if(!text)return Promise.reject(Error('请先写下一句话'));return this.transaction(s=>{const session=s.sessions.find(x=>x.id===id);if(!session)throw Error('会话不存在');if(session.paused)throw Error('本次会话已暂停，请查看支持提示或创建新会话');const time=new Date().toISOString();session.messages.push({role:'user',text,time});const matches=matchRisk(text);if(matches.length){session.paused=true;const work={id:uid('risk'),userId:s.profile.id,sessionId:id,time,status:'待跟进',tags:['关键词触发','待人工核验'],demo:false,transcript:clone(session.messages),notes:[]};s.cases.unshift(work);return{risk:true,notice:riskNotice,session:clone(session),caseId:work.id}}session.messages.push({role:'assistant',text:reply(text),time});return{risk:false,session:clone(session)}})}
 deleteSession(id){return this.transaction(s=>{s.sessions=s.sessions.filter(x=>x.id!==id);s.cases=s.cases.filter(x=>x.sessionId!==id)})}
 updateProfile(data){return this.transaction(s=>Object.assign(s.profile,{nickname:String(data.nickname||'墨友').slice(0,20),grade:String(data.grade||'初中').slice(0,20),contact:String(data.contact||'').slice(0,50)}))}
 privacy(value){return this.transaction(s=>{s.profile.privateByDefault=!!value})}
 remaining(activityId){const a=this.state.activities.find(a=>a.id===activityId);return a?Math.max(0,a.capacity-this.state.bookings.filter(b=>b.activityId===activityId&&b.status!=='已取消').length):0}
 book(data){return this.transaction(s=>{if(!String(data.name||'').trim())throw Error('请填写称呼（可用化名）');if(!data.consent)throw Error('请核对并确认预约信息');const linkedCase=data.caseId?s.cases.find(c=>c.id===data.caseId):null;const ownerId=linkedCase?linkedCase.userId:s.profile.id;let title;
 if(data.kind==='activity'){const a=s.activities.find(a=>a.id===data.activityId);if(!a)throw Error('活动不存在');if(s.bookings.filter(b=>b.activityId===a.id&&b.status!=='已取消').length>=a.capacity)throw Error('名额已满');if(s.bookings.some(b=>b.activityId===a.id&&b.userId===ownerId&&b.status!=='已取消'))throw Error('你已预约此活动');title=a.title;data.slot=a.time}
 else{const ex=s.experts.find(e=>e.id===data.expertId&&e.active);if(!ex||!ex.slots.includes(data.slot))throw Error('该专家或时段已不可用');if(s.bookings.some(b=>b.expertId===ex.id&&b.slot===data.slot&&b.status!=='已取消'))throw Error('该时段已被预约占用');title=ex.name}
 const b={id:uid('booking'),userId:ownerId,caseId:linkedCase?linkedCase.id:null,time:new Date().toISOString(),kind:data.kind,title,activityId:data.activityId||null,expertId:data.expertId||null,slot:data.slot,name:String(data.name).slice(0,20),grade:String(data.grade||'').slice(0,20),contact:String(data.contact||'').slice(0,50),request:String(data.request||'').slice(0,300),status:'待确认',demo:true};s.bookings.unshift(b);return clone(b)})}
 bookingStatus(id,status){if(!['待确认','已确认','已完成','已取消'].includes(status))return Promise.reject(Error('无效状态'));return this.transaction(s=>{const b=s.bookings.find(b=>b.id===id);if(!b)throw Error('预约不存在');if(b.status==='已完成'&&status!=='已完成')throw Error('已完成预约不再变更');b.status=status})}
 saveExpert(data){return this.transaction(s=>{if(!String(data.name||'').trim())throw Error('请填写专家姓名');const slots=(Array.isArray(data.slots)?data.slots:String(data.slots||'').split(/\n|，|,/)).map(x=>x.trim()).filter(Boolean);if(!slots.length)throw Error('请至少填写一个可约时段');const ex={id:data.id||uid('expert'),name:String(data.name).slice(0,30),title:String(data.title||'书画美育').slice(0,80),specialty:String(data.specialty||'书画美育').slice(0,100),bio:String(data.bio||'请填写服务方向与预约说明。').slice(0,400),slots,active:data.active!==false,avatar:data.avatar||0};const i=s.experts.findIndex(e=>e.id===ex.id);if(i<0)s.experts.push(ex);else s.experts[i]=ex;return clone(ex)})}
 toggleExpert(id){return this.transaction(s=>{const e=s.experts.find(e=>e.id===id);if(!e)throw Error('专家不存在');e.active=!e.active})}
 caseStatus(id,status){if(!['待跟进','跟进中','处理完成'].includes(status))return Promise.reject(Error('无效状态'));return this.transaction(s=>{const c=s.cases.find(c=>c.id===id);if(!c)throw Error('工单不存在');c.status=status})}
 caseNote(id,text){if(!String(text).trim())return Promise.reject(Error('留言不能为空'));return this.transaction(s=>{const c=s.cases.find(c=>c.id===id);if(!c)throw Error('工单不存在');c.notes.push({text:String(text).slice(0,400),time:new Date().toISOString()})})}
 async reset(){const previous=this.state.works.slice();const fresh=initial();tidyInterfaceCopy(fresh);await this.adapter.set(KEY,fresh);this.state=await this.adapter.get(KEY);for(const w of previous)await this.adapter.remove(MEDIA+w.id)}
}
return{Repository,KEY,MEDIA,uid,clone,moods,disclaimer,riskNotice,riskWords,matchRisk,demoQuestions,demoProgress,assessment,phqQuestions,phqSource,phqSupport,artReferences,questions,dimensions,calligraphyBrushes,paintingBrushes,inkColors,paintingColors,guides,greetings,dateLabel,nextDate};
});
