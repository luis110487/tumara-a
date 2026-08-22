let sb;
function getSupabase(){
  if(!sb){
    const url=document.querySelector('meta[name="SUPABASE_URL"]')?.content;
    const key=document.querySelector('meta[name="SUPABASE_ANON_KEY"]')?.content;
    if(!url||!key||!window.supabase) return null;
    sb=window.supabase.createClient(url,key);
  }
  return sb;
}
async function getSession(){const s=getSupabase(); if(!s)return null; const {data}=await s.auth.getSession(); return data.session;}
function message(id,text,ok=false){const e=document.getElementById(id);if(e){e.textContent=text;e.className='msg '+(ok?'ok':'error');}}
async function api(path,options={}){const session=await getSession();if(!session){location.href='/cuenta';throw new Error('AUTH_REQUIRED');}options.headers={...(options.headers||{}),Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'};const r=await fetch(path,options);let body={};try{body=await r.json()}catch{}if(!r.ok)throw new Error(body.detail||body.error||'No fue posible completar la operación');return body;}

document.addEventListener('DOMContentLoaded',()=>{
  const tabs=document.querySelectorAll('[data-tab]');
  tabs.forEach(btn=>btn.addEventListener('click',()=>{tabs.forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.getElementById('login-form').hidden=btn.dataset.tab!=='login';document.getElementById('signup-form').hidden=btn.dataset.tab!=='signup';}));
  const lf=document.getElementById('login-form');
  if(lf) lf.addEventListener('submit',async e=>{e.preventDefault();const s=getSupabase();if(!s)return message('auth-msg','Configura las variables de Supabase.');const {error}=await s.auth.signInWithPassword({email:loginEmail.value,password:loginPassword.value});if(error)return message('auth-msg',error.message);location.href='/';});
  const sf=document.getElementById('signup-form');
  if(sf) sf.addEventListener('submit',async e=>{e.preventDefault();const s=getSupabase();if(!s)return message('auth-msg','Configura Supabase.');const {error}=await s.auth.signUp({email:signupEmail.value,password:signupPassword.value,options:{data:{full_name:signupName.value.trim()}}});if(error)return message('auth-msg',error.message);message('auth-msg','Cuenta creada. Revisa tu correo si la confirmación está activada.',true);});
  const logout=document.getElementById('logout-btn');
  if(logout) logout.addEventListener('click',async()=>{const s=getSupabase();if(s) await s.auth.signOut();location.href='/';});
  const pf=document.getElementById('professional-form');
  if(pf) pf.addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/professionals',{method:'POST',body:JSON.stringify({display_name:document.getElementById('pro-name').value.trim(),category_id:document.getElementById('pro-category').value,city:document.getElementById('pro-city').value.trim(),neighborhood:document.getElementById('pro-neighborhood').value.trim(),experience_years:document.getElementById('pro-exp').value,description:document.getElementById('pro-description').value.trim()})});message('pro-msg','Perfil enviado para aprobación.',true);pf.reset()}catch(err){if(err.message!=='AUTH_REQUIRED')message('pro-msg',err.message)}});
  const rf=document.getElementById('request-form');
  if(rf) rf.addEventListener('submit',async e=>{e.preventDefault();try{const j=await api('/api/requests',{method:'POST',body:JSON.stringify({professional_id:rf.dataset.professional,service_title:document.getElementById('req-title').value.trim(),description:document.getElementById('req-description').value.trim(),city:document.getElementById('req-city').value.trim(),address:document.getElementById('req-address').value.trim(),preferred_date:document.getElementById('req-date').value?new Date(document.getElementById('req-date').value).toISOString():null})});location.href='/solicitud/'+j.id+'/chat'}catch(err){if(err.message!=='AUTH_REQUIRED')message('req-msg',err.message)}});
  loadChat();
});

async function loadChat(){
  const box=document.getElementById('messages'); if(!box)return;
  try{
    const session=await getSession(); if(!session){location.href='/cuenta';return;}
    const data=await api('/api/requests/'+window.TUMARANA_REQUEST_ID);
    document.getElementById('request-summary').textContent=`${data.service_title} · ${data.professional?.display_name||'Profesional'}`;
    box.innerHTML=data.messages.map(m=>`<div class="bubble ${m.sender_id===session.user.id?'mine':''}"><small>${m.sender_id===session.user.id?'Tú':'Participante'}</small><div>${escapeHtml(m.body)}</div></div>`).join('');
    const form=document.getElementById('message-form');
    form.onsubmit=async e=>{e.preventDefault();const input=document.getElementById('message-body');const body=input.value.trim();if(!body)return;try{await api('/api/requests/'+window.TUMARANA_REQUEST_ID+'/messages',{method:'POST',body:JSON.stringify({body})});input.value='';await loadChat()}catch(err){message('chat-msg',err.message)}};
    const s=getSupabase();
    if(s&&!window.__chatSubscription){window.__chatSubscription=s.channel('request-'+window.TUMARANA_REQUEST_ID).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'request_id=eq.'+window.TUMARANA_REQUEST_ID},()=>loadChat()).subscribe();}
  }catch(err){if(err.message!=='AUTH_REQUIRED')message('chat-msg',err.message)}
}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
