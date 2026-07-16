(() => {
  const avatarButton = document.getElementById('accountProfileButton');
  const collaborateButton = document.getElementById('collaborateRibbonButton');
  if (!avatarButton || !collaborateButton) return;

  const NAME_KEY = 'scicanvas-user-name-v1';
  let authSubscription = null;

  function cleanName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function localName() {
    return cleanName(localStorage.getItem(NAME_KEY));
  }

  function displayName(user) {
    return cleanName(
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      localName() ||
      user?.email?.split('@')[0] ||
      'Scientist'
    );
  }

  function initials(value) {
    const parts = cleanName(value).split(' ').filter(Boolean);
    if (!parts.length) return '◌';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
  }

  function avatarUrl(user) {
    const value = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
    return /^https:\/\//i.test(value) ? value : '';
  }

  function removeLegacyHeaderItems() {
    document.getElementById('accountButton')?.remove();
    document.getElementById('userGreetingButton')?.remove();
  }

  function renderAvatar(user = window.SciCanvasCloud?.getUser?.() || null) {
    const name = displayName(user);
    const imageUrl = avatarUrl(user);
    const face = document.createElement('span');
    face.className = 'account-avatar-face';

    if (imageUrl) {
      const image = document.createElement('img');
      image.alt = '';
      image.src = imageUrl;
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => {
        face.replaceChildren(Object.assign(document.createElement('span'), {
          className:'account-avatar-initials',
          textContent:initials(name)
        }));
      }, { once:true });
      face.appendChild(image);
    } else {
      const letters = document.createElement('span');
      letters.className = 'account-avatar-initials';
      letters.textContent = initials(name);
      face.appendChild(letters);
    }

    avatarButton.replaceChildren(face);
    avatarButton.dataset.signedIn = user ? 'true' : 'false';
    avatarButton.title = user ? `${name} · Account and project gallery` : 'Sign in or open the project gallery';
    avatarButton.setAttribute('aria-label', avatarButton.title);

    const drawerAvatar = document.querySelector('#cloudSignedIn .cloud-user-avatar');
    if (drawerAvatar) {
      drawerAvatar.replaceChildren(face.cloneNode(true));
      drawerAvatar.title = name;
    }
  }

  function openAccount() {
    removeLegacyHeaderItems();
    if (window.SciCanvasCloud?.open) {
      window.SciCanvasCloud.open();
      return;
    }
    document.getElementById('cloudGalleryDrawer')?.classList.add('open');
  }

  function openCollaboration() {
    const workspaceCard = document.querySelector('.pro-workspace-card[data-workspace="collab"]');
    if (workspaceCard && !workspaceCard.disabled) {
      workspaceCard.click();
      return;
    }
    document.getElementById('collaborationDrawer')?.classList.add('open');
  }

  async function bindAuthState() {
    try {
      const client = await window.SciCanvasCloud?.getClient?.();
      if (!client) return renderAvatar();
      const { data } = await client.auth.getSession();
      renderAvatar(data.session?.user || null);
      const listener = client.auth.onAuthStateChange((_event, session) => {
        renderAvatar(session?.user || null);
      });
      authSubscription = listener.data.subscription;
    } catch {
      renderAvatar();
    }
  }

  avatarButton.addEventListener('click', openAccount);
  collaborateButton.addEventListener('click', openCollaboration);

  const titleActions = document.querySelector('.title-actions');
  const legacyObserver = new MutationObserver(() => {
    removeLegacyHeaderItems();
    renderAvatar();
  });
  if (titleActions) legacyObserver.observe(titleActions, { childList:true });

  window.addEventListener('scicanvas-cloud-opened', () => renderAvatar());
  window.addEventListener('scicanvas-cloud-saved', () => renderAvatar());
  window.addEventListener('storage', event => {
    if (event.key === NAME_KEY) renderAvatar();
  });
  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());

  const style = document.createElement('style');
  style.id = 'accountHeaderPolishStyle';
  style.textContent = `
    #accountProfileButton.brand-mark{
      position:relative;isolation:isolate;appearance:none;flex:0 0 38px;width:38px;height:38px;padding:0!important;
      border:1px solid rgba(255,255,255,.76)!important;border-radius:50%!important;overflow:visible;
      background:linear-gradient(145deg,#365eae,#5d91a0 56%,#8175a8)!important;
      box-shadow:0 7px 18px rgba(65,105,193,.24)!important;color:white;
    }
    #accountProfileButton.brand-mark:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(65,105,193,.3)!important}
    #accountProfileButton.brand-mark:focus-visible{outline:3px solid rgba(74,128,191,.28);outline-offset:3px}
    #accountProfileButton::after{content:'';position:absolute;right:-1px;bottom:-1px;z-index:3;width:10px;height:10px;border:2px solid white;border-radius:50%;background:#9aa8b8}
    #accountProfileButton[data-signed-in="true"]::after{background:#4aa382}
    #accountProfileButton .account-avatar-face{display:grid!important;place-items:center;width:100%;height:100%;margin:0!important;overflow:hidden;border-radius:50%;background:inherit;color:white!important}
    #accountProfileButton .account-avatar-face img{display:block;width:100%;height:100%;margin:0;object-fit:cover}
    #accountProfileButton .account-avatar-initials{display:block;margin:0!important;color:white!important;font-size:12px;font-weight:850;line-height:1;letter-spacing:.01em;text-shadow:0 1px 3px rgba(20,31,50,.24)}
    #cloudSignedIn .cloud-user-avatar{overflow:hidden;padding:0}
    #cloudSignedIn .cloud-user-avatar .account-avatar-face{display:grid;place-items:center;width:100%;height:100%;margin:0}
    #cloudSignedIn .cloud-user-avatar .account-avatar-initials{margin:0;color:white;font-weight:850}

    .ribbon-tab{border-bottom:0!important}
    .ribbon-tab.active{border-bottom-color:transparent!important}
    .ribbon-tab.active::after{content:'';position:absolute;left:24%;right:24%;bottom:1px;height:2px;border-radius:999px;background:linear-gradient(90deg,var(--delight-cyan,#58a9b8),var(--delight-blue,#4169c1),var(--delight-lilac,#8f82b8))}
    .ribbon-command-tab{position:relative;height:38px;padding:0 15px;border:0;background:transparent;color:#52647c;font-weight:700}
    .ribbon-command-tab::before{content:'◎';margin-right:6px;color:#6489a4}
    .ribbon-command-tab:hover{color:#294d91;background:rgba(75,116,165,.07)}
    .ribbon-command-tab:focus-visible{outline:2px solid rgba(65,105,193,.35);outline-offset:-3px;border-radius:7px}

    #accountButton,#userGreetingButton{display:none!important}
    @media(max-width:700px){.brand>div:last-child span{display:none}.ribbon-command-tab{padding-inline:11px}.ribbon-command-tab::before{margin-right:4px}}
  `;
  document.head.appendChild(style);

  removeLegacyHeaderItems();
  renderAvatar();
  bindAuthState();
})();