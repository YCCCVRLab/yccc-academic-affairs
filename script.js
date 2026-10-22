const AA_SUPABASE_CONFIG_URL='https://ycccvrlab.github.io/yccc-academic-affairs/supabase-config.js';
const AA_SUPABASE_SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3';
const aaLoadScript=src=>new Promise((resolve,reject)=>{const old=[...document.scripts].find(s=>s.src===src);if(old){if(old.dataset.loaded==='yes')return resolve();old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>{s.dataset.loaded='yes';resolve()};s.onerror=reject;document.head.appendChild(s)});
const aaEmail=email=>String(email||'').trim().toLowerCase();
const aaAllowedDomain=email=>/^[^\s@]+@mainecc\.edu$/i.test(String(email||'').trim());
let aaSupabase=null,aaSupabaseReady=null,aaCurrentRole='public';
const aaEnsureSupabase=async()=>{if(aaSupabase)return aaSupabase;if(aaSupabaseReady)return aaSupabaseReady;aaSupabaseReady=(async()=>{await aaLoadScript(AA_SUPABASE_SDK);await aaLoadScript(AA_SUPABASE_CONFIG_URL);const c=window.AA_SUPABASE_CONFIG;if(!c?.url||!c?.publishableKey)throw new Error('Sign-in configuration is incomplete.');aaSupabase=window.supabase.createClient(c.url,c.publishableKey);return aaSupabase})();return aaSupabaseReady};
const updateAccountUI=(email='',name='',role='viewer')=>{const label=document.getElementById('accountLabel'),mark=document.getElementById('accountMark'),status=document.getElementById('accountStatus'),signIn=document.getElementById('accountSignIn'),signOut=document.getElementById('accountSignOut');if(!label||!mark||!status||!signIn||!signOut)return;const valid=!!email&&aaAllowedDomain(email);aaCurrentRole=valid?role:'public';if(valid){const displayName=name||email.split('@')[0];label.textContent=displayName;mark.textContent=displayName.split(/[\s._-]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'AA';status.textContent=email+' · '+role;signIn.hidden=true;signOut.hidden=false;window.AcademicAffairsAccount={email:email,name:displayName,access:{role:role,features:[]},authenticated:true};if(role==='admin'&&!status.querySelector('a')){const a=document.createElement('a');a.href='./admin.html';a.textContent='Admin console';a.style.cssText='display:block;margin-top:6px';status.append(a)}}else{label.textContent='Academic Affairs';mark.textContent='AA';status.textContent='Not signed in';signIn.hidden=false;signOut.hidden=true;window.AcademicAffairsAccount={authenticated:false,access:{role:'public',features:[]}}}aaRenderManagedResources()};
const aaRenderManagedResources=async()=>{const section=document.getElementById('managedResources'),box=document.getElementById('managedResourceList');if(!section||!box)return;try{const client=await aaEnsureSupabase(),{data,error}=await client.from('aa_resources').select('id,title,description,url,category').eq('published',true).order('category').order('title');if(error)throw error;box.replaceChildren();if(!data?.length){section.hidden=true;return}for(const item of data){const article=document.createElement('article'),a=document.createElement('a'),p=document.createElement('p'),small=document.createElement('small');article.className='managed-resource';a.href=item.url;a.target='_blank';a.rel='noopener';a.textContent=item.title;p.textContent=item.description||'';small.textContent=item.category||'General';article.append(small,a,p);box.append(article)}section.hidden=false}catch(err){console.warn('Managed resources are temporarily unavailable',err)}};
const initAccountAuth=()=>{const button=document.getElementById('accountButton'),dropdown=document.getElementById('accountDropdown'),signIn=document.getElementById('accountSignIn'),signOut=document.getElementById('accountSignOut');if(!button||!dropdown||!signIn||!signOut)return;const close=()=>{dropdown.classList.remove('open');button.setAttribute('aria-expanded','false')};button.addEventListener('click',e=>{e.stopPropagation();const open=dropdown.classList.toggle('open');button.setAttribute('aria-expanded',String(open))});document.addEventListener('click',e=>{if(dropdown.classList.contains('open')&&!dropdown.contains(e.target)&&e.target!==button)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});updateAccountUI();const form=()=>{let wrap=dropdown.querySelector('.account-domain-warning');if(wrap){wrap.querySelector('input')?.focus();return}wrap=document.createElement('div');wrap.className='account-domain-warning';wrap.style.cssText='padding:12px;max-width:320px';const heading=document.createElement('strong');heading.textContent='Sign in with YCCC';const intro=document.createElement('p');intro.textContent='Create an account with your @mainecc.edu address, verify your email, and sign in. An administrator manages your access.';intro.style.cssText='font-size:13px;margin:6px 0';const email=document.createElement('input');email.type='email';email.placeholder='name@mainecc.edu';email.autocomplete='email';email.required=true;email.style.cssText='width:100%;margin:5px 0;padding:9px;border:1px solid #cbd5da;border-radius:6px;box-sizing:border-box';const password=document.createElement('input');password.type='password';password.placeholder='Password (8+ characters)';password.autocomplete='current-password';password.style.cssText=email.style.cssText;const note=document.createElement('div');note.style.cssText='font-size:12px;margin:6px 0;overflow-wrap:anywhere';const make=(text)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='display:block;width:100%;margin-top:6px;padding:8px;border:1px solid #cbd5da;border-radius:6px;background:#f5f7f8';return b};const login=make('Sign in'),create=make('Create account'),reset=make('Reset password'),cancel=make('Cancel');wrap.append(heading,intro,email,password,login,create,reset,note,cancel);signIn.hidden=true;signIn.insertAdjacentElement('beforebegin',wrap);const resetForm=()=>{wrap.remove();signIn.hidden=false};cancel.onclick=resetForm;const check=()=>{const em=aaEmail(email.value);if(!aaAllowedDomain(em)){note.textContent='Enter a valid @mainecc.edu address.';return null}if(password.value.length<8){note.textContent='Use a password with at least 8 characters.';return null}return em};login.onclick=async()=>{const em=check();if(!em)return;login.disabled=true;note.textContent='Signing in…';try{const client=await aaEnsureSupabase(),{error}=await client.auth.signInWithPassword({email:em,password:password.value});if(error)throw error;note.textContent='Signed in. Loading your permissions…'}catch(err){note.textContent=err.message||'Sign-in failed.'}finally{login.disabled=false}};create.onclick=async()=>{const em=check();if(!em)return;create.disabled=true;note.textContent='Creating account…';try{const client=await aaEnsureSupabase(),{data,error}=await client.auth.signUp({email:em,password:password.value,options:{emailRedirectTo:location.href.split('#')[0],data:{full_name:''}}});if(error)throw error;if(data.session){await client.auth.signOut()}note.textContent='Account created. Check your college mailbox and verify your email before signing in.'}catch(err){note.textContent=err.message||'Could not create account.'}finally{create.disabled=false}};reset.onclick=async()=>{const em=aaEmail(email.value);if(!aaAllowedDomain(em)){note.textContent='Enter your @mainecc.edu address first.';return}try{const client=await aaEnsureSupabase(),{error}=await client.auth.resetPasswordForEmail(em,{redirectTo:location.href.split('#')[0]});if(error)throw error;note.textContent='If an account exists, a password reset email has been sent.'}catch(err){note.textContent=err.message||'Could not send the reset email.'}}};
signIn.addEventListener('click',event=>{event.preventDefault();form()});
signOut.addEventListener('click',async()=>{try{const client=await aaEnsureSupabase();await client.auth.signOut()}catch(err){console.error(err)}updateAccountUI();close()});aaEnsureSupabase().then(client=>{client.auth.onAuthStateChange((_event,session)=>{setTimeout(async()=>{const user=session?.user;if(!user){updateAccountUI();return}if(!user.email_confirmed_at&&!user.confirmed_at){await client.auth.signOut();updateAccountUI();const st=document.getElementById("accountStatus");if(st)st.textContent="Verify your @mainecc.edu email before signing in.";return}const em=aaEmail(user.email);if(!aaAllowedDomain(em)){await client.auth.signOut();updateAccountUI();return}const {data:profile,error}=await client.from('aa_profiles').select('email,display_name,role').eq('user_id',user.id).maybeSingle();if(error||!profile){updateAccountUI();const s=document.getElementById('accountStatus');if(s)s.textContent='Your email is verified. An administrator still needs to configure your access.';return}updateAccountUI(profile.email,profile.display_name||'',profile.role||'viewer')},0)});client.auth.getSession().then(({data})=>{const u=data?.session?.user;if(u)client.auth.onAuthStateChange;else aaRenderManagedResources()})}).catch(err=>{console.error('Supabase initialization failed',err);aaRenderManagedResources()})};
const init=()=>{
    initAccountAuth();
    const mobileNavToggle=document.getElementById('mobileNavToggle'), siteNavLinks=document.getElementById('siteNavLinks');
    mobileNavToggle.addEventListener('click',()=>{const open=mobileNavToggle.getAttribute('aria-expanded')==='true';mobileNavToggle.setAttribute('aria-expanded',String(!open));siteNavLinks.classList.toggle('open',!open)});
    document.querySelectorAll('#siteNavLinks a').forEach(a=>a.addEventListener('click',()=>{if(innerWidth<=850){mobileNavToggle.setAttribute('aria-expanded','false');siteNavLinks.classList.remove('open')}}));
    document.querySelectorAll('.faq-button').forEach(btn=>btn.addEventListener('click',()=>{const ans=document.getElementById(btn.getAttribute('aria-controls')),open=btn.getAttribute('aria-expanded')==='true';btn.setAttribute('aria-expanded',String(!open));ans.classList.toggle('open',!open)}));
    const searchItems=[
      ['Course Substitution Form','Frequently-Used Forms','Submit or locate information about academic course substitution requests.','course substitution substitution form advising transfer equivalency student degree','#/forms'],
      ['CARE Referral Form','Frequently-Used Forms','Report a student concern using the college’s CARE referral process.','care referral student concern support','#/forms/early-alert'],
      ['Early Alert Form','Frequently-Used Forms','Connect students with support through the Early Alert process.','early alert student success referral attendance','#/forms/early-alert'],
      ['Teaching Evaluations','Frequently-Used Forms','Digital and print-friendly faculty teaching evaluation resources.','teaching evaluation faculty evaluation digital print','#/forms/teaching-evaluations'],
      ['Syllabus Resources','Frequently-Used Forms','Current syllabus template and course-outline guidance.','syllabus template course outline forms','#/forms/syllabus-resources'],
      ['Curriculum Committee','Frequently-Used Forms','Curriculum proposal, revision, approval, and committee resources.','curriculum committee proposal course change approval','#/forms/curriculum-committee'],
      ['Professional Development Forms','Frequently-Used Forms','Forms and resources for faculty professional development.','professional development workshop training','#/forms'],
      ['Travel Expense and IPR Forms','Frequently-Used Forms','Travel, reimbursement, and IPR forms and instructions.','travel expense reimbursement ipr faculty chair','#/forms'],
      ['Syllabus Templates','Center for Teaching Excellence','Current syllabus templates and related course-design guidance.','syllabus template course outline teaching','#/teaching-excellence/syllabus-creation'],
      ['Assessment Plan Templates','Center for Teaching Excellence','Assessment-plan documents, templates, rubrics, and guidance.','assessment plan template rubric outcomes','#/teaching-excellence/rubrics'],
      ['ADA Materials and Accessibility Resources','Center for Teaching Excellence','Accessibility checklists, ADA guidance, and how-to videos.','ada accessibility checklist captions udl','#/teaching-excellence/accessibility'],
      ['Library and VR Lab','Center for Teaching Excellence','Connect with instructional partners in the Library and YCCC VR Lab.','library vr lab virtual reality immersive','#/teaching-excellence/course-materials'],
      ['Faculty Handbooks','Faculty Resources','Handbooks and guidance for full-time, part-time, and adjunct faculty.','faculty handbook full time part time adjunct','#/faculty-resources'],
      ['Advising How-Tos','Faculty Resources','Step-by-step guides and resources for academic advising.','advising how to degree audit registration advisee','#/faculty-resources/faculty-advising'],
      ['Assessment Data for Department Chairs','Faculty Resources','Assessment data, program review, reporting, and department-chair resources.','assessment data department chair program review reporting','#/faculty-resources/assessment-data'],
      ['Faculty Advising','Faculty Resources','Advising guidance, degree planning, registration, and student-support resources.','faculty advising degree planning registration advisee','#/faculty-resources/faculty-advising'],
      ['Class Cancellation Procedures','Faculty Resources','Procedures and communication guidance for cancelling a class.','cancel class cancellation emergency weather','#/faculty-resources'],
      ['Brightspace Support','Faculty Resources','Navigation, course setup, assignments, quizzes, rubrics, and tools.','brightspace support assignments quizzes rubrics','#/faculty-resources/brightspace-support'],
      ['Online Teaching','Faculty Resources','Online course resources and faculty teaching guidance.','online teaching course faculty','#/faculty-resources/online-teaching'],
      ['Brightspace QuickStart Videos','Faculty Resources','Quick videos and step-by-step Brightspace help.','quickstart videos brightspace training','#/faculty-resources/quickstart'],
      ['Faculty Toolbox','Faculty Resources','Technology, accessibility, media, and instructional tools.','faculty toolbox technology accessibility media','#/faculty-resources/faculty-toolbox'],
      ['MCCS Academic Policies','Policies','Maine Community College System academic policies, standards, and procedures.','mccs academic policy procedures standards','#/policies'],
      ['Academic Affairs Help and FAQ','Help','Frequently asked questions and options for contacting Academic Affairs.','help faq contact assistance support','#/help'],
      ['Welcome to Academic Affairs','Welcome','About Academic Affairs, the Dean contact, and getting started.','welcome academic affairs dean contact getting started','#/welcome']
    ];
    const openBtn=document.getElementById('searchOpenButton'),closeBtn=document.getElementById('searchCloseButton'),overlay=document.getElementById('searchOverlay'),input=document.getElementById('overlaySearchInput'),results=document.getElementById('searchResults');let prior=null;
    function render(q=''){const x=q.trim().toLowerCase(),m=x?searchItems.filter(i=>i.join(' ').toLowerCase().includes(x)):searchItems.slice(0,7);results.innerHTML='';const s=document.createElement('div');s.className='search-status';s.textContent=x?`${m.length} ${m.length===1?'result':'results'} for “${q.trim()}”`:'Suggested resources';results.append(s);if(!m.length){const d=document.createElement('div');d.className='empty-search';d.textContent='No matching resources found. Try “course substitution,” “advising,” “syllabus,” “Early Alert,” “ADA,” or “assessment.”';results.append(d);return}m.forEach(i=>{const a=document.createElement('a');a.className='search-result';a.href=i[4];a.innerHTML=`<span class="result-category"></span><span class="result-title"></span><span class="result-description"></span>`;a.children[0].textContent=i[1];a.children[1].textContent=i[0];a.children[2].textContent=i[2];a.addEventListener('click',closeSearch);results.append(a)})}
    function openSearch(){prior=document.activeElement;overlay.classList.add('open');document.body.classList.add('no-scroll');input.value='';render();setTimeout(()=>input.focus(),50)}function closeSearch(){overlay.classList.remove('open');document.body.classList.remove('no-scroll');if(prior)prior.focus()}
    openBtn.addEventListener('click',openSearch);closeBtn.addEventListener('click',closeSearch);input.addEventListener('input',e=>render(e.target.value));overlay.addEventListener('click',e=>{if(e.target===overlay)closeSearch()});
    const launcher=document.getElementById('chatLauncher'),win=document.getElementById('chatWindow'),chatClose=document.getElementById('chatCloseButton'),form=document.getElementById('chatForm'),chatInput=document.getElementById('chatInput'),messages=document.getElementById('chatMessages');
    function openChat(){win.classList.add('open');launcher.setAttribute('aria-expanded','true');setTimeout(()=>chatInput.focus(),50)}function closeChat(){win.classList.remove('open');launcher.setAttribute('aria-expanded','false');launcher.focus()}function add(text,user=false){const d=document.createElement('div');d.className=user?'message user':'message';d.textContent=text;messages.append(d);messages.scrollTop=messages.scrollHeight}function reply(t){t=t.toLowerCase();if(t.includes('substitution'))return'The Course Substitution Form is listed under Frequently-Used Forms. Connect that link to the official YCCC form and approval instructions.';if(t.includes('advis'))return'Look in Faculty Resources for Advising How-Tos, including degree audit, registration, referral, and common advising guidance.';if(t.includes('early alert')||t.includes('care'))return'CARE Referral and Early Alert resources are in Frequently-Used Forms. Use the official YCCC links there for student-support reporting.';if(t.includes('syllabus')||t.includes('assessment')||t.includes('rubric'))return'The Center for Teaching Excellence includes syllabus templates, assessment-plan materials, rubrics, workshop resources, and instructional support.';if(t.includes('ada')||t.includes('accessib'))return'For accessibility guidance, use the Center for Teaching Excellence for ADA checklists, videos, and accessible course-design resources.';if(t.includes('travel')||t.includes('ipr')||t.includes('expense'))return'Travel Expense and IPR materials are in Frequently-Used Forms, including instructions for faculty chairs.';if(t.includes('policy')||t.includes('mccs'))return'Use the MCCS Academic Policies tile for policies, standards, and procedure information.';return'I can help route you to Academic Affairs resources. Ask about course substitutions, advising, forms, Early Alert, accessibility, assessment, faculty handbooks, or MCCS policies.'}
    launcher.addEventListener('click',()=>win.classList.contains('open')?closeChat():openChat());chatClose.addEventListener('click',closeChat);form.addEventListener('submit',e=>{e.preventDefault();const t=chatInput.value.trim();if(!t)return;add(t,true);chatInput.value='';setTimeout(()=>add(reply(t)),300)});
    let aaRouteDefinitions={
  home:{label:'Home',page:'home',items:[]},
  welcome:{label:'Welcome to Academic Affairs',page:'welcome',items:[]},
  'teaching-excellence':{label:'Center for Teaching Excellence',page:'teaching-excellence',items:[
    ['teaching-excellence','Center for Teaching Excellence'],
    ['syllabus-creation','Syllabus Creation'],['rubrics','Rubrics & Assessment'],
    ['instructional-strategies','Instructional Strategies'],['course-materials','YC Course Materials'],
    ['accessibility','Accessibility & ADA']
  ]},
  forms:{label:'Frequently-Used Forms',page:'forms',items:[
    ['forms','Frequently-Used Forms'],['early-alert','Early Alert & Care Team'],
    ['teaching-evaluations','Teaching Evaluations'],['syllabus-resources','Syllabus Resources'],
    ['curriculum-committee','Curriculum Committee']
  ]},
  'faculty-resources':{label:'Faculty Resources',page:'faculty-resources',items:[
    ['faculty-resources','Faculty Resources'],['brightspace-support','Brightspace Support'],
    ['online-teaching','Online Teaching'],['quickstart','Brightspace QuickStart'],
    ['assessment-data','Assessment Data for Department Chairs'],['faculty-advising','Faculty Advising'],
    ['faculty-toolbox','Faculty Toolbox'],['academic-internships','Academic Internships'],
    ['articulations','Articulation Agreements'],['gender-equity','Gender Equity'],
    ['prior-learning','Prior Learning Assessment']
  ]},
  policies:{label:'MCCS Academic Policies',page:'policies',items:[['policies','MCCS Academic Policies']]},
  reads:{label:'Interesting Reads & Resources',page:'reads',items:[['reads','Interesting Reads & Resources']]},
  help:{label:'I Need Help',page:'help',items:[['help','I Need Help']]}
};
let aaLegacyRoutes={
  'main-content':'/', 'teaching-excellence':'/teaching-excellence','forms':'/forms','faculty-resources':'/faculty-resources',
  'policies':'/policies','reads':'/reads','help':'/help','welcome':'/welcome',
  'syllabus-creation':'/teaching-excellence/syllabus-creation','rubrics':'/teaching-excellence/rubrics',
  'instructional-strategies':'/teaching-excellence/instructional-strategies','course-materials':'/teaching-excellence/course-materials',
  'accessibility':'/teaching-excellence/accessibility','brightspace-support':'/faculty-resources/brightspace-support',
  'online-teaching':'/faculty-resources/online-teaching','quickstart':'/faculty-resources/quickstart',
  'faculty-toolbox':'/faculty-resources/faculty-toolbox','academic-internships':'/faculty-resources/academic-internships',
  'articulations':'/faculty-resources/articulations','gender-equity':'/faculty-resources/gender-equity',
  'prior-learning':'/faculty-resources/prior-learning','early-alert':'/forms/early-alert',
  'teaching-evaluations':'/forms/teaching-evaluations','syllabus-resources':'/forms/syllabus-resources',
  'curriculum-committee':'/forms/curriculum-committee','assessment-data':'/faculty-resources/assessment-data',
  'faculty-advising':'/faculty-resources/faculty-advising'
};
function aaNormalizeRoute(hash){
  let raw=String(hash||'').replace(/^#/,'');
  if(!raw||raw==='/')return {path:'/',page:'home',sub:''};
  if(raw.startsWith('/'))raw=raw.slice(1);
  if(aaLegacyRoutes[raw])raw=aaLegacyRoutes[raw].replace(/^\//,'');
  const parts=raw.split('/').filter(Boolean);
  if(!parts.length)return {path:'/',page:'home',sub:''};
  const page=parts[0];
  if(!aaRouteDefinitions[page])return {path:'/',page:'home',sub:''};
  return {path:'/'+parts.join('/'),page,sub:parts[1]||''};
}
function aaRouteForItem(itemId,page){
  return '#/'+(page==='home'?'':(page+(itemId&&itemId!==page?'/'+itemId:'')));
}
function aaRenderSidebar(route){
  const nav=document.getElementById('routeSidebarLinks');
  if(!nav)return;
  nav.innerHTML='';
  const def=aaRouteDefinitions[route.page]||aaRouteDefinitions.home;
  const home=document.createElement('a');
  home.className='sidebar-route-home';
  home.href='#/';
  home.textContent='Home';
  nav.append(home);
  if(def.items.length){
    const group=document.createElement('div');
    group.className='sidebar-route-group';
    def.items.forEach(([id,label])=>{
      const a=document.createElement('a');
      a.className='sidebar-route-link'+((route.sub||route.page)===id?' active':'');
      a.href=aaRouteForItem(id,def.page);
      a.textContent=label;
      group.append(a);
    });
    nav.append(group);
  }
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();
    const target=a.getAttribute('href')||'#/';
    if(location.hash===target){aaApplyRoute();return}
    location.hash=target.slice(1);
  }));
}
function aaApplyRoute(){
  const route=aaNormalizeRoute(location.hash);
  document.body.classList.toggle('aa-route-home',route.page==='home');
  document.body.classList.toggle('aa-route-page',route.page!=='home');
  const shell=document.querySelector('.route-shell');
  if(shell)shell.classList.toggle('route-shell-visible',route.page!=='home');
  document.querySelectorAll('.route-home-content').forEach(el=>el.classList.toggle('route-home-current',route.page==='home'));
  document.querySelectorAll('.route-content').forEach(el=>{
    let show=false;
    if(route.page!=='home'){
      if(route.sub) show=el.id===route.sub;
      else show=el.getAttribute('data-page')===route.page && (el.id===route.page || el.classList.contains('module-card-grid') || el.id==='welcome');
    }
    el.classList.toggle('is-current',show);
  });
  aaRenderSidebar(route);
  const navLinks=[...document.querySelectorAll('#siteNavLinks a')];
  navLinks.forEach(a=>{
    const href=a.getAttribute('href')||'#/';
    const navRoute=aaNormalizeRoute(href);
    a.classList.toggle('active',navRoute.page===route.page);
  });
  if(route.page!=='home')window.scrollTo({top:0,left:0,behavior:'auto'});
}
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]');
  if(!a||a.hasAttribute('download'))return;
  const href=a.getAttribute('href')||'';
  if(href==='#')return;
  const route=aaNormalizeRoute(href);
  if(!href.startsWith('#/')&&!aaLegacyRoutes[href.slice(1)]&&!href.startsWith('#main-content'))return;
  e.preventDefault();
  const target=route.path==='/#'? '#/' : '#'+route.path;
  if(location.hash===target)aaApplyRoute();else location.hash=target.slice(1);
});
window.addEventListener('hashchange',aaApplyRoute);
aaApplyRoute();

