const AA_FIREBASE_CONFIG_URL='https://ycccvrlab.github.io/yccc-academic-affairs/firebase-config.js';
const AA_FIREBASE_SDK='https://www.gstatic.com/firebasejs/10.14.1/';
const aaLoadScript=src=>new Promise((resolve,reject)=>{const existing=[...document.scripts].find(s=>s.src===src);if(existing){if(existing.dataset.loaded==='yes')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>{s.dataset.loaded='yes';resolve()};s.onerror=reject;document.head.appendChild(s)});
const aaEmail=email=>String(email||'').trim().toLowerCase();
const aaAllowedDomain=email=>/^[^\s@]+@mainecc\.edu$/i.test(String(email||'').trim());
const updateAccountUI=(email='',name='',role='viewer')=>{const label=document.getElementById('accountLabel'),mark=document.getElementById('accountMark'),status=document.getElementById('accountStatus'),signIn=document.getElementById('accountSignIn'),signOut=document.getElementById('accountSignOut');if(!label||!mark||!status||!signIn||!signOut)return;const valid=!!email&&aaAllowedDomain(email);if(valid){const displayName=name||email.split('@')[0];label.textContent=displayName;mark.textContent=displayName.split(/[\s._-]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'AA';status.textContent=email+' · '+role;signIn.hidden=true;signOut.hidden=false;window.AcademicAffairsAccount={email:email,name:displayName,access:{role:role,features:[]},authenticated:true};}else{label.textContent='Academic Affairs';mark.textContent='AA';status.textContent='Not signed in';signIn.hidden=false;signOut.hidden=true;window.AcademicAffairsAccount={authenticated:false,access:{role:'public',features:[]}};}};
const initAccountAuth=()=>{const button=document.getElementById('accountButton'),dropdown=document.getElementById('accountDropdown'),signIn=document.getElementById('accountSignIn'),signOut=document.getElementById('accountSignOut');if(!button||!dropdown||!signIn||!signOut)return;const close=()=>{dropdown.classList.remove('open');button.setAttribute('aria-expanded','false')};button.addEventListener('click',e=>{e.stopPropagation();const open=dropdown.classList.toggle('open');button.setAttribute('aria-expanded',String(open))});document.addEventListener('click',e=>{if(dropdown.classList.contains('open')&&!dropdown.contains(e.target)&&e.target!==button)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});updateAccountUI();let auth=null,db=null,ready=false;
const message=(box,text)=>{box.textContent=text;box.setAttribute('role','status')};
const loadFirebase=async()=>{if(ready)return true;try{await aaLoadScript(AA_FIREBASE_SDK+'firebase-app-compat.js');await aaLoadScript(AA_FIREBASE_SDK+'firebase-auth-compat.js');await aaLoadScript(AA_FIREBASE_SDK+'firebase-firestore-compat.js');await aaLoadScript(AA_FIREBASE_CONFIG_URL);if(!window.AA_FIREBASE_CONFIG||String(window.AA_FIREBASE_CONFIG.apiKey||'').startsWith('REPLACE_'))throw new Error('Firebase has not been configured yet.');if(!firebase.apps.length)firebase.initializeApp(window.AA_FIREBASE_CONFIG);auth=firebase.auth();db=firebase.firestore();ready=true;auth.onAuthStateChanged(async user=>{if(!user){updateAccountUI();return}if(!user.emailVerified){updateAccountUI();return}const email=aaEmail(user.email);if(!aaAllowedDomain(email)){await auth.signOut();updateAccountUI();return}try{const access=await db.collection('access').doc(email).get();const data=access.exists?access.data():null;if(!data||data.enabled!==true){updateAccountUI();messageOrStatus('Your email is verified, but an administrator has not enabled access for this account.');return}await db.collection('profiles').doc(user.uid).set({email:email,displayName:data.displayName||user.displayName||'',createdAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});updateAccountUI(email,data.displayName||user.displayName||'',data.role||'viewer');}catch(err){updateAccountUI();console.error('Could not load Academic Affairs permissions',err);}});return true}catch(err){console.error(err);return false}};
const messageOrStatus=msg=>{const status=document.getElementById('accountStatus');if(status)status.textContent=msg};
signIn.addEventListener('click',async()=>{let wrap=dropdown.querySelector('.account-domain-warning');if(wrap){wrap.querySelector('input')?.focus();return}wrap=document.createElement('div');wrap.className='account-domain-warning';wrap.style.cssText='padding:12px;max-width:320px';const heading=document.createElement('strong');heading.textContent='Sign in with YCCC';const intro=document.createElement('p');intro.textContent='Use your @mainecc.edu email. New users can create an account and verify their mailbox.';intro.style.cssText='font-size:13px;margin:6px 0';const email=document.createElement('input');email.type='email';email.placeholder='name@mainecc.edu';email.autocomplete='email';email.required=true;email.style.cssText='width:100%;margin:5px 0;padding:9px;border:1px solid #cbd5da;border-radius:6px;box-sizing:border-box';const password=document.createElement('input');password.type='password';password.placeholder='Password (6+ characters)';password.autocomplete='current-password';password.style.cssText=email.style.cssText;const note=document.createElement('div');note.style.cssText='font-size:12px;margin:6px 0;overflow-wrap:anywhere';const makeButton=(text)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='display:block;width:100%;margin-top:6px;padding:8px;border:1px solid #cbd5da;border-radius:6px;background:#f5f7f8';return b};const login=makeButton('Sign in'),create=makeButton('Create account'),verify=makeButton('Resend verification email'),reset=makeButton('Reset password'),cancel=makeButton('Cancel');wrap.append(heading,intro,email,password,login,create,verify,reset,note,cancel);signIn.hidden=true;signIn.insertAdjacentElement('beforebegin',wrap);const resetForm=()=>{wrap.remove();signIn.hidden=false};cancel.addEventListener('click',resetForm);const check=async()=>{const em=aaEmail(email.value);if(!aaAllowedDomain(em)){email.setCustomValidity('Use a valid @mainecc.edu email address.');email.reportValidity();return null}email.setCustomValidity('');if(password.value.length<6){password.setCustomValidity('Enter a password with at least 6 characters.');password.reportValidity();return null}password.setCustomValidity('');return em};login.addEventListener('click',async()=>{const em=await check();if(!em)return;login.disabled=true;message(note,'Signing in…');try{await loadFirebase();if(!ready)throw new Error('Firebase setup is not finished. Please try again after the site administrator configures it.');const result=await auth.signInWithEmailAndPassword(em,password.value);if(!result.user.emailVerified){await auth.signOut();message(note,'Check your college mailbox and verify your email first. Use Resend verification email if needed.');return}const a=await db.collection('access').doc(em).get();if(!a.exists||a.data().enabled!==true){await auth.signOut();message(note,'Your email is verified, but an administrator has not enabled access for this account.');return}resetForm();close()}catch(err){message(note,err.message||'Sign-in failed.');}finally{login.disabled=false}});create.addEventListener('click',async()=>{const em=await check();if(!em)return;create.disabled=true;message(note,'Creating account…');try{await loadFirebase();if(!ready)throw new Error('Firebase setup is not finished.');const result=await auth.createUserWithEmailAndPassword(em,password.value);await result.user.sendEmailVerification();await auth.signOut();message(note,'Account created. Check your college mailbox, verify the address, then sign in. Access still depends on admin-managed permissions.');}catch(err){message(note,err.message||'Could not create account.');}finally{create.disabled=false}});verify.addEventListener('click',async()=>{const em=aaEmail(email.value);if(!aaAllowedDomain(em)){message(note,'Enter your @mainecc.edu email first.');return}try{await loadFirebase();if(!ready)throw new Error('Firebase setup is not finished.');const result=await auth.signInWithEmailAndPassword(em,password.value);await result.user.sendEmailVerification();await auth.signOut();message(note,'Verification email sent.');}catch(err){message(note,err.message||'Could not send verification email.');}});reset.addEventListener('click',async()=>{const em=aaEmail(email.value);if(!aaAllowedDomain(em)){message(note,'Enter your @mainecc.edu email first.');return}try{await loadFirebase();if(!ready)throw new Error('Firebase setup is not finished.');await auth.sendPasswordResetEmail(em);message(note,'If an account exists, a password-reset email has been sent.');}catch(err){message(note,err.message||'Could not send reset email.');}});});
signOut.addEventListener('click',async()=>{try{if(await loadFirebase()&&auth)await auth.signOut()}catch(err){console.error(err)}updateAccountUI();close()});};
const initAccessibilityWidget=()=>{if(document.getElementById('aioa-adawidget'))return;const script=document.createElement('script');script.src='https://www.skynettechnologies.com/accessibility/js/all-in-one-accessibility-js-widget-minify.js?colorcode=%230a2240&token=ADAAIOA-03ECEB68848153DB3FA06EF9B35BE268&position=middle_right';script.id='aioa-adawidget';script.defer=true;document.body.appendChild(script)};
const init=()=>{
    initAccessibilityWidget();
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
    const aaRouteDefinitions={
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
const aaLegacyRoutes={
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
