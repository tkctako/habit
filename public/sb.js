(function(){
  const API='/api';

  function token(){return localStorage.getItem('habits_token');}
  function headers(){return{'Content-Type':'application/json','Authorization':'Bearer '+token()};}

  async function api(endpoint,body){
    const r=await fetch(API+'/'+endpoint,{method:'POST',headers:headers(),body:JSON.stringify(body)});
    if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error||'Request failed');}
    return r.json();
  }

  window.SB={
    myId:null, myProfile:null, partnerProfile:null,

    initFromCache(){
      try{
        const c=JSON.parse(sessionStorage.getItem('sb_cache'));
        if(c&&c.myId){this.myId=c.myId;this.myProfile=c.myProfile;this.partnerProfile=c.partnerProfile;return true;}
      }catch(e){}
      return false;
    },

    _saveCache(){
      try{sessionStorage.setItem('sb_cache',JSON.stringify({myId:this.myId,myProfile:this.myProfile,partnerProfile:this.partnerProfile}));}catch(e){}
    },

    async getSession(){return !!token();},

    async init(){
      if(!token())return false;
      try{
        const{me,partner}=await api('auth',{action:'me'});
        this.myId=me.id;
        this.myProfile=me;
        this.partnerProfile=partner;
        this._saveCache();
        return true;
      }catch(e){
        localStorage.removeItem('habits_token');
        sessionStorage.removeItem('sb_cache');
        return false;
      }
    },

    async login(email,password){
      const{token:t,user}=await api('auth',{action:'login',email,password});
      localStorage.setItem('habits_token',t);
      this.myId=user.id;
      this.myProfile=user;
      return true;
    },

    async loadHabits(){
      return api('habits',{action:'list'});
    },

    async toggleCheckIn(habitId,date){
      return api('habits',{action:'toggleCheckIn',habitId,date});
    },

    async addHabit(name,type,category){
      return api('habits',{action:'add',name,type,category});
    },

    async updateHabit(id,name,type,category){
      return api('habits',{action:'update',id,name,type,category});
    },

    async deleteHabit(id){
      return api('habits',{action:'delete',id});
    },

    async loadRecords(habitId){
      return api('records',{action:'list',habitId});
    },

    async addRecord(habitId,date,content){
      return api('records',{action:'add',habitId,date,content});
    },

    async updateRecord(id,date,content){
      return api('records',{action:'update',id,date,content});
    },

    async deleteRecord(id){
      return api('records',{action:'delete',id});
    },

    async loadMonthCheckIns(year,month,habits){
      if(!habits?.length)return[];
      return api('habits',{action:'monthCheckIns',year,month,habitIds:habits.map(h=>h.id)});
    },

    async getInviteCode(){
      // TODO if needed
      return null;
    },

    async updateDisplayName(name){
      await api('auth',{action:'updateName',name});
      this.myProfile.display_name=name;
      this._saveCache();
    },

    async updatePassword(pw){
      return api('auth',{action:'updatePassword',newPassword:pw});
    },

    async signOut(){
      localStorage.removeItem('habits_token');
      sessionStorage.removeItem('sb_cache');
      window.location.href='/';
    },

    async loadCover(coverId){
      return api('covers',{action:'load',coverId});
    },

    async saveCover(coverId,imageUrl,zoom,posX,posY){
      return api('covers',{action:'save',coverId,imageUrl,zoom,posX,posY});
    },

    async loadTodayRecords(){
      const d=new Date();const date=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      return api('records',{action:'today',date});
    },

    async loadAustralia(){return api('australia',{action:'list'});},
    async addAustralia(data){return api('australia',{action:'add',...data});},
    async updateAustralia(data){return api('australia',{action:'update',...data});},
    async toggleAustralia(id){return api('australia',{action:'toggle',id});},
    async deleteAustralia(id){return api('australia',{action:'delete',id});},

    formatDate(iso){
      if(!iso)return'';
      const d=new Date(iso+'T00:00:00');
      return`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
    }
  };
})();
