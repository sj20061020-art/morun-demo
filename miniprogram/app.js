App({
  onLaunch(){
    const M=require('./lib/model');
    // Only local APIs. No wx.request, cloud functions, login service or LLM API.
    const adapter={get:k=>new Promise((resolve,reject)=>wx.getStorage({key:k,success:r=>resolve(r.data),fail:e=>/not found|不存在|data not found/i.test(e.errMsg||'')?resolve(null):reject(Error('本地存储读取失败：'+(e.errMsg||'')))})),set:(k,v)=>new Promise((resolve,reject)=>wx.setStorage({key:k,data:v,success:resolve,fail:()=>reject(Error('本地存储空间不足或不可用。此次操作未保存，请先备份作品并清理记录。'))})),remove:k=>new Promise(resolve=>wx.removeStorage({key:k,complete:resolve}))};
    this.repo=new M.Repository(adapter);this.ready=this.repo.init();
    this.ready.catch(e=>wx.showModal({title:'本地存储暂不可用',content:e.message,showCancel:false}));
    // Local bundled font, with platform Song/serif fallback if unsupported.
    try{wx.getFileSystemManager().readFile({filePath:'assets/morun-song.woff2',encoding:'base64',success:r=>wx.loadFontFace({global:true,family:'MorunSong',source:'url("data:font/woff2;base64,'+r.data+'")',fail:()=>{}}),fail:()=>{}})}catch(e){}
  }
});
