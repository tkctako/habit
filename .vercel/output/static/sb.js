(function(){
  const URL='https://kmcnhuqrxxwzhnesisar.supabase.co';
  const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttY25odXFyeHh3emhuZXNpc2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzc4NDAsImV4cCI6MjA4OTc1Mzg0MH0.es4OLj5R5eE3c2y-mT8zDXrd4uB525e2xgDkObO7tl8';
  const sb=supabase.createClient(URL,KEY);

  window.SB={
    client:sb,
    myId:null, myProfile:null, partnerProfile:null,

    async getSession(){
      const{data:{session}}=await sb.auth.getSession();
      return session;
    },

    // Fast init: restore from cache first, then refresh in background
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

    async init(){
      const s=await this.getSession();
      if(!s){sessionStorage.removeItem('sb_cache');return false;}
      this.myId=s.user.id;
      // Parallel: fetch own profile + all users in one query
      const{data:allUsers}=await sb.from('users').select('*').or(`id.eq.${s.user.id},couple_id.not.is.null`);
      if(allUsers){
        this.myProfile=allUsers.find(u=>u.id===s.user.id)||null;
        if(this.myProfile?.couple_id){
          this.partnerProfile=allUsers.find(u=>u.couple_id===this.myProfile.couple_id&&u.id!==s.user.id)||null;
        }
      }
      this._saveCache();
      return true;
    },

    async loadHabits(){
      const me=this.myProfile;
      if(!me?.couple_id)return[];
      const today=new Date().toISOString().split('T')[0];
      const{data:habits}=await sb.from('habits').select('*').eq('couple_id',me.couple_id).order('created_at');
      if(!habits?.length)return[];
      const{data:cks}=await sb.from('check_ins').select('*').eq('date',today).in('habit_id',habits.map(h=>h.id));
      const ci=cks||[];
      return habits.map(h=>{
        if(h.type==='shared'){
          const myC=ci.find(c=>c.habit_id===h.id&&c.user_id===me.id);
          const bfC=ci.find(c=>c.habit_id===h.id&&c.user_id===this.partnerProfile?.id);
          return{id:h.id,name:h.name,type:'shared',category:h.category,
            users:[
              {name:'我',emoji:me.emoji||'👩',streak:0,done:!!myC?.done},
              {name:'男友',emoji:this.partnerProfile?.emoji||'👦',streak:0,done:!!bfC?.done}
            ]};
        }else{
          const isMe=h.created_by===me.id;
          const ck=ci.find(c=>c.habit_id===h.id&&c.user_id===h.created_by);
          return{id:h.id,name:h.name,type:'personal',owner:isMe?'me':'bf',
            category:h.category,streak:0,done:!!ck?.done};
        }
      });
    },

    async toggleCheckIn(habitId){
      const s=await this.getSession();
      const today=new Date().toISOString().split('T')[0];
      const{data:ex}=await sb.from('check_ins').select('*')
        .eq('habit_id',habitId).eq('user_id',s.user.id).eq('date',today).maybeSingle();
      if(ex){
        await sb.from('check_ins').update({done:!ex.done}).eq('id',ex.id);
      }else{
        await sb.from('check_ins').insert({habit_id:habitId,user_id:s.user.id,date:today,done:true});
      }
    },

    async addHabit(name,type,category){
      const me=this.myProfile;
      const s=await this.getSession();
      await sb.from('habits').insert({name,type,category,couple_id:me.couple_id,created_by:s.user.id});
    },

    async updateHabit(id,name,type,category){
      await sb.from('habits').update({name,type,category}).eq('id',id);
    },

    async deleteHabit(id){
      await sb.from('habits').delete().eq('id',id);
    },

    async loadRecords(habitId){
      const{data}=await sb.from('records').select('*').eq('habit_id',habitId).order('date',{ascending:false});
      return(data||[]).map(r=>({id:r.id,date:r.date,...(r.content||{})}));
    },

    async addRecord(habitId,date,content){
      const s=await this.getSession();
      await sb.from('records').insert({habit_id:habitId,user_id:s.user.id,date,content});
    },

    async updateRecord(id,date,content){
      await sb.from('records').update({date,content}).eq('id',id);
    },

    async deleteRecord(id){
      await sb.from('records').delete().eq('id',id);
    },

    async loadMonthCheckIns(year,month,habits){
      if(!habits?.length)return[];
      const start=`${year}-${String(month+1).padStart(2,'0')}-01`;
      const lastDay=new Date(year,month+1,0).getDate();
      const end=`${year}-${String(month+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
      const{data}=await sb.from('check_ins').select('*')
        .in('habit_id',habits.map(h=>h.id)).gte('date',start).lte('date',end);
      return data||[];
    },

    async getInviteCode(){
      const me=this.myProfile;
      if(!me?.couple_id)return null;
      const{data}=await sb.from('couples').select('invite_code').eq('id',me.couple_id).single();
      return data?.invite_code;
    },

    async updateDisplayName(name){
      const s=await this.getSession();
      await sb.from('users').update({display_name:name}).eq('id',s.user.id);
      this.myProfile.display_name=name;
    },

    async signOut(){
      sessionStorage.removeItem('sb_cache');
      await sb.auth.signOut();
      window.location.href='/';
    },

    async loadCover(coverId){
      const me=this.myProfile;
      if(!me?.couple_id)return null;
      const{data}=await sb.from('covers').select('*').eq('id',coverId).eq('couple_id',me.couple_id).maybeSingle();
      return data;
    },

    async saveCover(coverId,imageUrl,zoom,posX,posY){
      const me=this.myProfile;
      if(!me?.couple_id)return;
      const{data:existing}=await sb.from('covers').select('id').eq('id',coverId).eq('couple_id',me.couple_id).maybeSingle();
      if(existing){
        await sb.from('covers').update({image_url:imageUrl,zoom:zoom||100,pos_x:posX||0,pos_y:posY||0}).eq('id',coverId);
      }else{
        await sb.from('covers').insert({id:coverId,couple_id:me.couple_id,image_url:imageUrl,zoom:zoom||100,pos_x:posX||0,pos_y:posY||0});
      }
    },

    formatDate(iso){
      if(!iso)return'';
      const d=new Date(iso+'T00:00:00');
      return`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
    }
  };
})();
