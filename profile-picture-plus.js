(() => {
  if (window.__figureLoomProfilePicturePlusV1) return;
  window.__figureLoomProfilePicturePlusV1 = true;

  const NAME_KEY = 'scicanvas-user-name-v1';
  const AVATAR_KEY = 'scicanvas-profile-avatar-v1';
  const IMAGE_KEY = 'scicanvas-profile-avatar-image-v1';
  const OPTIONS = [
    ['initial','Initial',''],
    ['dna','DNA','🧬'],
    ['flask','Flask','⚗'],
    ['molecule','Molecule','⌬'],
    ['cell','Cell','◉'],
    ['wave','Signal','∿'],
    ['star','Marker','✦'],
    ['microscope','Microscope','🔬'],
    ['petri','Petri dish','🧫'],
    ['atom','Atom','⚛'],
    ['leaf','Leaf','🌿'],
    ['brain','Brain','🧠'],
    ['microbe','Microbe','🦠']
  ];
  const OPTION_MAP = new Map(OPTIONS.map(option => [option[0], option]));
  let activeUser = window.SciCanvasCloud?.getUser?.() || null;
  let authSubscription = null;
  let applying = false;

  function cleanName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  }

  function displayName(user = activeUser) {
    return cleanName(
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      localStorage.getItem(NAME_KEY) ||
      user?.email?.split('@')[0] ||
      'Scientist'
    );
  }

  function initials(value) {
    const parts = cleanName(value).split(' ').filter(Boolean);
    if (!parts.length) return 'S';
    return parts.length === 1 ? parts[0][0].toUpperCase() : `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
  }

  function storedImage(user = activeUser) {
    const local = localStorage.getItem(IMAGE_KEY) || '';
    const remote = user?.user_metadata?.avatar_data_url || '';
    const value = local || remote;
    return /^data:image\/(?:png|jpe?g|webp);base64,/i.test(value) ? value : '';
  }

  function currentChoice(user = activeUser) {
    const value = localStorage.getItem(AVATAR_KEY) || user?.user_metadata?.avatar_symbol || 'initial';
    if (value === 'custom' && storedImage(user)) return 'custom';
    return OPTION_MAP.has(value) ? value : 'initial';
  }

  function descriptor(user = activeUser) {
    const name = displayName(user);
    const choice = currentChoice(user);
    if (choice === 'custom') return { kind:'image', value:storedImage(user), label:name, choice };
    if (choice !== 'initial') return { kind:'symbol', value:OPTION_MAP.get(choice)?.[2] || initials(name), label:name, choice };
    return { kind:'initial', value:initials(name), label:name, choice:'initial' };
  }

  function renderInto(target, picture = descriptor()) {
    if (!target) return;
    const signature = `${picture.kind}:${picture.value}`;
    const existing = target.querySelector(':scope > .figureloom-profile-picture');
    if (target.dataset.figureloomProfileSignature === signature && existing) return;
    target.dataset.figureloomProfileSignature = signature;
    target.replaceChildren();

    if (picture.kind === 'image') {
      const image = document.createElement('img');
      image.className = 'figureloom-profile-picture figureloom-profile-image';
      image.src = picture.value;
      image.alt = '';
      image.addEventListener('error', () => {
        target.dataset.figureloomProfileSignature = '';
        renderInto(target, { kind:'initial', value:initials(picture.label), label:picture.label, choice:'initial' });
      }, { once:true });
      target.appendChild(image);
      return;
    }

    const face = document.createElement('span');
    face.className = `figureloom-profile-picture figureloom-profile-${picture.kind}`;
    face.textContent = picture.value;
    target.appendChild(face);
  }

  function dispatchChange() {
    window.dispatchEvent(new CustomEvent('scicanvas-avatar-changed', { detail:{ avatar:currentChoice(), picture:descriptor() } }));
  }

  async function syncMetadata(choice, image = storedImage()) {
    try {
      const client = await window.SciCanvasCloud?.getClient?.();
      const user = window.SciCanvasCloud?.getUser?.();
      if (!client || !user) return;
      const metadata = { ...(user.user_metadata || {}), avatar_symbol:choice };
      if (choice === 'custom' && image) metadata.avatar_data_url = image;
      const { data, error } = await client.auth.updateUser({ data:metadata });
      if (error) throw error;
      activeUser = data.user || user;
    } catch (error) {
      console.warn('Could not sync FigureLoom profile picture', error);
    }
  }

  function choose(choice) {
    if (choice !== 'custom' && !OPTION_MAP.has(choice)) return;
    localStorage.setItem(AVATAR_KEY, choice);
    if (activeUser) activeUser.user_metadata = { ...(activeUser.user_metadata || {}), avatar_symbol:choice };
    apply();
    dispatchChange();
    void syncMetadata(choice);
  }

  function loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The selected image could not be opened.')); };
      image.src = url;
    });
  }

  async function compressedPicture(file) {
    if (!file?.type?.startsWith('image/')) throw new Error('Choose a PNG, JPEG, or WebP image.');
    if (file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB.');
    const image = await loadImageElement(file);
    const side = Math.max(1, Math.min(image.naturalWidth, image.naturalHeight));
    const sourceX = Math.max(0, (image.naturalWidth - side) / 2);
    const sourceY = Math.max(0, (image.naturalHeight - side) / 2);

    function draw(size, type, quality) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d', { alpha:false });
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size, size);
      context.drawImage(image, sourceX, sourceY, side, side, 0, 0, size, size);
      return canvas.toDataURL(type, quality);
    }

    let data = draw(160, 'image/webp', .82);
    if (!/^data:image\/webp/i.test(data) || data.length > 60000) data = draw(128, 'image/jpeg', .72);
    if (data.length > 80000) data = draw(96, 'image/jpeg', .62);
    return data;
  }

  function uploadInput() {
    let input = document.getElementById('figureloomProfilePictureUpload');
    if (input) return input;
    input = document.createElement('input');
    input.id = 'figureloomProfilePictureUpload';
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.hidden = true;
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      try {
        const image = await compressedPicture(file);
        localStorage.setItem(IMAGE_KEY, image);
        localStorage.setItem(AVATAR_KEY, 'custom');
        if (activeUser) activeUser.user_metadata = { ...(activeUser.user_metadata || {}), avatar_symbol:'custom', avatar_data_url:image };
        apply();
        dispatchChange();
        await syncMetadata('custom', image);
      } catch (error) {
        window.SciCanvasToast?.(error.message || 'That profile picture could not be used.', 'warning', 4200);
      }
    });
    document.body.appendChild(input);
    return input;
  }

  function makeOption(id, label, symbol) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.scAvatarPlus = id;
    button.setAttribute('aria-label', label);
    button.innerHTML = `<span>${symbol || initials(displayName())}</span><small>${label}</small>`;
    button.addEventListener('click', () => choose(id));
    return button;
  }

  function extendPicker(picker) {
    if (!picker) return;
    OPTIONS.forEach(([id,label,symbol]) => {
      if (picker.querySelector(`[data-sc-avatar-option="${id}"],[data-sc-avatar-plus="${id}"]`)) return;
      picker.appendChild(makeOption(id, label, symbol));
    });
    if (!picker.querySelector('[data-sc-avatar-upload]')) {
      const upload = document.createElement('button');
      upload.type = 'button';
      upload.dataset.scAvatarUpload = '1';
      upload.setAttribute('aria-label', 'Upload a profile picture');
      upload.innerHTML = '<span>＋</span><small>Upload</small>';
      upload.addEventListener('click', () => uploadInput().click());
      picker.appendChild(upload);
    }
  }

  function updateButtons() {
    const choice = currentChoice();
    document.querySelectorAll('[data-sc-avatar-option],[data-sc-avatar-plus]').forEach(button => {
      const id = button.dataset.scAvatarOption || button.dataset.scAvatarPlus;
      button.setAttribute('aria-pressed', String(id === choice));
      if (id === 'initial') button.querySelector('span')?.replaceChildren(document.createTextNode(initials(displayName())));
    });
    document.querySelectorAll('[data-sc-avatar-upload]').forEach(button => button.setAttribute('aria-pressed', String(choice === 'custom')));
  }

  function installShareIdentity() {
    const drawer = document.getElementById('collaborationDrawer');
    const session = drawer?.querySelector('.collab-session-card');
    if (!drawer || !session) return;
    let row = drawer.querySelector('#figureloomShareIdentity');
    if (!row) {
      row = document.createElement('section');
      row.id = 'figureloomShareIdentity';
      row.className = 'figureloom-share-identity';
      row.innerHTML = '<div class="figureloom-share-avatar"></div><div><strong></strong><small>This profile picture is shown in shared sessions.</small></div>';
      session.insertAdjacentElement('beforebegin', row);
    }
    renderInto(row.querySelector('.figureloom-share-avatar'));
    row.querySelector('strong').textContent = `Sharing as ${displayName()}`;
  }

  function apply() {
    if (applying) return;
    applying = true;
    try {
      document.querySelectorAll('.scientific-avatar-picker,.welcome-avatar-options').forEach(extendPicker);
      document.querySelectorAll('[data-sc-avatar-preview]').forEach(target => renderInto(target));

      const headerFace = document.querySelector('#accountProfileButton .account-avatar-face');
      if (headerFace) renderInto(headerFace);
      const drawerFace = document.querySelector('#cloudSignedIn .cloud-user-avatar .account-avatar-face');
      if (drawerFace) renderInto(drawerFace);

      updateButtons();
      installShareIdentity();
    } finally {
      applying = false;
    }
  }

  const style = document.createElement('style');
  style.id = 'figureloomProfilePicturePlusStyle';
  style.textContent = `
    .figureloom-profile-picture{display:grid!important;place-items:center;width:100%;height:100%;margin:0!important;line-height:1}
    .figureloom-profile-image{display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;border-radius:inherit}
    .figureloom-profile-initial{font-size:inherit;font-weight:850}.figureloom-profile-symbol{font-size:inherit}
    .scientific-avatar-picker{grid-template-columns:repeat(auto-fit,minmax(62px,1fr))!important}
    .scientific-avatar-picker [data-sc-avatar-upload]{border-style:dashed!important}
    .scientific-avatar-picker [data-sc-avatar-plus][aria-pressed="true"],.scientific-avatar-picker [data-sc-avatar-upload][aria-pressed="true"]{border-color:var(--figureloom-ui-accent,#2f7468)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 16%,transparent)!important}
    .sc-profile-avatar,.cloud-user-avatar,#accountProfileButton .account-avatar-face,.figureloom-share-avatar{overflow:hidden}
    .sc-profile-avatar .figureloom-profile-picture{font-size:24px}.cloud-user-avatar .figureloom-profile-picture{font-size:19px}#accountProfileButton .figureloom-profile-picture{font-size:18px}
    .figureloom-share-identity{display:grid;grid-template-columns:46px minmax(0,1fr);align-items:center;gap:11px;margin-bottom:12px;padding:10px 12px;border:1px solid var(--figureloom-ui-line,#cddbd7);border-radius:13px;background:var(--figureloom-ui-accent-soft,#dff1ec)}
    .figureloom-share-avatar{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;color:#fff;background:linear-gradient(145deg,var(--figureloom-ui-accent,#2f7468),var(--figureloom-ui-accent-strong,#195c51));font-size:21px;font-weight:850}
    .figureloom-share-identity strong,.figureloom-share-identity small{display:block}.figureloom-share-identity strong{color:var(--figureloom-ui-text,#172321);font-size:11px}.figureloom-share-identity small{margin-top:3px;color:var(--figureloom-ui-muted,#60706c);font-size:8px;line-height:1.35}
    .collab-person-avatar{display:grid;place-items:center;flex:0 0 22px;width:22px;height:22px;overflow:hidden;border-radius:50%;color:#fff;background:var(--collab-person-color,var(--figureloom-ui-accent,#2f7468));font-size:11px;font-weight:800}
    @media(max-width:520px){.scientific-avatar-picker{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(() => requestAnimationFrame(apply));
  observer.observe(document.body, { childList:true, subtree:true });
  addEventListener('scicanvas-avatar-changed', () => requestAnimationFrame(apply));
  addEventListener('scicanvas-collaboration-opened', () => requestAnimationFrame(apply));
  addEventListener('scicanvas-cloud-opened', () => requestAnimationFrame(apply));
  addEventListener('storage', event => {
    if ([NAME_KEY,AVATAR_KEY,IMAGE_KEY].includes(event.key)) requestAnimationFrame(apply);
  });

  Promise.resolve().then(async () => {
    try {
      const client = await window.SciCanvasCloud?.getClient?.();
      if (!client) return;
      const { data } = await client.auth.getSession();
      activeUser = data.session?.user || activeUser;
      apply();
      const listener = client.auth.onAuthStateChange((_event, session) => {
        activeUser = session?.user || null;
        apply();
      });
      authSubscription = listener.data.subscription;
    } catch {
      apply();
    }
  });

  addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());
  uploadInput();
  apply();

  window.FigureLoomProfilePicture = Object.freeze({ descriptor, renderInto, displayName, choose, apply });
})();
