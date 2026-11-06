(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = (value, embed = false) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^#\//.test(raw) || /^#[A-Za-z][\w-]*$/.test(raw) || (!embed && /^(mailto:|tel:)/i.test(raw))) return raw;
    try { const u = new URL(raw, location.href); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
  };
  const cleanHtml = value => {
    const doc = new DOMParser().parseFromString(String(value || ''), 'text/html');
    doc.querySelectorAll('script,object,embed,meta[http-equiv],base,form').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || name === 'srcdoc' || name === 'formaction') el.removeAttribute(attr.name);
        else if (['href','src','xlink:href'].includes(name)) {
          const safe = safeUrl(attr.value, name === 'src' && el.tagName === 'IFRAME');
          if (!safe) el.removeAttribute(attr.name); else el.setAttribute(attr.name, safe);
        }
      });
      if (el.tagName === 'IFRAME') { el.setAttribute('loading','lazy'); el.setAttribute('sandbox','allow-scripts allow-forms allow-popups'); if (!el.title) el.title = 'Embedded resource'; }
      if (el.tagName === 'A' && el.target === '_blank') el.rel = 'noopener noreferrer';
    });
    return doc.body.innerHTML;
  };
  const element = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
  const routeFor = page => '#/' + (page.parent_slug ? page.parent_slug + '/' + page.slug : page.slug);
  const blockHtml = block => {
    if (block.type === 'legacy_html' || block.type === 'rich_text') return cleanHtml(block.html);
    if (block.type === 'heading') { const level = Number(block.level) === 3 ? 3 : 2; return (block.eyebrow ? '<p class="eyebrow">'+esc(block.eyebrow)+'</p>' : '') + '<h'+level+'>'+esc(block.text)+'</h'+level+'>'; }
    if (block.type === 'image') { const src=safeUrl(block.url,true); if(!src)return ''; const img='<img src="'+esc(src)+'" alt="'+esc(block.alt||'')+'" loading="lazy">'; const linked=safeUrl(block.link); const media=linked?'<a href="'+esc(linked)+'">'+img+'</a>':img; return '<figure class="cms-image">'+media+(block.caption?'<figcaption>'+esc(block.caption)+'</figcaption>':'')+'</figure>'; }
    if (block.type === 'embed') { const src=safeUrl(block.url,true); if(!src)return ''; const h=Math.max(160,Math.min(1600,Number(block.height)||480)); return '<figure class="cms-embed"><iframe src="'+esc(src)+'" title="'+esc(block.title||'Embedded content')+'" height="'+h+'" loading="lazy" sandbox="allow-scripts allow-forms allow-popups"></iframe>'+(block.caption?'<figcaption>'+esc(block.caption)+'</figcaption>':'')+'</figure>'; }
    if (block.type === 'callout') { const cls=['info','warning','success'].includes(block.tone)?block.tone:'info'; const link=safeUrl(block.link); return '<aside class="cms-callout '+cls+'">'+(block.title?'<h3>'+esc(block.title)+'</h3>':'')+'<p>'+esc(block.text)+'</p>'+(link?'<a href="'+esc(link)+'">'+esc(block.link_label||'Learn more')+'</a>':'')+'</aside>'; }
    if (['links','cards','faq'].includes(block.type)) {
      const faq=block.type==='faq', cards=block.type==='cards', tag=cards?'article':'li';
      const items=(block.items||[]).map(item=>{const url=safeUrl(item.url);const label=esc(item.title||item.question||'Resource');const desc=esc(item.description||item.answer||'');
        if(faq)return '<details class="cms-faq"><summary>'+label+'</summary><div>'+desc+'</div></details>';
        return '<'+tag+'>'+(url?'<a href="'+esc(url)+'">'+label+'</a>':'<strong>'+label+'</strong>')+(desc?'<p>'+desc+'</p>':'')+'</'+tag+'>';}).join('');
      return '<section class="cms-list '+(cards?'content-card-grid':'resource-card')+'">'+(block.title?'<h2>'+esc(block.title)+'</h2>':'')+(faq?items:'<ul class="cms-links">'+items+'</ul>')+'</section>';
    }
    return '';
  };
  const teamContacts = {
    'JJ Dufort, Ed.D.': 'jdufort@mainecc.edu',
    'Chris Watkinson': 'cwatkinson@mainecc.edu',
    'M. Wendy West': 'wwest@mainecc.edu',
    'John Barr': 'john.barr@mainecc.edu',
    'John C. Barr': 'john.barr@mainecc.edu',
    'Thomas Jarmusz': 'tjarmusz@mainecc.edu'
  };
  const normalizeTeamCards = () => {
    const grid = document.querySelector('#teaching-excellence .person-grid');
    if (!grid) return;
    for (const card of grid.querySelectorAll('.mini-card')) {
      const name = card.querySelector('h3')?.textContent.trim();
      const email = teamContacts[name];
      if (!email) continue;
      let link = card.querySelector('a[href^="mailto:"]');
      if (!link) {
        card.querySelectorAll('a').forEach(a => a.remove());
        link = element('a', '', email);
        card.append(link);
      }
      link.href = 'mailto:' + email;
      link.textContent = email;
    }
    if (![...grid.querySelectorAll('h3')].some(h => h.textContent.trim() === 'Thomas Jarmusz')) {
      const card = element('article', 'mini-card');
      card.append(element('h3', '', 'Thomas Jarmusz'), element('p', '', 'Instructional Designer.'));
      const link = element('a', '', 'tjarmusz@mainecc.edu');
      link.href = 'mailto:tjarmusz@mainecc.edu';
      card.append(link);
      grid.append(card);
    }
  };
  const pageBody = page => (page.blocks||[]).map(blockHtml).join('');
  const BANNER_BASE = 'https://ycccvrlab.github.io/yccc-academic-affairs/assets/';
  const bannerVariants = ['campus', 'branded', 'classic', 'clean'];
  const normalizeBannerVariant = value => bannerVariants.includes(value) ? value : 'clean';
  const bannerAssetSet = variant => variant === 'classic'
    ? { desktop: BANNER_BASE + 'academic-affairs-banner-classic.svg?v=20261104-1', mobile: BANNER_BASE + 'academic-affairs-banner-classic-mobile.svg?v=20261104-1' }
    : { desktop: BANNER_BASE + 'academic-affairs-banner.svg?v=20261104-2', mobile: BANNER_BASE + 'academic-affairs-banner-mobile.svg?v=20261105-2' };
  const applyBanner = settings => {
    const hero = document.querySelector('.hero.hero-brand') || document.querySelector('.hero');
    if (!hero) return;
    const theme = settings.theme || {};
    const variant = normalizeBannerVariant(theme.banner_variant);
    const title = settings.hero_title || 'Academic Affairs';
    const description = settings.hero_description || '';
    hero.dataset.bannerVariant = variant;
    hero.classList.toggle('is-branded', variant === 'branded');
    hero.classList.toggle('is-campus', variant === 'campus');
    hero.setAttribute('aria-labelledby', 'hero-title');
    if (variant === 'branded') {
      hero.style.removeProperty('background-image');
      hero.innerHTML = '<div class="hero-content"><div class="hero-brand-badge" aria-hidden="true"><img src="https://www.yccc.edu/app/themes/yccc/dist/img/logo_emblem.png" alt="" width="144" height="144"></div><p class="eyebrow">' + esc(settings.hero_eyebrow || 'York County Community College') + '</p><h1 id="hero-title">' + esc(title) + '</h1><p>' + esc(description) + '</p></div>';
    } else if (variant === 'campus') {
      hero.style.removeProperty('background-image');
      hero.innerHTML = '<div class="hero-content"><p class="eyebrow">' + esc(settings.hero_eyebrow || 'York County Community College') + '</p><h1 id="hero-title">' + esc(title) + '</h1><p>' + esc(description) + '</p></div>';
    } else {
      const assets = bannerAssetSet(variant);
      hero.innerHTML = '<h1 class="sr-only" id="hero-title">' + esc(title) + '</h1><picture class="hero-brand-picture"><source media="(max-width: 900px)" srcset="' + esc(assets.mobile) + '" type="image/svg+xml"><img class="hero-brand-image" src="' + esc(assets.desktop) + '" alt="' + esc(description) + '" loading="eager" decoding="async"></picture>';
    }
  };
  const applySettings = settings => {
    if (!settings) return;
    const set=(selector,value)=>{const el=document.querySelector(selector);if(el&&value)el.textContent=value;};
    set('.hero .eyebrow',settings.hero_eyebrow); set('.hero h1',settings.hero_title); set('.hero-content>p:last-child',settings.hero_description);
    const logo=document.querySelector('.brand-link img'); if(logo&&settings.logo_url){const u=safeUrl(settings.logo_url,true);if(u)logo.src=u;}
    set('footer .footer-name',settings.footer_name); set('footer .footer-inner>div>div:nth-child(2)',settings.footer_label);
    const theme=settings.theme||{}, root=document.documentElement;
    for(const [key,variable] of Object.entries({navy:'--navy',blue:'--blue',gold:'--gold',gray:'--gray',page:'--page',panel:'--panel',scrollbar_track:'--scrollbar-track',scrollbar_thumb:'--scrollbar-thumb',scrollbar_thumb_hover:'--scrollbar-thumb-hover'})) if(/^#[0-9a-f]{6}$/i.test(theme[key]||''))root.style.setProperty(variable,theme[key]);
    if(/^#[0-9a-f]{6}$/i.test(theme.navy||''))root.style.setProperty('--navy2',theme.navy);
    if(/^#[0-9a-f]{6}$/i.test(theme.blue||''))root.style.setProperty('--blueDark',theme.blue);
    const body=document.body; body.classList.toggle('aa-compact-banner',theme.compact_banner===true); body.classList.toggle('aa-home-cards-minimal',theme.home_cards_minimal===true); body.classList.toggle('aa-hide-home-nav',theme.hide_home_nav===true);
    const hero=document.querySelector('.hero'); const heroUrl=safeUrl(settings.hero_image_url,true); if(hero){if(heroUrl)hero.style.backgroundImage='linear-gradient(90deg,rgba(3,28,52,.78),rgba(5,39,66,.55) 52%,rgba(5,39,66,.24)),url("'+heroUrl.replace(/["\\]/g,'')+'")';else hero.style.removeProperty('background-image');}
    applyBanner(settings);
    const footer=document.querySelector('.footer-links'); if(footer&&Array.isArray(settings.footer_links)){footer.replaceChildren();for(const item of settings.footer_links){const url=safeUrl(item.url);if(!url)continue;const a=element('a','',item.label);a.href=url;footer.append(a);}}
  };
  const applyContent = (pages, settings) => {
    if (!Array.isArray(pages) || !pages.length) return false;
    applySettings(settings);
      const visible=new Set(pages.map(p=>p.slug));
      document.querySelectorAll('.route-content[id]').forEach(section=>{if(!visible.has(section.id))section.hidden=true;});
      const pageBySlug=new Map(pages.map(p=>[p.slug,p]));
      window.AA_SiteCMSPageCatalog=pages.map(p=>({slug:p.slug,parent_slug:p.parent_slug,title:p.title,nav_label:p.nav_label,published:p.published,is_home:p.is_home,show_in_nav:p.show_in_nav}));
      window.AA_SiteCMSRouteDefinitions=window.AA_SiteCMSRouteDefinitions||{};
      for(const root of pages.filter(p=>!p.parent_slug&&!p.is_home)){
        const children=pages.filter(p=>p.parent_slug===root.slug).sort((a,b)=>a.page_order-b.page_order);
        window.AA_SiteCMSRouteDefinitions[root.slug]={label:root.nav_label||root.title,page:root.slug,items:children.map(p=>[p.slug,p.nav_label||p.title])};
      }
      const nav=document.getElementById('siteNavLinks'); if(nav){nav.replaceChildren();pages.filter(p=>!p.parent_slug&&!p.is_home&&p.show_in_nav).sort((a,b)=>a.page_order-b.page_order).forEach(p=>{const a=element('a','',p.nav_label||p.title);a.href='#/'+p.slug;nav.append(a);});}
      for(const page of pages){
        if(page.is_home){const home=document.querySelector('.route-home-content');if(home){const body=page.blocks?.find(b=>b.type==='legacy_html')?.html;if(body!==undefined)home.innerHTML=cleanHtml(body);home.hidden=false;}continue;}
        let section=document.getElementById(page.slug);
        if(!section){const parent=document.querySelector('.brightspace-main');if(!parent)continue;section=element('section','detail-section route-content internal-page');section.id=page.slug;parent.append(section);}
        section.classList.add('route-content');section.dataset.page=page.parent_slug||page.slug;section.hidden=false;
        section.innerHTML=pageBody(page);
        if(!section.querySelector('h1,h2')){const heading=element('h1','',page.title);section.prepend(heading);}
        if(page.summary&&!section.querySelector('.cms-summary')){const summary=element('p','cms-summary',page.summary);section.prepend(summary);}
      }
      const cards=document.querySelector('.portal-resource-grid'); if(cards){cards.replaceChildren();pages.filter(p=>!p.parent_slug&&!p.is_home&&p.show_home_card).sort((a,b)=>a.page_order-b.page_order).forEach(page=>{
        const card=element('article','resource-card '+String(page.accent||'navy').replace(/[^a-z0-9_-]/gi,''));if(/^#[0-9a-f]{6}$/i.test(page.panel_color||''))card.style.backgroundColor=page.panel_color;
        const head=element('div','card-banner'),icon=element('span','card-icon',page.icon||'•'),title=element('h3','',page.title),link=element('a','card-banner-link');link.href='#/'+page.slug;link.setAttribute('aria-label',page.title);head.append(icon,title);link.append(head);
        const content=element('div','card-content');if(/^#[0-9a-f]{6}$/i.test(page.panel_color||''))content.style.backgroundColor=page.panel_color;content.append(element('p','',page.summary||''));const list=element('ul','quick-links');(page.home_links||[]).slice(0,3).forEach(item=>{const li=element('li'),a=element('a',''),label=element('span','',item.label||item.title||'Open page'),arrow=element('b','', '›');arrow.setAttribute('aria-hidden','true');a.href=safeUrl(item.url)||('#/'+page.slug);a.append(label,arrow);li.append(a);list.append(li);});content.append(list);card.append(link,content);cards.append(card);
      });}
      normalizeTeamCards();
      window.AA_SiteCMSApplyRoute?.();
      return true;
  };
  const assetBase = (() => {
    try {
      const src = document.currentScript?.src;
      if (src) return new URL('./', src).href;
    } catch {}
    return 'https://ycccvrlab.github.io/yccc-academic-affairs/';
  })();
  const loadBackup = async () => {
    const response = await fetch(assetBase + 'backend/firebase/site-content.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Backup request returned HTTP ' + response.status);
    const backup = await response.json();
    if (!applyContent(backup.pages, backup.settings)) throw new Error('Backup does not contain any published pages.');
    console.warn('Published site content is unavailable from Supabase; using the last known backup.');
  };
  const render = async client => {
    try {
      const [{data:pages,error:pErr},{data:settings,error:sErr}]=await Promise.all([
        client.from('aa_site_pages').select('*').eq('published',true).order('page_order').order('title'),
        client.from('aa_site_settings').select('*').eq('singleton',true).maybeSingle()
      ]);
      if(pErr||sErr)throw pErr||sErr;
      if(!applyContent(pages, settings)) throw new Error('Supabase returned no published pages.');
    } catch(error){
      console.warn('Published site content could not be loaded from Supabase; trying the backup.', error);
      try { await loadBackup(); } catch(backupError) { console.warn('The site content backup could not be loaded.', backupError); }
    }
  };
  window.AA_SiteCMS={render,renderBlocks:pageBody,renderBlock:blockHtml,cleanHtml,safeUrl,normalizeTeamCards};
})();

