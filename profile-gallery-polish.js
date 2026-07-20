(() => {
  const NAME_KEY = 'scicanvas-user-name-v1';
  const AVATAR_KEY = 'scicanvas-profile-avatar-v1';
  const OPTIONS = [
    ['initial', 'Initial', ''],
    ['dna', 'DNA', '🧬'],
    ['flask', 'Flask', '⚗'],
    ['molecule', 'Molecule', '⌬'],
    ['cell', 'Cell', '◉'],
    ['wave', 'Signal', '∿'],
    ['star', 'Marker', '✦']
  ];

  let authSubscription = null;
  let activeUser = window.SciCanvasCloud?.getUser?.() || null;

  function cleanName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 32);
  }

  function currentName(user = activeUser) {
    return cleanName(user?.user_metadata?.full_name || user?.user_metadata?.name || localStorage.getItem(NAME_KEY) || user?.email?.split('@')[0] || 'Scientist');
  }

  function initials(name) {
    const parts = cleanName(name).split(' ').filter(Boolean);
    if (!parts.length) return 'S';
    return parts.length === 1 ? parts[0][0].toUpperCase() : `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
  }

  function currentChoice(user = activeUser) {
    const value = localStorage.getItem(AVATAR_KEY) || user?.user_metadata?.avatar_symbol || 'initial';
    return OPTIONS.some(([id]) => id === value) ? value : 'initial';
  }

  function avatarText(choice, user = activeUser) {
    if (choice === 'initial') return initials(currentName(user));
    return OPTIONS.find(([id]) => id === choice)?.[2] || initials(currentName(user));
  }

  function renderPreview(target, user = activeUser) {
    if (!target) return;
    const choice = currentChoice(user);
    target.textContent = avatarText(choice, user);
    target.dataset.avatar = choice;
  }

  function dispatchAvatarChange() {
    window.dispatchEvent(new CustomEvent('scicanvas-avatar-changed', { detail:{ avatar:currentChoice() } }));
  }

  async function chooseAvatar(choice) {
    if (!OPTIONS.some(([id]) => id === choice)) return;
    localStorage.setItem(AVATAR_KEY, choice);
    const liveUser = window.SciCanvasCloud?.getUser?.();
    if (liveUser) {
      liveUser.user_metadata = { ...(liveUser.user_metadata || {}), avatar_symbol:choice };
      activeUser = liveUser;
    }
    document.querySelectorAll('[data-sc-avatar-option]').forEach(button => {
      button.setAttribute('aria-pressed', button.dataset.scAvatarOption === choice ? 'true' : 'false');
    });
    document.querySelectorAll('[data-sc-avatar-preview]').forEach(target => renderPreview(target));
    dispatchAvatarChange();

    try {
      const client = await window.SciCanvasCloud?.getClient?.();
      const user = window.SciCanvasCloud?.getUser?.();
      if (!client || !user) return;
      const { data, error } = await client.auth.updateUser({
        data:{ ...(user.user_metadata || {}), avatar_symbol:choice }
      });
      if (error) throw error;
      activeUser = data.user || user;
      dispatchAvatarChange();
    } catch (error) {
      console.warn('Could not sync SciCanvas avatar choice', error);
    }
  }

  function avatarPicker(className = '') {
    const group = document.createElement('div');
    group.className = `scientific-avatar-picker ${className}`.trim();
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Choose a scientific profile picture');
    OPTIONS.forEach(([id, label, symbol]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.scAvatarOption = id;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', currentChoice() === id ? 'true' : 'false');
      button.innerHTML = `<span>${id === 'initial' ? initials(currentName()) : symbol}</span><small>${label}</small>`;
      button.addEventListener('click', () => chooseAvatar(id));
      group.appendChild(button);
    });
    return group;
  }

  function installAccountProfileCard() {
    const drawer = document.getElementById('cloudGalleryDrawer');
    const panel = drawer?.querySelector('.cloud-account-panel');
    if (!drawer || !panel || drawer.querySelector('#scAccountProfileCard')) return;

    const card = document.createElement('section');
    card.id = 'scAccountProfileCard';
    card.className = 'sc-account-profile-card';
    card.innerHTML = `
      <div class="sc-profile-summary">
        <div class="sc-profile-avatar" data-sc-avatar-preview></div>
        <div class="sc-profile-copy"><strong id="scProfileDisplayName"></strong><small id="scProfileSubtitle">Local SciCanvas profile</small></div>
        <div class="sc-profile-actions">
          <button id="scProfileEditName" type="button">Edit name</button>
          <button id="scProfileSignOut" type="button" hidden>Sign out</button>
        </div>
      </div>
      <div class="sc-profile-picker-heading"><span>Choose your profile symbol</span><small>Only changes the app profile—not your figures or exports.</small></div>
    `;
    card.appendChild(avatarPicker('account-avatar-options'));
    panel.insertAdjacentElement('beforebegin', card);

    card.querySelector('#scProfileEditName').addEventListener('click', () => window.openSciCanvasWelcome?.({ edit:true }));
    card.querySelector('#scProfileSignOut').addEventListener('click', () => drawer.querySelector('#cloudSignOut')?.click());
    renderProfileCard();
  }

  function renderProfileCard() {
    const drawer = document.getElementById('cloudGalleryDrawer');
    const card = drawer?.querySelector('#scAccountProfileCard');
    if (!card) return;

    const signedIn = Boolean(activeUser);
    card.hidden = !signedIn;
    const accountPanel = drawer.querySelector('.cloud-account-panel');
    if (accountPanel) accountPanel.hidden = signedIn;

    card.querySelector('#scProfileDisplayName').textContent = currentName();
    card.querySelector('#scProfileSubtitle').textContent = activeUser?.email || 'Local SciCanvas profile · sign in when you want cloud projects';
    renderPreview(card.querySelector('[data-sc-avatar-preview]'));
    card.querySelectorAll('[data-sc-avatar-option]').forEach(button => {
      const id = button.dataset.scAvatarOption;
      button.setAttribute('aria-pressed', currentChoice() === id ? 'true' : 'false');
      if (id === 'initial') button.querySelector('span').textContent = initials(currentName());
    });
    card.querySelector('#scProfileSignOut').hidden = !signedIn;
  }

  function installWelcomePicker() {
    const form = document.querySelector('#scWelcome .welcome-card');
    if (!form || form.querySelector('.welcome-avatar-chooser')) return;
    const section = document.createElement('section');
    section.className = 'welcome-avatar-chooser';
    section.innerHTML = `<div><strong>Pick a profile picture</strong><small>Use your initials or a scientific symbol.</small></div>`;
    section.appendChild(avatarPicker('welcome-avatar-options'));
    form.querySelector('.welcome-actions')?.insertAdjacentElement('beforebegin', section);
  }

  function normalizeDynamicButtons(root = document.getElementById('cloudGalleryDrawer')) {
    if (!root) return;
    root.querySelectorAll('.utility-body button').forEach(button => button.classList.add('cloud-uniform-button'));
    root.querySelectorAll('.project-card-actions button').forEach(button => {
      button.classList.toggle('cloud-danger-button', button.textContent.trim().toLowerCase() === 'delete');
    });
  }

  async function bindAuth() {
    try {
      const client = await window.SciCanvasCloud?.getClient?.();
      if (!client) return;
      const { data } = await client.auth.getSession();
      activeUser = data.session?.user || null;
      renderProfileCard();
      const listener = client.auth.onAuthStateChange((_event, session) => {
        activeUser = session?.user || null;
        renderProfileCard();
      });
      authSubscription = listener.data.subscription;
    } catch {
      renderProfileCard();
    }
  }

  const style = document.createElement('style');
  style.id = 'profileGalleryPolishStyle';
  style.textContent = `
    .cloud-gallery-drawer{width:min(960px,calc(100vw - 18px))!important}
    .cloud-gallery-drawer .utility-body{padding:14px!important;background:radial-gradient(circle at 8% 0,rgba(88,169,184,.1),transparent 28%),radial-gradient(circle at 92% 7%,rgba(143,130,184,.1),transparent 28%)}
    .cloud-gallery-drawer .cloud-hero{position:relative;overflow:hidden;min-height:78px;padding:17px 18px!important;border-radius:17px!important;background:linear-gradient(125deg,rgba(234,247,246,.97),rgba(245,242,250,.97))!important;box-shadow:0 10px 28px rgba(44,67,91,.08)}
    .cloud-gallery-drawer .cloud-hero::after{content:'⌬';position:absolute;right:72px;top:-18px;color:rgba(84,139,151,.12);font-size:86px;line-height:1;transform:rotate(12deg);pointer-events:none}
    .cloud-gallery-drawer .cloud-hero strong{font-size:18px!important;letter-spacing:-.025em}
    .cloud-gallery-drawer .cloud-account-panel{padding:15px!important;border-radius:16px!important;background:rgba(255,255,255,.82)!important;box-shadow:0 8px 24px rgba(48,67,91,.06)}
    .sc-account-profile-card{display:grid;gap:12px;margin-top:12px;padding:15px;border:1px solid rgba(109,137,157,.23);border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.92),rgba(241,248,248,.88) 55%,rgba(246,243,250,.9));box-shadow:0 9px 28px rgba(43,62,88,.07)}
    .sc-account-profile-card[hidden],.cloud-gallery-drawer .cloud-account-panel[hidden]{display:none!important}
    .sc-profile-summary{display:grid;grid-template-columns:50px minmax(0,1fr) auto;align-items:center;gap:11px}.sc-profile-avatar{display:grid;place-items:center;width:50px;height:50px;border-radius:16px;background:linear-gradient(145deg,#365eae,#5d91a0 56%,#8175a8);color:#fff;font-size:24px;font-weight:850;box-shadow:0 9px 20px rgba(65,105,193,.2)}
    .sc-profile-copy strong,.sc-profile-copy small{display:block}.sc-profile-copy strong{font-size:13px}.sc-profile-copy small{margin-top:3px;color:#718095;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sc-profile-actions{display:flex;align-items:center;gap:7px}.sc-profile-actions button{min-width:82px!important}.sc-profile-picker-heading{display:flex;align-items:end;justify-content:space-between;gap:10px}.sc-profile-picker-heading span{font-size:10px;font-weight:800;color:#4c5e73}.sc-profile-picker-heading small{font-size:8px;color:#7d8998}
    .scientific-avatar-picker{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.scientific-avatar-picker button{display:grid!important;place-items:center;gap:3px;min-width:0!important;min-height:58px!important;padding:6px!important;border:1px solid #d2dde5!important;border-radius:12px!important;background:rgba(255,255,255,.86)!important;color:#4a5c73!important}.scientific-avatar-picker button span{font-size:20px;line-height:1}.scientific-avatar-picker button small{font-size:7px;color:#7a8797}.scientific-avatar-picker button[aria-pressed="true"]{border-color:#5f8eaa!important;background:linear-gradient(145deg,#edf8f6,#f1eff9)!important;box-shadow:0 0 0 3px rgba(95,142,170,.12)!important;color:#315c76!important}
    .welcome-avatar-chooser{display:grid;gap:9px;margin-top:14px;padding:12px;border:1px solid rgba(109,137,157,.22);border-radius:14px;background:rgba(255,255,255,.52)}.welcome-avatar-chooser>div{display:flex;align-items:end;justify-content:space-between;gap:8px}.welcome-avatar-chooser strong{font-size:11px;color:#4f6076}.welcome-avatar-chooser small{font-size:9px;color:#7d8998}.welcome-avatar-options{grid-template-columns:repeat(7,minmax(0,1fr))}
    .cloud-gallery-drawer .cloud-account-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px!important}.cloud-gallery-drawer .cloud-toolbar{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px!important}.cloud-gallery-drawer .cloud-uniform-button{display:inline-flex!important;align-items:center;justify-content:center;min-height:40px!important;height:40px;padding:0 14px!important;border-radius:11px!important;font-size:9px!important;font-weight:780!important;line-height:1.1;white-space:nowrap}.cloud-gallery-drawer .password-field .cloud-uniform-button{min-width:66px!important}.cloud-gallery-drawer .project-card-actions{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(66px,1fr));gap:6px!important;width:100%}.cloud-gallery-drawer .project-card-actions .cloud-uniform-button{width:100%;min-height:34px!important;height:34px;padding:0 8px!important;font-size:8px!important}.cloud-gallery-drawer .cloud-danger-button{border-color:#e5b6b6!important;background:#fff4f4!important;color:#9a3b3b!important}
    .cloud-gallery-drawer .gallery-section{padding:13px;border:1px solid rgba(109,137,157,.18);border-radius:16px;background:rgba(250,252,253,.72)}.cloud-gallery-drawer .project-gallery{gap:11px!important}.cloud-gallery-drawer .project-gallery-card{padding:11px!important;border-radius:14px!important;background:linear-gradient(150deg,rgba(255,255,255,.96),rgba(245,249,250,.92))!important;box-shadow:0 7px 20px rgba(43,62,88,.06)}.cloud-gallery-drawer .project-thumb{border-radius:11px!important;background:linear-gradient(145deg,#edf4f5,#f1eef7)!important}
    @media(max-width:700px){.scientific-avatar-picker,.welcome-avatar-options{grid-template-columns:repeat(4,minmax(0,1fr))}.cloud-gallery-drawer .cloud-toolbar{grid-template-columns:1fr}.sc-profile-summary{grid-template-columns:46px minmax(0,1fr)}.sc-profile-actions{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.sc-profile-actions button{width:100%!important}.sc-profile-picker-heading{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(() => {
    installAccountProfileCard();
    installWelcomePicker();
    normalizeDynamicButtons();
  });
  observer.observe(document.body, { childList:true, subtree:true });

  installAccountProfileCard();
  installWelcomePicker();
  normalizeDynamicButtons();
  bindAuth();

  window.addEventListener('scicanvas-avatar-changed', renderProfileCard);
  window.addEventListener('storage', event => {
    if (event.key === NAME_KEY || event.key === AVATAR_KEY) renderProfileCard();
  });
  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());
})();