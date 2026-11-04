(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
  const dateValue = value => value ? dateFmt.format(new Date(String(value).slice(0, 10) + 'T12:00:00')) : '';
  const stampValue = value => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '';
  const roleLabel = role => ({ viewer: 'Viewer', editor: 'Editor', admin: 'Administrator' }[role] || role);
  const roles = ['viewer', 'editor', 'admin'];

  let client = null, actor = null;
  const data = {
    profiles: [], groups: [], memberships: [], resources: [],
    direct: [], groupRules: [], activity: new Map()
  };
  const ui = { search: '', role: '', group: '', resource: '', sort: 'name', dir: 1, loaded: false };

  const setStatus = (message, error = false) => {
    const el = $('uaStatus'); if (!el) return;
    el.textContent = message; el.classList.toggle('is-error', !!error);
  };

  const audit = async (action, entityType, entityId, details = {}) => {
    if (!client || !actor) return;
    const { error } = await client.from('aa_audit_log').insert({
      actor_user_id: actor.id,
      action,
      entity_type: entityType,
      entity_id: String(entityId || ''),
      details
    });
    if (error) console.warn('Admin audit entry was not saved', error);
  };

  const mount = () => {
    const section = $('usersTab'); if (!section || $('uaApp')) return;
    [...section.children].forEach(child => child.classList.add('ua-legacy'));
    const app = document.createElement('div');
    app.id = 'uaApp';
    section.prepend(app);
    app.innerHTML = `
      <div class="ua-head">
        <div><h2>User directory</h2><p class="muted">Every registered account in one editable table. Changes save immediately; the email address and password stay with Supabase Auth.</p></div>
        <button id="uaRefresh" type="button">Refresh directory</button>
      </div>
      <div class="ua-toolbar">
        <label for="uaSearch">Search name or email<input id="uaSearch" type="search" autocomplete="off" placeholder="Start typing…"></label>
        <label for="uaRole">Role<select id="uaRole"><option value="">All roles</option><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Administrator</option></select></label>
        <label for="uaGroup">Group<select id="uaGroup"><option value="">All groups</option></select></label>
        <label for="uaResource">Resource<select id="uaResource"><option value="">All restricted resources</option></select></label>
        <button id="uaClear" type="button">Clear filters</button>
        <span class="ua-count" id="uaCount">Sign in to load the directory.</span>
      </div>
      <div class="ua-status" id="uaStatus" role="status">Sign in to load the directory.</div>
      <div id="uaGrid"></div>`;
    $('uaSearch').addEventListener('input', event => { ui.search = event.target.value; render(); });
    $('uaRole').addEventListener('change', event => { ui.role = event.target.value; render(); });
    $('uaGroup').addEventListener('change', event => { ui.group = event.target.value; render(); });
    $('uaResource').addEventListener('change', event => { ui.resource = event.target.value; render(); });
    $('uaClear').addEventListener('click', () => {
      ui.search = ''; ui.role = ''; ui.group = ''; ui.resource = '';
      $('uaSearch').value = ''; $('uaRole').value = ''; $('uaGroup').value = ''; $('uaResource').value = '';
      render();
    });
    $('uaRefresh').addEventListener('click', () => load());
    $('uaGrid').addEventListener('click', handleGridClick);
    $('uaGrid').addEventListener('change', handleGridChange);
    document.querySelector('[data-tab="users"]')?.addEventListener('click', () => { if (ui.loaded) load(); });
  };

  const load = async () => {
    if (!client || !actor) return;
    setStatus('Loading the user directory…');
    const since = new Date(Date.now() - 364 * 86400000).toISOString().slice(0, 10);
    try {
      const [profiles, groups, memberships, resources, direct, groupRules, activity] = await Promise.all([
        client.from('aa_profiles').select('user_id,email,display_name,role,created_at,updated_at').order('email'),
        client.from('aa_groups').select('id,name,description,created_at').order('name'),
        client.from('aa_group_members').select('group_id,user_id'),
        client.from('aa_resources').select('id,title,category,visibility,published').order('category').order('title'),
        client.from('aa_resource_email_rules').select('resource_id,email'),
        client.from('aa_resource_group_rules').select('resource_id,group_id'),
        client.from('aa_user_activity_daily').select('user_id,activity_date').gte('activity_date', since).order('activity_date', { ascending: false }).limit(10000)
      ]);
      for (const result of [profiles, groups, memberships, resources, direct, groupRules, activity]) {
        if (result.error) throw result.error;
      }
      data.profiles = profiles.data || [];
      data.groups = groups.data || [];
      data.memberships = memberships.data || [];
      data.resources = resources.data || [];
      data.direct = direct.data || [];
      data.groupRules = groupRules.data || [];
      data.activity = new Map();
      (activity.data || []).forEach(row => { if (!data.activity.has(row.user_id)) data.activity.set(row.user_id, row.activity_date); });
      ui.loaded = true;
      syncFilters();
      render();
      setStatus(`Loaded ${data.profiles.length} registered account${data.profiles.length === 1 ? '' : 's'}.`);
    } catch (error) {
      console.error('User directory could not load', error);
      setStatus(error.message || 'The user directory could not load.', true);
    }
  };

  const syncFilters = () => {
    const groupFilter = $('uaGroup'), resourceFilter = $('uaResource');
    if (groupFilter) {
      const previous = groupFilter.value;
      groupFilter.replaceChildren(new Option('All groups', ''), ...data.groups.map(group => new Option(group.name, group.id)));
      if (data.groups.some(group => group.id === previous)) groupFilter.value = previous; else ui.group = '';
    }
    if (resourceFilter) {
      const previous = resourceFilter.value;
      const restricted = data.resources.filter(resource => resource.visibility === 'restricted');
      resourceFilter.replaceChildren(new Option('All restricted resources', ''), ...restricted.map(resource => new Option(resource.title, resource.id)));
      if (restricted.some(resource => resource.id === previous)) resourceFilter.value = previous; else ui.resource = '';
    }
  };

  const profileGroups = profile => data.memberships
    .filter(row => row.user_id === profile.user_id)
    .map(row => data.groups.find(group => group.id === row.group_id))
    .filter(Boolean);

  const directResourceIds = profile => new Set(data.direct
    .filter(row => String(row.email || '').toLowerCase() === String(profile.email || '').toLowerCase())
    .map(row => row.resource_id));

  const effectiveResourceIds = profile => {
    const direct = directResourceIds(profile);
    const groupIds = new Set(profileGroups(profile).map(group => group.id));
    return new Set(data.resources
      .filter(resource => resource.visibility === 'restricted')
      .filter(resource => direct.has(resource.id) || data.groupRules.some(rule => rule.resource_id === resource.id && groupIds.has(rule.group_id)))
      .map(resource => resource.id));
  };

  const groupResourceIds = profile => {
    const groupIds = new Set(profileGroups(profile).map(group => group.id));
    return new Set(data.groupRules.filter(rule => groupIds.has(rule.group_id)).map(rule => rule.resource_id));
  };

  const lastActive = profile => data.activity.get(profile.user_id) || '';

  const filteredProfiles = () => {
    const query = ui.search.trim().toLowerCase();
    return data.profiles.filter(profile => {
      if (query && !`${profile.display_name || ''} ${profile.email || ''}`.toLowerCase().includes(query)) return false;
      if (ui.role && profile.role !== ui.role) return false;
      if (ui.group && !data.memberships.some(row => row.user_id === profile.user_id && row.group_id === ui.group)) return false;
      if (ui.resource && !effectiveResourceIds(profile).has(ui.resource)) return false;
      return true;
    });
  };

  const sortValue = (profile, key) => {
    if (key === 'name') return String(profile.display_name || profile.email || '').toLowerCase();
    if (key === 'email') return String(profile.email || '').toLowerCase();
    if (key === 'role') return roles.indexOf(profile.role);
    if (key === 'groups') return profileGroups(profile).length;
    if (key === 'resources') return effectiveResourceIds(profile).size;
    if (key === 'last') return lastActive(profile) || '';
    if (key === 'created') return String(profile.created_at || '');
    return '';
  };

  const sortHeader = (key, label) => {
    const active = ui.sort === key;
    return `<th aria-sort="${active ? (ui.dir === 1 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="ua-sort${active ? ' is-sorted' : ''}" data-sort="${key}">${label}${active ? `<span aria-hidden="true">${ui.dir === 1 ? '▲' : '▼'}</span>` : ''}</button></th>`;
  };

  const groupCell = profile => {
    const groups = profileGroups(profile);
    const rows = data.groups.map(group => {
      const checked = groups.some(item => item.id === group.id);
      const rosterManaged = group.name === 'Faculty Chairs';
      return `<label class="ua-check${rosterManaged ? ' is-disabled' : ''}" title="${rosterManaged ? 'Managed by the Faculty Chairs roster sync' : ''}">
        <input type="checkbox" data-group-id="${esc(group.id)}"${checked ? ' checked' : ''}${rosterManaged ? ' disabled' : ''}>
        <span>${esc(group.name)}</span>${rosterManaged ? '<em>Roster</em>' : ''}
      </label>`;
    }).join('');
    return `<details class="ua-details"><summary>${groups.length} group${groups.length === 1 ? '' : 's'}</summary><div class="ua-details-body">${rows || '<span class="ua-note">No groups have been created.</span>'}</div></details>`;
  };

  const resourceCell = profile => {
    const restricted = data.resources.filter(resource => resource.visibility === 'restricted');
    const direct = directResourceIds(profile);
    const viaGroups = groupResourceIds(profile);
    const rows = restricted.map(resource => {
      const isDirect = direct.has(resource.id);
      const inherited = viaGroups.has(resource.id);
      return `<div class="ua-resource-row"><label class="ua-check" title="Grant this resource directly to ${esc(profile.email)}">
        <input type="checkbox" data-resource-id="${esc(resource.id)}"${isDirect ? ' checked' : ''}>
        <span>${esc(resource.title)}${resource.published ? '' : ' (draft)'}</span>
      </label>${inherited ? '<span class="ua-badge">via group</span>' : ''}</div>`;
    }).join('');
    const directCount = [...direct].filter(id => restricted.some(resource => resource.id === id)).length;
    const inheritedCount = [...viaGroups].filter(id => restricted.some(resource => resource.id === id)).length;
    return `<details class="ua-details"><summary>${directCount} direct · ${inheritedCount} via group</summary><div class="ua-details-body">${rows || '<span class="ua-note">No restricted resources yet.</span>'}</div></details>`;
  };

  const render = () => {
    const grid = $('uaGrid'); if (!grid) return;
    if (!ui.loaded) return;
    const profiles = filteredProfiles().sort((a, b) => {
      const left = sortValue(a, ui.sort), right = sortValue(b, ui.sort);
      if (left < right) return -1 * ui.dir;
      if (left > right) return ui.dir;
      return String(a.email || '').localeCompare(String(b.email || ''));
    });
    const count = $('uaCount');
    if (count) count.textContent = `${profiles.length} of ${data.profiles.length} account${data.profiles.length === 1 ? '' : 's'} shown${ui.search ? ` · search “${ui.search}”` : ''}`;
    if (!profiles.length) {
      grid.innerHTML = '<div class="ua-empty">No accounts match these filters.</div>';
      return;
    }
    grid.innerHTML = `<div class="ua-summary"><span>Click a name or role to edit it.</span><span>Group and resource checkboxes save immediately.</span><span>Faculty Chairs is roster-managed.</span></div>
      <div class="ua-table-wrap"><table class="ua-table">
        <thead><tr>${sortHeader('name', 'User')}${sortHeader('role', 'Role')}${sortHeader('groups', 'Groups')}${sortHeader('resources', 'Extra resources')}${sortHeader('last', 'Last active')}${sortHeader('created', 'Account')}</tr></thead>
        <tbody>${profiles.map(profile => {
          const last = lastActive(profile);
          return `<tr data-user-id="${esc(profile.user_id)}">
            <td><div class="ua-user"><input class="ua-name" data-name-user="${esc(profile.user_id)}" value="${esc(profile.display_name || '')}" aria-label="Display name for ${esc(profile.email)}" placeholder="Add a display name"><span class="ua-email">${esc(profile.email)}</span><span class="ua-meta">Joined ${esc(stampValue(profile.created_at))} · Email and password managed by Auth</span></div></td>
            <td><select class="ua-role" data-role-user="${esc(profile.user_id)}" aria-label="Role for ${esc(profile.email)}">${roles.map(role => `<option value="${role}"${profile.role === role ? ' selected' : ''}>${esc(roleLabel(role))}</option>`).join('')}</select></td>
            <td>${groupCell(profile)}</td>
            <td>${resourceCell(profile)}</td>
            <td><span class="ua-date">${last ? esc(dateValue(last)) : '<small>None recorded</small>'}</span></td>
            <td><span class="ua-date">${esc(stampValue(profile.created_at))}<small>${profile.updated_at ? 'Updated ' + esc(stampValue(profile.updated_at)) : ''}</small></span><div class="row" style="margin-top:6px"><button type="button" class="ua-reset" data-reset-user="${esc(profile.user_id)}" title="Send a Supabase password reset email">Reset password</button></div></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      <p class="ua-note">Passwords are never shown or set here. “Reset password” sends a Supabase reset email to the account address; delivery depends on the project’s email/SMTP configuration.</p>`;
  };

  const profileFromRow = element => {
    const row = element.closest('tr[data-user-id]');
    return row ? data.profiles.find(profile => profile.user_id === row.dataset.userId) : null;
  };

  const handleGridClick = event => {
    const sort = event.target.closest('[data-sort]');
    if (sort) {
      const key = sort.dataset.sort;
      if (ui.sort === key) ui.dir *= -1; else { ui.sort = key; ui.dir = 1; }
      render(); return;
    }
    const reset = event.target.closest('[data-reset-user]');
    if (reset) sendPasswordReset(reset);
  };

  const handleGridChange = async event => {
    const roleSelect = event.target.closest('[data-role-user]');
    if (roleSelect) return updateRole(roleSelect);
    const nameInput = event.target.closest('[data-name-user]');
    if (nameInput) return updateName(nameInput);
    const groupCheck = event.target.closest('[data-group-id]');
    if (groupCheck) return updateGroup(groupCheck);
    const resourceCheck = event.target.closest('[data-resource-id]');
    if (resourceCheck) return updateResource(resourceCheck);
  };

  const updateName = async input => {
    const profile = profileFromRow(input); if (!profile) return;
    const display_name = input.value.trim() || null;
    if (display_name === (profile.display_name || null)) return;
    input.disabled = true;
    try {
      const { error } = await client.from('aa_profiles').update({ display_name, updated_at: new Date().toISOString() }).eq('user_id', profile.user_id);
      if (error) throw error;
      profile.display_name = display_name;
      await audit('profile_name_updated', 'profile', profile.user_id, { display_name });
      setStatus(`Saved the display name for ${profile.email}.`);
    } catch (error) {
      input.value = profile.display_name || '';
      setStatus(error.message || 'Could not save the display name.', true);
    } finally {
      input.disabled = false;
    }
  };

  const updateRole = async select => {
    const profile = profileFromRow(select); if (!profile) return;
    const role = select.value;
    if (role === profile.role) return;
    if (profile.user_id === actor.id && role !== 'admin' && !confirm('You are changing your own role away from Administrator. You may lose access to this console. Continue?')) {
      select.value = profile.role; return;
    }
    select.disabled = true;
    const previous = profile.role;
    try {
      const { error } = await client.from('aa_profiles').update({ role, updated_at: new Date().toISOString() }).eq('user_id', profile.user_id);
      if (error) throw error;
      profile.role = role;
      await audit('role_updated', 'profile', profile.user_id, { from: previous, to: role });
      setStatus(`${profile.email} is now ${roleLabel(role)}.`);
      render();
    } catch (error) {
      select.value = previous;
      setStatus(error.message || 'Could not change the role.', true);
    } finally {
      select.disabled = false;
    }
  };

  const updateGroup = async check => {
    const profile = profileFromRow(check); if (!profile) return;
    const group = data.groups.find(item => item.id === check.dataset.groupId);
    if (!group || group.name === 'Faculty Chairs') { check.checked = !check.checked; return; }
    const want = check.checked;
    check.disabled = true;
    try {
      if (want) {
        const { error } = await client.from('aa_group_members').upsert({ group_id: group.id, user_id: profile.user_id }, { onConflict: 'group_id,user_id' });
        if (error) throw error;
        if (!data.memberships.some(row => row.group_id === group.id && row.user_id === profile.user_id)) data.memberships.push({ group_id: group.id, user_id: profile.user_id });
        await audit('member_added', 'group', group.id, { email: profile.email });
        setStatus(`Added ${profile.email} to ${group.name}.`);
      } else {
        const { error } = await client.from('aa_group_members').delete().eq('group_id', group.id).eq('user_id', profile.user_id);
        if (error) throw error;
        data.memberships = data.memberships.filter(row => !(row.group_id === group.id && row.user_id === profile.user_id));
        await audit('member_removed', 'group', group.id, { email: profile.email });
        setStatus(`Removed ${profile.email} from ${group.name}.`);
      }
      render();
    } catch (error) {
      check.checked = !want;
      setStatus(error.message || 'Could not update group membership.', true);
    } finally {
      check.disabled = false;
    }
  };

  const updateResource = async check => {
    const profile = profileFromRow(check); if (!profile) return;
    const resource = data.resources.find(item => item.id === check.dataset.resourceId);
    if (!resource) { check.checked = !check.checked; return; }
    const email = String(profile.email || '').toLowerCase();
    const want = check.checked;
    check.disabled = true;
    try {
      if (want) {
        const { error } = await client.from('aa_resource_email_rules').upsert({ resource_id: resource.id, email }, { onConflict: 'resource_id,email' });
        if (error) throw error;
        data.direct.push({ resource_id: resource.id, email });
        await audit('resource_email_grant_added', 'resource', resource.id, { email });
        setStatus(`Granted ${resource.title} directly to ${profile.email}.`);
      } else {
        const { error } = await client.from('aa_resource_email_rules').delete().eq('resource_id', resource.id).eq('email', email);
        if (error) throw error;
        data.direct = data.direct.filter(row => !(row.resource_id === resource.id && String(row.email || '').toLowerCase() === email));
        await audit('resource_email_grant_removed', 'resource', resource.id, { email });
        setStatus(`Removed the direct ${resource.title} grant from ${profile.email}.`);
      }
      render();
    } catch (error) {
      check.checked = !want;
      setStatus(error.message || 'Could not update the resource grant.', true);
    } finally {
      check.disabled = false;
    }
  };

  const sendPasswordReset = async button => {
    const profile = profileFromRow(button); if (!profile) return;
    if (!confirm(`Send a password reset email to ${profile.email}?`)) return;
    button.disabled = true;
    try {
      const { error } = await client.auth.resetPasswordForEmail(profile.email, { redirectTo: new URL('index.html', location.href).href });
      if (error) throw error;
      setStatus(`Password reset email requested for ${profile.email}. Delivery depends on the project’s email configuration.`);
      await audit('password_reset_requested', 'profile', profile.user_id, { email: profile.email });
    } catch (error) {
      setStatus(error.message || 'Could not request a password reset.', true);
    } finally {
      button.disabled = false;
    }
  };

  const init = async () => {
    client = window.AA_ADMIN_CLIENT || client;
    actor = window.AA_ADMIN_ACTOR || actor;
    if (!client || !actor) return;
    await load();
  };

  const boot = () => {
    mount();
    if (window.AA_ADMIN_CLIENT && window.AA_ADMIN_ACTOR) init();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('aa-admin-ready', init);
})();
