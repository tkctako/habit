// Shared user settings modal logic
(function(){
  window.updateUserGreeting=function(){
    const g=document.getElementById('user-greeting');
    if(g&&window.SB?.myProfile)g.textContent=SB.myProfile.display_name||'';
  };

  const origInit=window.SB?.init;
  if(origInit){
    const _orig=origInit.bind(SB);
    SB.init=async function(){const r=await _orig();updateUserGreeting();return r;};
  }
  if(window.SB?.myProfile)updateUserGreeting();

  window.openUserModal=function(){
    document.getElementById('uf-name').value=SB.myProfile?.display_name||'';
    document.getElementById('pw-new').value='';
    document.getElementById('pw-confirm').value='';
    document.getElementById('pw-error').style.display='none';
    document.getElementById('pw-success').style.display='none';
    document.getElementById('user-modal').style.display='flex';
  };

  // Bind forms after DOM is ready
  document.addEventListener('DOMContentLoaded',function(){
    document.getElementById('user-form')?.addEventListener('submit',async function(e){
      e.preventDefault();
      const name=document.getElementById('uf-name').value.trim();
      if(name){
        await SB.updateDisplayName(name);
        updateUserGreeting();
      }
      document.getElementById('user-modal').style.display='none';
    });

    document.getElementById('pw-form')?.addEventListener('submit',async function(e){
      e.preventDefault();
      const pw=document.getElementById('pw-new').value;
      const pw2=document.getElementById('pw-confirm').value;
      const err=document.getElementById('pw-error');
      const ok=document.getElementById('pw-success');
      err.style.display='none';ok.style.display='none';
      if(pw.length<6){err.textContent='密碼至少 6 個字元';err.style.display='';return;}
      if(pw!==pw2){err.textContent='兩次密碼不一致';err.style.display='';return;}
      try{await SB.updatePassword(pw);}
      catch(e){err.textContent=e.message;err.style.display='';return;}
      ok.textContent='密碼已更新 ✓';ok.style.display='';
      document.getElementById('pw-new').value='';
      document.getElementById('pw-confirm').value='';
    });
  });
})();
