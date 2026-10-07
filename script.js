const restorePortalOrder=()=>{const main=document.getElementById('main-content'),portal=main?.querySelector('.brightspace-main .tile-section[aria-labelledby="portal-title"]'),ann=main?.querySelector('.announcements');if(main&&portal&&ann)main.insertBefore(portal,ann)};
    const AA_WHITELIST={
  /* Future: add approved users here, e.g. 'person@mainecc.edu':{role:'admin',features:['private-resource']}. */
};
const getAllowedEmail=email=>{const value=String(email||'').trim().toLowerCase();return value.endsWith('@mainecc.edu')?value:''};
const aaAccessFor=email=>AA_WHITELIST[email]||{role:'faculty',features:[]};
const updateAccountUI=(email='',name='')=>{const label=document.getElementById('accountLabel'),mark=document.getElementById('accountMark'),status=document.getElementById('accountStatus'),signIn=document.getElementById('accountSignIn'),signOut=document.getElementById('accountSignOut');if(!label||!mark||!status||!signIn||!signOut)return;const allowed=getAllowedEmail(email);if(allowed){const displayName=name||allowed.split('@')[0];const initials=displayName.split(/\\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'AA';label.textContent=displayName;mark.textContent=initials;status.textContent=allowed;signIn.hidden=true;signOut.hidden=false;window.AcademicAffairsAccount={email:allowed,name:displayName,access:aaAccessFor(allowed),authenticated:true};}else{label.textContent='Academic Affairs';mark.textContent='AA';status.textContent='Not signed in';signIn.hidden=false;signOut.hidden=true;window.AcademicAffairsAccount={authenticated:false,access:{role:'public',features:[]}};}};
const initAccountAuth=()=>{const button=document.getElementById('accountButton'),dropdown=document.getElementById('accountDropdown'),signIn=document.getElementById('accountSignIn'),signOut=document.getElementById('accountSignOut');if(!button||!dropdown||!signIn||!signOut)return;const close=()=>{dropdown.classList.remove('open');button.setAttribute('aria-expanded','false')};button.addEventListener('click',e=>{e.stopPropagation();const open=dropdown.classList.toggle('open');button.setAttribute('aria-expanded',String(open))});document.addEventListener('click',e=>{if(dropdown.classList.contains('open')&&!dropdown.contains(e.target)&&e.target!==button)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});updateAccountUI();signIn.addEventListener('click',()=>{const existing=dropdown.querySelector('.account-domain-warning');if(existing)existing.remove();const wrap=document.createElement('div');wrap.className='account-domain-warning';wrap.innerHTML='<strong>YCCC account</strong><br>Enter your <b>@mainecc.edu</b> email address below.';const input=document.createElement('input');input.type='email';input.placeholder='name@mainecc.edu';input.autocomplete='email';input.style='width:100%;margin-top:8px;padding:9px;border:1px solid #cbd5da;border-radius:6px;box-sizing:border-box';const go=document.createElement('button');go.type='button';go.textContent='Continue';go.style.marginTop='7px';wrap.append(input,go);signIn.replaceWith(wrap);go.addEventListener('click',()=>{const email=getAllowedEmail(input.value);if(!email){input.setCustomValidity('Please enter an @mainecc.edu email address.');input.reportValidity();return}const name=email.split('@')[0].replace(/[._-]+/g,' ').replace(/\\b\\w/g,m=>m.toUpperCase());updateAccountUI(email,name);close();});input.addEventListener('keydown',e=>{if(e.key==='Enter')go.click()});input.focus();});signOut.addEventListener('click',()=>{updateAccountUI();close();});};
const init=()=>{restorePortalOrder();
    initAccountAuth();
    const mobileNavToggle=document.getElementById('mobileNavToggle'), siteNavLinks=document.getElementById('siteNavLinks');
    mobileNavToggle.addEventListener('click',()=>{const open=mobileNavToggle.getAttribute('aria-expanded')==='true';mobileNavToggle.setAttribute('aria-expanded',String(!open));siteNavLinks.classList.toggle('open',!open)});
    document.querySelectorAll('#siteNavLinks a').forEach(a=>a.addEventListener('click',()=>{if(innerWidth<=850){mobileNavToggle.setAttribute('aria-expanded','false');siteNavLinks.classList.remove('open')}}));
    document.querySelectorAll('.faq-button').forEach(btn=>btn.addEventListener('click',()=>{const ans=document.getElementById(btn.getAttribute('aria-controls')),open=btn.getAttribute('aria-expanded')==='true';btn.setAttribute('aria-expanded',String(!open));ans.classList.toggle('open',!open)}));
    const searchItems=[
      ['Course Substitution Form','Frequently-Used Forms','Submit or locate information about academic course substitution requests.','course substitution substitution form advising transfer equivalency student degree','#forms'],
      ['CARE Referral Form','Frequently-Used Forms','Report a student concern using the college’s CARE referral process.','care referral student concern support','#forms'],
      ['Early Alert Form','Frequently-Used Forms','Connect students with support through the Early Alert process.','early alert student success referral attendance','#forms'],
      ['Professional Development Forms','Frequently-Used Forms','Forms and resources for faculty professional development.','professional development workshop training','#forms'],
      ['Travel Expense and IPR Forms','Frequently-Used Forms','Travel, reimbursement, and IPR forms and instructions.','travel expense reimbursement ipr faculty chair','#forms'],
      ['Syllabus Templates','Center for Teaching Excellence','Current syllabus templates and related course-design guidance.','syllabus template course outline teaching','#teaching-excellence'],
      ['Assessment Plan Templates','Center for Teaching Excellence','Assessment-plan documents, templates, rubrics, and guidance.','assessment plan template rubric outcomes','#teaching-excellence'],
      ['ADA Materials and Accessibility Resources','Center for Teaching Excellence','Accessibility checklists, ADA guidance, and how-to videos.','ada accessibility checklist captions udl','#teaching-excellence'],
      ['Library and VR Lab','Center for Teaching Excellence','Connect with instructional partners in the Library and YCCC VR Lab.','library vr lab virtual reality immersive','#teaching-excellence'],
      ['Faculty Handbooks','Faculty Resources','Handbooks and guidance for full-time, part-time, and adjunct faculty.','faculty handbook full time part time adjunct','#faculty-resources'],
      ['Advising How-Tos','Faculty Resources','Step-by-step guides and resources for academic advising.','advising how to degree audit registration advisee','#faculty-resources'],
      ['Class Cancellation Procedures','Faculty Resources','Procedures and communication guidance for cancelling a class.','cancel class cancellation emergency weather','#faculty-resources'],
      ['MCCS Academic Policies','Policies','Maine Community College System academic policies, standards, and procedures.','mccs academic policy procedures standards','#policies'],
      ['Academic Affairs Help and FAQ','Help','Frequently asked questions and options for contacting Academic Affairs.','help faq contact assistance support','#help']
    ];
    const openBtn=document.getElementById('searchOpenButton'),closeBtn=document.getElementById('searchCloseButton'),overlay=document.getElementById('searchOverlay'),input=document.getElementById('overlaySearchInput'),results=document.getElementById('searchResults');let prior=null;
    function render(q=''){const x=q.trim().toLowerCase(),m=x?searchItems.filter(i=>i.join(' ').toLowerCase().includes(x)):searchItems.slice(0,7);results.innerHTML='';const s=document.createElement('div');s.className='search-status';s.textContent=x?`${m.length} ${m.length===1?'result':'results'} for “${q.trim()}”`:'Suggested resources';results.append(s);if(!m.length){const d=document.createElement('div');d.className='empty-search';d.textContent='No matching resources found. Try “course substitution,” “advising,” “syllabus,” “Early Alert,” “ADA,” or “assessment.”';results.append(d);return}m.forEach(i=>{const a=document.createElement('a');a.className='search-result';a.href=i[4];a.innerHTML=`<span class="result-category"></span><span class="result-title"></span><span class="result-description"></span>`;a.children[0].textContent=i[1];a.children[1].textContent=i[0];a.children[2].textContent=i[2];a.addEventListener('click',closeSearch);results.append(a)})}
    function openSearch(){prior=document.activeElement;overlay.classList.add('open');document.body.classList.add('no-scroll');input.value='';render();setTimeout(()=>input.focus(),50)}function closeSearch(){overlay.classList.remove('open');document.body.classList.remove('no-scroll');if(prior)prior.focus()}
    openBtn.addEventListener('click',openSearch);closeBtn.addEventListener('click',closeSearch);input.addEventListener('input',e=>render(e.target.value));overlay.addEventListener('click',e=>{if(e.target===overlay)closeSearch()});
    const launcher=document.getElementById('chatLauncher'),win=document.getElementById('chatWindow'),chatClose=document.getElementById('chatCloseButton'),form=document.getElementById('chatForm'),chatInput=document.getElementById('chatInput'),messages=document.getElementById('chatMessages');
    function openChat(){win.classList.add('open');launcher.setAttribute('aria-expanded','true');setTimeout(()=>chatInput.focus(),50)}function closeChat(){win.classList.remove('open');launcher.setAttribute('aria-expanded','false');launcher.focus()}function add(text,user=false){const d=document.createElement('div');d.className=user?'message user':'message';d.textContent=text;messages.append(d);messages.scrollTop=messages.scrollHeight}function reply(t){t=t.toLowerCase();if(t.includes('substitution'))return'The Course Substitution Form is listed under Frequently-Used Forms. Connect that link to the official YCCC form and approval instructions.';if(t.includes('advis'))return'Look in Faculty Resources for Advising How-Tos, including degree audit, registration, referral, and common advising guidance.';if(t.includes('early alert')||t.includes('care'))return'CARE Referral and Early Alert resources are in Frequently-Used Forms. Use the official YCCC links there for student-support reporting.';if(t.includes('syllabus')||t.includes('assessment')||t.includes('rubric'))return'The Center for Teaching Excellence includes syllabus templates, assessment-plan materials, rubrics, workshop resources, and instructional support.';if(t.includes('ada')||t.includes('accessib'))return'For accessibility guidance, use the Center for Teaching Excellence for ADA checklists, videos, and accessible course-design resources.';if(t.includes('travel')||t.includes('ipr')||t.includes('expense'))return'Travel Expense and IPR materials are in Frequently-Used Forms, including instructions for faculty chairs.';if(t.includes('policy')||t.includes('mccs'))return'Use the MCCS Academic Policies tile for policies, standards, and procedure information.';return'I can help route you to Academic Affairs resources. Ask about course substitutions, advising, forms, Early Alert, accessibility, assessment, faculty handbooks, or MCCS policies.'}
    launcher.addEventListener('click',()=>win.classList.contains('open')?closeChat():openChat());chatClose.addEventListener('click',closeChat);form.addEventListener('submit',e=>{e.preventDefault();const t=chatInput.value.trim();if(!t)return;add(t,true);chatInput.value='';setTimeout(()=>add(reply(t)),300)});
    const sidebarLinks=[...document.querySelectorAll('.content-sidebar a[href^="#"]')];
function setActiveSidebar(id){sidebarLinks.forEach(a=>a.classList.toggle('active',(a.getAttribute('href')||'')==='#'+id));}
sidebarLinks.forEach(a=>a.addEventListener('click',()=>{const id=(a.getAttribute('href')||'').slice(1);if(id)setActiveSidebar(id)}));
if(location.hash)setActiveSidebar(location.hash.slice(1));
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(id)setActiveSidebar(id)});
const navLinks=[...document.querySelectorAll('#siteNavLinks a')];
    const navTargets=navLinks.map(a=>({a,id:(a.getAttribute('href')||'').replace('#','')})).filter(x=>x.id).map(x=>({...x,el:document.getElementById(x.id)})).filter(x=>x.el);
    function setActiveNav(id){navLinks.forEach(a=>a.classList.toggle('active',(a.getAttribute('href')||'')==='#'+id));}
    navLinks.forEach(a=>a.addEventListener('click',()=>{const id=(a.getAttribute('href')||'').replace('#','');if(id)setActiveNav(id);}));
    if('IntersectionObserver' in window){
      const navObserver=new IntersectionObserver(entries=>{
        const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.boundingClientRect.top-a.boundingClientRect.top);
        if(visible[0])setActiveNav(visible[0].target.id);
      },{rootMargin:'-170px 0px -55% 0px',threshold:[0,.01,.15,.35]});
      navTargets.forEach(x=>navObserver.observe(x.el));
    }

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
      const panel=document.createElement('div');
      panel.className='notification-panel';
      panel.innerHTML='<div class="notification-panel-header"><strong>Notifications</strong><button type="button" aria-label="Close notifications">×</button></div><div class="notification-item"><span class="notification-item-dot"></span><div><strong>Academic Affairs</strong><p>Welcome to the Academic Affairs faculty portal. Check back here for announcements, deadlines, workshops, and important updates.</p><a href="#calendar">View key dates</a></div></div>';
      notificationButton.parentElement.appendChild(panel);
      const closeNotification=()=>{panel.classList.remove('open');notificationButton.setAttribute('aria-expanded','false')};
      notificationButton.addEventListener('click',e=>{e.stopPropagation();const open=panel.classList.toggle('open');notificationButton.setAttribute('aria-expanded',String(open))});
      panel.querySelector('button').addEventListener('click',closeNotification);
      document.addEventListener('click',e=>{if(panel.classList.contains('open')&&!panel.contains(e.target)&&e.target!==notificationButton)closeNotification()});
    }
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(overlay.classList.contains('open'))closeSearch();else if(win.classList.contains('open'))closeChat();else if(notificationButton&&document.querySelector('.notification-panel.open')){const p=document.querySelector('.notification-panel.open');p.classList.remove('open');notificationButton.setAttribute('aria-expanded','false')}else if(fileViewer&&fileViewer.classList.contains('open'))fileViewer._close()}});
};

if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init)}else{init()}
