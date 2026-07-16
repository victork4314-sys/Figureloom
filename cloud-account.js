(() => {
  if (typeof createDrawer !== 'function') return;

  const CONFIG = window.SCICANVAS_CLOUD_CONFIG || {};
  const LOCAL_GALLERY_KEY = 'project-gallery-v1';
  const CURRENT_CLOUD_KEY = 'scicanvas-current-cloud-project-v1';
  const LAST_EMAIL_KEY = 'scicanvas-account-email-v1';
  const SUPABASE_MODULE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
  let clientPromise = null;
  let currentUser = null;
  let localProjects = [];
  let authSubscription = null;
  let recoveryMode = false;

  const drawer = createDrawer('cloudGalleryDrawer', 'Accounts & project gallery', 'Email accounts, recovery, local projects, encrypted cloud vault and sharing');
  drawer.classList.add('cloud-gallery-drawer');
  const body = drawer.querySelector('.utility-body');
  body.innerHTML = `
    <div class="cloud-hero">
      <div><strong id="cloudHeroTitle">Your projects</strong><small id="cloudHeroStatus">Local gallery is ready. Cloud is optional.</small></div>
      <button id="cloudRefreshButton" type="button">Refresh</button>
    </div>
    <div class="cloud-account-panel">
      <div id="cloudSignedOut">
        <div class="email-account-heading"><span>@</span><div><strong>Email account</strong><small>One dependable sign-in method, with recovery links sent to your inbox.</small></div></div>
        <label>Email <input id="cloudEmail" type="email" autocomplete="email" inputmode="email" placeholder="researcher@example.com"></label>
        <label>Password
          <span class="password-field"><input id="cloudPassword" type="password" autocomplete="current-password" minlength="8" placeholder="At least 8 characters"><button id="cloudTogglePassword" type="button" aria-label="Show password">Show</button></span>
        </label>
        <div class="cloud-account-actions">
          <button id="cloudEmailSignIn" type="button" class="primary">Sign in</button>
          <button id="cloudEmailSignUp" type="button">Create account</button>
          <button id="cloudForgotPassword" type="button">Forgot password?</button>
          <button id="cloudResendConfirmation" type="button" hidden>Resend confirmation email</button>
        </div>
        <p class="cloud-note">Account confirmation and password-reset links are sent by email. SciCanvas does not use Apple, Microsoft, or other third-party sign-in providers.</p>
      </div>
      <div id="cloudSignedIn" hidden>
        <div class="cloud-user-row"><span class="cloud-user-avatar">SC</span><span><strong id="cloudUserName">Signed in</strong><small id="cloudUserEmail"></small></span><button id="cloudSignOut" type="button">Sign out</button></div>
      </div>
      <div id="cloudPasswordRecovery" class="cloud-password-recovery" hidden>
        <strong>Choose a new password</strong>
        <p>The recovery link was accepted. Enter the new password twice.</p>
        <label>New password <input id="cloudNewPassword" type="password" minlength="8" autocomplete="new-password"></label>
        <label>Confirm new password <input id="cloudConfirmPassword" type="password" minlength="8" autocomplete="new-password"></label>
        <div class="cloud-account-actions"><button id="cloudUpdatePassword" type="button" class="primary">Update password</button><button id="cloudCancelRecovery" type="button">Cancel</button></div>
      </div>
      <p id="cloudAccountMessage" class="cloud-message" aria-live="polite"></p>
    </div>
    <div class="cloud-toolbar">
      <button id="saveLocalGallery" type="button">Save local gallery copy</button>
      <button id="saveCloudProject" type="button" class="primary">Save encrypted cloud copy</button>
      <button id="saveCloudProjectAs" type="button">Save cloud copy as new</button>
    </div>
    <section class="gallery-section"><div class="gallery-heading"><h3>On this device</h3><small>Works without an account</small></div><div id="localProjectGallery" class="project-gallery"></div></section>
    <section class="gallery-section"><div class="gallery-heading"><h3>Cloud vault</h3><small>Owned projects and shared workspaces</small></div><div id="cloudProjectGallery" class="project-gallery"></div></section>
  `;

  const q = selector => drawer.querySelector(selector);
  const accountMessage = q('#cloudAccountMessage');
  const cloudStatus = q('#cloudHeroStatus');
  const localGrid = q('#localProjectGallery');
  const cloudGrid = q('#cloudProjectGallery');

  function configured() {
    return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && !/YOUR_|example/i.test(`${CONFIG.supabaseUrl}${CONFIG.supabaseAnonKey}`));
  }

  function message(text, kind = '') {
    accountMessage.textContent = text || '';
    accountMessage.dataset.kind = kind;
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
  }

  function bytesToBase64(bytes) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value || '');
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  }

  async function encryptJson(value, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(value));
    const encrypted = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, encoded);
    return { cipherText:bytesToBase64(new Uint8Array(encrypted)), iv:bytesToBase64(iv) };
  }

  async function decryptJson(cipherText, iv, key) {
    const decrypted = await crypto.subtle.decrypt({ name:'AES-GCM', iv:base64ToBytes(iv) }, key, base64ToBytes(cipherText));
    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  async function getClient() {
    if (!configured()) throw new Error('Email accounts are not configured for this deployment yet. Add the Supabase URL and public publishable key in cloud-config.js.');
    if (!clientPromise) {
      clientPromise = import(SUPABASE_MODULE).then(({ createClient }) => createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
        auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'pkce' },
        realtime:{ params:{ eventsPerSecond:8 } }
      }));
    }
    return clientPromise;
  }

  async function sessionUser() {
    const client = await getClient();
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data.user || null;
  }

  async function getProjectKey(projectId) {
    const client = await getClient();
    const { data, error } = await client.functions.invoke('project-key', { body:{ projectId } });
    if (error) throw error;
    if (!data?.key) throw new Error('The cloud project encryption key could not be retrieved.');
    return crypto.subtle.importKey('raw', base64ToBytes(data.key), 'AES-GCM', false, ['encrypt','decrypt']);
  }

  function currentProjectPayload() {
    if (typeof projectData === 'function') return structuredClone(projectData());
    if (typeof snapshot === 'function') return JSON.parse(snapshot());
    throw new Error('The project serializer is unavailable.');
  }

  function makeThumbnail() {
    try {
      const source = document.getElementById('canvas');
      if (!source) return '';
      const copy = source.cloneNode(true);
      copy.querySelector('#selectionLayer')?.remove();
      copy.querySelectorAll('.selection-box,.resize-handle,.path-node-handle').forEach(node => node.remove());
      const serialized = new XMLSerializer().serializeToString(copy);
      if (serialized.length > 180000) return '';
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    } catch {
      return '';
    }
  }

  function currentTitle() {
    return document.getElementById('documentName')?.value?.trim() || 'Untitled project';
  }

  async function readLocalGallery() {
    try {
      const record = await window.vaultRead?.(LOCAL_GALLERY_KEY);
      if (Array.isArray(record?.value)) return record.value;
    } catch {}
    try { return JSON.parse(localStorage.getItem(`scicanvas-${LOCAL_GALLERY_KEY}`) || '[]'); }
    catch { return []; }
  }

  async function writeLocalGallery() {
    try { await window.vaultWrite?.(LOCAL_GALLERY_KEY, localProjects); }
    catch {
      try { localStorage.setItem(`scicanvas-${LOCAL_GALLERY_KEY}`, JSON.stringify(localProjects)); } catch {}
    }
  }

  async function saveLocalCopy() {
    const entry = {
      id:crypto.randomUUID(), title:currentTitle(), updatedAt:new Date().toISOString(),
      data:currentProjectPayload(), thumbnail:makeThumbnail()
    };
    localProjects.unshift(entry);
    localProjects = localProjects.slice(0, 100);
    await writeLocalGallery();
    renderLocalGallery();
    message('Saved a local gallery copy.', 'success');
  }

  function restorePayload(data) {
    if (typeof restore !== 'function') throw new Error('Project restore is unavailable.');
    restore(structuredClone(data));
    window.syncPage?.();
    window.renderPages?.();
    window.saveSciCanvasImmediately?.('autosave');
  }

  function galleryCard(entry, cloud = false) {
    const article = document.createElement('article');
    article.className = 'project-gallery-card';
    const isOwner = !cloud || entry.owner_id === currentUser?.id;
    const thumbnail = cloud ? '' : entry.thumbnail;
    article.innerHTML = `
      <div class="project-thumb">${thumbnail ? `<img alt="" src="${thumbnail}">` : '<span>⌬</span>'}</div>
      <div class="project-card-copy"><strong title="${escapeHtml(entry.title)}">${escapeHtml(entry.title)}</strong><small>${new Date(entry.updated_at || entry.updatedAt).toLocaleString()}</small>${cloud && !isOwner ? '<em>Shared with you</em>' : cloud ? '<em>Owned by you</em>' : ''}</div>
      <div class="project-card-actions"></div>`;
    const actions = article.querySelector('.project-card-actions');
    const open = document.createElement('button');
    open.type = 'button'; open.textContent = 'Open';
    open.addEventListener('click', () => cloud ? openCloudProject(entry.id) : (() => { restorePayload(entry.data); drawer.classList.remove('open'); message(`Opened ${entry.title}.`, 'success'); })());
    const duplicate = document.createElement('button');
    duplicate.type = 'button'; duplicate.textContent = 'Duplicate';
    duplicate.addEventListener('click', async () => {
      try {
        if (cloud) {
          await openCloudProject(entry.id, { keepDrawer:true });
          localStorage.removeItem(CURRENT_CLOUD_KEY);
          window.SciCanvasCloud.currentProjectId = '';
          await saveCloudProject({ forceNew:true });
        } else {
          const copy = structuredClone(entry); copy.id = crypto.randomUUID(); copy.title = `${entry.title} copy`; copy.updatedAt = new Date().toISOString();
          localProjects.unshift(copy); await writeLocalGallery(); renderLocalGallery();
        }
      } catch (error) { message(error.message, 'error'); }
    });
    actions.append(open, duplicate);
    if (isOwner) {
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = 'Delete';
      remove.addEventListener('click', async () => {
        if (!confirm(`Delete “${entry.title}” from ${cloud ? 'the cloud vault' : 'this device gallery'}?`)) return;
        try {
          if (cloud) await deleteCloudProject(entry.id);
          else { localProjects = localProjects.filter(item => item.id !== entry.id); await writeLocalGallery(); renderLocalGallery(); }
        } catch (error) { message(error.message, 'error'); }
      });
      actions.appendChild(remove);
    }
    return article;
  }

  function renderLocalGallery() {
    localGrid.replaceChildren();
    if (!localProjects.length) {
      localGrid.innerHTML = '<p class="gallery-empty">No saved gallery copies yet. The active editor project still autosaves separately.</p>';
      return;
    }
    localProjects.forEach(entry => localGrid.appendChild(galleryCard(entry, false)));
  }

  async function loadCloudProjects() {
    cloudGrid.replaceChildren();
    if (!configured()) {
      cloudGrid.innerHTML = '<p class="gallery-empty">Email accounts are not configured on this deployment. Local projects remain fully available.</p>';
      return [];
    }
    if (!currentUser) {
      cloudGrid.innerHTML = '<p class="gallery-empty">Sign in with email to view encrypted projects and shared laboratory workspaces.</p>';
      return [];
    }
    cloudGrid.innerHTML = '<p class="gallery-empty">Loading cloud projects…</p>';
    try {
      const client = await getClient();
      const { data, error } = await client.from('projects').select('id,title,updated_at,revision,owner_id').order('updated_at', { ascending:false });
      if (error) throw error;
      cloudGrid.replaceChildren();
      if (!data?.length) cloudGrid.innerHTML = '<p class="gallery-empty">No cloud projects yet.</p>';
      else data.forEach(entry => cloudGrid.appendChild(galleryCard(entry, true)));
      return data || [];
    } catch (error) {
      cloudGrid.innerHTML = `<p class="gallery-empty">Could not load cloud projects: ${escapeHtml(error.message)}</p>`;
      return [];
    }
  }

  async function saveCloudProject(options = {}) {
    const user = currentUser || await sessionUser();
    if (!user) throw new Error('Sign in before saving to the cloud vault.');
    const client = await getClient();
    let projectId = options.forceNew ? null : localStorage.getItem(CURRENT_CLOUD_KEY);
    let revision = 0;
    if (!projectId) {
      projectId = crypto.randomUUID();
      const { error } = await client.from('projects').insert({ id:projectId, owner_id:user.id, title:currentTitle(), cipher_text:'', iv:'', revision:0, thumbnail:'' });
      if (error) throw error;
    } else {
      const { data, error } = await client.from('projects').select('revision').eq('id', projectId).maybeSingle();
      if (error) throw error;
      revision = Number(data?.revision) || 0;
    }
    const key = await getProjectKey(projectId);
    const encrypted = await encryptJson(currentProjectPayload(), key);
    const nextRevision = revision + 1;
    const { error } = await client.from('projects').update({
      title:currentTitle(), cipher_text:encrypted.cipherText, iv:encrypted.iv,
      revision:nextRevision, thumbnail:'', updated_at:new Date().toISOString()
    }).eq('id', projectId);
    if (error) throw error;
    localStorage.setItem(CURRENT_CLOUD_KEY, projectId);
    window.SciCanvasCloud.currentProjectId = projectId;
    message(`Encrypted cloud copy saved · revision ${nextRevision}.`, 'success');
    await loadCloudProjects();
    window.dispatchEvent(new CustomEvent('scicanvas-cloud-saved', { detail:{ projectId, revision:nextRevision } }));
    return { projectId, revision:nextRevision, key };
  }

  async function openCloudProject(projectId, options = {}) {
    const client = await getClient();
    const { data, error } = await client.from('projects').select('*').eq('id', projectId).single();
    if (error) throw error;
    if (!data.cipher_text || !data.iv) throw new Error('This cloud project has not finished its first encrypted save.');
    const key = await getProjectKey(projectId);
    const payload = await decryptJson(data.cipher_text, data.iv, key);
    restorePayload(payload);
    localStorage.setItem(CURRENT_CLOUD_KEY, projectId);
    window.SciCanvasCloud.currentProjectId = projectId;
    window.dispatchEvent(new CustomEvent('scicanvas-cloud-opened', { detail:{ projectId, revision:data.revision || 0 } }));
    if (!options.keepDrawer) drawer.classList.remove('open');
    message(`Opened encrypted project “${data.title}”.`, 'success');
    return { data, payload, key };
  }

  async function deleteCloudProject(projectId) {
    const client = await getClient();
    const { error } = await client.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    if (localStorage.getItem(CURRENT_CLOUD_KEY) === projectId) {
      localStorage.removeItem(CURRENT_CLOUD_KEY);
      window.SciCanvasCloud.currentProjectId = '';
    }
    await loadCloudProjects();
  }

  function showRecovery(show) {
    recoveryMode = Boolean(show);
    q('#cloudPasswordRecovery').hidden = !recoveryMode;
    q('#cloudSignedOut').hidden = recoveryMode || Boolean(currentUser);
    q('#cloudSignedIn').hidden = recoveryMode || !currentUser;
    if (recoveryMode) setTimeout(() => q('#cloudNewPassword').focus({ preventScroll:true }), 50);
  }

  function updateAuthUi(user) {
    currentUser = user || null;
    if (!recoveryMode) {
      q('#cloudSignedOut').hidden = Boolean(user);
      q('#cloudSignedIn').hidden = !user;
    }
    q('#saveCloudProject').disabled = !user;
    q('#saveCloudProjectAs').disabled = !user;
    if (user) {
      q('#cloudUserEmail').textContent = user.email || 'Email account';
      q('#cloudUserName').textContent = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Scientist';
      cloudStatus.textContent = 'Encrypted cloud vault connected.';
    } else {
      cloudStatus.textContent = configured() ? 'Sign in with email for encrypted sync and shared workspaces.' : 'Local gallery is ready. Email account backend setup is still required.';
    }
    const accountButton = document.getElementById('accountButton');
    if (accountButton) accountButton.textContent = user ? 'Gallery' : 'Sign in';
    loadCloudProjects();
  }

  async function initializeAuth() {
    q('#cloudEmail').value = localStorage.getItem(LAST_EMAIL_KEY) || '';
    if (!configured()) {
      updateAuthUi(null);
      q('#cloudEmailSignIn').disabled = true;
      q('#cloudEmailSignUp').disabled = true;
      q('#cloudForgotPassword').disabled = true;
      message('Local gallery works now. Email accounts need the deployment values described in docs/CLOUD_SETUP.md.', '');
      return;
    }
    try {
      const client = await getClient();
      const { data } = await client.auth.getSession();
      updateAuthUi(data.session?.user || null);
      const subscription = client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          currentUser = session?.user || currentUser;
          showRecovery(true);
          message('Recovery link accepted. Choose a new password.', 'success');
          return;
        }
        if (event === 'USER_UPDATED' && recoveryMode) showRecovery(false);
        updateAuthUi(session?.user || null);
        if (event === 'SIGNED_IN') message('Signed in.', 'success');
        if (event === 'SIGNED_OUT') message('Signed out. Local projects remain on this device.', 'success');
      });
      authSubscription = subscription.data.subscription;
    } catch (error) {
      message(error.message, 'error');
    }
  }

  function rememberEmail() {
    const email = q('#cloudEmail').value.trim().toLowerCase();
    if (email) localStorage.setItem(LAST_EMAIL_KEY, email);
    return email;
  }

  async function emailAuth(mode) {
    try {
      const client = await getClient();
      const email = rememberEmail();
      const password = q('#cloudPassword').value;
      if (!email) throw new Error('Enter your email address.');
      if (mode !== 'reset' && password.length < 8) throw new Error('Use a password with at least 8 characters.');
      message(mode === 'signup' ? 'Creating account…' : mode === 'reset' ? 'Sending recovery email…' : 'Signing in…');
      if (mode === 'signup') {
        const localName = localStorage.getItem('scicanvas-user-name-v1') || '';
        const { data, error } = await client.auth.signUp({
          email, password,
          options:{ emailRedirectTo:CONFIG.redirectUrl, data:{ full_name:localName || email.split('@')[0] } }
        });
        if (error) throw error;
        q('#cloudPassword').value = '';
        if (data.session) message('Account created and signed in.', 'success');
        else {
          q('#cloudResendConfirmation').hidden = false;
          message('Account created. Open the confirmation email, then return here to sign in.', 'success');
        }
      } else if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo:CONFIG.redirectUrl });
        if (error) throw error;
        message('Password recovery email sent. Open the link in that email to choose a new password.', 'success');
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        q('#cloudPassword').value = '';
        message('Signed in.', 'success');
      }
    } catch (error) { message(error.message, 'error'); }
  }

  async function resendConfirmation() {
    try {
      const email = rememberEmail();
      if (!email) throw new Error('Enter your email address first.');
      const client = await getClient();
      const { error } = await client.auth.resend({ type:'signup', email, options:{ emailRedirectTo:CONFIG.redirectUrl } });
      if (error) throw error;
      message('A new confirmation email was sent.', 'success');
    } catch (error) { message(error.message, 'error'); }
  }

  q('#cloudEmailSignIn').addEventListener('click', () => emailAuth('signin'));
  q('#cloudEmailSignUp').addEventListener('click', () => emailAuth('signup'));
  q('#cloudForgotPassword').addEventListener('click', () => emailAuth('reset'));
  q('#cloudResendConfirmation').addEventListener('click', resendConfirmation);
  q('#cloudTogglePassword').addEventListener('click', () => {
    const input = q('#cloudPassword');
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    q('#cloudTogglePassword').textContent = reveal ? 'Hide' : 'Show';
    q('#cloudTogglePassword').setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
  });
  q('#cloudPassword').addEventListener('keydown', event => { if (event.key === 'Enter') emailAuth('signin'); });
  q('#cloudSignOut').addEventListener('click', async () => {
    try {
      const { error } = await (await getClient()).auth.signOut();
      if (error) throw error;
      showRecovery(false);
    } catch (error) { message(error.message, 'error'); }
  });
  q('#cloudUpdatePassword').addEventListener('click', async () => {
    try {
      const password = q('#cloudNewPassword').value;
      const confirmPassword = q('#cloudConfirmPassword').value;
      if (password.length < 8) throw new Error('Use at least 8 characters.');
      if (password !== confirmPassword) throw new Error('The two passwords do not match.');
      const { error } = await (await getClient()).auth.updateUser({ password });
      if (error) throw error;
      q('#cloudNewPassword').value = '';
      q('#cloudConfirmPassword').value = '';
      showRecovery(false);
      updateAuthUi(currentUser);
      message('Password updated. You are signed in.', 'success');
      history.replaceState({}, document.title, `${location.pathname}${location.search ? '' : ''}`);
    } catch (error) { message(error.message, 'error'); }
  });
  q('#cloudCancelRecovery').addEventListener('click', () => { showRecovery(false); updateAuthUi(currentUser); message('Password change cancelled.'); });
  q('#saveLocalGallery').addEventListener('click', () => saveLocalCopy().catch(error => message(error.message, 'error')));
  q('#saveCloudProject').addEventListener('click', () => saveCloudProject().catch(error => message(error.message, 'error')));
  q('#saveCloudProjectAs').addEventListener('click', () => saveCloudProject({ forceNew:true }).catch(error => message(error.message, 'error')));
  q('#cloudRefreshButton').addEventListener('click', async () => { localProjects = await readLocalGallery(); renderLocalGallery(); await loadCloudProjects(); });

  const accountButton = document.createElement('button');
  accountButton.id = 'accountButton';
  accountButton.type = 'button';
  accountButton.textContent = 'Sign in';
  accountButton.title = 'Email account and project gallery';
  accountButton.addEventListener('click', () => drawer.classList.toggle('open'));
  document.querySelector('.title-actions')?.prepend(accountButton);

  const style = document.createElement('style');
  style.textContent = `
    #accountButton{border-color:#9ab8bb;background:linear-gradient(145deg,#eef8f7,#f4f1fb);color:#315f69;font-weight:750}.cloud-gallery-drawer{width:min(920px,calc(100vw - 18px))!important}.cloud-hero,.cloud-user-row,.gallery-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.cloud-hero{padding:13px;border:1px solid #c9d8de;border-radius:13px;background:linear-gradient(135deg,#edf7f6,#f6f3fb)}.cloud-hero strong,.cloud-hero small,.cloud-user-row strong,.cloud-user-row small,.email-account-heading strong,.email-account-heading small{display:block}.cloud-hero strong{font-size:15px}.cloud-hero small,.cloud-user-row small,.email-account-heading small{margin-top:3px;color:#6d7b8c;font-size:10px}.cloud-account-panel{display:grid;gap:10px;margin-top:11px;padding:13px;border:1px solid #d7e0e8;border-radius:12px;background:rgba(255,255,255,.76)}.email-account-heading{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #d6e2e5;border-radius:10px;background:linear-gradient(135deg,#f0f8f7,#f6f3fa)}.email-account-heading>span{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,#4f8992,#746aa0);color:white;font-size:18px;font-weight:800}.cloud-account-panel label{display:grid;gap:5px;color:#617086;font-size:10px}.cloud-account-panel input{min-height:38px;border:1px solid #cbd6e2;border-radius:9px;background:white;padding:8px}.password-field{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}.password-field button{min-width:58px}.cloud-account-actions,.cloud-toolbar{display:flex;flex-wrap:wrap;gap:8px}.cloud-account-actions button,.cloud-toolbar button{min-height:38px}.cloud-account-actions .primary,.cloud-toolbar .primary{background:#3f69b9;color:white;border-color:#3f69b9}.cloud-note,.cloud-message,.cloud-password-recovery p{margin:0;color:#748196;font-size:9px;line-height:1.45}.cloud-message[data-kind="error"]{color:#b42318}.cloud-message[data-kind="success"]{color:#28745f}.cloud-password-recovery{display:grid;gap:8px;padding:11px;border:1px solid #9fc9bd;border-radius:11px;background:#eef9f5}.cloud-password-recovery[hidden]{display:none}.cloud-password-recovery>strong{font-size:12px}.cloud-user-avatar{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:linear-gradient(145deg,#4f89a0,#786ca3);color:white;font-weight:800}.cloud-user-row>span:nth-child(2){flex:1}.cloud-toolbar{margin-top:11px}.gallery-section{margin-top:16px}.gallery-heading h3{margin:0;font-size:12px}.gallery-heading small{color:#7a8798;font-size:9px}.project-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:8px}.project-gallery-card{min-width:0;display:grid;grid-template-columns:100px minmax(0,1fr);gap:10px;padding:9px;border:1px solid #d5dfe8;border-radius:12px;background:rgba(255,255,255,.88)}.project-thumb{grid-row:1/3;width:100px;height:72px;display:grid;place-items:center;overflow:hidden;border-radius:8px;background:#eef2f5;color:#8a9aab;font-size:24px}.project-thumb img{width:100%;height:100%;object-fit:contain}.project-card-copy{min-width:0}.project-card-copy strong,.project-card-copy small,.project-card-copy em{display:block}.project-card-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.project-card-copy small{margin-top:4px;color:#7a8797;font-size:8px}.project-card-copy em{margin-top:4px;color:#4d7896;font-size:8px}.project-card-actions{display:flex;gap:5px;align-self:end;flex-wrap:wrap}.project-card-actions button{padding:5px 7px;font-size:8px}.gallery-empty{grid-column:1/-1;margin:0;padding:16px;border:1px dashed #cfd9e3;border-radius:10px;color:#7c8999;text-align:center;font-size:9px}.cloud-toolbar button:disabled,.cloud-account-actions button:disabled{opacity:.5}@media(max-width:700px){.project-gallery{grid-template-columns:1fr}.project-gallery-card{grid-template-columns:82px minmax(0,1fr)}.project-thumb{width:82px;height:64px}}`;
  document.head.appendChild(style);

  window.SciCanvasCloud = {
    configured, getClient, getUser:() => currentUser, getProjectKey, encryptJson, decryptJson,
    currentProjectId:localStorage.getItem(CURRENT_CLOUD_KEY) || '',
    open:() => drawer.classList.add('open'), saveCurrentProject:saveCloudProject,
    openProject:openCloudProject, listProjects:loadCloudProjects,
    invite:async (projectId, email, role = 'editor') => {
      const client = await getClient();
      const { data, error } = await client.functions.invoke('invite-member', { body:{ projectId, email, role } });
      if (error) throw error;
      return data;
    }
  };
  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());

  Promise.resolve(readLocalGallery()).then(entries => { localProjects = entries; renderLocalGallery(); });
  initializeAuth();
  const register = () => window.SciCanvasPro?.register('cloud', () => drawer.classList.add('open'));
  register(); setTimeout(register, 100);
})();