(() => {
  const $ = id => document.getElementById(id);
  let sb = null, actor = null, pages = [], settings = null, activeSlug = null, editingNew = false;
  let activeBlocks = [], selectedBlock = -1, settingsMode = false, dirty = false, device = 'desktop';
  let frame = null, previewScroll = 0, dragBlock = null, dragCard = null, previewLinks = false;
  let collab = null, collabReady = false, collabTimer = null, pendingDraft = null, localEditedSinceRemote = false;
  let historyTarget = null, historyRows = [], lastSavedAt = null;
  let trackPresence = () => {};
  let queueLiveDraft = () => {};
  const collabTopic = 'aa-site-builder';
  const collabKey = (globalThis.crypto?.randomUUID?.() || ('sb-' + Math.random().toString(36).slice(2)));
  const adminBase = new URL('./', location.href);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const cleanUrl = (value, allowHash = true) => {
    const raw = String(value || '').trim();
    if (allowHash && (raw.startsWith('#/') || raw.startsWith('#main-content') || raw.startsWith('mailto:') || raw.startsWith('tel:'))) return raw;
    try { const u = new URL(raw, location.href); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
  };
  const safeHtml = html => {
    const doc = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html');
    doc.querySelectorAll('script,object,embed,form,svg,math,base,meta,link').forEach(n => n.remove());
    doc.body.querySelectorAll('*').forEach(el => [...el.attributes].forEach(a => {
      const name = a.name.toLowerCase(), value = a.value.trim();
      if (name.startsWith('on') || name === 'srcdoc' || name === 'contenteditable' || name === 'draggable') el.removeAttribute(a.name);
      else if (['href', 'src', 'xlink:href'].includes(name) && value && !value.startsWith('#') && !value.startsWith('/') && !value.startsWith('./') && !value.startsWith('../') && !/^https?:|^mailto:|^tel:/i.test(value)) el.removeAttribute(a.name);
    }));
    return doc.body.innerHTML;
  };
  const clean = html => window.AA_SiteCMS?.cleanHtml ? window.AA_SiteCMS.cleanHtml(html) : safeHtml(html);
  const renderBlockHtml = block => window.AA_SiteCMS?.renderBlock ? window.AA_SiteCMS.renderBlock(block) : (['legacy_html', 'rich_text'].includes(block.type) ? clean(block.html) : '');
  const safeUrl = (value, embed = false) => window.AA_SiteCMS?.safeUrl ? window.AA_SiteCMS.safeUrl(value, embed) : cleanUrl(value);
  const status = (message, error = false) => {
    const e = $('sbStatus'); if (!e) return;
    e.textContent = message; e.style.background = error ? '#fff0ef' : '#eef4f7'; e.style.color = error ? '#9b1c1c' : '';
  };
  const setSaveLocation = message => {
    const e = $('sbSaveLocation'); if (e) e.textContent = message;
  };
  const defaultSettings = () => ({
    organization_name: 'York County Community College', site_name: 'Academic Affairs',
    hero_eyebrow: 'York County Community College', hero_title: 'Academic Affairs',
    hero_description: 'Faculty resources, teaching support, academic information, forms, policies, and professional learning.',
    hero_image_url: '', logo_url: 'https://www.nsnsports.net/wp-content/uploads/MascotLogoStack.png',
    theme: { navy: '#0a2240', blue: '#00a0df', gold: '#c6b784', gray: '#b1b1b1', page: '#f5f6f7', panel: '#ffffff', banner_variant: 'clean', scrollbar_track: '#0a2240', scrollbar_thumb: '#c6b784', scrollbar_thumb_hover: '#d8c993' },
    footer_name: 'York County Community College', footer_label: 'Academic Affairs',
    footer_links: [
      { label: 'YCCC Home', url: 'https://www.yccc.edu/' },
      { label: 'MCCS', url: 'https://mymccs.me.edu/ICS/MCCS_Policies/' },
      { label: 'Directory', url: 'https://www.yccc.edu/' },
      { label: 'Accessibility resources', url: '#/teaching-excellence/accessibility' },
      { label: 'Contact Academic Affairs', url: 'mailto:acrampton@mainecc.edu' }
    ]
  });
  const bannerVariants = [
    { value: 'campus', label: 'Campus photo', note: 'Original school background' },
    { value: 'branded', label: 'Branded text', note: '2024 navy/gold text hero' },
    { value: 'classic', label: 'Original image', note: 'Gold divider beside logo' },
    { value: 'clean', label: 'Clean image', note: 'No divider, extra top space' }
  ];
  const bannerAsset = (file, version) => new URL('assets/' + file, adminBase).href + '?v=' + version;
  const bannerCampusAsset = bannerAsset('academic-affairs-banner-campus.jpg', '20261104-1');
  const bannerAssetSet = variant => variant === 'classic'
    ? { desktop: bannerAsset('academic-affairs-banner-classic.svg', '20261104-1'), mobile: bannerAsset('academic-affairs-banner-classic-mobile.svg', '20261104-1') }
    : { desktop: bannerAsset('academic-affairs-banner.svg', '20261104-2'), mobile: bannerAsset('academic-affairs-banner-mobile.svg', '20261105-2') };
  const normalizeBannerVariant = value => bannerVariants.some(v => v.value === value) ? value : 'clean';
  const hexColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
  const scrollbarColorsFor = theme => ({
    track: hexColor(theme.scrollbar_track, '#0a2240'),
    thumb: hexColor(theme.scrollbar_thumb, '#c6b784'),
    hover: hexColor(theme.scrollbar_thumb_hover, '#d8c993')
  });
  const scrollbarPresets = [
    { value: 'gold-navy', label: 'Gold thumb · dark blue track' },
    { value: 'blue-gold', label: 'Blue thumb · gold track' },
    { value: 'navy-gold', label: 'Dark blue thumb · gold track' }
  ];
  const scrollbarPresetColors = (preset, theme) => {
    const navy = hexColor(theme.navy, '#0a2240'), gold = hexColor(theme.gold, '#c6b784'), blue = hexColor(theme.blue, '#00a0df');
    if (preset === 'gold-navy') return { track: navy, thumb: gold, hover: '#d8c993' };
    if (preset === 'blue-gold') return { track: gold, thumb: blue, hover: '#007eaf' };
    if (preset === 'navy-gold') return { track: gold, thumb: navy, hover: '#0e4d7e' };
    return null;
  };
  const scrollbarPresetFor = theme => {
    const current = scrollbarColorsFor(theme);
    return scrollbarPresets.find(preset => {
      const colors = scrollbarPresetColors(preset.value, theme);
      return colors && ['track', 'thumb', 'hover'].every(key => colors[key].toLowerCase() === current[key].toLowerCase());
    })?.value || 'custom';
  };
  const bannerThumb = variant => variant === 'branded'
    ? '<span>YCCC</span>'
    : variant === 'campus'
      ? '<span class="sb-banner-thumb-label">Academic Affairs</span>'
      : `<img src="${esc(bannerAssetSet(variant).desktop)}" alt="">`;
  const bannerThumbStyle = variant => variant === 'campus'
    ? ` style="background-image:url('${esc(bannerCampusAsset)}')"`
    : '';
  const bannerMarkup = (source, variant) => {
    const title = source.hero_title || 'Academic Affairs';
    const description = source.hero_description || '';
    if (variant === 'branded') {
      return `<section class="hero hero-brand is-branded" data-banner-variant="branded" aria-labelledby="hero-title"><div class="hero-content"><div class="hero-brand-badge" aria-hidden="true"><img src="https://www.yccc.edu/app/themes/yccc/dist/img/logo_emblem.png" alt="" width="144" height="144"></div><p class="eyebrow">${esc(source.hero_eyebrow || 'York County Community College')}</p><h1 id="hero-title">${esc(title)}</h1><p>${esc(description)}</p></div></section>`;
    }
    if (variant === 'campus') {
      return `<section class="hero hero-brand is-campus" data-banner-variant="campus" aria-labelledby="hero-title"><div class="hero-content"><p class="eyebrow">${esc(source.hero_eyebrow || 'York County Community College')}</p><h1 id="hero-title">${esc(title)}</h1><p>${esc(description)}</p></div></section>`;
    }
    const assets = bannerAssetSet(variant);
    return `<section class="hero hero-brand" data-banner-variant="${variant}" aria-labelledby="hero-title"><h1 class="sr-only" id="hero-title">${esc(title)}</h1><picture class="hero-brand-picture"><source media="(max-width: 900px)" srcset="${esc(assets.mobile)}" type="image/svg+xml"><img class="hero-brand-image" src="${esc(assets.desktop)}" alt="${esc(description)}" loading="eager" decoding="async"></picture></section>`;
  };
  const siteSettings = () => settings || defaultSettings();
  const currentPage = () => pages.find(p => p.slug === activeSlug) || null;
  const pageRoute = page => page.is_home || page.slug === 'home' ? '#/' : '#/' + ((page.parent_slug ? page.parent_slug + '/' : '') + page.slug);
  const order = (a, b) => (Number(a.page_order) || 0) - (Number(b.page_order) || 0) || String(a.title || '').localeCompare(String(b.title || ''));
  const homeCardPages = () => pages.filter(p => !p.parent_slug && !p.is_home && p.show_home_card).sort(order);
  const routeFromHref = href => {
    const raw = String(href || '').trim();
    if (!raw.startsWith('#/')) return '';
    const path = raw.slice(2).split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
    if (!path) return 'home';
    const exact = pages.find(p => p.slug === path || pageRoute(p).slice(2) === path);
    if (exact) return exact.slug;
    const last = path.split('/').pop();
    return pages.find(p => p.slug === last)?.slug || '';
  };

  const blockDefaults = type => {
    if (type === 'embed') return { type, url: '', title: 'Embedded content', height: 480, caption: '' };
    if (type === 'image') return { type, url: '', alt: '', caption: '', link: '' };
    if (type === 'heading') return { type, text: 'Section heading', level: 2, eyebrow: '' };
    if (type === 'callout') return { type, title: 'Important information', text: '', tone: 'info', link: '', link_label: '' };
    if (['links', 'cards', 'faq'].includes(type)) return { type, title: type === 'faq' ? 'Frequently asked questions' : '', category: 'General', items: [] };
    return { type: 'rich_text', html: '<p>Start writing here.</p>' };
  };
  const blockName = type => ({ legacy_html: 'Existing content', rich_text: 'Text', links: 'Link list', cards: 'Card grid', faq: 'FAQ', embed: 'Embed', image: 'Image', heading: 'Heading', callout: 'Callout' }[type] || type);

  const buildShell = () => {
    const root = $('siteBuilderApp'); if (!root) return;
    root.innerHTML = `
      <div class="builder-shell">
        <div class="builder-head">
          <div><p class="builder-kicker">Academic Affairs</p><h2 class="builder-title">Site Builder</h2><p class="builder-subtitle">Drag sections and home cards by the ⠿ handle. Click text to edit it. Links and buttons stay inactive in edit mode; switch to Preview links when you want to test them. Changes stay private until you publish.</p><p class="sb-storage-note">Changes are saved in Supabase: pages in <code>aa_site_pages</code>, branding and footer in <code>aa_site_settings</code>. The public site reads only published pages.</p></div>
          <div class="sb-actions"><button id="sbHistory" type="button" class="sb-button">History</button><button id="sbTemplate" type="button" class="sb-button">Template &amp; embed</button><button id="sbViewSite" type="button" class="sb-button">View site</button><button id="sbFullscreen" type="button" class="sb-button" aria-pressed="false">Full screen</button><button id="sbSaveDraft" type="button" class="sb-button">Save draft</button><button id="sbPublish" type="button" class="sb-button primary">Publish</button></div>
        </div>
        <div id="sbStatus" class="builder-status" role="status">Loading site content…</div>
        <div class="sb-builder-meta"><span id="sbSaveLocation" class="sb-save-location">Storage: Supabase · loading…</span><span id="sbCollabState" class="sb-collab-state" title="Live editor presence and draft sync">Live collaboration: connecting…</span></div>
        <div id="sbLiveNotice" class="sb-live-notice" hidden><span></span><button id="sbApplyRemote" type="button">Apply live edits</button><button id="sbDismissRemote" type="button">Dismiss</button></div>
        <div id="sbSidePanel" class="sb-side-panel hidden" role="dialog" aria-modal="false" aria-labelledby="sbSideTitle"><div class="sb-side-head"><h3 id="sbSideTitle">History</h3><button id="sbSideClose" type="button" aria-label="Close panel">×</button></div><div id="sbSideBody" class="sb-side-body"></div></div>
        <div class="builder-layout">
          <aside class="builder-tree"><h3>Pages</h3><p class="sb-muted">Pages follow the same sections and nav as the public site.</p><div class="builder-actions"><button id="sbNewSection" type="button">New section</button><button id="sbNewPage" type="button">New page</button><button id="sbSiteSettings" type="button">Site settings</button></div><div id="sbTreeList"></div></aside>
          <div class="builder-editor">
            <div class="sb-page-head"><div><p class="builder-kicker" id="sbPageKicker">Page</p><h3 id="sbPageTitle">Loading…</h3><p class="sb-muted" id="sbPageMeta"></p></div><div class="sb-actions"><button id="sbPageSettings" type="button" class="sb-button">Page settings</button></div></div>
            <div class="sb-canvas">
              <div class="sb-toolbar"><div class="sb-palette" id="sbPalette"></div><div class="sb-toolbar-right"><button id="sbPreviewLinks" type="button" class="sb-mode-toggle" aria-pressed="false" title="When off, links and buttons select their section instead of navigating. Turn on to test them.">Preview links</button><div class="sb-device" id="sbDevice"><button type="button" data-device="desktop" class="active">Desktop</button><button type="button" data-device="tablet">Tablet</button><button type="button" data-device="phone">Phone</button></div></div></div>
              <div class="sb-workspace"><div class="sb-frame-wrap" id="sbFrameWrap" data-device="desktop"><iframe id="sbPreview" class="sb-frame" title="Editable page preview"></iframe></div><aside class="sb-inspector" id="sbInspector"></aside></div>
            </div>
          </div>
        </div>
      </div>`;
    $('sbViewSite').onclick = () => window.open(new URL('index.html', adminBase).href, '_blank', 'noopener');
    $('sbHistory').onclick = openHistory;
    $('sbTemplate').onclick = openTemplatePanel;
    $('sbSideClose').onclick = closeSidePanel;
    $('sbApplyRemote').onclick = applyPendingDraft;
    $('sbDismissRemote').onclick = () => { pendingDraft = null; setLiveNotice(''); };
    $('sbSaveDraft').onclick = () => savePage(false);
    $('sbPublish').onclick = () => savePage(true);
    $('sbFullscreen').onclick = toggleFullscreen;
    $('sbPreviewLinks').onclick = togglePreviewLinks;
    syncPreviewModeButton();
    $('sbNewSection').onclick = () => startDraft(null, true);
    $('sbNewPage').onclick = () => startDraft(currentRoot(), false);
    $('sbSiteSettings').onclick = editSettings;
    $('sbPageSettings').onclick = () => selectBlock(-1);
    $('sbPalette').innerHTML = [['rich_text', 'Text'], ['heading', 'Heading'], ['callout', 'Callout'], ['links', 'Links'], ['cards', 'Cards'], ['faq', 'FAQ'], ['image', 'Image'], ['embed', 'Embed']]
      .map(([type, label]) => `<button type="button" data-add-block="${type}">${label}</button>`).join('');
    $('sbPalette').onclick = event => { const b = event.target.closest('[data-add-block]'); if (b) addBlock(b.dataset.addBlock); };
    $('sbDevice').onclick = event => {
      const b = event.target.closest('[data-device]'); if (!b) return;
      device = b.dataset.device; $('sbFrameWrap').dataset.device = device;
      $('sbDevice').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    };
  };

  const renderTree = () => {
    const tree = $('sbTreeList'); if (!tree) return;
    tree.replaceChildren();
    const makeButton = (page, indent) => {
      const line = document.createElement('div'); line.className = 'builder-tree-item'; line.style.marginLeft = (indent * 13) + 'px';
      const b = document.createElement('button'); b.type = 'button'; b.textContent = (page.published ? '' : '◌ ') + (page.nav_label || page.title || page.slug);
      b.setAttribute('aria-current', page.slug === activeSlug ? 'page' : 'false'); b.onclick = () => navigateTo(page.slug);
      line.append(b);
      const up = document.createElement('button'); up.type = 'button'; up.textContent = '↑'; up.title = 'Move up'; up.className = 'tree-add'; up.onclick = () => movePage(page, -1);
      const down = document.createElement('button'); down.type = 'button'; down.textContent = '↓'; down.title = 'Move down'; down.className = 'tree-add'; down.onclick = () => movePage(page, 1);
      line.append(up, down); tree.append(line);
    };
    const home = pages.find(p => p.is_home || p.slug === 'home'); if (home) makeButton(home, 0);
    const roots = pages.filter(p => !p.parent_slug && !p.is_home).sort(order);
    roots.forEach(root => { makeButton(root, 0); pages.filter(p => p.parent_slug === root.slug).sort(order).forEach(child => makeButton(child, 1)); });
    pages.filter(p => p.parent_slug && !pages.some(q => q.slug === p.parent_slug)).forEach(p => makeButton(p, 0));
  };

  const updatePageHead = () => {
    const kicker = $('sbPageKicker'), title = $('sbPageTitle'), meta = $('sbPageMeta');
    const save = $('sbSaveDraft'), publish = $('sbPublish'); if (!title) return;
    if (settingsMode) {
      kicker.textContent = 'Site-wide settings'; title.textContent = 'Branding, hero, and footer'; meta.textContent = 'Changes apply across the public site.';
      meta.classList.remove('is-dirty'); save?.classList.add('hidden'); publish?.classList.add('hidden'); setSaveLocation('Storage: Supabase → aa_site_settings'); return;
    }
    save?.classList.remove('hidden'); publish?.classList.remove('hidden');
    const page = currentPage();
    if (!page) { kicker.textContent = 'Page'; title.textContent = 'Choose a page'; meta.textContent = ''; setSaveLocation('Storage: Supabase · choose a page'); save?.classList.add('hidden'); publish?.classList.add('hidden'); return; }
    kicker.textContent = editingNew ? 'New page' : (page.is_home ? 'Home page' : 'Page');
    title.textContent = page.title || 'Untitled page';
    const route = page.is_home ? '#/' : '#/' + ((page.parent_slug ? page.parent_slug + '/' : '') + (page._draftSlug || page.slug));
    meta.textContent = (editingNew ? 'Not saved yet' : (page.published ? 'Published' : 'Draft')) + ' · ' + route + ' · ' + activeBlocks.length + (activeBlocks.length === 1 ? ' section' : ' sections') + (dirty ? ' · Unsaved changes' : '');
    meta.classList.toggle('is-dirty', dirty);
    setSaveLocation('Storage: Supabase → aa_site_pages · ' + (page._draftSlug || page.slug));
  };
  const markDirty = () => {
    if (!currentPage() && !settingsMode) return;
    localEditedSinceRemote = true;
    queueLiveDraft();
    if (dirty) { updatePageHead(); return; }
    dirty = true; updatePageHead();
  };
  const currentRoot = () => { const page = currentPage(); if (!page || page.is_home) return null; return page.parent_slug || page.slug; };
  const uniqueSlug = base => { let slug = base, n = 2; while (pages.some(p => p.slug === slug)) slug = base + '-' + n++; return slug; };

  const confirmLeave = () => {
    if (!dirty && !editingNew) return true;
    if (!dirty && editingNew) { pages = pages.filter(p => p !== currentPage()); editingNew = false; return true; }
    if (!confirm(editingNew ? 'Discard this new page?' : 'Discard unsaved changes to this page?')) return false;
    if (editingNew) { pages = pages.filter(p => p !== currentPage()); editingNew = false; }
    dirty = false; return true;
  };
  const navigateTo = slug => {
    if (slug === activeSlug) { settingsMode = false; selectBlock(-1); return; }
    const target = pages.find(p => p.slug === slug); if (!target) { status('That page is not in the Site Builder yet.', true); return; }
    if (!confirmLeave()) return;
    settingsMode = false; openPage(target);
  };
  const openPage = (page, isNew = false) => {
    if (!page) return;
    activeSlug = page.slug; editingNew = isNew; settingsMode = false; selectedBlock = -1; dirty = false; previewScroll = 0;
    activeBlocks = JSON.parse(JSON.stringify(page.blocks || []));
    renderTree(); updatePageHead(); renderPreview(); renderInspector();
    trackPresence();
  };
  const editSettings = () => {
    if (!settings) settings = defaultSettings();
    settingsMode = true; selectedBlock = -1; updateSelection(); renderInspector(); updatePageHead();
    trackPresence();
  };
  const startDraft = (parent, isSection) => {
    if (!confirmLeave()) return;
    const slug = uniqueSlug(isSection ? 'new-section' : 'new-page');
    const page = {
      slug, _draftSlug: slug, parent_slug: parent || null, page_order: pages.filter(p => (p.parent_slug || null) === (parent || null) && !p.is_home).length,
      title: isSection ? 'New section' : 'New page', nav_label: isSection ? 'New section' : 'New page', summary: '', category: parent || '', icon: '', accent: 'navy', panel_color: '',
      home_links: [], content_type: isSection ? 'landing' : 'standard', blocks: [], is_home: false, show_in_nav: !!isSection, show_home_card: !!isSection, published: false
    };
    pages.push(page); openPage(page, true);
    setTimeout(() => $('pTitle')?.select(), 0);
  };

  const refreshData = async (announce = true) => {
    const [p, s] = await Promise.all([
      sb.from('aa_site_pages').select('*').order('page_order').order('title'),
      sb.from('aa_site_settings').select('*').eq('singleton', true).maybeSingle()
    ]);
    if (p.error) throw p.error; if (s.error) throw s.error;
    pages = p.data || []; settings = s.data || defaultSettings();
    renderTree();
    if (!pages.length) {
      activeSlug = null; activeBlocks = []; updatePageHead(); renderPreview(); renderInspector();
      status('No pages are in the Site Builder yet. Apply the site-builder migration, then reload.', true); return;
    }
    const target = (activeSlug && pages.find(x => x.slug === activeSlug)) || pages.find(x => x.is_home) || pages[0];
    openPage(target);
    if (announce) status('Loaded ' + pages.length + ' pages. Changes stay private until published.');
  };

  const bgStyle = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '';
  const homeCardHtml = (page, index) => {
    const accent = String(page.accent || 'navy').replace(/[^a-z0-9_-]/gi, '') || 'navy';
    const panel = bgStyle(page.panel_color);
    const style = panel ? ` style="background-color:${panel}"` : '';
    const links = (page.home_links || []).slice(0, 3).map(item => {
      const url = safeUrl(item.url) || ('#/' + page.slug);
      return `<li><a href="${esc(url)}"><span>${esc(item.label || item.title || 'Open page')}</span><b>›</b></a></li>`;
    }).join('');
    return `<article class="resource-card ${accent} sb-home-card" data-sb-card="${esc(page.slug)}" data-card-index="${index}"${style}>
      <span class="sb-card-handle" draggable="true" title="Drag card to reorder" aria-hidden="true">⠿</span>
      <a class="card-banner-link" href="#/${esc(page.slug)}" aria-label="${esc(page.title)}"><div class="card-banner"><span class="card-icon">${esc(page.icon || '•')}</span><h3>${esc(page.title)}</h3></div></a>
      <div class="card-content"${style}><p>${esc(page.summary || '')}</p><ul class="quick-links">${links}</ul></div>
    </article>`;
  };
  const hydrateHomeCards = doc => {
    const host = doc.querySelector('.sb-home-content') || doc.querySelector('.route-home-content'); if (!host) return;
    let grid = host.querySelector('.portal-resource-grid') || host.querySelector('.resource-grid');
    if (!grid) { grid = doc.createElement('div'); grid.className = 'resource-grid portal-resource-grid'; host.append(grid); }
    grid.replaceChildren();
    const cards = homeCardPages();
    if (!cards.length) { grid.innerHTML = '<div class="sb-empty-home">No pages are marked “Show as a home page card.” Open a page’s settings to add it.</div>'; return; }
    grid.innerHTML = cards.map(homeCardHtml).join('');
  };

  const previewCss = `
    body.sb-preview{min-width:0}.sb-preview .route-home-content{display:block!important}
    .sb-preview .sb-preview-block{position:relative;outline:1px dashed transparent;outline-offset:4px;transition:outline-color .15s}
    .sb-preview .sb-preview-block:hover{outline-color:rgba(0,126,175,.55)}
    .sb-preview .sb-preview-block.is-selected{outline:2px solid #007eaf;outline-offset:5px}
    .sb-preview .sb-preview-block.is-dragging{opacity:.45}
    .sb-preview .sb-preview-block.is-drop-target{outline:2px dashed #c6b784;outline-offset:7px}
    .sb-preview .sb-block-tools{position:absolute;z-index:40;top:-12px;left:8px;display:flex;align-items:center;gap:5px;padding:3px 7px;background:#0a2240;color:#fff;border-radius:4px;box-shadow:0 2px 8px rgba(10,34,64,.22);opacity:0;transition:opacity .15s;font:11px/1.2 Arial,sans-serif}
    .sb-preview .sb-preview-block:hover>.sb-block-tools,.sb-preview .sb-preview-block.is-selected>.sb-block-tools{opacity:1}
    .sb-preview .sb-drag-handle{cursor:grab;font-size:14px;letter-spacing:1px;user-select:none}
    .sb-preview .sb-block-label{white-space:nowrap;font-weight:700;letter-spacing:.2px}
    .sb-preview .sb-block-content{min-height:28px;border-radius:3px;transition:background .15s}
    .sb-preview .sb-block-content[contenteditable="true"]{cursor:text}
    .sb-preview .sb-block-content[contenteditable="true"]:focus{outline:2px dashed #00a0df;outline-offset:5px;background:rgba(0,160,223,.035)}
    .sb-preview .sb-home-content .section-title[contenteditable="true"]{cursor:text;border-radius:3px}
    .sb-preview .sb-home-content .section-title[contenteditable="true"]:focus{outline:2px dashed #00a0df;outline-offset:5px}
    .sb-preview .sb-home-card{position:relative}
    .sb-preview .sb-home-card .sb-card-handle{position:absolute;z-index:30;top:7px;right:7px;display:flex;width:24px;height:24px;align-items:center;justify-content:center;background:#0a2240;color:#fff;border-radius:4px;box-shadow:0 2px 7px rgba(10,34,64,.25);cursor:grab;opacity:0;transition:opacity .15s;font:14px/1 Arial,sans-serif;user-select:none}
    .sb-preview .sb-home-card:hover .sb-card-handle{opacity:1}
    .sb-preview .sb-home-card.is-card-dragging{opacity:.45}
    .sb-preview .sb-home-card.is-card-drop{outline:2px dashed #c6b784;outline-offset:3px}
    .sb-preview .sb-empty-home{grid-column:1/-1;padding:24px;border:1px dashed #b9c8d0;border-radius:8px;background:#f8fbfc;color:#5d6a74;text-align:center;font-size:14px}
    .sb-preview .sb-added-heading{margin:0 0 10px;color:#0a2240;font-family:"Rift Bold Italic","Rift",Arial,sans-serif;font-size:34px;font-style:italic;line-height:1.1}
    .sb-preview .sb-block-placeholder{padding:18px;border:1px dashed #b9c8d0;border-radius:6px;background:#f8fbfc;color:#5d6a74;font-size:13px}
    .sb-preview .sb-empty-section{padding:30px;border:1px dashed #b9c8d0;border-radius:8px;background:#f8fbfc;color:#5d6a74;text-align:center;font-size:14px}
    .sb-preview .cms-summary{color:#5d6a74;font-size:16px;line-height:1.6}
  `;
  const buildPreviewDocument = (page, blocks) => {
    const s = siteSettings(); const theme = Object.assign(defaultSettings().theme, s.theme || {}); const scrollbar = scrollbarColorsFor(theme);
    const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
    const navPages = pages.filter(p => !p.parent_slug && !p.is_home && p.show_in_nav).sort(order);
    const rootSlug = page.parent_slug || page.slug;
    const nav = navPages.map(p => `<a href="#/${esc(p.slug)}" class="${p.slug === rootSlug ? 'active' : ''}">${esc(p.nav_label || p.title)}</a>`).join('') || '<a href="#/" class="active">Home</a>';
    const logoUrl = cleanUrl(s.logo_url);
    const brand = logoUrl ? `<img class="yccc-logo" src="${esc(logoUrl)}" alt="${esc(s.organization_name || 'York County Community College')}">` : `<span class="text-logo" style="display:block"><strong>York County</strong><span>Community College</span></span>`;
    const heroImg = cleanUrl(s.hero_image_url);
    const heroStyle = heroImg ? ` style="background-image:linear-gradient(90deg,rgba(3,28,52,.78),rgba(5,39,66,.55) 52%,rgba(5,39,66,.24)),url('${esc(heroImg)}')"` : '';
    const blockMarkup = blocks.map((b, i) => {
      const raw = renderBlockHtml(b);
      const homeLegacy = page.is_home && b.type === 'legacy_html';
      const editable = ['legacy_html', 'rich_text'].includes(b.type) && !homeLegacy;
      const content = raw || `<div class="sb-block-placeholder">This section is empty. Select it and add content in the inspector.</div>`;
      return `<div class="sb-preview-block" data-sb-block="${i}" data-block-type="${esc(b.type)}">
        <div class="sb-block-tools"><span class="sb-drag-handle" draggable="true" title="Drag section">⠿</span><span class="sb-block-label">${i + 1} · ${esc(blockName(b.type))}</span></div>
        <div class="sb-block-content${homeLegacy ? ' sb-home-content' : ''}"${editable ? ' contenteditable="true" spellcheck="true"' : ''}>${content}</div>
      </div>`;
    }).join('');
    let main;
    if (page.is_home) {
      const homeContent = blockMarkup || `<div class="section-title"><div><p class="eyebrow">Faculty Portal</p><h2>What can we help you find?</h2></div><p>Start with one of the areas requested for the Academic Affairs site. Each tile opens a detailed collection of resources.</p></div><div class="resource-grid portal-resource-grid"></div>`;
      main = `<main id="main-content"><section class="tile-section route-home-content route-home-current">${homeContent}</section></main>`;
    } else {
      const root = pages.find(p => p.slug === rootSlug);
      const children = pages.filter(p => p.parent_slug === rootSlug).sort(order);
      const sidebar = root ? `<div class="sidebar-title"><a class="sidebar-home" href="#/">Academic Affairs</a></div><nav class="sidebar-route-links" aria-label="Page sections"><a href="#/${esc(root.slug)}" class="${page.slug === root.slug ? 'active' : ''}">${esc(root.nav_label || root.title)}</a>${children.map(p => `<a href="#/${esc(p.slug)}" class="${page.slug === p.slug ? 'active' : ''}">${esc(p.nav_label || p.title)}</a>`).join('')}</nav>` : `<div class="sidebar-title"><a class="sidebar-home" href="#/">Academic Affairs</a></div>`;
      const hasHeading = /<h[1-3][\s>]/i.test(blockMarkup);
      const summary = page.summary && !/class="cms-summary"/.test(blockMarkup) ? `<p class="cms-summary">${esc(page.summary)}</p>` : '';
      const heading = hasHeading ? '' : `<h1 class="sb-added-heading">${esc(page.title)}</h1>`;
      main = `<main id="main-content"><div class="brightspace-shell route-shell"><aside class="content-sidebar"><div class="sidebar-sticky">${sidebar}</div></aside><div class="brightspace-main"><section class="detail-section route-content internal-page is-current" id="${esc(page.slug)}" data-page="${esc(page.parent_slug || page.slug)}">${summary}${heading}${blockMarkup || '<div class="sb-empty-section">This page is empty. Add a section from the toolbar above.</div>'}</section></div></div></main>`;
    }
    const footerLinks = (Array.isArray(s.footer_links) && s.footer_links.length ? s.footer_links : defaultSettings().footer_links)
      .map(item => { const url = safeUrl(item.url); return url ? `<a href="${esc(url)}">${esc(item.label)}</a>` : ''; }).join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${esc(adminBase.href)}">  <link rel="stylesheet" href="${esc(new URL('styles.css', adminBase).href + '?v=20261105-5')}"><title>${esc(page.title)} | ${esc(s.site_name)}</title><style>:root{--navy:${color(theme.navy, '#0a2240')};--blue:${color(theme.blue, '#00a0df')};--blueDark:${color(theme.blue, '#007eaf')};--gold:${color(theme.gold, '#c6b784')};--gray:${color(theme.gray, '#b1b1b1')};--page:${color(theme.page, '#f5f6f7')};--panel:${color(theme.panel, '#ffffff')};--scrollbar-track:${scrollbar.track};--scrollbar-thumb:${scrollbar.thumb};--scrollbar-thumb-hover:${scrollbar.hover}}${previewCss}</style></head><body class="sb-preview ${page.is_home ? 'aa-route-home' : 'aa-route-page'}">
      <header class="site-header"><div class="top-accent"></div><div class="utility-bar"><div class="container utility-inner"><div class="brand-area"><a class="home-icon-button" href="#/" aria-label="Academic Affairs home"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 10.3 12 3l9 7.3v9.3c0 .8-.7 1.4-1.5 1.4h-5v-6.2h-5V21h-5C3.7 21 3 20.4 3 19.6v-9.3Z"/></svg></a><span class="brand-divider"></span><a class="brand-link" href="#/">${brand}</a></div><div class="header-tools"><button class="icon-button search-button" type="button" aria-label="Search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg></button><button class="icon-button notification-button" type="button" aria-label="Notifications"><span class="notification-dot"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></button><span class="header-separator"></span><div class="account-menu"><button class="account-button" type="button"><span class="account-mark">AA</span><span class="account-label">Academic Affairs</span><span class="account-caret">⌄</span></button></div></div></div></div><nav class="main-nav" aria-label="Primary navigation"><div class="container main-nav-inner"><button class="mobile-nav-toggle" type="button" aria-expanded="false">Menu <span class="mobile-arrow"></span></button><div class="nav-links">${page.is_home ? '<a href="#/" class="active">Home</a>' : '<a href="#/">Home</a>'}${nav}</div></div></nav></header>
      ${bannerMarkup(s, normalizeBannerVariant(theme.banner_variant))}
      ${main}
      <footer><div class="container footer-inner"><div><div class="footer-name">${esc(s.footer_name)}</div><div>${esc(s.footer_label)}</div></div><div class="footer-links">${footerLinks}</div></div></footer>
    </body></html>`;
  };

  const renderPreview = () => {
    frame = $('sbPreview'); if (!frame) return;
    const page = currentPage();
    if (!page) { frame.srcdoc = '<!doctype html><html><body style="font:15px Arial;padding:24px;color:#5d6a74">Choose a page to edit.</body></html>'; return; }
    try { previewScroll = frame.contentWindow?.scrollY || 0; } catch { previewScroll = 0; }
    frame.onload = () => { try { frame.contentWindow.scrollTo(0, previewScroll); } catch {} wirePreview(); };
    frame.srcdoc = buildPreviewDocument(page, activeBlocks);
  };
  const updateSelection = () => {
    let doc; try { doc = frame?.contentDocument; } catch { return; }
    if (!doc) return;
    doc.querySelectorAll('[data-sb-block]').forEach(w => w.classList.toggle('is-selected', Number(w.dataset.sbBlock) === selectedBlock));
  };
  const selectBlock = index => {
    if (index >= 0 && !activeBlocks[index]) index = -1;
    selectedBlock = index; settingsMode = false; updateSelection(); renderInspector(); updatePageHead();
  };
  const syncPreviewModeButton = () => {
    const button = $('sbPreviewLinks'); if (!button) return;
    button.textContent = previewLinks ? 'Preview mode on' : 'Preview links';
    button.classList.toggle('is-active', previewLinks);
    button.setAttribute('aria-pressed', String(previewLinks));
  };
  const togglePreviewLinks = () => {
    previewLinks = !previewLinks; syncPreviewModeButton();
    status(previewLinks ? 'Preview mode on. Links and buttons are live; click text to keep editing.' : 'Edit mode. Links and buttons select their section instead of navigating.');
  };
  const toggleFullscreen = () => {
    const on = document.body.classList.toggle('sb-fullscreen');
    const button = $('sbFullscreen');
    if (button) { button.textContent = on ? 'Exit full screen' : 'Full screen'; button.setAttribute('aria-pressed', String(on)); }
    status(on ? 'Full-screen editor. Press Escape to return.' : 'Returned to the admin console.');
  };
  const syncHomeHeading = (index, el) => {
    const block = activeBlocks[index]; if (!block) return;
    const doc = new DOMParser().parseFromString('<body>' + (block.html || '') + '</body>', 'text/html');
    const clone = el.cloneNode(true); clone.removeAttribute('contenteditable');
    clone.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
    const old = doc.querySelector('.section-title');
    if (old) old.replaceWith(doc.importNode(clone, true)); else doc.body.prepend(doc.importNode(clone, true));
    block.html = clean(doc.body.innerHTML);
  };
  const syncInlineEdits = () => {
    let doc; try { doc = frame?.contentDocument; } catch { return; }
    if (!doc || !currentPage()) return;
    doc.querySelectorAll('[data-sb-block]').forEach(w => {
      const index = Number(w.dataset.sbBlock), block = activeBlocks[index]; if (!block) return;
      if (currentPage().is_home && block.type === 'legacy_html') {
        const heading = w.querySelector('.sb-home-content .section-title'); if (heading) syncHomeHeading(index, heading);
      } else if (['legacy_html', 'rich_text'].includes(block.type)) {
        const content = w.querySelector('.sb-block-content'); if (content) block.html = clean(content.innerHTML);
      }
    });
  };
  const refreshPreview = () => { syncInlineEdits(); renderPreview(); };
  const moveBlockTo = (from, to) => {
    if (from === to || !activeBlocks[from]) return;
    syncInlineEdits();
    const [block] = activeBlocks.splice(from, 1);
    activeBlocks.splice(Math.max(0, Math.min(to, activeBlocks.length)), 0, block);
    selectedBlock = Math.min(to, activeBlocks.length - 1); dirty = true;
    renderPreview(); renderInspector(); updatePageHead();
  };
  const moveBlock = (index, delta) => {
    const other = index + delta; if (other < 0 || other >= activeBlocks.length) return;
    syncInlineEdits(); [activeBlocks[index], activeBlocks[other]] = [activeBlocks[other], activeBlocks[index]];
    selectedBlock = other; dirty = true; renderPreview(); renderInspector(); updatePageHead();
  };
  const addBlock = type => {
    if (!currentPage()) return;
    settingsMode = false; syncInlineEdits();
    activeBlocks.push(blockDefaults(type)); selectedBlock = activeBlocks.length - 1; dirty = true;
    renderPreview(); renderInspector(); updatePageHead();
  };
  const duplicateBlock = index => {
    syncInlineEdits(); const copy = JSON.parse(JSON.stringify(activeBlocks[index])); activeBlocks.splice(index + 1, 0, copy);
    selectedBlock = index + 1; dirty = true; renderPreview(); renderInspector(); updatePageHead();
  };
  const removeBlock = index => {
    if (!confirm('Remove this section?')) return;
    syncInlineEdits(); activeBlocks.splice(index, 1); selectedBlock = -1; dirty = true;
    renderPreview(); renderInspector(); updatePageHead();
  };

  const wirePreview = () => {
    frame = $('sbPreview'); if (!frame) return;
    let doc; try { doc = frame.contentDocument; } catch { return; }
    if (!doc) return;
    if (currentPage()?.is_home) hydrateHomeCards(doc);
    updateSelection();
    doc.addEventListener('click', event => {
      const target = event.target.nodeType === 1 ? event.target : event.target.parentElement; if (!target) return;
      if (target.closest('.sb-card-handle') || target.closest('.sb-drag-handle')) return;
      const interactive = target.closest('a,button,input,select,textarea,summary,label,[role="button"]');
      const block = target.closest('[data-sb-block]');
      if (!previewLinks) {
        if (interactive) {
          event.preventDefault(); event.stopPropagation();
          if (block) { selectBlock(Number(block.dataset.sbBlock)); return; }
          status('Links and buttons are inactive while editing. Use “Preview links” to test them.'); return;
        }
        if (block) { selectBlock(Number(block.dataset.sbBlock)); return; }
        if (!target.closest('.site-header') && !target.closest('footer')) selectBlock(-1);
        return;
      }
      const anchor = target.closest('a');
      if (anchor) {
        event.preventDefault();
        const href = anchor.getAttribute('href') || '';
        const slug = routeFromHref(href);
        if (slug) { navigateTo(slug); return; }
        if (href && !href.startsWith('#')) { window.open(anchor.href, '_blank', 'noopener'); return; }
        return;
      }
      const card = target.closest('[data-sb-card]');
      if (card) { event.preventDefault(); navigateTo(card.dataset.sbCard); return; }
      if (interactive) return;
      if (block) { selectBlock(Number(block.dataset.sbBlock)); return; }
      if (!target.closest('.site-header') && !target.closest('footer')) selectBlock(-1);
    }, true);
    doc.querySelector('.mobile-nav-toggle')?.addEventListener('click', event => {
      event.preventDefault(); const nav = doc.querySelector('.nav-links'); const open = nav?.classList.toggle('open');
      event.currentTarget.setAttribute('aria-expanded', String(!!open));
    });
    doc.querySelectorAll('.faq-button').forEach(btn => btn.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      const open = btn.getAttribute('aria-expanded') === 'true'; btn.setAttribute('aria-expanded', String(!open));
      btn.closest('.faq-item')?.querySelector('.faq-answer')?.classList.toggle('open', !open);
    }));
    doc.querySelectorAll('[data-sb-block]').forEach(w => {
      const index = Number(w.dataset.sbBlock);
      const content = w.querySelector('.sb-block-content[contenteditable="true"]');
      if (content) {
        content.addEventListener('focusin', () => selectBlock(index));
        content.addEventListener('input', markDirty);
        content.addEventListener('blur', () => { const b = activeBlocks[index]; if (b) b.html = clean(content.innerHTML); });
        content.addEventListener('keydown', event => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            const selection = frame.contentWindow.getSelection(); const text = selection?.toString().trim();
            if (!text) { status('Select the text you want to link first.', true); return; }
            const href = prompt('Link destination (https://, mailto:, tel:, or #/page)'); if (!href) return;
            const range = selection.getRangeAt(0), a = doc.createElement('a');
            a.setAttribute('href', href); a.textContent = text; range.deleteContents(); range.insertNode(a);
            range.setStartAfter(a); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
            if (activeBlocks[index]) activeBlocks[index].html = clean(content.innerHTML); markDirty();
          }
        });
      }
      const heading = w.querySelector('.sb-home-content .section-title');
      if (heading) {
        heading.setAttribute('contenteditable', 'true');
        heading.addEventListener('focusin', () => selectBlock(index));
        heading.addEventListener('input', markDirty);
        heading.addEventListener('blur', () => syncHomeHeading(index, heading));
      }
    });
    doc.querySelectorAll('.sb-block-tools .sb-drag-handle').forEach(handle => {
      const wrapper = handle.closest('[data-sb-block]'); const index = Number(wrapper.dataset.sbBlock);
      handle.addEventListener('dragstart', event => {
        event.stopPropagation(); dragBlock = index; wrapper.classList.add('is-dragging');
        if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); }
      });
      handle.addEventListener('dragend', () => { wrapper.classList.remove('is-dragging'); setTimeout(() => { dragBlock = null; }, 0); });
      handle.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); });
    });
    doc.querySelectorAll('[data-sb-block]').forEach(w => {
      w.addEventListener('dragover', event => { if (dragBlock === null) return; event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'; w.classList.add('is-drop-target'); });
      w.addEventListener('dragleave', () => w.classList.remove('is-drop-target'));
      w.addEventListener('drop', event => {
        if (dragBlock === null) return;
        event.preventDefault(); event.stopPropagation();
        const from = dragBlock, to = Number(w.dataset.sbBlock); dragBlock = null;
        doc.querySelectorAll('.is-drop-target,.is-dragging').forEach(n => n.classList.remove('is-drop-target', 'is-dragging'));
        moveBlockTo(from, to);
      });
    });
    doc.querySelectorAll('.sb-card-handle').forEach(handle => {
      const card = handle.closest('[data-sb-card]'); const index = Number(card.dataset.cardIndex);
      handle.addEventListener('dragstart', event => {
        event.stopPropagation(); dragCard = index; card.classList.add('is-card-dragging');
        if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); }
      });
      handle.addEventListener('dragend', () => { card.classList.remove('is-card-dragging'); setTimeout(() => { dragCard = null; }, 0); });
      handle.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); });
    });
    doc.querySelectorAll('[data-sb-card]').forEach(card => {
      card.addEventListener('dragover', event => { if (dragCard === null) return; event.preventDefault(); event.stopPropagation(); card.classList.add('is-card-drop'); });
      card.addEventListener('dragleave', () => card.classList.remove('is-card-drop'));
      card.addEventListener('drop', event => {
        if (dragCard === null) return;
        event.preventDefault(); event.stopPropagation();
        const from = dragCard, to = Number(card.dataset.cardIndex); dragCard = null;
        doc.querySelectorAll('.is-card-drop,.is-card-dragging').forEach(n => n.classList.remove('is-card-drop', 'is-card-dragging'));
        reorderHomeCards(from, to);
      });
    });
  };

  const reorderHomeCards = async (from, to) => {
    if (from === to) return;
    const cards = homeCardPages(); if (!cards[from] || !cards[to]) return;
    const all = pages.filter(p => !p.parent_slug && !p.is_home).sort(order);
    const cardSlugs = new Set(cards.map(p => p.slug));
    const slots = all.filter(p => cardSlugs.has(p.slug)).map(p => Number(p.page_order) || 0);
    const previous = cards.map(p => ({ page: p, order: p.page_order }));
    const reordered = [...cards]; const [moved] = reordered.splice(from, 1); reordered.splice(to, 0, moved);
    reordered.forEach((p, i) => { p.page_order = slots[i] ?? i; });
    renderTree(); refreshPreview();
    const results = await Promise.all(reordered.map(p => sb.from('aa_site_pages').update({ page_order: p.page_order, updated_by: actor.id }).eq('slug', p.slug)));
    const error = results.find(r => r.error)?.error;
    if (error) { previous.forEach(({ page, order }) => { page.page_order = order; }); renderTree(); refreshPreview(); status(error.message || 'Could not save card order.', true); return; }
    status('Home card order saved.');
  };

  const field = (label, key, value, type = 'text', wide = false, attrs = '') => `<div class="builder-field${wide ? ' wide' : ''}"><label for="sb_${key}">${esc(label)}</label><input id="sb_${key}" data-block-field="${key}" type="${type}" value="${esc(value ?? '')}" ${attrs}></div>`;
  const area = (label, key, value, rows = 3) => `<div class="builder-field wide"><label for="sb_${key}">${esc(label)}</label><textarea id="sb_${key}" data-block-field="${key}" rows="${rows}">${esc(value ?? '')}</textarea></div>`;
  const select = (label, key, value, options) => `<div class="builder-field"><label for="sb_${key}">${esc(label)}</label><select id="sb_${key}" data-block-field="${key}">${options.map(([v, t]) => `<option value="${esc(v)}"${String(value) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
  const anchorData = block => {
    const doc = new DOMParser().parseFromString('<body>' + (block.html || '') + '</body>', 'text/html');
    return [...doc.querySelectorAll('a')];
  };
  const anchorEditor = block => {
    const anchors = anchorData(block);
    if (!anchors.length) return '<p class="sb-muted">No links in this section yet. Select text in the preview and press Ctrl+K to add one.</p>';
    return `<div class="sb-section"><h4>Links in this section</h4><div class="sb-repeater">${anchors.map((a, i) => `
      <div class="sb-repeater-row" data-anchor-index="${i}"><div class="builder-field"><label>Link text</label><input data-anchor-field="label" value="${esc(a.textContent.trim())}"></div><div class="builder-field"><label>Destination</label><input data-anchor-field="href" value="${esc(a.getAttribute('href') || '')}"></div></div>`).join('')}</div></div>`;
  };
  const itemEditor = block => {
    const items = Array.isArray(block.items) ? block.items : [];
    const isFaq = block.type === 'faq';
    const rows = items.map((item, i) => `<div class="sb-repeater-card" data-item-index="${i}">
      <div class="sb-repeater-card-head"><strong>${isFaq ? 'Question' : 'Item'} ${i + 1}</strong><button type="button" data-remove-item="${i}" aria-label="Remove item">×</button></div>
      <div class="sb-form-grid">
        <div class="builder-field wide"><label>${isFaq ? 'Question' : 'Title'}</label><input data-item-field="${isFaq ? 'question' : 'title'}" value="${esc(isFaq ? item.question || '' : item.title || '')}"></div>
        ${isFaq ? '' : '<div class="builder-field"><label>Link or URL</label><input data-item-field="url" value="' + esc(item.url || '') + '"></div>'}
        <div class="builder-field wide"><label>${isFaq ? 'Answer' : 'Description'}</label><textarea data-item-field="${isFaq ? 'answer' : 'description'}" rows="2">${esc(isFaq ? item.answer || '' : item.description || '')}</textarea></div>
        ${isFaq ? '' : '<div class="builder-field"><label>Category</label><input data-item-field="category" value="' + esc(item.category || block.category || 'General') + '"></div>'}
      </div></div>`).join('');
    return `<div class="sb-section"><h4>${isFaq ? 'Questions' : 'Items'}</h4><div class="sb-repeater">${rows || '<p class="sb-muted">No items yet.</p>'}</div><button type="button" data-add-item>Add ${isFaq ? 'question' : 'item'}</button></div>`;
  };

  const renderBlockInspector = index => {
    const block = activeBlocks[index], box = $('sbInspector'); if (!block) { selectedBlock = -1; renderInspector(); return; }
    let body = '';
    if (block.type === 'heading') body = `<div class="sb-form-grid">${field('Heading text', 'text', block.text, 'text', true)}${field('Eyebrow', 'eyebrow', block.eyebrow)}${select('Level', 'level', block.level || 2, [[2, 'Section heading'], [3, 'Subheading']])}</div>`;
    else if (block.type === 'callout') body = `<div class="sb-form-grid">${field('Title', 'title', block.title, 'text', true)}${area('Text', 'text', block.text, 3)}${select('Style', 'tone', block.tone || 'info', [['info', 'Information'], ['warning', 'Warning'], ['success', 'Success']])}${field('Link', 'link', block.link, 'url')}${field('Link label', 'link_label', block.link_label)}</div>`;
    else if (block.type === 'image') body = `<div class="sb-form-grid">${field('Image URL', 'url', block.url, 'url', true)}${field('Alternative text', 'alt', block.alt)}${field('Caption', 'caption', block.caption)}${field('Optional link', 'link', block.link, 'url')}</div>`;
    else if (block.type === 'embed') body = `<div class="sb-form-grid">${field('Embed URL', 'url', block.url, 'url', true)}${field('Accessible title', 'title', block.title)}${field('Height in pixels', 'height', block.height || 480, 'number')}${field('Caption', 'caption', block.caption)}</div>`;
    else if (['links', 'cards', 'faq'].includes(block.type)) body = `<div class="sb-form-grid">${field('Block heading', 'title', block.title, 'text', true)}${block.type === 'faq' ? '' : field('Category', 'category', block.category)}</div>${itemEditor(block)}`;
    else body = `<p class="sb-tip">Click directly in the preview to edit this text. Select text and press Ctrl+K to add a link.</p>${block.type === 'legacy_html' && currentPage()?.is_home ? '<p class="sb-tip">The home cards below are generated from top-level pages. Drag a card to reorder it, or click one to edit that page.</p>' : anchorEditor(block)}`;
    box.innerHTML = `<div class="sb-inspector-head"><div><p class="builder-kicker">Section ${index + 1}</p><h3>${esc(blockName(block.type))}</h3></div><div class="sb-inspector-actions"><button type="button" data-block-action="page" title="Page settings">Page</button><button type="button" data-block-action="up" title="Move up"${index === 0 ? ' disabled' : ''}>↑</button><button type="button" data-block-action="down" title="Move down"${index === activeBlocks.length - 1 ? ' disabled' : ''}>↓</button><button type="button" data-block-action="duplicate" title="Duplicate">⧉</button><button type="button" class="danger" data-block-action="delete" title="Remove">×</button></div></div><div class="sb-inspector-body">${body}</div>`;
    box.querySelectorAll('[data-block-field]').forEach(el => {
      const key = el.dataset.blockField;
      const apply = () => { block[key] = el.type === 'checkbox' ? el.checked : el.value; markDirty(); };
      el.addEventListener('input', apply);
      el.addEventListener('change', () => { syncInlineEdits(); apply(); if (block.type === 'embed') block.height = Math.max(160, Math.min(1600, Number(block.height) || 480)); if (block.type === 'heading') block.level = Number(block.level) === 3 ? 3 : 2; markDirty(); renderPreview(); });
    });
    box.querySelectorAll('[data-anchor-field]').forEach(el => {
      el.addEventListener('change', () => {
        syncInlineEdits();
        const row = el.closest('[data-anchor-index]'), i = Number(row.dataset.anchorIndex);
        const doc = new DOMParser().parseFromString('<body>' + (block.html || '') + '</body>', 'text/html');
        const anchor = [...doc.querySelectorAll('a')][i]; if (!anchor) return;
        if (el.dataset.anchorField === 'label') anchor.textContent = el.value;
        else { const safe = cleanUrl(el.value); if (safe) anchor.setAttribute('href', safe); else anchor.removeAttribute('href'); }
        block.html = clean(doc.body.innerHTML); markDirty(); renderPreview();
      });
    });
    box.querySelectorAll('[data-item-field]').forEach(el => {
      const row = el.closest('[data-item-index]'), i = Number(row.dataset.itemIndex), key = el.dataset.itemField;
      const apply = () => { if (!Array.isArray(block.items)) block.items = []; block.items[i] = block.items[i] || {}; block.items[i][key] = el.value; };
      el.addEventListener('input', () => { apply(); markDirty(); });
      el.addEventListener('change', () => { syncInlineEdits(); apply(); markDirty(); renderPreview(); });
    });
    box.querySelectorAll('[data-add-item]').forEach(b => b.onclick = () => {
      syncInlineEdits(); if (!Array.isArray(block.items)) block.items = [];
      block.items.push(block.type === 'faq' ? { question: '', answer: '' } : { title: '', url: '', description: '', category: block.category || 'General' });
      markDirty(); renderPreview(); renderInspector();
    });
    box.querySelectorAll('[data-remove-item]').forEach(b => b.onclick = () => {
      syncInlineEdits(); block.items.splice(Number(b.dataset.removeItem), 1); markDirty(); renderPreview(); renderInspector();
    });
    box.querySelectorAll('[data-block-action]').forEach(b => b.onclick = () => {
      const action = b.dataset.blockAction;
      if (action === 'page') selectBlock(-1); else if (action === 'up') moveBlock(index, -1); else if (action === 'down') moveBlock(index, 1); else if (action === 'duplicate') duplicateBlock(index); else if (action === 'delete') removeBlock(index);
    });
  };

  const homeLinkRows = page => {
    const links = Array.isArray(page.home_links) ? page.home_links : [];
    return `${links.map((item, i) => `<div class="sb-repeater-row" data-home-link="${i}"><div class="builder-field"><label>Label</label><input data-home-field="label" value="${esc(item.label || '')}"></div><div class="builder-field"><label>Link</label><input data-home-field="url" value="${esc(item.url || '')}"></div><button type="button" class="sb-remove" data-remove-home="${i}" aria-label="Remove link">×</button></div>`).join('') || '<p class="sb-muted">No quick links yet.</p>'}`;
  };
  const renderPageInspector = () => {
    const page = currentPage(), box = $('sbInspector'); if (!page) { box.innerHTML = '<div class="sb-empty">Choose a page in the tree to edit it.</div>'; return; }
    const slug = editingNew ? (page._draftSlug || page.slug) : page.slug;
    const parentOptions = '<option value="">Top level</option>' + pages.filter(p => !p.is_home && !p.parent_slug && p !== page).sort(order).map(p => `<option value="${esc(p.slug)}"${(page.parent_slug || '') === p.slug ? ' selected' : ''}>${esc(p.title)}</option>`).join('');
    box.innerHTML = `<div class="sb-inspector-head"><div><p class="builder-kicker">${editingNew ? 'New page' : 'Page settings'}</p><h3>${esc(page.title || 'Untitled page')}</h3></div><div class="sb-inspector-actions"><button type="button" data-page-action="site" title="Site settings">⚙</button></div></div><div class="sb-inspector-body">
      <p class="sb-muted">These settings control the page, its navigation label, and its home card.</p>
      <div class="sb-form-grid">
        <div class="builder-field wide"><label for="pTitle">Page title</label><input id="pTitle" value="${esc(page.title || '')}"></div>
        <div class="builder-field wide"><label for="pSlug">Page address (slug)</label><input id="pSlug" value="${esc(slug)}" ${editingNew ? '' : 'disabled'}></div>
        <div class="builder-field"><label for="pParent">Inside section</label><select id="pParent" ${page.is_home ? 'disabled' : ''}>${parentOptions}</select></div>
        <div class="builder-field"><label for="pOrder">Order</label><input id="pOrder" type="number" value="${Number(page.page_order) || 0}"></div>
        <div class="builder-field"><label for="pNav">Navigation label</label><input id="pNav" value="${esc(page.nav_label || '')}"></div>
        <div class="builder-field"><label for="pCategory">Category label</label><input id="pCategory" value="${esc(page.category || '')}"></div>
        <div class="builder-field wide"><label for="pSummary">Short description</label><textarea id="pSummary" rows="3">${esc(page.summary || '')}</textarea></div>
        <div class="builder-field"><label for="pIcon">Card icon</label><input id="pIcon" value="${esc(page.icon || '')}"></div>
        <div class="builder-field"><label for="pAccent">Card accent class</label><input id="pAccent" value="${esc(page.accent || 'navy')}"></div>
        <div class="builder-field"><label for="pPanel">Card panel color</label><input id="pPanel" type="color" value="${/^#[0-9a-f]{6}$/i.test(page.panel_color || '') ? page.panel_color : '#ffffff'}"></div>
        <div class="builder-field"><label for="pLayout">Page layout</label><select id="pLayout">${[['standard', 'Standard'], ['landing', 'Landing page'], ['article', 'Article'], ['directory', 'Directory']].map(([v, t]) => `<option value="${v}"${(page.content_type || 'standard') === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="sb-checks"><label><input id="pShowNav" type="checkbox"${page.show_in_nav ? ' checked' : ''}> Show in top navigation</label>${page.is_home ? '' : `<label><input id="pShowCard" type="checkbox"${page.show_home_card ? ' checked' : ''}> Show as a home page card</label>`}<label><input id="pPublished" type="checkbox"${page.published ? ' checked' : ''}> Published on the public site</label></div>
      ${page.is_home ? '<p class="sb-tip">Home cards are generated from top-level pages. Drag a card in the preview to reorder it, or click a card to edit that page.</p>' : `<div class="sb-section"><h4>Home card links</h4><p class="sb-muted">These are the quick links under this page’s card on the home page.</p><div class="sb-repeater" id="pHomeLinks">${homeLinkRows(page)}</div><button type="button" id="pAddHomeLink">Add link</button></div>`}
      <div class="sb-actions"><button type="button" id="pSaveDraft">Save draft</button><button type="button" id="pPublish" class="primary">Publish</button></div>
      ${page.is_home ? '' : `<div class="sb-danger"><button type="button" id="pDelete" class="sb-button danger">${editingNew ? 'Discard new page' : 'Delete page'}</button></div>`}
    </div>`;
    const bindPage = (id, apply, opts = {}) => {
      const el = $(id); if (!el) return;
      const run = () => { apply(el.type === 'checkbox' ? el.checked : el.value); markDirty(); };
      el.addEventListener('input', run);
      el.addEventListener('change', () => { run(); if (opts.tree) renderTree(); if (opts.preview) refreshPreview(); });
    };
    bindPage('pTitle', value => { page.title = value; box.querySelector('.sb-inspector-head h3').textContent = value || 'Untitled page'; updatePageHead(); }, { tree: true, preview: true });
    const slugEl = $('pSlug'); if (slugEl) slugEl.addEventListener('input', () => { page._draftSlug = slugEl.value.trim().toLowerCase(); markDirty(); updatePageHead(); });
    bindPage('pParent', value => { page.parent_slug = value || null; }, { tree: true, preview: true });
    bindPage('pOrder', value => { page.page_order = Math.max(0, Number(value) || 0); }, { tree: true });
    bindPage('pNav', value => { page.nav_label = value; }, { tree: true, preview: true });
    bindPage('pCategory', value => { page.category = value; });
    bindPage('pSummary', value => { page.summary = value; }, { preview: true });
    bindPage('pIcon', value => { page.icon = value; });
    bindPage('pAccent', value => { page.accent = value; });
    bindPage('pPanel', value => { page.panel_color = value; });
    bindPage('pLayout', value => { page.content_type = value; });
    bindPage('pShowNav', value => { page.show_in_nav = value; }, { preview: true });
    bindPage('pShowCard', value => { page.show_home_card = value; });
    bindPage('pPublished', value => { page.published = value; updatePageHead(); });
    box.querySelectorAll('[data-home-field]').forEach(el => {
      const row = el.closest('[data-home-link]'), i = Number(row.dataset.homeLink), key = el.dataset.homeField;
      el.addEventListener('input', () => { if (!Array.isArray(page.home_links)) page.home_links = []; page.home_links[i] = page.home_links[i] || {}; page.home_links[i][key] = el.value; markDirty(); });
    });
    $('pAddHomeLink')?.addEventListener('click', () => { if (!Array.isArray(page.home_links)) page.home_links = []; page.home_links.push({ label: '', url: '' }); markDirty(); renderInspector(); });
    box.querySelectorAll('[data-remove-home]').forEach(b => b.onclick = () => { page.home_links.splice(Number(b.dataset.removeHome), 1); markDirty(); renderInspector(); });
    $('pSaveDraft')?.addEventListener('click', () => savePage(false));
    $('pPublish')?.addEventListener('click', () => savePage(true));
    $('pDelete')?.addEventListener('click', deleteActivePage);
    box.querySelector('[data-page-action="site"]')?.addEventListener('click', editSettings);
  };

  const renderSettingsInspector = () => {
    const s = settings, box = $('sbInspector'); const theme = Object.assign(defaultSettings().theme, s.theme || {}); const scrollbar = scrollbarColorsFor(theme), scrollbarPreset = scrollbarPresetFor(theme);
    if (!Array.isArray(s.footer_links)) s.footer_links = [];
    box.innerHTML = `<div class="sb-inspector-head"><div><p class="builder-kicker">Site-wide</p><h3>Branding, hero, and footer</h3></div><div class="sb-inspector-actions"><button type="button" data-page-action="back" title="Back to page">←</button></div></div><div class="sb-inspector-body sb-settings">
      <p class="sb-muted">These values update the header, hero, and footer of the public site.</p>
      <div class="sb-form-grid">
        <div class="builder-field wide"><label for="sOrg">Organization name</label><input id="sOrg" value="${esc(s.organization_name || '')}"></div>
        <div class="builder-field"><label for="sName">Site name</label><input id="sName" value="${esc(s.site_name || '')}"></div>
        <div class="builder-field"><label for="sEyebrow">Hero eyebrow</label><input id="sEyebrow" value="${esc(s.hero_eyebrow || '')}"></div>
        <div class="builder-field wide"><label for="sTitle">Hero title</label><input id="sTitle" value="${esc(s.hero_title || '')}"></div>
        <div class="builder-field wide"><label for="sDescription">Hero description</label><textarea id="sDescription" rows="3">${esc(s.hero_description || '')}</textarea></div>
        <div class="builder-field wide"><label>Banner design</label><div class="sb-banner-picker" role="radiogroup" aria-label="Banner design">${bannerVariants.map(v => { const selected = normalizeBannerVariant(theme.banner_variant) === v.value; return `<label class="sb-banner-option"><input type="radio" name="sBannerVariant" value="${v.value}"${selected ? ' checked' : ''}><span class="sb-banner-thumb sb-banner-thumb-${v.value}"${bannerThumbStyle(v.value)}>${bannerThumb(v.value)}</span><span class="sb-banner-option-copy"><strong>${v.label}</strong><small>${v.note}</small></span></label>`; }).join('')}</div><p class="sb-muted">Preview updates immediately. Save site settings to publish the selected banner.</p></div>
        <div class="builder-field wide"><label for="sHeroImage">Hero background image URL</label><input id="sHeroImage" type="url" value="${esc(s.hero_image_url || '')}"></div>
        <div class="builder-field wide"><label for="sLogo">Logo image URL</label><input id="sLogo" type="url" value="${esc(s.logo_url || '')}"></div>
        <div class="builder-field"><label for="sNavy">Primary navy</label><input id="sNavy" type="color" value="${esc(theme.navy)}"></div>
        <div class="builder-field"><label for="sBlue">Primary blue</label><input id="sBlue" type="color" value="${esc(theme.blue)}"></div>
        <div class="builder-field"><label for="sGold">Gold accent</label><input id="sGold" type="color" value="${esc(theme.gold)}"></div>
        <div class="builder-field"><label for="sGray">Gray accent</label><input id="sGray" type="color" value="${esc(theme.gray)}"></div>
        <div class="builder-field"><label for="sPage">Page background</label><input id="sPage" type="color" value="${esc(theme.page)}"></div>
        <div class="builder-field"><label for="sPanel">Card panel background</label><input id="sPanel" type="color" value="${esc(theme.panel)}"></div>
        <div class="builder-field"><label for="sFooterName">Footer name</label><input id="sFooterName" value="${esc(s.footer_name || '')}"></div>
        <div class="builder-field"><label for="sFooterLabel">Footer label</label><input id="sFooterLabel" value="${esc(s.footer_label || '')}"></div>
      </div>
      <div class="sb-section"><h4>Page scrollbar</h4><p class="sb-muted">Choose a preset or set each color independently. These values apply to the public site.</p><div class="sb-form-grid">
        <div class="builder-field wide"><label for="sScrollbarPreset">Color combination</label><select id="sScrollbarPreset">${scrollbarPresets.map(p => `<option value="${p.value}"${scrollbarPreset === p.value ? ' selected' : ''}>${p.label}</option>`).join('')}<option value="custom"${scrollbarPreset === 'custom' ? ' selected' : ''}>Custom colors</option></select></div>
        <div class="builder-field"><label for="sScrollbarTrack">Track color</label><input id="sScrollbarTrack" type="color" value="${scrollbar.track}"></div>
        <div class="builder-field"><label for="sScrollbarThumb">Thumb color</label><input id="sScrollbarThumb" type="color" value="${scrollbar.thumb}"></div>
        <div class="builder-field"><label for="sScrollbarHover">Thumb on hover</label><input id="sScrollbarHover" type="color" value="${scrollbar.hover}"></div>
      </div></div>
      <div class="sb-section"><h4>Footer links</h4><div class="sb-repeater" id="sFooterLinks">${s.footer_links.map((item, i) => `<div class="sb-repeater-row" data-footer-link="${i}"><div class="builder-field"><label>Label</label><input data-footer-field="label" value="${esc(item.label || '')}"></div><div class="builder-field"><label>Link</label><input data-footer-field="url" value="${esc(item.url || '')}"></div><button type="button" class="sb-remove" data-remove-footer="${i}" aria-label="Remove link">×</button></div>`).join('') || '<p class="sb-muted">No footer links yet.</p>'}</div><button type="button" id="sAddFooter">Add link</button></div>
      <div class="sb-actions"><button type="button" id="sSave" class="primary">Save site settings</button></div>
    </div>`;
    const bindSetting = (id, apply, preview = true) => {
      const el = $(id); if (!el) return;
      const run = () => apply(el.value);
      el.addEventListener('input', run);
      el.addEventListener('change', () => { run(); if (preview) refreshPreview(); });
    };
    bindSetting('sOrg', v => { s.organization_name = v; });
    bindSetting('sName', v => { s.site_name = v; });
    bindSetting('sEyebrow', v => { s.hero_eyebrow = v; });
    bindSetting('sTitle', v => { s.hero_title = v; });
    bindSetting('sDescription', v => { s.hero_description = v; });
    bindSetting('sHeroImage', v => { s.hero_image_url = v; });
    bindSetting('sLogo', v => { s.logo_url = v; });
    bindSetting('sFooterName', v => { s.footer_name = v; });
    bindSetting('sFooterLabel', v => { s.footer_label = v; });
    $('sScrollbarPreset')?.addEventListener('change', event => {
      const colors = scrollbarPresetColors(event.target.value, Object.assign(defaultSettings().theme, s.theme || {}));
      if (!colors) return;
      s.theme = Object.assign(defaultSettings().theme, s.theme || {});
      s.theme.scrollbar_track = colors.track; s.theme.scrollbar_thumb = colors.thumb; s.theme.scrollbar_thumb_hover = colors.hover;
      [['sScrollbarTrack', colors.track], ['sScrollbarThumb', colors.thumb], ['sScrollbarHover', colors.hover]].forEach(([id, value]) => { const el = $(id); if (el) el.value = value; });
      markDirty(); refreshPreview();
    });
    [['sScrollbarTrack', 'scrollbar_track'], ['sScrollbarThumb', 'scrollbar_thumb'], ['sScrollbarHover', 'scrollbar_thumb_hover']].forEach(([id, key]) => {
      const el = $(id); if (!el) return;
      const apply = () => {
        s.theme = Object.assign(defaultSettings().theme, s.theme || {});
        s.theme[key] = el.value;
        const select = $('sScrollbarPreset'); if (select) select.value = scrollbarPresetFor(Object.assign(defaultSettings().theme, s.theme || {}));
        markDirty();
      };
      el.addEventListener('input', apply);
      el.addEventListener('change', () => { apply(); refreshPreview(); });
    });
    ['navy', 'blue', 'gold', 'gray', 'page', 'panel'].forEach(key => {
      const id = 's' + key[0].toUpperCase() + key.slice(1);
      bindSetting(id, v => { s.theme = Object.assign(defaultSettings().theme, s.theme || {}); s.theme[key] = v; });
    });
    box.querySelectorAll('input[name="sBannerVariant"]').forEach(input => input.addEventListener('change', () => {
      if (!input.checked) return;
      s.theme = Object.assign(defaultSettings().theme, s.theme || {});
      s.theme.banner_variant = normalizeBannerVariant(input.value);
      markDirty();
      refreshPreview();
    }));
    box.querySelectorAll('[data-footer-field]').forEach(el => {
      const row = el.closest('[data-footer-link]'), i = Number(row.dataset.footerLink), key = el.dataset.footerField;
      el.addEventListener('input', () => { s.footer_links[i] = s.footer_links[i] || {}; s.footer_links[i][key] = el.value; });
      el.addEventListener('change', () => { s.footer_links[i] = s.footer_links[i] || {}; s.footer_links[i][key] = el.value; refreshPreview(); });
    });
    $('sAddFooter')?.addEventListener('click', () => { s.footer_links.push({ label: '', url: '' }); renderInspector(); });
    box.querySelectorAll('[data-remove-footer]').forEach(b => b.onclick = () => { s.footer_links.splice(Number(b.dataset.removeFooter), 1); renderInspector(); });
    $('sSave')?.addEventListener('click', saveSettings);
    box.querySelector('[data-page-action="back"]')?.addEventListener('click', () => { settingsMode = false; renderInspector(); updatePageHead(); });
  };

  const renderInspector = () => {
    if (settingsMode) return renderSettingsInspector();
    if (!currentPage()) { $('sbInspector').innerHTML = '<div class="sb-empty">Choose a page in the tree to edit it.</div>'; return; }
    if (selectedBlock >= 0 && activeBlocks[selectedBlock]) return renderBlockInspector(selectedBlock);
    renderPageInspector();
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const nowIso = () => new Date().toISOString();
  const formatWhen = value => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown time';
  const pageRowFrom = (source, slug, publish) => ({
    slug, parent_slug: source.is_home ? null : (source.parent_slug || null), page_order: Math.max(0, Number(source.page_order) || 0),
    title: (source.title || '').trim() || slug, nav_label: (source.nav_label || '').trim() || (source.title || '').trim() || slug,
    summary: (source.summary || '').trim(), category: (source.category || '').trim(), icon: (source.icon || '').trim(),
    accent: String(source.accent || 'navy').replace(/[^a-z0-9_-]/gi, '') || 'navy',
    panel_color: /^#[0-9a-f]{6}$/i.test(source.panel_color || '') ? source.panel_color : '',
    home_links: (source.home_links || []).map(x => ({ label: String(x.label || '').trim(), url: cleanUrl(x.url) || '' })).filter(x => x.label && x.url),
    content_type: source.content_type || 'standard', blocks: Array.isArray(source.blocks) ? source.blocks : [],
    is_home: !!source.is_home || slug === 'home', show_in_nav: !!source.show_in_nav, show_home_card: !!source.show_home_card,
    published: publish === undefined ? !!source.published : publish ? true : !!source.published,
    updated_by: actor.id, updated_at: nowIso()
  });
  const settingsRowFrom = source => {
    const s = source || {}; const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
    const theme = Object.assign(defaultSettings().theme, s.theme || {});
    return {
      singleton: true, organization_name: (s.organization_name || '').trim(), site_name: (s.site_name || '').trim(), hero_eyebrow: (s.hero_eyebrow || '').trim(), hero_title: (s.hero_title || '').trim(), hero_description: (s.hero_description || '').trim(),
      hero_image_url: cleanUrl(s.hero_image_url) || '', logo_url: cleanUrl(s.logo_url) || '',
      theme: { navy: color(theme.navy, '#0a2240'), blue: color(theme.blue, '#00a0df'), gold: color(theme.gold, '#c6b784'), gray: color(theme.gray, '#b1b1b1'), page: color(theme.page, '#f5f6f7'), panel: color(theme.panel, '#ffffff'), banner_variant: normalizeBannerVariant(theme.banner_variant), scrollbar_track: color(theme.scrollbar_track, '#0a2240'), scrollbar_thumb: color(theme.scrollbar_thumb, '#c6b784'), scrollbar_thumb_hover: color(theme.scrollbar_thumb_hover, '#d8c993') },
      footer_name: (s.footer_name || '').trim(), footer_label: (s.footer_label || '').trim(),
      footer_links: (s.footer_links || []).map(x => ({ label: String(x.label || '').trim(), url: cleanUrl(x.url) || '' })).filter(x => x.label && x.url), updated_by: actor.id, updated_at: nowIso()
    };
  };
  const recordRevision = async (entityType, entityId, action, before, after) => {
    try {
      const { error } = await sb.from('aa_site_revisions').insert({ entity_type: entityType, entity_id: entityId, action, previous_snapshot: before ? clone(before) : null, snapshot: clone(after) });
      if (error) throw error;
      return true;
    } catch (error) { console.warn('Site revision was not recorded', error); return false; }
  };
  const closeSidePanel = () => { $('sbSidePanel')?.classList.add('hidden'); };
  const openSidePanel = (title, html) => {
    const panel = $('sbSidePanel'); if (!panel) return;
    $('sbSideTitle').textContent = title; $('sbSideBody').innerHTML = html;
    panel.classList.remove('hidden');
  };
  const historyScope = () => settingsMode ? { type: 'settings', id: 'singleton', label: 'Site settings' } : currentPage() ? { type: 'page', id: activeSlug, label: currentPage().title || activeSlug } : null;
  const historyActionLabel = action => ({ baseline: 'Baseline', create: 'Created', draft: 'Saved draft', publish: 'Published', settings: 'Saved settings', delete: 'Deleted', reorder: 'Reordered', restore: 'Restored version', undo: 'Undid change' }[action] || action);
  const renderHistory = () => {
    const target = historyTarget, body = $('sbSideBody'); if (!target || !body) return;
    if (!historyRows.length) { body.innerHTML = '<p class="sb-muted">No saved versions yet. This page may predate history; save it once to start tracking.</p>'; return; }
    const own = historyRows.find(row => row.actor_user_id === actor.id && row.previous_snapshot);
    body.innerHTML = '<div class="sb-history-tools"><button type="button" data-history-action="undo"' + (own ? '' : ' disabled') + '>Undo my last change</button><p class="sb-muted">Restore is admin-only. Undo returns to the snapshot immediately before your latest save.</p></div>' + '<div class="sb-history-list">' + historyRows.map(row => {
      const title = row.snapshot?.title || row.snapshot?.site_name || row.entity_id;
      const who = row.actor_email || 'System';
      return '<article class="sb-history-item"><div><strong>' + esc(historyActionLabel(row.action)) + ' · ' + esc(who) + '</strong><time>' + esc(formatWhen(row.created_at)) + '</time><p>' + esc(title) + '</p></div><button type="button" data-history-restore="' + row.id + '">Restore</button></article>';
    }).join('') + '</div>';
    body.querySelector('[data-history-action="undo"]')?.addEventListener('click', () => { const row = historyRows.find(item => item.actor_user_id === actor.id && item.previous_snapshot); if (!row) return status('No earlier version of your changes is available.', true); restoreRevision({ snapshot: row.previous_snapshot, action: 'undo' }); });
    body.querySelectorAll('[data-history-restore]').forEach(button => button.addEventListener('click', () => { const row = historyRows.find(item => String(item.id) === button.dataset.historyRestore); if (row) restoreRevision(row); }));
  };
  const openHistory = async () => {
    const target = historyScope(); if (!target) return status('Choose a page before opening history.', true);
    historyTarget = target; openSidePanel('History · ' + target.label, '<p class="sb-muted">Loading saved versions…</p>');
    try {
      const { data, error } = await sb.from('aa_site_revisions').select('id,entity_type,entity_id,action,previous_snapshot,snapshot,actor_user_id,actor_email,created_at').eq('entity_type', target.type).eq('entity_id', target.id).order('created_at', { ascending: false }).limit(40);
      if (error) throw error; historyRows = data || []; renderHistory();
    } catch (error) {
      console.warn('Revision history is unavailable', error);
      openSidePanel('History', '<p class="sb-muted">History is not available yet. Apply the latest Supabase migration, then reload this page.</p>');
    }
  };
  const restoreRevision = async row => {
    const target = historyScope(); if (!target || !row?.snapshot) return;
    if (!confirm('Restore this saved version? The current version stays in History.')) return;
    try {
      if (target.type === 'page') {
        const { data: before, error } = await sb.from('aa_site_pages').select('*').eq('slug', target.id).maybeSingle(); if (error) throw error; if (!before) throw new Error('That page no longer exists.');
        const { data: after, error: restoreError } = await sb.from('aa_site_pages').update(pageRowFrom(row.snapshot, target.id)).eq('slug', target.id).eq('updated_at', before.updated_at).select('*').maybeSingle(); if (restoreError) throw restoreError; if (!after) throw new Error('This page changed in another session. Reload and try again.');
        await recordRevision('page', target.id, row.action === 'undo' ? 'undo' : 'restore', before, after);
        await refreshData(false); status('Restored “' + (after.title || target.id) + '”.');
      } else {
        const { data: before, error } = await sb.from('aa_site_settings').select('*').eq('singleton', true).maybeSingle(); if (error) throw error; if (!before) throw new Error('Site settings were not found.');
        const restoreRow = settingsRowFrom(row.snapshot);
        const { data: after, error: restoreError } = await sb.from('aa_site_settings').update(restoreRow).eq('singleton', true).eq('updated_at', before.updated_at).select('*').maybeSingle(); if (restoreError) throw restoreError; if (!after) throw new Error('Site settings changed in another session. Reload and try again.');
        await recordRevision('settings', 'singleton', row.action === 'undo' ? 'undo' : 'restore', before, after);
        settings = { ...settings, ...after }; refreshPreview(); renderInspector(); updatePageHead(); status('Restored site settings.');
      }
      if (historyTarget) await openHistory();
    } catch (error) { status(error.message || 'Could not restore that version.', true); }
  };
  const openTemplatePanel = () => {
    const siteUrl = 'https://academicaffairs.libsite.com/';
    openSidePanel('Template & embed', '<p class="sb-muted">This site is a reusable static template. The front end can be deployed with one click; the editor needs its own Supabase project and migrations.</p>' +
      '<div class="sb-template-links"><a href="https://github.com/YCCCVRLab/yccc-academic-affairs/generate" target="_blank" rel="noopener">Use this GitHub template</a><a href="https://app.netlify.com/start/deploy?repository=https://github.com/YCCCVRLab/yccc-academic-affairs" target="_blank" rel="noopener">Deploy front end to Netlify</a><a href="https://vercel.com/new/clone?repository-url=https://github.com/YCCCVRLab/yccc-academic-affairs" target="_blank" rel="noopener">Deploy front end to Vercel</a><a href="https://github.com/YCCCVRLab/yccc-academic-affairs/blob/main/TEMPLATE.md" target="_blank" rel="noopener">Setup guide</a></div>' +
      '<div class="sb-section"><h4>Export content</h4><p class="sb-muted">Download pages and settings as JSON for another deployment. Drafts are included, so do not publish this file.</p><button type="button" id="sbDownloadTemplate">Download site-template.json</button></div>' +
      '<div class="sb-section"><h4>Embed the public site</h4><p class="sb-muted">Paste this iframe into another site builder. The admin editor stays on its own origin for authentication.</p><textarea id="sbEmbedCode" class="sb-embed-code" readonly rows="4">&lt;iframe src="' + esc(siteUrl) + '" title="YCCC Academic Affairs" style="width:100%;height:900px;border:0" loading="lazy"&gt;&lt;/iframe&gt;</textarea><button type="button" id="sbCopyEmbed">Copy embed code</button></div>');
    $('sbDownloadTemplate')?.addEventListener('click', () => { const exportData = { schema: 'yccc-aa-template', version: 1, exported_at: nowIso(), settings, pages: pages.map(page => { const copy = clone(page); delete copy._draftSlug; return copy; }) }; const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'site-template.json'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); status('Template snapshot downloaded. Treat it as editorial data.'); });
    $('sbCopyEmbed')?.addEventListener('click', async () => { const code = $('sbEmbedCode')?.value || ''; try { await navigator.clipboard.writeText(code); status('Embed code copied.'); } catch { $('sbEmbedCode')?.select(); status('Select the embed code and copy it.', true); } });
  };
  const setLiveNotice = (message, canApply = false) => {
    const box = $('sbLiveNotice'); if (!box) return; box.hidden = !message; const text = box.querySelector('span'); if (text) text.textContent = message || ''; const button = $('sbApplyRemote'); if (button) button.hidden = !canApply;
  };
  const isPreviewEditing = () => { try { const active = frame?.contentDocument?.activeElement; return !!active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)); } catch { return false; } };
  const applyRemoteDraft = payload => {
    if (payload.settings_mode) { settings = clone(payload.settings_data); settingsMode = true; }
    else { activeBlocks = clone(payload.blocks || []); settingsMode = false; }
    dirty = true; localEditedSinceRemote = false; selectedBlock = -1; pendingDraft = null;
    renderPreview(); renderInspector(); updatePageHead(); setLiveNotice('Live edits applied from ' + (payload.email || 'another editor') + '. Save to share the combined version.');
  };
  const applyPendingDraft = () => { if (!pendingDraft) return; applyRemoteDraft(pendingDraft); };
  const setCollabState = message => { const el = $('sbCollabState'); if (el) { el.textContent = message; el.classList.toggle('is-offline', /unavailable|offline|connecting/i.test(message)); } };
  const renderPresence = () => {
    if (!collab) return;
    const states = Object.values(collab.presenceState() || {}).flat().filter(Boolean);
    const byUser = new Map(); states.forEach(state => { if (state.email) byUser.set(state.email, state); });
    const others = [...byUser.values()].filter(state => state.email !== actor.email);
    setCollabState(others.length ? 'Live · ' + others.length + ' other editor' + (others.length === 1 ? '' : 's') : 'Live · only you here');
    const el = $('sbCollabState'); if (el) el.title = byUser.size ? [...byUser.values()].map(state => state.email + ' · ' + (state.settings ? 'Site settings' : state.title || state.slug || 'a page')).join('\n') : 'No other editors connected';
  };
  trackPresence = () => { if (!collabReady || !collab) return; collab.track({ user_id: actor.id, email: actor.email, name: actor.email, slug: settingsMode ? 'settings' : activeSlug, title: settingsMode ? 'Site settings' : currentPage()?.title || activeSlug, settings: settingsMode }).catch(error => console.warn('Presence could not be updated', error)); };
  queueLiveDraft = () => {
    if (!collabReady) return; clearTimeout(collabTimer);
    collabTimer = setTimeout(() => { syncInlineEdits(); if (!collabReady) return; const payload = { client_id: collabKey, user_id: actor.id, email: actor.email, slug: settingsMode ? 'settings' : activeSlug, title: settingsMode ? 'Site settings' : currentPage()?.title || activeSlug, settings_mode: settingsMode, blocks: settingsMode ? undefined : activeBlocks, settings_data: settingsMode ? settings : undefined, at: Date.now() }; collab.send({ type: 'broadcast', event: 'draft', payload }).catch(error => console.warn('Live draft could not be broadcast', error)); }, 500);
  };
  const receiveDraft = payload => {
    if (!payload || payload.user_id === actor.id || payload.client_id === collabKey) return;
    const name = payload.email || 'Another editor';
    if (payload.settings_mode !== settingsMode || payload.slug !== (settingsMode ? 'settings' : activeSlug)) { setLiveNotice(name + ' is editing ' + (payload.title || 'another page') + '.'); return; }
    if (isPreviewEditing() || localEditedSinceRemote) { pendingDraft = payload; setLiveNotice(name + ' has live draft changes.', true); return; }
    applyRemoteDraft(payload);
  };
  const receiveSaved = async payload => {
    if (!payload || payload.user_id === actor.id) return;
    const name = payload.email || 'Another editor';
    if (payload.settings_mode === settingsMode && payload.slug === (settingsMode ? 'settings' : activeSlug) && !dirty && !editingNew) { await refreshData(false); status(name + ' saved this page. Loaded the saved version.'); return; }
    setLiveNotice(name + ' saved changes to ' + (payload.title || 'another page') + '.');
  };
  const sendSaved = payload => { if (!collabReady || !collab) return; collab.send({ type: 'broadcast', event: 'saved', payload: { ...payload, user_id: actor.id, email: actor.email, at: Date.now() } }).catch(error => console.warn('Saved notice could not be broadcast', error)); };
  const startCollab = () => {
    if (!sb || !actor || collab) return;
    collab = sb.channel(collabTopic, { config: { presence: { key: collabKey } } });
    collab.on('presence', { event: 'sync' }, renderPresence);
    collab.on('broadcast', { event: 'draft' }, event => receiveDraft(event.payload));
    collab.on('broadcast', { event: 'saved' }, event => receiveSaved(event.payload));
    collab.subscribe(async status => {
      if (status === 'SUBSCRIBED') { collabReady = true; await trackPresence(); renderPresence(); }
      else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) { collabReady = false; setCollabState('Live collaboration unavailable'); }
    });
    window.addEventListener('beforeunload', () => { try { collab?.untrack(); sb.removeChannel(collab); } catch {} });
  };
  const savePage = async publish => {
    const page = currentPage(); if (!page) return;
    try {
      syncInlineEdits();
      let slug = page.is_home ? 'home' : page.slug;
      if (editingNew) { const el = $('pSlug'); slug = (el ? el.value : page._draftSlug || page.slug).trim().toLowerCase(); }
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error('Use lowercase letters, numbers, and hyphens for the page address.');
      if (slug === 'home' && !page.is_home) throw new Error('The home address is reserved.');
      if (pages.some(p => p !== page && p.slug === slug)) throw new Error('That page address is already in use.');
      const parent = page.is_home ? null : (page.parent_slug || null);
      if (parent) { const parentPage = pages.find(p => p.slug === parent); if (!parentPage) throw new Error('Choose an existing section.'); if (parentPage.parent_slug) throw new Error('Choose a top-level section as the parent.'); if (parent === slug) throw new Error('A page cannot be inside itself.'); }
      const row = { ...pageRowFrom(page, slug, publish), blocks: clone(activeBlocks) };
      let before = null, after = null;
      if (editingNew) {
        const saved = await sb.from('aa_site_pages').insert(row).select('*').single(); if (saved.error) throw saved.error;
        after = saved.data;
        await recordRevision('page', slug, 'create', null, after);
        await sb.from('aa_audit_log').insert({ actor_user_id: actor.id, action: 'site_page_created', entity_type: 'site_page', entity_id: slug, details: { title: row.title, published: row.published } });
        activeSlug = slug; editingNew = false;
      } else {
        const current = await sb.from('aa_site_pages').select('*').eq('slug', page.slug).maybeSingle(); if (current.error) throw current.error; before = current.data;
        if (!before) throw new Error('This page no longer exists. Reload the Site Builder.');
        if (page.updated_at && before.updated_at !== page.updated_at) throw new Error('This page changed in another session. Reload it before saving.');
        const saved = await sb.from('aa_site_pages').update(row).eq('slug', page.slug).eq('updated_at', before.updated_at).select('*').maybeSingle();
        if (saved.error) throw saved.error; after = saved.data;
        if (!after) throw new Error('This page changed in another session. Reload it before saving.');
        await recordRevision('page', slug, publish ? 'publish' : 'draft', before, after);
        await sb.from('aa_audit_log').insert({ actor_user_id: actor.id, action: 'site_page_updated', entity_type: 'site_page', entity_id: slug, details: { title: row.title, published: row.published } });
        activeSlug = slug;
      }
      dirty = false; localEditedSinceRemote = false;
      await refreshData(false);
      status((row.published ? 'Published' : 'Saved draft') + ' “' + row.title + '”.');
      setSaveLocation('Saved in Supabase → aa_site_pages · ' + slug + ' · ' + formatWhen(nowIso()));
      sendSaved({ slug, title: row.title, settings_mode: false });
    } catch (error) { status(error.message || 'Could not save the page.', true); }
  };
  const deleteActivePage = async () => {
    const page = currentPage(); if (!page || page.is_home) return;
    if (editingNew) { if (dirty && !confirm('Discard this new page?')) return; pages = pages.filter(p => p !== page); editingNew = false; dirty = false; activeSlug = null; const next = pages.find(p => p.is_home) || pages[0]; if (next) openPage(next); else { renderTree(); updatePageHead(); renderPreview(); renderInspector(); } return; }
    if (!confirm('Delete “' + page.title + '” and any pages inside it?')) return;
    const { error } = await sb.from('aa_site_pages').delete().eq('slug', page.slug); if (error) { status(error.message, true); return; }
    await sb.from('aa_audit_log').insert({ actor_user_id: actor.id, action: 'site_page_deleted', entity_type: 'site_page', entity_id: page.slug });
    activeSlug = null; await refreshData(); status('Deleted ' + page.title + '.');
  };
  const movePage = async (page, delta) => {
    if (page._draftSlug) { status('Save the new page before reordering.', true); return; }
    const siblings = pages.filter(p => (p.parent_slug || null) === (page.parent_slug || null) && p.is_home === page.is_home).sort(order);
    const i = siblings.findIndex(p => p.slug === page.slug), j = i + delta;
    if (i < 0 || j < 0 || j >= siblings.length) return;
    const a = siblings[i], b = siblings[j], old = a.page_order; a.page_order = b.page_order; b.page_order = old;
    const results = await Promise.all([a, b].map(p => sb.from('aa_site_pages').update({ page_order: p.page_order, updated_by: actor.id }).eq('slug', p.slug)));
    const error = results.find(r => r.error)?.error;
    if (error) { status(error.message || 'Could not save page order.', true); return; }
    renderTree(); status('Page order saved.');
  };

  const saveSettings = async () => {
    try {
      const s = settings;
      const row = settingsRowFrom(s);
      let before = null, after = null;
      const current = await sb.from('aa_site_settings').select('*').eq('singleton', true).maybeSingle(); if (current.error) throw current.error; before = current.data;
      if (before) {
        if (s.updated_at && before.updated_at !== s.updated_at) throw new Error('Site settings changed in another session. Reload before saving.');
        const saved = await sb.from('aa_site_settings').update(row).eq('singleton', true).eq('updated_at', before.updated_at).select('*').maybeSingle();
        if (saved.error) throw saved.error; after = saved.data;
      } else {
        const saved = await sb.from('aa_site_settings').insert(row).select('*').single();
        if (saved.error) throw saved.error; after = saved.data;
      }
      if (!after) throw new Error('Site settings changed in another session. Reload before saving.');
      await recordRevision('settings', 'singleton', 'settings', before, after);
      await sb.from('aa_audit_log').insert({ actor_user_id: actor.id, action: 'site_settings_updated', entity_type: 'site_settings', details: { site_name: row.site_name } });
      settings = { ...s, ...after }; dirty = false; localEditedSinceRemote = false; refreshPreview(); renderInspector(); updatePageHead();
      status('Site-wide settings saved.'); setSaveLocation('Saved in Supabase → aa_site_settings · ' + formatWhen(nowIso())); sendSaved({ slug: 'settings', title: 'Site settings', settings_mode: true });
    } catch (error) { status(error.message || 'Could not save settings.', true); }
  };

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('sb-fullscreen')) { event.preventDefault(); toggleFullscreen(); }
  });

  window.AA_SiteBuilder = {
    init: async (client, user) => {
      sb = client; actor = user; buildShell();
      try { await refreshData(); } catch (error) { status(error.message || 'Site Builder could not load. Apply the site builder migration first.', true); }
      startCollab();
    }
  };
})();
