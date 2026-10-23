(() => {
  const KEY='aa-site-engagement-v1', YEAR=365*86400000;
  let client=null,userId=null,state={visited_route_slugs:[],tour_started_at:null,last_tour_completed_at:null,seen_announcement_ids:[]};
  let catalog=[],tourActive=false,modal=null,banner=null,button=null,saving=Promise.resolve();
  const fallback=[
    ['home','Home','#/'],['welcome','Welcome to Academic Affairs','#/welcome'],
    ['teaching-excellence','Center for Teaching Excellence','#/teaching-excellence'],
    ['teaching-excellence/syllabus-creation','Syllabus creation','#/teaching-excellence/syllabus-creation'],
    ['teaching-excellence/rubrics','Rubrics & assessment','#/teaching-excellence/rubrics'],
    ['teaching-excellence/instructional-strategies','Instructional strategies','#/teaching-excellence/instructional-strategies'],
    ['teaching-excellence/course-materials','Course materials','#/teaching-excellence/course-materials'],
    ['teaching-excellence/accessibility','Accessibility & ADA','#/teaching-excellence/accessibility'],
    ['forms','Frequently-Used Forms','#/forms'],['forms/early-alert','Early Alert','#/forms/early-alert'],
    ['forms/care-team','Care Team','#/forms/care-team'],['forms/teaching-evaluations','Teaching evaluations','#/forms/teaching-evaluations'],
    ['forms/syllabus-resources','Syllabus resources','#/forms/syllabus-resources'],['forms/curriculum-committee','Curriculum Committee','#/forms/curriculum-committee'],
    ['faculty-resources','Faculty Resources','#/faculty-resources'],['faculty-resources/brightspace-support','Brightspace support','#/faculty-resources/brightspace-support'],
    ['faculty-resources/online-teaching','Online teaching','#/faculty-resources/online-teaching'],['faculty-resources/quickstart','Brightspace QuickStart','#/faculty-resources/quickstart'],
    ['faculty-resources/assessment-data','Assessment data for department chairs','#/faculty-resources/assessment-data'],
    ['faculty-resources/faculty-advising','Faculty advising','#/faculty-resources/faculty-advising'],['faculty-resources/faculty-toolbox','Faculty Toolbox','#/faculty-resources/faculty-toolbox'],
    ['faculty-resources/academic-internships','Academic internships','#/faculty-resources/academic-internships'],
    ['faculty-resources/articulations','Articulation agreements','#/faculty-resources/articulations'],
    ['faculty-resources/gender-equity','Gender equity','#/faculty-resources/gender-equity'],
    ['faculty-resources/prior-learning','Prior learning assessment','#/faculty-resources/prior-learning'],
    ['policies','MCCS Academic Policies','#/policies'],['reads','Interesting Reads & Resources','#/reads'],['help','I Need Help','#/help']
  ].map(([key,label,hash])=>({key,label,hash}));
  const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const localKey=()=>KEY+':'+(userId||'guest');
  const readLocal=()=>{try{return JSON.parse(localStorage.getItem(localKey())||'{}')}catch{return{}}};
  const normalizeState=x=>({visited_route_slugs:Array.isArray(x?.visited_route_slugs)?x.visited_route_slugs:[],tour_started_at:x?.tour_started_at||null,last_tour_completed_at:x?.last_tour_completed_at||null,seen_announcement_ids:Array.isArray(x?.seen_announcement_ids)?x.seen_announcement_ids:[]});
  const persist=()=>{state.updated_at=new Date().toISOString();try{localStorage.setItem(localKey(),JSON.stringify(state))}catch{};if(client&&userId){saving=saving.then(async()=>{const {error}=await client.from('aa_user_site_state').upsert({user_id:userId,visited_route_slugs:state.visited_route_slugs,tour_started_at:state.tour_started_at,last_tour_completed_at:state.last_tour_completed_at,seen_announcement_ids:state.seen_announcement_ids,updated_at:state.updated_at},{onConflict:'user_id'});if(error)console.warn('Site check-in progress could not be saved',error)}).catch(e=>console.warn('Site state sync failed',e))}};
  const currentKey=()=>{const h=location.hash||'#/';const raw=h.replace(/^#\/?/,'').split('?')[0];return raw||'home'};
  const buildCatalog=()=>{
    const found=new Map([['home',fallback[0]]]);
    const pages=window.AA_SiteCMSPageCatalog;
    if(Array.isArray(pages))for(const p of pages.filter(x=>x.published!==false)){const key=p.is_home?'home':(p.parent_slug?p.parent_slug+'/'+p.slug:p.slug);found.set(key,{key,label:p.nav_label||p.title||p.slug,hash:key==='home'?'#/':'#/'+key})}
    const defs=window.AA_SiteCMSRouteDefinitions||{};
    for(const def of Object.values(defs)){const root=def.page||'';if(root)found.set(root,{key:root,label:def.label||root,hash:'#/'+root});for(const [id,label] of def.items||[]){const key=id===root?root:root+'/'+id;found.set(key,{key,label:label||id,hash:'#/'+key})}}
    document.querySelectorAll('a[href^="#/"]').forEach(a=>{const hash=a.getAttribute('href');const key=hash.replace(/^#\/?/,'')||'home';if(!found.has(key))found.set(key,{key,label:a.textContent.trim()||key,hash})});
    if(found.size<=1)fallback.forEach(x=>found.set(x.key,x));
    catalog=[...found.values()].filter(x=>x.label).sort((a,b)=>a.key==='home'?-1:b.key==='home'?1:a.key.localeCompare(b.key));
  };
  const due=()=>!state.last_tour_completed_at||Date.now()-Date.parse(state.last_tour_completed_at)>=YEAR;
  const visited=()=>new Set(state.visited_route_slugs||[]);
  const statusText=()=>{const n=visited().size;return n+' of '+catalog.length+' areas visited'+(due()?' · annual check-in due':'')};
  const ensureUi=()=>{
    if(!button){button=document.createElement('button');button.id='aaGuidedTourButton';button.type='button';button.textContent='Annual site tour';button.setAttribute('aria-haspopup','dialog');button.style.cssText='position:fixed;z-index:4400;left:20px;bottom:22px;padding:11px 15px;background:#0a2240;color:#fff;border:2px solid #fff;border-radius:24px;font:700 14px Arial,sans-serif;box-shadow:0 3px 14px #0004';button.addEventListener('click',()=>startTour());document.body.append(button)}
    if(!banner){banner=document.createElement('aside');banner.id='aaSiteCheckinBanner';banner.setAttribute('role','status');banner.style.cssText='display:none;position:relative;z-index:3;max-width:1180px;margin:14px auto;padding:12px 16px;background:#fff7df;border-left:4px solid #c6b784;border-radius:4px;color:#26323b';banner.innerHTML='<strong>Annual Academic Affairs check-in</strong><span data-copy></span> <button type="button" data-start style="margin-left:8px">Start guided tour</button><button type="button" data-later style="margin-left:6px">Later</button>';document.querySelector('main')?.before(banner);banner.querySelector('[data-start]').onclick=()=>startTour();banner.querySelector('[data-later]').onclick=()=>{banner.style.display='none';try{sessionStorage.setItem(KEY+':later','1')}catch{}}}
    if(!modal){modal=document.createElement('div');modal.id='aaGuidedTourDialog';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','aaTourTitle');modal.hidden=true;modal.style.cssText='position:fixed;inset:0;z-index:7000;background:#071729bb;display:flex;align-items:center;justify-content:center;padding:16px';modal.innerHTML='<section style="width:min(620px,100%);max-height:88vh;overflow:auto;background:#fff;color:#26323b;border-radius:10px;padding:22px;box-shadow:0 14px 48px #0006"><p style="margin:0;color:#007eaf;font-size:12px;font-weight:800;text-transform:uppercase">Faculty resource check-in</p><h2 id="aaTourTitle" style="margin:3px 0 4px">Explore every Academic Affairs area</h2><p data-summary style="margin:0 0 12px;color:#5d6a74"></p><ol data-stops style="padding-left:25px;max-height:42vh;overflow:auto"></ol><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button type="button" data-next>Go to next unvisited area</button><button type="button" data-finish disabled>Finish annual check-in</button><button type="button" data-pause>Pause for later</button></div></section>';document.body.append(modal);modal.querySelector('[data-next]').onclick=goNext;modal.querySelector('[data-finish]').onclick=finishTour;modal.querySelector('[data-pause]').onclick=()=>{tourActive=false;modal.hidden=true;persist();refreshUi()};modal.addEventListener('click',e=>{if(e.target===modal){tourActive=false;modal.hidden=true;persist();refreshUi()}})}
  };
  const renderStops=()=>{if(!modal)return;const list=modal.querySelector('[data-stops]'),seen=visited();list.replaceChildren();catalog.forEach(item=>{const li=document.createElement('li');li.style.margin='5px 0';const label=document.createElement('span');label.textContent=item.label+(seen.has(item.key)?' ✓':'');const link=document.createElement('a');link.href=item.hash;link.textContent='Visit';link.style.marginLeft='8px';link.onclick=()=>{setTimeout(()=>markCurrent(),150)};li.append(label,link);list.append(li)});modal.querySelector('[data-summary]').textContent=(tourActive?'Guided check-in is in progress. ':'')+statusText()+'. Visit each area at least once; you can pause and resume.';const all=catalog.length>0&&catalog.every(x=>seen.has(x.key));modal.querySelector('[data-finish]').disabled=!all;modal.querySelector('[data-next]').textContent=all?'All areas visited':'Go to next unvisited area'};
  const refreshUi=()=>{if(!button||!banner)return;button.textContent=due()?'Annual site tour · due':'Annual site tour';let dismissed=false;try{dismissed=sessionStorage.getItem(KEY+':later')==='1'}catch{};banner.style.display=due()&&!dismissed?'block':'none';banner.querySelector('[data-copy]').textContent=' '+statusText()+'. Visit every page and resource section, then confirm your annual check-in.';if(modal&&!modal.hidden)renderStops()};
  const startTour=()=>{if(!catalog.length)buildCatalog();if(!tourActive){tourActive=true;if(due()&&state.last_tour_completed_at)state.visited_route_slugs=[];state.tour_started_at=new Date().toISOString();try{sessionStorage.removeItem(KEY+':later')}catch{};persist()}modal.hidden=false;markCurrent();renderStops();modal.querySelector('[data-next]').focus()};
  const goNext=()=>{const seen=visited(),next=catalog.find(x=>!seen.has(x.key));if(!next){renderStops();return}if(location.hash===next.hash)markCurrent();else location.hash=next.hash.slice(1);renderStops()};
  const markCurrent=()=>{if(!tourActive)return;buildCatalog();const key=currentKey();if(!catalog.some(x=>x.key===key))return;const set=visited();set.add(key);state.visited_route_slugs=[...set];persist();renderStops()};
  const finishTour=()=>{if(!catalog.length||!catalog.every(x=>visited().has(x.key)))return;state.last_tour_completed_at=new Date().toISOString();state.tour_started_at=null;tourActive=false;persist();modal.hidden=true;try{sessionStorage.removeItem(KEY+':later')}catch{};refreshUi();const note=document.createElement('div');note.setAttribute('role','status');note.textContent='Annual Academic Affairs check-in complete. You can return any time to review all areas.';note.style.cssText='position:fixed;z-index:7100;left:20px;bottom:78px;padding:12px 16px;background:#edf8f0;border:1px solid #93c5a3;border-radius:8px;box-shadow:0 4px 16px #0003';document.body.append(note);setTimeout(()=>note.remove(),8000)};
  const loadState=async()=>{state=normalizeState(readLocal());if(client){try{const {data:{user}}=await client.auth.getUser();userId=user?.id||null;if(userId){const {data,error}=await client.from('aa_user_site_state').select('visited_route_slugs,tour_started_at,last_tour_completed_at,seen_announcement_ids').eq('user_id',userId).maybeSingle();if(error)throw error;if(data)state=normalizeState(data);try{localStorage.setItem(localKey(),JSON.stringify(state))}catch{}}}catch(e){console.warn('Account site-tour state unavailable; using this browser only.',e)}}};
  const loadAnnouncements=async()=>{if(!client)return;try{const {data,error}=await client.from('aa_site_announcements').select('id,title,summary,body,url,severity,created_at').eq('published',true).order('created_at',{ascending:false}).limit(30);if(error)throw error;window.dispatchEvent(new CustomEvent('aa-site-updates-loaded',{detail:{updates:data||[]}}))}catch(e){console.warn('Site updates could not be loaded',e)}};
  const setSeen=ids=>{state.seen_announcement_ids=[...new Set((ids||[]).filter(Boolean))];persist()};
  const init=async sb=>{if(sb)client=sb;buildCatalog();ensureUi();await loadState();buildCatalog();if(state.tour_started_at)tourActive=true;refreshUi();markCurrent();await loadAnnouncements();};
  window.addEventListener('hashchange',()=>{buildCatalog();markCurrent();refreshUi()});
  window.addEventListener('aa-notification-read-ids',e=>setSeen(e.detail));
  window.addEventListener('aa-user-state-reset',()=>{userId=null;state=normalizeState(null);try{localStorage.removeItem(localKey())}catch{};loadState().then(()=>refreshUi())});
  window.AA_SiteEngagement={init,refresh:refreshUi};
})();