async function aaLoadEditableSite(){
  try{
    const client=await aaEnsureSupabase();
    const [pageResult,settingsResult]=await Promise.all([
      client.from('aa_site_pages').select('*').eq('published',true).order('page_order').order('title'),
      client.from('aa_site_settings').select('*').eq('singleton',true).maybeSingle()
    ]);
    if(pageResult.error)throw pageResult.error;
    const pages=pageResult.data||[];
    const settings=settingsResult.error?null:settingsResult.data;
    if(settings?.theme){
      const rootStyle=document.documentElement.style;
      const variables={navy:'--navy',blue:'--blue',gold:'--gold',gray:'--gray',page:'--page',panel:'--aa-panel'};
      for(const [key,name] of Object.entries(variables)){const value=settings.theme[key];if(/^#[0-9a-f]{6}$/i.test(String(value||''))){rootStyle.setProperty(name,value);if(key==='navy')rootStyle.setProperty('--navy2',value);if(key==='blue')rootStyle.setProperty('--blueDark',value)}}
      let themeStyle=document.getElementById('aaDynamicThemeStyle');
      if(!themeStyle){themeStyle=document.createElement('style');themeStyle.id='aaDynamicThemeStyle';document.head.append(themeStyle)}
      themeStyle.textContent='.resource-card,.content-card,.mini-card,.faq-section,.panel{background-color:var(--aa-panel,#fff)!important}.resource-card.teaching .card-banner,.resource-card.reads .card-banner{background:linear-gradient(135deg,var(--navy),var(--blue))}.resource-card.forms .card-banner,.resource-card.help .card-banner{background:linear-gradient(135deg,var(--blueDark,var(--blue)),var(--blue))}.resource-card.faculty .card-banner{background:linear-gradient(135deg,var(--gray),var(--gold))}.resource-card.policies .card-banner{background:linear-gradient(135deg,var(--gray),var(--muted))}';
    }
    if(!pages.length)return;
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const safeUrl=v=>{const raw=String(v||'').trim();if(/^#\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)?)?$/i.test(raw)||raw==='#main-content'||/^mailto:|^tel:/i.test(raw))return raw;try{const u=new URL(raw,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'#'}catch{return '#'}};
    const safeHtml=html=>{
      const doc=new DOMParser().parseFromString('<body>'+String(html||'')+'</body>','text/html');
      doc.querySelectorAll('script,object,form,base,meta,link').forEach(n=>n.remove());
      doc.querySelectorAll('iframe').forEach(n=>{const src=n.getAttribute('src')||'';try{if(new URL(src,location.href).protocol!=='https:')n.remove()}catch{n.remove()}});
      doc.body.querySelectorAll('*').forEach(el=>[...el.attributes].forEach(a=>{
        if(a.name.toLowerCase().startsWith('on')||a.name.toLowerCase()==='srcdoc')el.removeAttribute(a.name);
        if(['href','src','xlink:href'].includes(a.name.toLowerCase()))el.setAttribute(a.name,safeUrl(a.value));
      }));
      return doc.body.innerHTML;
    };
    const blockHtml=b=>{
      if(!b)return '';
      if(b.type==='legacy_html'||b.type==='rich_text'||b.type==='html')return safeHtml(b.html||b.content||'');
      if(b.type==='heading')return '<h2>'+esc(b.text||'')+'</h2>';
      if(b.type==='callout')return '<aside class="site-callout"><strong>'+esc(b.title||'')+'</strong><div>'+safeHtml(b.html||'')+'</div></aside>';
      if(b.type==='image'){const src=safeUrl(b.url);return src==='#'?'':'<figure><img loading="lazy" src="'+esc(src)+'" alt="'+esc(b.alt||'')+'"><figcaption>'+esc(b.caption||'')+'</figcaption></figure>'}
      if(b.type==='embed'){const src=safeUrl(b.url);return /^https:\/\//i.test(src)?'<div class="site-embed"><iframe loading="lazy" title="'+esc(b.title||'Embedded content')+'" src="'+esc(src)+'" allowfullscreen></iframe></div>':''}
      const items=Array.isArray(b.items)?b.items:[];
      if(['links','cards','faq'].includes(b.type)){
        const cards=b.type==='cards';
        return (b.title?'<h2>'+esc(b.title)+'</h2>':'')+(b.type==='faq'?'<div class="site-faq">'+items.map(x=>'<details><summary>'+esc(x.label||x.question||'')+'</summary><div>'+safeHtml(x.html||x.answer||'')+'</div></details>').join('')+'</div>':'<div class="'+(cards?'site-card-grid':'site-link-list')+'">'+items.map(x=>'<article><a href="'+esc(safeUrl(x.url))+'">'+esc(x.label||x.title||x.url||'Link')+'</a>'+(x.description?'<p>'+esc(x.description)+'</p>':'')+'</article>').join('')+'</div>');
      }
      return '';
    };
    const rootPages=pages.filter(p=>!p.parent_slug&&!p.is_home);
    const children=pages.filter(p=>p.parent_slug);
    const bySlug=new Map(pages.map(p=>[p.slug,p]));
    const home=pages.find(p=>p.is_home||p.slug==='home');
    let defs={home:{label:'Home',page:'home',items:[]}};
    rootPages.forEach(root=>{defs[root.slug]={label:root.nav_label||root.title,page:root.slug,items:[[root.slug,root.nav_label||root.title],...children.filter(p=>p.parent_slug===root.slug).map(p=>[p.slug,p.nav_label||p.title])]};});
    aaRouteDefinitions=defs;
    aaLegacyRoutes={ 'main-content':'/', ...Object.fromEntries(pages.map(p=>[p.slug,'/'+(p.parent_slug?p.parent_slug+'/':'')+(p.is_home?'':p.slug)])) };
    const main=document.querySelector('main')||document.getElementById('main-content');
    if(main){
      let homeNode=main.querySelector('.route-home-content');
      if(home&&homeNode)homeNode.innerHTML=(home.blocks||[]).map(blockHtml).join('');
      pages.filter(p=>!p.is_home&&p.slug!=='home').forEach(p=>{
        let node=document.getElementById(p.slug);
        if(!node){node=document.createElement('section');node.id=p.slug;node.className='route-content';node.setAttribute('data-page',p.parent_slug||p.slug);main.append(node)}
        node.classList.add('route-content');node.setAttribute('data-page',p.parent_slug||p.slug);node.innerHTML=(p.blocks||[]).map(blockHtml).join('');
      });
    }
    const nav=document.getElementById('siteNavLinks');
    if(nav){
      nav.replaceChildren();
      [{slug:'home',label:'Home'},...rootPages.filter(p=>p.show_in_nav).map(p=>({slug:p.slug,label:p.nav_label||p.title}))].forEach((p,i)=>{
        const a=document.createElement('a');a.href=p.slug==='home'?'#/':'#/'+p.slug;a.textContent=p.label;if(i===0)a.className='active';nav.append(a);
      });
    }
    const homeGrid=document.querySelector('.portal-resource-grid');
    if(homeGrid&&rootPages.some(p=>p.show_home_card)){
      homeGrid.replaceChildren();
      rootPages.filter(p=>p.show_home_card).forEach(p=>{
        const card=document.createElement('article');card.className='resource-card '+(p.accent||'navy');
        const banner=document.createElement('a');banner.className='card-banner-link';banner.href='#/'+p.slug;banner.setAttribute('aria-label',p.title);
        const bannerInner=document.createElement('div');bannerInner.className='card-banner';if(/^#[0-9a-f]{6}$/i.test(String(p.panel_color||'')))bannerInner.style.setProperty('background','linear-gradient(135deg,var(--navy),'+p.panel_color+')','important');const icon=document.createElement('span');icon.className='card-icon';icon.textContent=p.icon||'•';const title=document.createElement('h3');title.textContent=p.title;bannerInner.append(icon,title);banner.append(bannerInner);
        const content=document.createElement('div');content.className='card-content';const desc=document.createElement('p');desc.textContent=p.summary||'';content.append(desc);
        if(p.home_links?.length){const ul=document.createElement('ul');ul.className='quick-links';p.home_links.forEach(x=>{const li=document.createElement('li'),a=document.createElement('a');a.href=safeUrl(x.url);const label=document.createElement('span');label.textContent=x.label||'';const arrow=document.createElement('b');arrow.textContent='›';a.append(label,arrow);li.append(a);ul.append(li)});content.append(ul)}
        card.append(banner,content);homeGrid.append(card);
      });
    }
    if(settings){
      const hero=document.querySelector('.hero');
      if(hero){const h=hero.querySelector('h1'),eyebrow=hero.querySelector('.eyebrow'),desc=hero.querySelector('p');if(h)h.textContent=settings.hero_title||settings.site_name;if(eyebrow)eyebrow.textContent=settings.hero_eyebrow||settings.organization_name;if(desc)desc.textContent=settings.hero_description||'';if(settings.hero_image_url)hero.style.backgroundImage='linear-gradient(90deg,rgba(8,28,52,.86),rgba(8,28,52,.16)),url("'+String(settings.hero_image_url).replace(/["\\]/g,'')+'")'}
      const brand=document.querySelector('.brand-link');if(brand){const img=brand.querySelector('img');if(img&&settings.logo_url)img.src=safeUrl(settings.logo_url);brand.setAttribute('aria-label',settings.organization_name||'York County Community College')}
      const footer=document.querySelector('footer');if(footer){const name=footer.querySelector('.footer-name');if(name)name.textContent=settings.footer_name||settings.organization_name||'';const label=footer.querySelector('.footer-label');if(label)label.textContent=settings.footer_label||settings.site_name||'';const links=footer.querySelector('.footer-links');if(links&&Array.isArray(settings.footer_links)&&settings.footer_links.length){links.replaceChildren(...settings.footer_links.map(x=>{const a=document.createElement('a');a.href=safeUrl(x.url);a.textContent=x.label||'';return a}))}}
    }
    aaApplyRoute();
  }catch(error){console.warn('Editable site content could not be loaded; using the bundled site version.',error)}
}
aaLoadEditableSite();

const initAaAccessibility=()=>{
  const root=document.getElementById('aaAccessibilityTools'),toggle=document.getElementById('aaAccessibilityToggle'),panel=document.getElementById('aaAccessibilityPanel');
  if(!root||!toggle||!panel||root.dataset.ready==='yes')return;root.dataset.ready='yes';
  const classes={contrast:'aa-a11y-contrast',large:'aa-a11y-large',underline:'aa-a11y-underline',spacing:'aa-a11y-spacing'};
  const close=()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false')};
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)panel.querySelector('button')?.focus()});
  panel.querySelectorAll('[data-aa-accessibility]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.aaAccessibility;if(key==='reset'){Object.values(classes).forEach(name=>document.body.classList.remove(name));document.documentElement.classList.remove(classes.large);panel.querySelectorAll('[aria-pressed]').forEach(x=>x.setAttribute('aria-pressed','false'));return}
    const target=key==='large'?document.documentElement:document.body;const active=target.classList.toggle(classes[key]);button.setAttribute('aria-pressed',String(active));
  }));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){close();toggle.focus()}});
  document.addEventListener('click',event=>{if(!panel.hidden&&!root.contains(event.target))close()});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initAaAccessibility,{once:true});else initAaAccessibility();


