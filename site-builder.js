(() => {
  const $ = (id) => document.getElementById(id);
  let sb = null, actor = null, pages = [], settings = null, activeSlug = null, editingNew = false;
  const adminBase = new URL('./', location.href);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const cleanUrl = (value, allowHash = true) => {
    const raw = String(value || '').trim();
    if (allowHash && (raw.startsWith('#/') || raw.startsWith('#main-content') || raw.startsWith('mailto:') || raw.startsWith('tel:'))) return raw;
    try { const u = new URL(raw, location.href); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
  };
  const safeHtml = (html) => {
    const doc = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html');
    doc.querySelectorAll('script,object,embed,form,svg,math,base,meta,link').forEach(n => n.remove());
    doc.body.querySelectorAll('*').forEach(el => [...el.attributes].forEach(a => {
      const name = a.name.toLowerCase(), value = a.value.trim();
      if (name.startsWith('on') || name === 'srcdoc') el.removeAttribute(a.name);
      else if (name === 'href' || name === 'src' || name === 'xlink:href') {
        if (value && !value.startsWith('#') && !value.startsWith('/') && !value.startsWith('./') && !value.startsWith('../') && !/^https?:|^mailto:|^tel:/i.test(value)) el.removeAttribute(a.name);
      }
    }));
    return doc.body.innerHTML;
  };
  const status = (message, error = false) => {
    const e = $('sbStatus'); if (!e) return;
    e.textContent = message; e.style.background = error ? '#fff0ef' : '#eef4f7'; e.style.color = error ? '#9b1c1c' : '';
  };
  const buildShell = () => {
    const root = $('siteBuilderApp');
    root.innerHTML = '<h2>Site Builder</h2><p class="muted">Edit the live Academic Affairs site: pages, groups, order, navigation, home cards, links, embeds, and reusable content blocks. Drafts stay private until published.</p><div id="sbStatus" class="builder-status" role="status">Loading site content…</div><div class="builder-layout"><aside class="builder-tree"><div class="builder-actions"><button id="sbAddCategory" type="button">New section</button><button id="sbAddPage" type="button">New page</button><button id="sbSiteSettings" type="button">Site settings</button></div><div id="sbTreeList"></div></aside><div id="sbEditor" class="builder-editor"><p class="muted">Choose a page to edit.</p></div></div>';
    $('sbAddCategory').onclick = createCategory;
    $('sbAddPage').onclick = createPage;
    $('sbSiteSettings').onclick = editSettings;
  };
  const titleFromHtml = html => {
    const d = new DOMParser().parseFromString(String(html || ''), 'text/html');
    return d.querySelector('h1,h2,h3')?.textContent?.trim() || 'New page';
  };
  const currentRoot = () => {
    const p = pages.find(x => x.slug === activeSlug);
    const root = p?.parent_slug || p?.slug || '';
    return root === 'home' ? '' : root;
  };
  const renderTree = () => {
    const tree = $('sbTreeList'); if (!tree) return;
    tree.replaceChildren();
    const makeButton = (page, indent) => {
      const line = document.createElement('div'); line.className = 'builder-tree-item'; line.style.marginLeft = (indent * 13) + 'px';
      const b = document.createElement('button'); b.type = 'button'; b.textContent = (page.published ? '' : '◌ ') + (page.nav_label || page.title || page.slug);
      b.setAttribute('aria-current', page.slug === activeSlug ? 'page' : 'false'); b.onclick = () => editPage(page.slug);
      line.append(b);
      const up = document.createElement('button'); up.type = 'button'; up.textContent = '↑'; up.title = 'Move up'; up.className = 'tree-add'; up.onclick = () => movePage(page, -1);
      const down = document.createElement('button'); down.type = 'button'; down.textContent = '↓'; down.title = 'Move down'; down.className = 'tree-add'; down.onclick = () => movePage(page, 1);
      line.append(up, down); tree.append(line);
    };
    const home = pages.find(p => p.is_home || p.slug === 'home'); if (home) makeButton(home, 0);
    const roots = pages.filter(p => !p.parent_slug && !p.is_home).sort((a,b) => a.page_order - b.page_order || a.title.localeCompare(b.title));
    roots.forEach(root => { makeButton(root, 0); pages.filter(p => p.parent_slug === root.slug).sort((a,b) => a.page_order - b.page_order || a.title.localeCompare(b.title)).forEach(child => makeButton(child,1)); });
    pages.filter(p => p.parent_slug && !pages.some(q => q.slug === p.parent_slug)).forEach(p => makeButton(p,0));
  };
  const refreshData = async () => {
    const [p, s] = await Promise.all([
      sb.from('aa_site_pages').select('*').order('page_order').order('title'),
      sb.from('aa_site_settings').select('*').eq('singleton', true).maybeSingle()
    ]);
    if (p.error) throw p.error;
    if (s.error) throw s.error;
    if (!p.data?.length) {
      status('First-time setup: importing the current site so the existing pages remain editable…');
      await importCurrentSite();
      return refreshData();
    }
    pages = p.data || []; settings = s.data;
    renderTree();
    if (activeSlug && pages.some(x => x.slug === activeSlug)) editPage(activeSlug);
    else editPage(pages.find(x => x.is_home)?.slug || pages[0]?.slug);
    status('Loaded ' + pages.length + ' pages. Published updates appear on the public site; drafts remain private.');
  };
  const readFooterLinks = doc => [...doc.querySelectorAll('footer .footer-links a')].map(a => ({label:a.textContent.trim(), url:a.getAttribute('href') || ''}));
  const importCurrentSite = async () => {
    const response = await fetch(new URL('fragment.html', adminBase).href, {cache:'no-store'});
    if (!response.ok) throw new Error('Could not load the published site source (' + response.status + ').');
    const source = await response.text(), doc = new DOMParser().parseFromString(source, 'text/html');
    const nav = new Map([...doc.querySelectorAll('#siteNavLinks a')].map(a => {
      const route = String(a.getAttribute('href') || '').replace(/^#\/?/, '').split('/')[0];
      return [route, a.textContent.trim()];
    }).filter(([route]) => route));
    const cards = new Map();
    doc.querySelectorAll('.route-home-content .resource-card').forEach(card => {
      const a = card.querySelector('.card-banner-link'), route = String(a?.getAttribute('href') || '').replace(/^#\/?/, '').split('/')[0];
      if (route) cards.set(route, {summary:card.querySelector('.card-content>p')?.textContent?.trim() || '', icon:card.querySelector('.card-icon')?.textContent?.trim() || '', accent:[...card.classList].find(c => c !== 'resource-card') || 'navy', home_links:[...card.querySelectorAll('.quick-links a')].map(link => ({label:link.querySelector('span')?.textContent?.trim() || link.textContent.trim(),url:link.getAttribute('href') || ''}))});
    });
    const records = [];
    const home = doc.querySelector('.route-home-content');
    if (home) records.push({slug:'home', parent_slug:null, page_order:-1, title:'Home', nav_label:'Home', summary:'', category:'', icon:'⌂', accent:'navy', home_links:[], content_type:'landing', blocks:[{type:'legacy_html',html:home.innerHTML}], is_home:true, show_in_nav:false, show_home_card:false, published:true, updated_by:actor.id});
    const seen = new Set(['home']), orderByParent = new Map();
    for (const section of doc.querySelectorAll('section.route-content[id]')) {
      const slug = section.id.trim().toLowerCase();
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || seen.has(slug)) continue;
      const group = String(section.getAttribute('data-page') || slug).toLowerCase();
      const parent = slug === group ? null : group;
      const n = orderByParent.get(parent || '') || 0; orderByParent.set(parent || '', n + 1);
      const card = cards.get(slug) || {};
      const h = section.querySelector('h1,h2,h3');
      const title = h?.textContent?.trim() || nav.get(slug) || slug.replace(/-/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
      records.push({slug,parent_slug:parent,page_order:parent ? n : (nav.has(slug) ? [...nav.keys()].indexOf(slug) : 50+n),title,nav_label:nav.get(slug)||title,summary:card.summary||'',category:parent||'',icon:card.icon||'',accent:card.accent||'navy',home_links:card.home_links||[],content_type:'standard',blocks:[{type:'legacy_html',html:section.innerHTML}],is_home:false,show_in_nav:nav.has(slug),show_home_card:cards.has(slug),published:true,updated_by:actor.id});
      seen.add(slug);
    }
    const roots = records.filter(p => !p.parent_slug);
    for (const child of records.filter(p => p.parent_slug)) if (!roots.some(r => r.slug === child.parent_slug)) child.parent_slug = null;
    const parents = records.filter(p => !p.parent_slug), children = records.filter(p => p.parent_slug);
    const first = await sb.from('aa_site_pages').upsert(parents,{onConflict:'slug'});
    if (first.error) throw first.error;
    if (children.length) { const second = await sb.from('aa_site_pages').upsert(children,{onConflict:'slug'}); if (second.error) throw second.error; }
    const hero = doc.querySelector('.hero'), logo = doc.querySelector('.brand-link img');
    const settingsRow = {
      singleton:true,
      organization_name:doc.querySelector('.footer-name')?.textContent?.trim() || 'York County Community College',
      site_name:hero?.querySelector('h1')?.textContent?.trim() || 'Academic Affairs',
      hero_eyebrow:hero?.querySelector('.eyebrow')?.textContent?.trim() || 'York County Community College',
      hero_title:hero?.querySelector('h1')?.textContent?.trim() || 'Academic Affairs',
      hero_description:hero?.querySelector('.hero-content>p:last-child')?.textContent?.trim() || '',
      hero_image_url:'',
      logo_url:logo?.getAttribute('src') || '',
      footer_name:doc.querySelector('.footer-name')?.textContent?.trim() || 'York County Community College',
      footer_label:doc.querySelector('footer .footer-inner>div>div:nth-child(2)')?.textContent?.trim() || 'Academic Affairs',
      footer_links:readFooterLinks(doc),
      updated_by:actor.id
    };
    const saved = await sb.from('aa_site_settings').upsert(settingsRow,{onConflict:'singleton'});
    if (saved.error) throw saved.error;
    status('Imported the current site: ' + records.length + ' editable pages and the current navigation/home card structure.');
  };
  const pageOptions = current => '<option value="">Top level</option>' + pages.filter(p => !p.parent_slug && !p.is_home && p.slug !== current).sort((a,b)=>a.title.localeCompare(b.title)).map(p=>'<option value="'+esc(p.slug)+'">'+esc(p.title)+'</option>').join('');
  const inputField = (label,id,value,type='text') => '<div class="builder-field"><label for="'+id+'">'+esc(label)+'</label><input id="'+id+'" type="'+type+'" value="'+esc(value||'')+'"></div>';
  const blockDefaults = type => {
    if (type === 'embed') return {type,url:'',title:'Embedded content',height:480,caption:''};
    if (type === 'image') return {type,url:'',alt:'',caption:'',link:''};
    if (type === 'heading') return {type,text:'Section heading',level:2,eyebrow:''};
    if (type === 'callout') return {type,title:'Important information',text:'',tone:'info',link:'',link_label:''};
    if (type === 'links' || type === 'cards' || type === 'faq') return {type,title:type==='faq'?'Frequently asked questions':'',category:'General',items:[]};
    return {type:type==='html'?'legacy_html':'rich_text',html:'<p>Start writing here.</p>'};
  };
  const blockName = type => ({legacy_html:'Existing site content (visual editor)',rich_text:'Rich text',html:'HTML content',links:'Link list',cards:'Card grid',faq:'Frequently asked questions',embed:'Embed',image:'Image',heading:'Heading',callout:'Callout'}[type] || type);
  const srcDoc = html => '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="'+new URL('styles.css',adminBase).href+'"><style>body{padding:14px;background:#fff}.sb-edit-root{min-height:250px;outline:none}.sb-edit-root:focus{outline:2px solid #0099c6;outline-offset:4px}a{cursor:pointer}</style></head><body><main class="sb-edit-root" contenteditable="true">'+safeHtml(html)+'</main></body></html>';
  const addField = (wrap,label,value,attrs={}) => {
    const box=document.createElement('div');box.className='builder-field';
    const l=document.createElement('label');l.textContent=label;box.append(l);
    let input;
    if(attrs.area){input=document.createElement('textarea');input.rows=attrs.rows||3;}
    else if(attrs.select){input=document.createElement('select');attrs.options.forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;input.append(o)});}
    else {input=document.createElement('input');input.type=attrs.type||'text';}
    input.value=value ?? ''; l.htmlFor=''; box.append(input); wrap.append(box); return input;
  };
  const addCheckbox = (wrap,label,value) => {
    const row=document.createElement('label');row.style.cssText='display:flex;align-items:center;gap:8px;margin:8px 0;font-size:14px';
    const c=document.createElement('input');c.type='checkbox';c.checked=!!value;c.style.width='auto';row.append(c,document.createTextNode(label));wrap.append(row);return c;
  };
  const itemEditor = (block, container) => {
    const list=document.createElement('div');list.className='builder-items';
    const items=Array.isArray(block.items)?block.items:[];
    const draw=()=>{
      list.replaceChildren();
      items.forEach((item,i)=>{
        const card=document.createElement('div');card.className='builder-block';
        const grid=document.createElement('div');grid.className='builder-form-grid';
        const title=addField(grid,'Title',item.title||item.question||'');
        const url=block.type==='faq'?null:addField(grid,'Link or URL',item.url||'',{type:'url'});
        const desc=addField(grid,block.type==='faq'?'Answer':'Description',item.description||item.answer||'',{area:true,rows:2});
        const category=block.type==='faq'?null:addField(grid,'Category',item.category||block.category||'General');
        card.append(grid);
        const remove=document.createElement('button');remove.type='button';remove.textContent='Remove item';remove.onclick=()=>{items.splice(i,1);draw()};card.append(remove);
        item._get=()=>({title:title.value.trim(),question:block.type==='faq'?title.value.trim():undefined,url:url?cleanUrl(url.value):undefined,description:block.type==='faq'?undefined:desc.value.trim(),answer:block.type==='faq'?desc.value.trim():undefined,category:category?.value.trim()||undefined});
        list.append(card);
      });
    };
    draw();
    const add=document.createElement('button');add.type='button';add.textContent='Add item';add.onclick=()=>{items.push({title:'',url:'',description:'',category:block.category||'General'});draw()};
    container.append(list,add);
    return ()=>{block.items=items.map(item=>item._get?item._get():item);delete block.items._get;};
  };
  const renderBlock = (block,index) => {
    const wrap=document.createElement('div');wrap.className='builder-block';wrap.dataset.blockIndex=String(index);
    const head=document.createElement('div');head.className='row';head.style.justifyContent='space-between';
    const name=document.createElement('strong');name.textContent=(index+1)+'. '+blockName(block.type);
    const select=document.createElement('select');select.style.width='auto';
    [['legacy_html','Existing HTML'],['rich_text','Rich text'],['links','Link list'],['cards','Card grid'],['faq','FAQ'],['embed','Embed'],['image','Image'],['heading','Heading'],['callout','Callout']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;o.selected=(block.type==='legacy_html'&&v==='legacy_html')||block.type===v;select.append(o)});
    select.onchange=()=>{captureBlock(wrap,block);const replacement=blockDefaults(select.value);Object.keys(block).forEach(k=>delete block[k]);Object.assign(block,replacement);editPage(activeSlug)};
    const moveUp=document.createElement('button');moveUp.type='button';moveUp.textContent='↑';moveUp.title='Move block up';moveUp.onclick=()=>moveBlock(index,-1);
    const moveDown=document.createElement('button');moveDown.type='button';moveDown.textContent='↓';moveDown.title='Move block down';moveDown.onclick=()=>moveBlock(index,1);
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.onclick=()=>removeBlock(index);
    head.append(name,select,moveUp,moveDown,remove);wrap.append(head);
    if(['legacy_html','rich_text'].includes(block.type)){
      const frame=document.createElement('iframe');frame.title='Visual content editor';
      frame.srcdoc=srcDoc(block.html||'');wrap.append(frame);
      const source=document.createElement('textarea');source.className='sb-source hidden';source.value=block.html||'';source.setAttribute('aria-label','HTML source for this block');wrap.append(source);
      const actions=document.createElement('div');actions.className='builder-actions';
      const toggle=document.createElement('button');toggle.type='button';toggle.textContent='Edit HTML source';let showSource=false;
      toggle.onclick=()=>{showSource=!showSource;source.classList.toggle('hidden',!showSource);frame.classList.toggle('hidden',showSource);toggle.textContent=showSource?'Preview visual editor':'Edit HTML source';if(!showSource){frame.srcdoc=srcDoc(source.value);frame.onload=()=>wireEditor(frame)}};
      const links=document.createElement('button');links.type='button';links.textContent='Edit links in this page';links.onclick=()=>editLinks(wrap,frame,source);
      actions.append(toggle,links);wrap.append(actions);
      frame.onload=()=>wireEditor(frame);
    } else if (block.type==='embed') {
      const g=document.createElement('div');g.className='builder-form-grid';
      block._fields={url:addField(g,'Embed URL (HTTPS)',block.url||'',{type:'url'}),title:addField(g,'Accessible title',block.title||'Embedded content'),height:addField(g,'Height in pixels',block.height||480,{type:'number'}),caption:addField(g,'Caption',block.caption||'',{area:true})};wrap.append(g);
    } else if (block.type==='image') {
      const g=document.createElement('div');g.className='builder-form-grid';
      block._fields={url:addField(g,'Image URL (HTTPS)',block.url||'',{type:'url'}),alt:addField(g,'Alternative text',block.alt||''),caption:addField(g,'Caption',block.caption||''),link:addField(g,'Link URL (optional)',block.link||'',{type:'url'})};wrap.append(g);
    } else if (block.type==='heading') {
      const g=document.createElement('div');g.className='builder-form-grid';
      block._fields={text:addField(g,'Heading text',block.text||''),eyebrow:addField(g,'Eyebrow / category',block.eyebrow||''),level:addField(g,'Heading level',block.level||2,{select:true,options:[['2','Section heading'],['3','Subheading']]} )};wrap.append(g);
    } else if (block.type==='callout') {
      const g=document.createElement('div');g.className='builder-form-grid';
      block._fields={title:addField(g,'Callout title',block.title||''),text:addField(g,'Callout text',block.text||'',{area:true}),tone:addField(g,'Style',block.tone||'info',{select:true,options:[['info','Information'],['warning','Warning'],['success','Success']]}),link:addField(g,'Link URL (optional)',block.link||'',{type:'url'}),link_label:addField(g,'Link label',block.link_label||'')};wrap.append(g);
    } else if (['links','cards','faq'].includes(block.type)) {
      const g=document.createElement('div');g.className='builder-form-grid';block._fields={title:addField(g,'Block heading',block.title||''),category:addField(g,'Category',block.category||'General')};wrap.append(g);block._readItems=itemEditor(block,wrap);
    }
    return wrap;
  };
  const wireEditor = frame => {
    try {
      const d=frame.contentDocument, root=d.querySelector('.sb-edit-root'); if(!root)return;
      root.contentEditable='true';
      root.addEventListener('click',e=>{const a=e.target.closest('a');if(a)e.preventDefault()});
      root.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();const selection=d.getSelection(),text=selection?.toString();if(!text)return;const href=prompt('Link destination (https://, mailto:, tel:, or a #/page route)');if(href){const a=d.createElement('a');a.href=href;selection.deleteFromDocument();selection.getRangeAt(0).insertNode(a);a.textContent=text}}});
    } catch {}
  };
  const captureBlock = (wrap,block) => {
    if(['legacy_html','rich_text'].includes(block.type)){
      const frame=wrap.querySelector('iframe'),source=wrap.querySelector('.sb-source');
      block.html=source&&!source.classList.contains('hidden')?source.value:(frame?.contentDocument?.querySelector('.sb-edit-root')?.innerHTML||block.html||'');
    } else if(block._fields){
      Object.entries(block._fields).forEach(([k,e])=>{block[k]=e.value});
      if(block.type==='embed') block.height=Math.max(160,Math.min(1600,Number(block.height)||480));
      if(block._readItems) block._readItems();
      delete block._fields;delete block._readItems;
    }
    delete block._fields;delete block._readItems;
    return block;
  };
  const renderLinkEditor = (wrap,frame,source) => {
    const html=source&&!source.classList.contains('hidden')?source.value:(frame?.contentDocument?.querySelector('.sb-edit-root')?.innerHTML||'');
    const doc=new DOMParser().parseFromString('<body>'+html+'</body>','text/html');
    const anchors=[...doc.querySelectorAll('a')];
    if(!anchors.length){status('No links in this content block yet. Use Ctrl+K in the visual editor to add a link.');return}
    const list=document.createElement('div');list.className='builder-block';const h=document.createElement('strong');h.textContent='Links in this content block';list.append(h);
    anchors.forEach((a,i)=>{const g=document.createElement('div');g.className='builder-form-grid';const label=addField(g,'Link text',a.textContent||('Link '+(i+1)));const href=addField(g,'Destination',a.getAttribute('href')||'');list.append(g);a._label=label;a._href=href});
    const save=document.createElement('button');save.type='button';save.textContent='Apply link edits';save.onclick=()=>{anchors.forEach(a=>{a.textContent=a._label.value;a.setAttribute('href',cleanUrl(a._href.value)||'#')});const updated=safeHtml(doc.body.innerHTML);source.value=updated;if(source.classList.contains('hidden'))frame.srcdoc=srcDoc(updated);status('Link changes are ready. Save the page to publish them.')};
    list.append(save);wrap.append(list);
  };
  const editLinks = (wrap,frame,source) => {wrap.querySelector('.sb-links-editor')?.remove();const old=wrap.querySelector('.builder-actions');const parent=old?.parentElement||wrap;const before=old?.nextSibling;const area=document.createElement('div');area.className='sb-links-editor';renderLinkEditor(area,frame,source);if(area.childNodes.length)parent.insertBefore(area,before)};
  const captureAllBlocks = () => [...$('sbBlocks').querySelectorAll('[data-block-index]')].map(w=>{
    const i=Number(w.dataset.blockIndex),b=activeBlocks[i];return captureBlock(w,b);
  });
  let activeBlocks = [];
  const moveBlock = (index,delta) => {
    activeBlocks=captureAllBlocks();const other=index+delta;if(other<0||other>=activeBlocks.length)return;
    [activeBlocks[index],activeBlocks[other]]=[activeBlocks[other],activeBlocks[index]];editPage(activeSlug);
  };
  const removeBlock = index => {activeBlocks=captureAllBlocks();activeBlocks.splice(index,1);editPage(activeSlug)};
  const readPageForm = () => {
    activeBlocks=captureAllBlocks();
    const get=id=>$(id);
    const slug=editingNew?get('sbSlug').value.trim().toLowerCase():activeSlug;
    if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)||slug==='home'&&editingNew) throw new Error('Use a simple page name with lowercase letters, numbers, and hyphens.');
    if(pages.some(p=>p.slug===slug&&slug!==activeSlug))throw new Error('That page name is already in use.');
    const parent=get('sbParent').value||null;
    if(parent===slug)throw new Error('A page cannot be inside itself.');
    if(parent && pages.find(p=>p.slug===parent)?.parent_slug)throw new Error('Choose a top-level section as the parent.');
    const pos=Math.max(0,Number(get('sbOrder').value)||0);
      return {slug,parent_slug:parent,page_order:pos,title:get('sbTitle').value.trim()||slug,nav_label:get('sbNav').value.trim()||get('sbTitle').value.trim()||slug,summary:get('sbSummary').value.trim(),category:get('sbCategory').value.trim(),icon:get('sbIcon').value.trim(),accent:get('sbAccent').value.trim()||'navy',panel_color:get('sbPanelColor').value||'',home_links:activePageHomeLinks(),content_type:get('sbContentType').value,blocks:activeBlocks,is_home:slug==='home',show_in_nav:get('sbShowNav').checked,show_home_card:get('sbShowCard').checked,published:get('sbPublished').checked,updated_by:actor.id};
  };
  const activePageHomeLinks = () => {
    const ta=$('sbHomeLinks'); if(!ta)return [];
    try { const x=JSON.parse(ta.value||'[]'); return Array.isArray(x)?x:[]; } catch { throw new Error('Home card links must be valid JSON.'); }
  };
  const savePage = async publish => {
    try {
      const row=readPageForm();if(publish)row.published=true;
      const {error}=await sb.from('aa_site_pages').upsert(row,{onConflict:'slug'});if(error)throw error;
      await sb.from('aa_audit_log').insert({actor_user_id:actor.id,action:editingNew?'site_page_created':'site_page_updated',entity_type:'site_page',entity_id:row.slug,details:{title:row.title,published:row.published}});
      status((row.published?'Published':'Saved draft')+' “'+row.title+'”.');
      activeSlug=row.slug;editingNew=false;await refreshData();
    } catch(e){status(e.message||'Could not save the page.',true)}
  };
  const pageFormMarkup = p => {
    const parent=p.parent_slug||'';
    const options=pageOptions(p.slug);
    return '<div class="row" style="justify-content:space-between"><div><h3>'+(editingNew?'Create a page':'Edit page')+'</h3><p class="muted">Drag-free ordering controls are beside each page in the tree; content is edited visually or by HTML source.</p></div><button id="sbDeletePage" type="button" class="builder-danger">Delete page</button></div><div class="builder-form-grid">'+
      (editingNew?inputField('Page address (slug)','sbSlug',p.slug||'new-page'):'<div class="builder-field"><label>Page address</label><input value="'+esc(p.slug)+'" disabled></div>')+
      inputField('Page title','sbTitle',p.title)+
      '<div class="builder-field"><label for="sbParent">Inside section</label><select id="sbParent">'+options+'</select></div>'+
      inputField('Navigation label','sbNav',p.nav_label)+inputField('Category label','sbCategory',p.category)+
      inputField('Short description','sbSummary',p.summary)+inputField('Icon','sbIcon',p.icon)+
      inputField('Accent class','sbAccent',p.accent||'navy')+inputField('Home card panel color','sbPanelColor',p.panel_color||'#0a2240','color')+inputField('Order','sbOrder',String(p.page_order||0),'number')+
      '<div class="builder-field"><label for="sbContentType">Page layout</label><select id="sbContentType"><option value="standard">Standard</option><option value="landing">Landing page</option><option value="article">Article</option><option value="directory">Directory</option></select></div>'+
      '</div><div class="builder-form-grid"><div><label>Home card links (JSON list of {label,url})</label><textarea id="sbHomeLinks" rows="4">'+esc(JSON.stringify(p.home_links||[],null,2))+'</textarea></div><div><label class="builder-field">Publishing and navigation</label><div id="sbChecks"></div></div></div>'+
      '<div class="builder-actions"><button id="sbSaveDraft" type="button">Save draft</button><button id="sbPublish" type="button" class="primary">Publish changes</button><button id="sbAddBlock" type="button">Add content block</button></div>'+
      '<h3>Page content</h3><p class="muted">Edit existing pages visually, adjust links with “Edit links”, or use the HTML source for precise layout changes. Add reusable blocks for text, links, cards, FAQs, images, and embeds.</p><div id="sbBlocks"></div>';
  };
  const editPage = slug => {
    if (!slug) return;
    activeSlug=slug;editingNew=false;
    const page=pages.find(p=>p.slug===slug);if(!page)return;
    const editor=$('sbEditor');editor.innerHTML=pageFormMarkup(page);
    if($('sbParent'))$('sbParent').value=page.parent_slug||'';
    $('sbContentType').value=page.content_type||'standard';
    const checks=$('sbChecks');
    const showNav=addCheckbox(checks,'Show in top navigation',page.show_in_nav);
    const showCard=addCheckbox(checks,'Show as a home page card',page.show_home_card);
    const publish=addCheckbox(checks,'Published on the public site',page.published);
    showNav.id='sbShowNav';showCard.id='sbShowCard';publish.id='sbPublished';
    activeBlocks=JSON.parse(JSON.stringify(page.blocks||[]));
    const blocks=$('sbBlocks');activeBlocks.forEach((block,i)=>blocks.append(renderBlock(block,i)));
    $('sbDeletePage').onclick=deleteActivePage;
    $('sbSaveDraft').onclick=()=>savePage(false);$('sbPublish').onclick=()=>savePage(true);
    $('sbAddBlock').onclick=()=>{
      activeBlocks=captureAllBlocks();const type=prompt('Block type: rich_text, links, cards, faq, embed, image, heading, callout, or html','rich_text');
      if(!type)return;const aliases={text:'rich_text',link_list:'links',card_grid:'cards',html:'legacy_html'};
      const actual=aliases[type.trim().toLowerCase()]||type.trim().toLowerCase();
      const allowed=['rich_text','links','cards','faq','embed','image','heading','callout','legacy_html'];
      if(!allowed.includes(actual)){status('Choose a supported block type from the list.',true);return}
      activeBlocks.push(blockDefaults(actual));editPage(activeSlug);
    };
    $('sbTreeList').querySelectorAll('button[aria-current="page"]')[0]?.focus({preventScroll:true});
    renderTree();
  };
  const createCategory = async () => {
    const name=prompt('Name for the new top-level site section');if(!name?.trim())return;
    const slug=name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    if(!slug||pages.some(p=>p.slug===slug)){status('That section name is invalid or already exists.',true);return}
    editingNew=true;activeSlug=null;activeBlocks=[];
    const page={slug,title:name.trim(),nav_label:name.trim(),summary:'',category:'',icon:'',accent:'navy',page_order:pages.filter(p=>!p.parent_slug&&!p.is_home).length,content_type:'landing',blocks:[],is_home:false,show_in_nav:true,show_home_card:true,published:false,home_links:[]};
    pages.push(page);renderTree();drawNewPage(page);
  };
  const createPage = async () => {
    const title=prompt('Name for the new page');if(!title?.trim())return;
    const slug=title.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    if(!slug||pages.some(p=>p.slug===slug)){status('That page name is invalid or already exists.',true);return}
    const current=currentRoot();
    const parent=current || null;
    editingNew=true;activeSlug=null;activeBlocks=[];
    const page={slug,parent_slug:parent,title:title.trim(),nav_label:title.trim(),summary:'',category:parent||'',icon:'',accent:'navy',panel_color:'',page_order:pages.filter(p=>(p.parent_slug||null)===parent).length,content_type:'standard',blocks:[blockDefaults('rich_text')],is_home:false,show_in_nav:false,show_home_card:false,published:false,home_links:[]};
    pages.push(page);renderTree();drawNewPage(page);
  };
  const drawNewPage = page => {
    const editor=$('sbEditor');editor.innerHTML=pageFormMarkup(page);
    if($('sbParent'))$('sbParent').value=page.parent_slug||'';
    $('sbContentType').value=page.content_type||'standard';
    const checks=$('sbChecks');const showNav=addCheckbox(checks,'Show in top navigation',page.show_in_nav),showCard=addCheckbox(checks,'Show as a home page card',page.show_home_card),publish=addCheckbox(checks,'Published on the public site',page.published);
    showNav.id='sbShowNav';showCard.id='sbShowCard';publish.id='sbPublished';
    activeBlocks=page.blocks||[];activeBlocks.forEach((b,i)=>$('sbBlocks').append(renderBlock(b,i)));
    $('sbDeletePage').onclick=()=>{pages=pages.filter(p=>p.slug!==page.slug);activeSlug=pages[0]?.slug;renderTree();editPage(activeSlug)};
    $('sbSaveDraft').onclick=()=>savePage(false);$('sbPublish').onclick=()=>savePage(true);
    $('sbAddBlock').onclick=()=>{activeBlocks=captureAllBlocks();activeBlocks.push(blockDefaults('rich_text'));drawNewPage(page)};
  };
  const movePage = async (page,delta) => {
    const siblings=pages.filter(p=>p.parent_slug===page.parent_slug && p.is_home===page.is_home).sort((a,b)=>a.page_order-b.page_order);
    const i=siblings.findIndex(p=>p.slug===page.slug),j=i+delta;if(j<0||j>=siblings.length)return;
    const a=siblings[i],b=siblings[j];const old=a.page_order;a.page_order=b.page_order;b.page_order=old;
    const res=await sb.from('aa_site_pages').upsert([a,b],{onConflict:'slug'});if(res.error){status(res.error.message,true);return}
    pages=pages.map(p=>p.slug===a.slug?a:p.slug===b.slug?b:p);renderTree();status('Page order saved.');
  };
  const deleteActivePage = async () => {
    const page=pages.find(p=>p.slug===activeSlug);if(!page)return;
    if(!confirm('Delete “'+page.title+'” and all pages inside it?'))return;
    const {error}=await sb.from('aa_site_pages').delete().eq('slug',page.slug);
    if(error){status(error.message,true);return}
    await sb.from('aa_audit_log').insert({actor_user_id:actor.id,action:'site_page_deleted',entity_type:'site_page',entity_id:page.slug});
    activeSlug=null;await refreshData();status('Deleted '+page.title+'.');
  };
  const editSettings = () => {
    activeSlug=null;editingNew=false;
    const s=settings||{};
    const editor=$('sbEditor');
    editor.innerHTML='<div class="builder-settings"><h3>Site-wide settings</h3><p class="muted">These values update the hero, logo, browser-visible site name, and footer on the published site.</p><div class="builder-form-grid">'+
      inputField('Organization name','ssOrg',s.organization_name||'York County Community College')+
      inputField('Site name','ssName',s.site_name||'Academic Affairs')+
      inputField('Hero eyebrow','ssEyebrow',s.hero_eyebrow||'York County Community College')+
      inputField('Hero title','ssTitle',s.hero_title||'Academic Affairs')+
      inputField('Hero description','ssDescription',s.hero_description||'')+
      inputField('Hero background image URL (HTTPS)','ssHeroImage',s.hero_image_url||'','url')+
      inputField('Logo image URL (HTTPS)','ssLogo',s.logo_url||'','url')+
      inputField('Primary navy','ssNavy',s.theme?.navy||'#0a2240','color')+
      inputField('Primary blue','ssBlue',s.theme?.blue||'#00a0df','color')+
      inputField('Gold accent','ssGold',s.theme?.gold||'#c6b784','color')+
      inputField('Gray accent','ssGray',s.theme?.gray||'#b1b1b1','color')+
      inputField('Page background','ssPage',s.theme?.page||'#f5f6f7','color')+
      inputField('Card panel background','ssPanel',s.theme?.panel||'#ffffff','color')+
      inputField('Footer name','ssFooterName',s.footer_name||'York County Community College')+
      inputField('Footer label','ssFooterLabel',s.footer_label||'Academic Affairs')+
      '</div><label>Footer links (JSON list of {label,url})</label><textarea id="ssFooterLinks" rows="6">'+esc(JSON.stringify(s.footer_links||[],null,2))+'</textarea><div class="builder-actions"><button id="ssSave" type="button" class="primary">Save site settings</button></div></div>';
    $('ssSave').onclick=saveSettings;
  };
  const saveSettings = async () => {
    try {
      let links=JSON.parse($('ssFooterLinks').value||'[]');if(!Array.isArray(links))throw new Error('Footer links must be a list.');
      links=links.map(x=>({label:String(x.label||'').trim(),url:cleanUrl(x.url)||''})).filter(x=>x.label&&x.url);
      const color=id=>/^#[0-9a-f]{6}$/i.test($(id).value)?$(id).value:'#ffffff';
      const row={singleton:true,organization_name:$('ssOrg').value.trim(),site_name:$('ssName').value.trim(),hero_eyebrow:$('ssEyebrow').value.trim(),hero_title:$('ssTitle').value.trim(),hero_description:$('ssDescription').value.trim(),hero_image_url:cleanUrl($('ssHeroImage').value)||'',logo_url:cleanUrl($('ssLogo').value)||'',theme:{navy:color('ssNavy'),blue:color('ssBlue'),gold:color('ssGold'),gray:color('ssGray'),page:color('ssPage'),panel:color('ssPanel')},footer_name:$('ssFooterName').value.trim(),footer_label:$('ssFooterLabel').value.trim(),footer_links:links,updated_by:actor.id};
      const {error}=await sb.from('aa_site_settings').upsert(row,{onConflict:'singleton'});if(error)throw error;
      await sb.from('aa_audit_log').insert({actor_user_id:actor.id,action:'site_settings_updated',entity_type:'site_settings',details:{site_name:row.site_name}});
      settings=row;status('Site-wide settings saved.');
    } catch(e){status(e.message||'Could not save settings.',true)}
  };
  window.AA_SiteBuilder = { init: async (client,user) => {
    sb=client;actor=user;buildShell();
    try {await refreshData();}
    catch(e){status(e.message||'Site Builder could not load. Apply the site builder migration first.',true)}
  }};
})();

