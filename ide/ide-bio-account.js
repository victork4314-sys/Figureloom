(() => {
  'use strict';

  const CONFIG = window.SCICANVAS_CLOUD_CONFIG || {};
  const SUPABASE_MODULE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.5/+esm';
  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const LOCAL_GALLERY_KEY = 'figureloom-bio-project-gallery-v1';
  const CURRENT_CLOUD_KEY = 'figureloom-bio-current-cloud-project-v1';
  const LAST_EMAIL_KEY = 'scicanvas-account-email-v1';
  const NAME_KEY = 'scicanvas-user-name-v1';
  const AVATAR_KEY = 'scicanvas-profile-avatar-v1';
  const AVATAR_SYMBOLS = { dna:'🧬', flask:'⚗', molecule:'⌬', cell:'◉', wave:'∿', star:'✦' };

  const accountButton = document.getElementById('bioAccountButton');
  if (!accountButton) return;

  let clientPromise = null;
  let currentUser = null;
  let authSubscription = null;
  let localProjects = readLocalProjects();

  function configured() {
    return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && !/YOUR_|example/i.test(`${CONFIG.supabaseUrl}${CONFIG.supabaseAnonKey}`));
  }

  function getClient() {
    if (!configured()) return Promise.reject(new Error('FigureLoom accounts are not configured for this deployment.'));
    if (!clientPromise) {
      clientPromise = import(SUPABASE_MODULE).then(({ createClient }) => createClient(
        CONFIG.supabaseUrl,
        CONFIG.supabaseAnonKey,
        { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }
      ));
    }
    return clientPromise;
  }

  function cleanName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function displayName(user) {
    return cleanName(user?.user_metadata?.full_name || user?.user_metadata?.name || localStorage.getItem(NAME_KEY) || user?.email?.split('@')[0] || 'Scientist');
  }

  function initials(value) {
    const parts = cleanName(value).split(' ').filter(Boolean);
    if (!parts.length) return '◌';
    return parts.length === 1 ? parts[0][0].toUpperCase() : `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
  }

  function renderAvatar(user = currentUser) {
    const name = displayName(user);
    const choice = user?.user_metadata?.avatar_symbol || localStorage.getItem(AVATAR_KEY) || 'initial';
    const imageUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
    accountButton.replaceChildren();
    if (choice !== 'initial' && AVATAR_SYMBOLS[choice]) {
      accountButton.textContent = AVATAR_SYMBOLS[choice];
    } else if (/^https:\/\//i.test(imageUrl)) {
      const image = document.createElement('img');
      image.alt = '';
      image.src = imageUrl;
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => { accountButton.textContent = initials(name); }, { once:true });
      accountButton.append(image);
    } else {
      accountButton.textContent = initials(name);
    }
    accountButton.dataset.signedIn = user ? 'true' : 'false';
    accountButton.title = user ? `${name} · FigureLoom Bio projects` : 'Sign in or open FigureLoom Bio projects';
    accountButton.setAttribute('aria-label', accountButton.title);
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value === null ? fallback : value;
    } catch { return fallback; }
  }

  function workspacePayload() {
    return {
      version:1,
      files:readJson(FILES_KEY, {}),
      activeFile:localStorage.getItem(ACTIVE_KEY) || '',
      deleted:readJson(DELETED_KEY, [])
    };
  }

  function restoreWorkspace(payload) {
    const files = payload?.files && typeof payload.files === 'object' ? payload.files : {};
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    localStorage.setItem(ACTIVE_KEY, String(payload?.activeFile || Object.keys(files)[0] || ''));
    localStorage.setItem(DELETED_KEY, JSON.stringify(Array.isArray(payload?.deleted) ? payload.deleted : []));
    location.reload();
  }

  function currentTitle() {
    return document.getElementById('programName')?.value?.trim() || 'Untitled Bio program';
  }

  function readLocalProjects() {
    const value = readJson(LOCAL_GALLERY_KEY, []);
    return Array.isArray(value) ? value : [];
  }

  function writeLocalProjects() {
    localStorage.setItem(LOCAL_GALLERY_KEY, JSON.stringify(localProjects.slice(0, 100)));
  }

  function bytesToBase64(bytes) {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    return btoa(binary);
  }

  function base64ToBytes(value) {
    return Uint8Array.from(atob(value || ''), (character) => character.charCodeAt(0));
  }

  async function getProjectKey(projectId) {
    const client = await getClient();
    const { data, error } = await client.rpc('get_bio_project_key', { target_project:projectId });
    if (error) throw error;
    if (!data) throw new Error('The Bio project encryption key could not be retrieved.');
    return crypto.subtle.importKey('raw', base64ToBytes(data), 'AES-GCM', false, ['encrypt','decrypt']);
  }

  async function encryptPayload(payload, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify(payload));
    const encrypted = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, plain);
    return { cipherText:bytesToBase64(new Uint8Array(encrypted)), iv:bytesToBase64(iv) };
  }

  async function decryptPayload(cipherText, iv, key) {
    const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv:base64ToBytes(iv) }, key, base64ToBytes(cipherText));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  const dialog = document.createElement('dialog');
  dialog.id = 'bioAccountDialog';
  dialog.className = 'bio-account-dialog';
  dialog.innerHTML = `
    <div class="bio-account-shell">
      <header class="bio-account-header">
        <div><span>FigureLoom account</span><h2>FigureLoom Bio projects</h2><p>The account is shared with FigureLoom. Bio projects stay in their own separate galleries.</p></div>
        <button id="bioAccountClose" type="button" aria-label="Close">×</button>
      </header>
      <section class="bio-account-auth">
        <div id="bioSignedOut">
          <label>Email <input id="bioEmail" type="email" autocomplete="email"></label>
          <label>Password <input id="bioPassword" type="password" minlength="8" autocomplete="current-password"></label>
          <div class="bio-account-actions"><button id="bioSignIn" class="primary" type="button">Sign in</button><button id="bioSignUp" type="button">Create account</button><button id="bioForgot" type="button">Forgot password?</button></div>
        </div>
        <div id="bioSignedIn" hidden><div class="bio-signed-row"><span id="bioDialogAvatar" class="bio-dialog-avatar">◌</span><span><strong id="bioUserName"></strong><small id="bioUserEmail"></small></span><button id="bioSignOut" type="button">Sign out</button></div></div>
        <div id="bioRecovery" hidden><strong>Choose a new password</strong><label>New password <input id="bioNewPassword" type="password" minlength="8"></label><label>Confirm password <input id="bioConfirmPassword" type="password" minlength="8"></label><button id="bioUpdatePassword" class="primary" type="button">Update password</button></div>
        <p id="bioAccountMessage" aria-live="polite"></p>
      </section>
      <div class="bio-save-actions"><button id="bioSaveLocal" type="button">Save on this device</button><button id="bioSaveCloud" class="primary" type="button">Save to Bio cloud</button><button id="bioSaveCloudAs" type="button">Save as new Bio project</button></div>
      <section class="bio-gallery-section"><div><h3>On this device</h3><small>FigureLoom Bio only</small></div><div id="bioLocalGallery" class="bio-project-grid"></div></section>
      <section class="bio-gallery-section"><div><h3>FigureLoom Bio cloud</h3><small>Encrypted and separate from figure projects</small></div><div id="bioCloudGallery" class="bio-project-grid"></div></section>
    </div>`;
  document.body.append(dialog);

  const q = (selector) => dialog.querySelector(selector);
  const messageBox = q('#bioAccountMessage');
  const localGrid = q('#bioLocalGallery');
  const cloudGrid = q('#bioCloudGallery');

  function message(text, kind = '') {
    messageBox.textContent = text || '';
    messageBox.dataset.kind = kind;
  }

  function projectCard(entry, cloud = false) {
    const card = document.createElement('article');
    card.className = 'bio-project-card';
    card.innerHTML = `<div class="bio-project-icon">🧬</div><div><strong>${escapeHtml(entry.title)}</strong><small>${new Date(entry.updated_at || entry.updatedAt).toLocaleString()}</small></div><div class="bio-project-card-actions"></div>`;
    const actions = card.querySelector('.bio-project-card-actions');
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Open';
    open.addEventListener('click', async () => {
      try {
        if (cloud) await openCloudProject(entry.id);
        else restoreWorkspace(entry.payload);
      } catch (error) { message(error.message, 'error'); }
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      if (!confirm(`Delete “${entry.title}” from ${cloud ? 'FigureLoom Bio cloud' : 'this device'}?`)) return;
      try {
        if (cloud) {
          const { error } = await (await getClient()).from('bio_projects').delete().eq('id', entry.id);
          if (error) throw error;
          if (localStorage.getItem(CURRENT_CLOUD_KEY) === entry.id) localStorage.removeItem(CURRENT_CLOUD_KEY);
          await loadCloudProjects();
        } else {
          localProjects = localProjects.filter((item) => item.id !== entry.id);
          writeLocalProjects();
          renderLocalProjects();
        }
      } catch (error) { message(error.message, 'error'); }
    });
    actions.append(open, remove);
    return card;
  }

  function renderLocalProjects() {
    localGrid.replaceChildren();
    if (!localProjects.length) {
      localGrid.innerHTML = '<p class="bio-gallery-empty">No saved Bio projects on this device yet.</p>';
      return;
    }
    localProjects.forEach((entry) => localGrid.append(projectCard(entry)));
  }

  async function saveLocalProject() {
    localProjects.unshift({ id:crypto.randomUUID(), title:currentTitle(), updatedAt:new Date().toISOString(), payload:workspacePayload() });
    localProjects = localProjects.slice(0, 100);
    writeLocalProjects();
    renderLocalProjects();
    message('Saved in the separate FigureLoom Bio device gallery.', 'success');
  }

  async function validatedUser() {
    const { data, error } = await (await getClient()).auth.getUser();
    if (error) throw error;
    return data.user || null;
  }

  async function loadCloudProjects() {
    cloudGrid.replaceChildren();
    if (!configured()) {
      cloudGrid.innerHTML = '<p class="bio-gallery-empty">Cloud accounts are not configured. Device saves still work.</p>';
      return;
    }
    if (!currentUser) {
      cloudGrid.innerHTML = '<p class="bio-gallery-empty">Sign in with the same FigureLoom account to see Bio cloud projects.</p>';
      return;
    }
    cloudGrid.innerHTML = '<p class="bio-gallery-empty">Loading Bio projects…</p>';
    try {
      const { data, error } = await (await getClient()).from('bio_projects').select('id,title,updated_at,revision').order('updated_at', { ascending:false });
      if (error) throw error;
      cloudGrid.replaceChildren();
      if (!data?.length) cloudGrid.innerHTML = '<p class="bio-gallery-empty">No Bio cloud projects yet.</p>';
      else data.forEach((entry) => cloudGrid.append(projectCard(entry, true)));
    } catch (error) {
      cloudGrid.innerHTML = `<p class="bio-gallery-empty">Could not load Bio projects: ${escapeHtml(error.message)}</p>`;
    }
  }

  async function saveCloudProject(forceNew = false) {
    const user = currentUser || await validatedUser();
    if (!user) throw new Error('Sign in before saving to FigureLoom Bio cloud.');
    const client = await getClient();
    let projectId = forceNew ? '' : localStorage.getItem(CURRENT_CLOUD_KEY) || '';
    let revision = 0;
    if (!projectId) {
      projectId = crypto.randomUUID();
      const { error } = await client.from('bio_projects').insert({ id:projectId, owner_id:user.id, title:currentTitle(), cipher_text:'', iv:'', revision:0 });
      if (error) throw error;
    } else {
      const { data, error } = await client.from('bio_projects').select('revision').eq('id', projectId).maybeSingle();
      if (error) throw error;
      revision = Number(data?.revision) || 0;
    }
    const encrypted = await encryptPayload(workspacePayload(), await getProjectKey(projectId));
    const nextRevision = revision + 1;
    const { error } = await client.from('bio_projects').update({ title:currentTitle(), cipher_text:encrypted.cipherText, iv:encrypted.iv, revision:nextRevision, updated_at:new Date().toISOString() }).eq('id', projectId);
    if (error) throw error;
    localStorage.setItem(CURRENT_CLOUD_KEY, projectId);
    message(`Encrypted Bio cloud project saved · revision ${nextRevision}.`, 'success');
    await loadCloudProjects();
  }

  async function openCloudProject(projectId) {
    const client = await getClient();
    const { data, error } = await client.from('bio_projects').select('*').eq('id', projectId).single();
    if (error) throw error;
    if (!data.cipher_text || !data.iv) throw new Error('This Bio project has not completed its first save.');
    const payload = await decryptPayload(data.cipher_text, data.iv, await getProjectKey(projectId));
    localStorage.setItem(CURRENT_CLOUD_KEY, projectId);
    restoreWorkspace(payload);
  }

  function updateAuthUi(user) {
    currentUser = user || null;
    q('#bioSignedOut').hidden = Boolean(currentUser);
    q('#bioSignedIn').hidden = !currentUser;
    q('#bioSaveCloud').disabled = !currentUser;
    q('#bioSaveCloudAs').disabled = !currentUser;
    if (currentUser) {
      q('#bioUserName').textContent = displayName(currentUser);
      q('#bioUserEmail').textContent = currentUser.email || '';
      q('#bioDialogAvatar').textContent = initials(displayName(currentUser));
    }
    renderAvatar(currentUser);
    loadCloudProjects();
  }

  async function emailAuth(mode) {
    try {
      const client = await getClient();
      const email = q('#bioEmail').value.trim().toLowerCase();
      const password = q('#bioPassword').value;
      if (!email) throw new Error('Enter your email address.');
      localStorage.setItem(LAST_EMAIL_KEY, email);
      if (mode !== 'reset' && password.length < 8) throw new Error('Use a password with at least 8 characters.');
      if (mode === 'signup') {
        const { error } = await client.auth.signUp({ email, password, options:{ emailRedirectTo:`${location.origin}/ide/`, data:{ full_name:localStorage.getItem(NAME_KEY) || email.split('@')[0] } } });
        if (error) throw error;
        message('Account created. Check your email if confirmation is required.', 'success');
      } else if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo:`${location.origin}/ide/` });
        if (error) throw error;
        message('Password recovery email sent.', 'success');
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        message('Signed in to the shared FigureLoom account.', 'success');
      }
      q('#bioPassword').value = '';
    } catch (error) { message(error.message, 'error'); }
  }

  async function initializeAuth() {
    q('#bioEmail').value = localStorage.getItem(LAST_EMAIL_KEY) || '';
    if (!configured()) return updateAuthUi(null);
    try {
      const client = await getClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      updateAuthUi(data.session?.user || null);
      const listener = client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          q('#bioRecovery').hidden = false;
          dialog.showModal?.();
          message('Recovery link accepted. Choose a new password.', 'success');
        }
        updateAuthUi(session?.user || null);
      });
      authSubscription = listener.data.subscription;
    } catch (error) { message(error.message, 'error'); }
  }

  accountButton.addEventListener('click', () => {
    renderLocalProjects();
    loadCloudProjects();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  });
  q('#bioAccountClose').addEventListener('click', () => dialog.close?.());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close?.(); });
  q('#bioSignIn').addEventListener('click', () => emailAuth('signin'));
  q('#bioSignUp').addEventListener('click', () => emailAuth('signup'));
  q('#bioForgot').addEventListener('click', () => emailAuth('reset'));
  q('#bioPassword').addEventListener('keydown', (event) => { if (event.key === 'Enter') emailAuth('signin'); });
  q('#bioSignOut').addEventListener('click', async () => {
    try {
      const { error } = await (await getClient()).auth.signOut();
      if (error) throw error;
      message('Signed out. Bio projects saved on this device remain here.', 'success');
    } catch (error) { message(error.message, 'error'); }
  });
  q('#bioUpdatePassword').addEventListener('click', async () => {
    try {
      const password = q('#bioNewPassword').value;
      if (password.length < 8) throw new Error('Use at least 8 characters.');
      if (password !== q('#bioConfirmPassword').value) throw new Error('The two passwords do not match.');
      const { error } = await (await getClient()).auth.updateUser({ password });
      if (error) throw error;
      q('#bioRecovery').hidden = true;
      history.replaceState({}, document.title, location.pathname);
      message('Password updated.', 'success');
    } catch (error) { message(error.message, 'error'); }
  });
  q('#bioSaveLocal').addEventListener('click', () => saveLocalProject().catch((error) => message(error.message, 'error')));
  q('#bioSaveCloud').addEventListener('click', () => saveCloudProject(false).catch((error) => message(error.message, 'error')));
  q('#bioSaveCloudAs').addEventListener('click', () => saveCloudProject(true).catch((error) => message(error.message, 'error')));
  window.addEventListener('storage', (event) => { if (event.key === NAME_KEY || event.key === AVATAR_KEY) renderAvatar(); });
  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());

  renderAvatar();
  renderLocalProjects();
  initializeAuth();
})();