const fileViewerLinks=[...document.querySelectorAll('a[href]')].filter(a=>{const h=a.getAttribute('href')||'';try{const u=new URL(h,location.href),p=u.pathname.toLowerCase();return p.endsWith('.pdf')||p.endsWith('.doc')||p.endsWith('.docx')||p.endsWith('.ppt')||p.endsWith('.pptx')||p.endsWith('.xls')||p.endsWith('.xlsx')||p.endsWith('/ld.php')}catch{return false}});
    let fileViewer=null;
    function ensureFileViewer(){
      if(fileViewer)return fileViewer;
      fileViewer=document.createElement('div');fileViewer.className='file-viewer';fileViewer.setAttribute('aria-hidden','true');
      fileViewer.innerHTML='<div class="file-viewer-dialog" role="dialog" aria-modal="true" aria-labelledby="fileViewerTitle"><div class="file-viewer-header"><div><strong id="fileViewerTitle">File viewer</strong><span id="fileViewerMeta">Preview</span></div><button type="button" class="file-viewer-close" aria-label="Close file viewer">×</button></div><div class="file-viewer-frame"><div class="file-viewer-loading">Loading preview…</div><iframe title="File preview" loading="lazy"></iframe></div><div class="file-viewer-footer"><a class="file-viewer-open" target="_blank" rel="noopener">Open original</a><a class="file-viewer-download" target="_blank" rel="noopener">Download file</a></div></div>';
      document.body.appendChild(fileViewer);
      const close=()=>{fileViewer.classList.remove('open');fileViewer.setAttribute('aria-hidden','true');document.body.classList.remove('no-scroll');const f=fileViewer.querySelector('iframe');if(f)f.src='about:blank'};
      fileViewer.querySelector('.file-viewer-close').addEventListener('click',close);
      fileViewer.addEventListener('click',e=>{if(e.target===fileViewer)close()});
      fileViewer._close=close;return fileViewer;
    }
    fileViewerLinks.forEach(a=>a.addEventListener('click',e=>{
      if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
      const u=new URL(a.href,location.href),v=ensureFileViewer(),frame=v.querySelector('iframe'),loading=v.querySelector('.file-viewer-loading'),p=u.pathname.toLowerCase();
      e.preventDefault();
      v.querySelector('#fileViewerTitle').textContent=a.textContent.trim()||'File viewer';
      const isOffice=/\.(doc|docx|ppt|pptx|xls|xlsx)$/.test(p);
      const isPdf=p.endsWith('.pdf')||p.endsWith('/ld.php');
      v.querySelector('#fileViewerMeta').textContent=isOffice?'Office document preview':isPdf?'Document preview':'File preview';
      v.querySelector('.file-viewer-open').href=u.href;v.querySelector('.file-viewer-download').href=u.href;
      loading.style.display='flex';
      frame.onload=()=>{loading.style.display='none'};
      frame.src=isOffice?'https://view.officeapps.live.com/op/embed.aspx?src='+encodeURIComponent(u.href):u.href;
      v.classList.add('open');v.setAttribute('aria-hidden','false');document.body.classList.add('no-scroll');
    }));
    const notificationButton=document.getElementById('notificationButton');
    if(notificationButton){
      const announcements=[
        {id:'welcome-20261007',icon:'!',title:'Welcome to the new Academic Affairs site',summary:'New faculty resources, forms, policies, teaching support, and professional learning.',body:'<p>We have updated the Academic Affairs site to make faculty resources, forms, policies, teaching support, and professional learning easier to find.</p><p><a href="#main-content">Explore the new site</a></p>'},
        {id:'textbook-survey-20261006',icon:'📚',title:'Hey Hawks, do you think textbooks are affordable?',summary:'Complete the 2026 Textbook Survey and make your voice heard.',body:'<ul><li>Complete this online survey and make your voice heard.</li><li>Open from September 16 through October 6, share your thoughts and you’ll have a chance to win an Amazon gift card!</li></ul><p><a href="http://bit.ly/textbooks2026" target="_blank" rel="noopener noreferrer"><strong>2026 Textbook Survey</strong></a></p><p>Sponsored by the YCCC Library, in partnership with 22 Maine colleges and universities and the New England Board of Higher Education.</p>'}
      ];
      const storageKey='yccc-academic-affairs-read-notifications-v1';
      const readIds=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return[]}};
      const saveRead=ids=>{try{localStorage.setItem(storageKey,JSON.stringify([...new Set(ids)]))}catch{}};
      const unread=()=>announcements.filter(item=>!readIds().includes(item.id));
      const panel=document.createElement('div');
      panel.className='notification-panel';
      panel.innerHTML='<div class="notification-panel-header"><div><strong>Notifications</strong><span class="notification-panel-count"></span></div><button type="button" aria-label="Close notifications">×</button></div><div class="notification-list"></div><div class="notification-panel-footer"><button type="button" class="notification-mark-read">Mark all as read</button></div>';
      notificationButton.parentElement.appendChild(panel);
      const list=panel.querySelector('.notification-list');
      const count=panel.querySelector('.notification-panel-count');
      const markRead=panel.querySelector('.notification-mark-read');
      const renderNotifications=()=>{
        const pending=unread();
        count.textContent=pending.length?pending.length+' new':'All caught up';
        notificationButton.querySelector('.notification-dot')?.classList.toggle('hidden',pending.length===0);
        list.innerHTML='';
        announcements.forEach(item=>{
          const isUnread=pending.some(x=>x.id===item.id);
          const details=document.createElement('details');
          details.className='notification-item'+(isUnread?' unread':'');
          if(isUnread)details.open=true;
          const summary=document.createElement('summary');
          summary.innerHTML='<span class="notification-item-dot" aria-hidden="true"></span><span class="notification-item-copy"><strong></strong><span></span></span><span class="notification-item-chevron" aria-hidden="true">⌄</span>';
          summary.querySelector('strong').textContent=item.title;
          summary.querySelector('.notification-item-copy>span').textContent=item.summary;
          const body=document.createElement('div');
          body.className='notification-item-body';
          body.innerHTML=item.body;
          details.append(summary,body);
          details.addEventListener('toggle',()=>{if(details.open){const ids=readIds();if(!ids.includes(item.id)){ids.push(item.id);saveRead(ids);details.classList.remove('unread');const remaining=unread().length;count.textContent=remaining?remaining+' new':'All caught up';notificationButton.querySelector('.notification-dot')?.classList.toggle('hidden',remaining===0);}}});
          list.append(details);
        });
      };
      const closeNotification=()=>{panel.classList.remove('open');notificationButton.setAttribute('aria-expanded','false')};
      const openNotification=()=>{renderNotifications();panel.classList.add('open');notificationButton.setAttribute('aria-expanded','true')};
      notificationButton.addEventListener('click',e=>{e.stopPropagation();if(panel.classList.contains('open'))closeNotification();else openNotification()});
      panel.querySelector('.notification-panel-header button').addEventListener('click',closeNotification);
      markRead.addEventListener('click',()=>{saveRead(announcements.map(item=>item.id));renderNotifications()});
      document.addEventListener('click',e=>{if(panel.classList.contains('open')&&!panel.contains(e.target)&&e.target!==notificationButton)closeNotification()});
      renderNotifications();
      if(unread().length)openNotification();
    }
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(overlay.classList.contains('open'))closeSearch();else if(win.classList.contains('open'))closeChat();else if(notificationButton&&document.querySelector('.notification-panel.open')){const p=document.querySelector('.notification-panel.open');p.classList.remove('open');notificationButton.setAttribute('aria-expanded','false')}else if(fileViewer&&fileViewer.classList.contains('open'))fileViewer._close()}});
};

if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init)}else{init()}


