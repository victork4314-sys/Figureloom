(() => {
  const drawer = document.getElementById('collaborationDrawer');
  if (!drawer) return;

  const SHARE_PARAM = 'scshare';
  const PENDING_KEY = 'scicanvas-pending-share-link-v1';
  let authSubscription = null;
  let latestShareUrl = '';

  const messageNode = drawer.querySelector('#collabMessage');
  const emailNote = drawer.querySelector('.collab-invite-row + .collab-note');
  if (emailNote) emailNote.textContent = 'Existing accounts receive access immediately. New emails receive access automatically after that address creates an account.';

  function message(text, kind = '') {
    if (!messageNode) return;
    messageNode.textContent = text || '';
    messageNode.dataset.kind = kind;
  }

  function cloud() {
    if (!window.SciCanvasCloud) throw new Error('The account and cloud project module is unavailable.');
    return window.SciCanvasCloud;
  }

  function projectId() {
    return cloud().currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '';
  }

  function currentShareToken() {
    const fromUrl = new URL(location.href).searchParams.get(SHARE_PARAM);
    return fromUrl || sessionStorage.getItem(PENDING_KEY) || '';
  }

  function clearShareToken() {
    sessionStorage.removeItem(PENDING_KEY);
    const url = new URL(location.href);
    url.searchParams.delete(SHARE_PARAM);
    history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  function buildShareUrl(token) {
    const url = new URL(location.href);
    url.hash = '';
    url.search = '';
    url.searchParams.set(SHARE_PARAM, token);
    return url.toString();
  }

  function copyText(value) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    return Promise.resolve();
  }

  const emailSection = drawer.querySelector('.collab-invite-row')?.closest('.collab-section');
  const linkSection = document.createElement('section');
  linkSection.className = 'collab-section collab-link-section';
  linkSection.innerHTML = `
    <div class="collab-heading"><h3>Share with a secure link</h3><span class="collab-link-badge">Sign-in required</span></div>
    <p class="collab-note">Anyone with the link can join with the selected role after signing in. Links expire automatically and can be revoked by the project owner.</p>
    <div class="collab-link-controls">
      <select id="collabLinkRole" aria-label="Share-link role"><option value="reviewer">Can review</option><option value="editor">Can edit</option><option value="viewer">Can view</option></select>
      <select id="collabLinkExpiry" aria-label="Share-link expiry"><option value="24">Expires in 24 hours</option><option value="168" selected>Expires in 7 days</option><option value="720">Expires in 30 days</option></select>
      <button id="collabCreateLink" type="button" class="primary">Create link</button>
      <button id="collabRevokeLinks" type="button">Revoke links</button>
    </div>
    <div id="collabLinkOutput" class="collab-link-output" hidden>
      <input id="collabShareUrl" type="text" readonly aria-label="Collaboration share link">
      <button id="collabCopyLink" type="button">Copy link</button>
      <button id="collabSendLink" type="button">Send link</button>
    </div>
  `;
  emailSection?.insertAdjacentElement('afterend', linkSection);

  const roleSelect = linkSection.querySelector('#collabLinkRole');
  const expirySelect = linkSection.querySelector('#collabLinkExpiry');
  const createButton = linkSection.querySelector('#collabCreateLink');
  const revokeButton = linkSection.querySelector('#collabRevokeLinks');
  const output = linkSection.querySelector('#collabLinkOutput');
  const urlInput = linkSection.querySelector('#collabShareUrl');
  const copyButton = linkSection.querySelector('#collabCopyLink');
  const sendButton = linkSection.querySelector('#collabSendLink');

  async function ownerState() {
    const id = projectId();
    const user = cloud().getUser?.();
    if (!id || !user) return { owner:false, id };
    try {
      const client = await cloud().getClient();
      const { data, error } = await client.from('projects').select('owner_id').eq('id', id).maybeSingle();
      if (error) throw error;
      return { owner:data?.owner_id === user.id, id };
    } catch {
      return { owner:false, id };
    }
  }

  async function updateControls() {
    const { owner, id } = await ownerState();
    const enabled = Boolean(owner && id);
    [roleSelect, expirySelect, createButton, revokeButton].forEach(control => { control.disabled = !enabled; });
    createButton.title = enabled ? 'Create an expiring collaboration link' : id ? 'Only the project owner can create share links' : 'Save or open a cloud project first';
    revokeButton.title = createButton.title;
  }

  async function createShareLink() {
    try {
      const id = projectId();
      if (!cloud().getUser?.()) throw new Error('Sign in before creating a share link.');
      if (!id) throw new Error('Save or open a cloud project first.');
      createButton.disabled = true;
      createButton.textContent = 'Creating…';
      const client = await cloud().getClient();
      const { data, error } = await client.rpc('create_project_share_link', {
        target_project:id,
        target_role:roleSelect.value,
        valid_hours:Number(expirySelect.value)
      });
      if (error) throw error;
      latestShareUrl = buildShareUrl(data.token);
      urlInput.value = latestShareUrl;
      output.hidden = false;
      message(`${data.role} link created. It expires ${new Date(data.expires_at).toLocaleString()}.`, 'success');
    } catch (error) {
      message(error.message, 'error');
    } finally {
      createButton.textContent = 'Create link';
      await updateControls();
    }
  }

  async function revokeShareLinks() {
    try {
      const id = projectId();
      if (!id) throw new Error('Open a cloud project first.');
      const client = await cloud().getClient();
      const { data, error } = await client.rpc('revoke_project_share_links', { target_project:id });
      if (error) throw error;
      latestShareUrl = '';
      output.hidden = true;
      urlInput.value = '';
      message(`${Number(data) || 0} active share link${Number(data) === 1 ? '' : 's'} revoked.`, 'success');
    } catch (error) {
      message(error.message, 'error');
    }
  }

  async function acceptShareLink(token = currentShareToken()) {
    if (!token) return;
    sessionStorage.setItem(PENDING_KEY, token);
    const user = cloud().getUser?.();
    if (!user) {
      document.getElementById('cloudGalleryDrawer')?.classList.add('open');
      const accountMessage = document.getElementById('cloudAccountMessage');
      if (accountMessage) {
        accountMessage.textContent = 'Sign in or create an account to accept this collaboration link.';
        accountMessage.dataset.kind = 'success';
      }
      return;
    }

    try {
      message('Accepting collaboration link…');
      const client = await cloud().getClient();
      const { data, error } = await client.rpc('accept_project_share_link', { link_token:token });
      if (error) throw error;
      clearShareToken();
      await cloud().openProject(data.project_id);
      drawer.classList.add('open');
      message(`Joined “${data.title}” as ${data.role}.`, 'success');
      window.dispatchEvent(new CustomEvent('scicanvas-share-link-accepted', { detail:data }));
    } catch (error) {
      message(error.message, 'error');
      drawer.classList.add('open');
    }
  }

  createButton.addEventListener('click', createShareLink);
  revokeButton.addEventListener('click', revokeShareLinks);
  copyButton.addEventListener('click', async () => {
    try {
      await copyText(latestShareUrl || urlInput.value);
      copyButton.textContent = 'Copied';
      setTimeout(() => { copyButton.textContent = 'Copy link'; }, 1400);
    } catch (error) { message(error.message, 'error'); }
  });
  sendButton.addEventListener('click', async () => {
    const url = latestShareUrl || urlInput.value;
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title:`Collaborate on ${document.getElementById('documentName')?.value || 'a SciCanvas project'}`, text:'Open this link to join the SciCanvas project.', url });
      } else {
        await copyText(url);
        message('Sharing is not available in this browser, so the link was copied instead.', 'success');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') message(error.message, 'error');
    }
  });

  window.openSciCanvasCollaboration = () => {
    drawer.classList.add('open');
    updateControls();
  };

  window.addEventListener('scicanvas-collaboration-opened', updateControls);
  window.addEventListener('scicanvas-cloud-opened', updateControls);
  window.addEventListener('scicanvas-cloud-saved', updateControls);
  window.addEventListener('scicanvas-share-link-accepted', updateControls);

  const style = document.createElement('style');
  style.id = 'collaborationShareLinkStyle';
  style.textContent = `
    .collab-link-section{padding:13px;border:1px solid rgba(99,135,158,.22);border-radius:13px;background:linear-gradient(145deg,rgba(241,249,248,.88),rgba(246,243,250,.88))}.collab-link-badge{padding:4px 7px;border-radius:999px;background:rgba(81,137,148,.1);color:#567e87;font-size:8px;font-weight:800}.collab-link-controls{display:grid;grid-template-columns:130px minmax(150px,1fr) auto auto;gap:7px;margin-top:9px}.collab-link-controls select,.collab-link-output input{min-height:38px;border:1px solid #cbd7e2;border-radius:10px;background:white;padding:8px;color:#4d5e73}.collab-link-controls button,.collab-link-output button{min-height:38px;border-radius:10px;padding:0 12px}.collab-link-controls .primary{background:#3f69b9;color:white;border-color:#3f69b9}.collab-link-output{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:7px;margin-top:8px}.collab-link-output[hidden]{display:none}.collab-link-output input{font-size:9px;color:#53667b;background:rgba(255,255,255,.9)}@media(max-width:700px){.collab-link-controls{grid-template-columns:1fr 1fr}.collab-link-controls button{grid-column:span 1}.collab-link-output{grid-template-columns:1fr 1fr}.collab-link-output input{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  updateControls();
  Promise.resolve().then(async () => {
    try {
      const client = await cloud().getClient();
      const listener = client.auth.onAuthStateChange((_event, session) => {
        if (session?.user && currentShareToken()) acceptShareLink();
        updateControls();
      });
      authSubscription = listener.data.subscription;
      if (currentShareToken()) acceptShareLink();
    } catch (error) {
      if (currentShareToken()) message(error.message, 'error');
    }
  });

  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());
})();