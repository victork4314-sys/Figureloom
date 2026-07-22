(() => {
  'use strict';

  const accountButton = document.getElementById('bioAccountButton');
  if (!accountButton) return;

  const CONFIG = window.SCICANVAS_CLOUD_CONFIG || {};
  const SUPABASE_MODULE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.5/+esm';
  const NAME_KEY = 'scicanvas-user-name-v1';
  const AVATAR_KEY = 'scicanvas-profile-avatar-v1';
  const IMAGE_KEY = 'scicanvas-profile-avatar-image-v1';
  const AVATAR_SYMBOLS = {
    dna:'🧬', flask:'⚗', molecule:'⌬', cell:'◉', wave:'∿', star:'✦',
    microscope:'🔬', petri:'🧫', atom:'⚛', leaf:'🌿', brain:'🧠', microbe:'🦠'
  };

  let currentUser = null;
  let clientPromise = null;
  let authSubscription = null;
  let scheduled = false;

  function configured() {
    return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && !/YOUR_|example/i.test(`${CONFIG.supabaseUrl}${CONFIG.supabaseAnonKey}`));
  }

  function getClient() {
    if (!configured()) return Promise.resolve(null);
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

  function displayName(user = currentUser) {
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
    if (!parts.length) return '◌';
    return parts.length === 1
      ? parts[0].slice(0, 1).toUpperCase()
      : `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
  }

  function validImage(value) {
    const source = String(value || '');
    return /^(?:data:image\/(?:png|jpe?g|webp);base64,|https:\/\/)/i.test(source) ? source : '';
  }

  function avatarDescriptor(user = currentUser) {
    const metadata = user?.user_metadata || {};
    const name = displayName(user);
    const choice = localStorage.getItem(AVATAR_KEY) || metadata.avatar_symbol || 'initial';
    const uploaded = validImage(localStorage.getItem(IMAGE_KEY) || metadata.avatar_data_url);
    const remote = validImage(metadata.avatar_url || metadata.picture);

    if (choice === 'custom' && uploaded) return { kind:'image', value:uploaded, label:name };
    if (choice !== 'initial' && AVATAR_SYMBOLS[choice]) return { kind:'symbol', value:AVATAR_SYMBOLS[choice], label:name };
    if (remote) return { kind:'image', value:remote, label:name };
    return { kind:'initial', value:initials(name), label:name };
  }

  function renderInto(target, descriptor = avatarDescriptor()) {
    if (!target) return;
    const signature = `${descriptor.kind}:${descriptor.value}`;
    if (target.dataset.bioAvatarSignature === signature && target.querySelector(':scope > .bio-avatar-face')) return;

    const face = document.createElement('span');
    face.className = `bio-avatar-face bio-avatar-${descriptor.kind}`;
    if (descriptor.kind === 'image') {
      const image = document.createElement('img');
      image.alt = '';
      image.src = descriptor.value;
      image.addEventListener('error', () => {
        target.dataset.bioAvatarSignature = '';
        renderInto(target, { kind:'initial', value:initials(descriptor.label), label:descriptor.label });
      }, { once:true });
      face.append(image);
    } else {
      face.textContent = descriptor.value;
    }

    target.dataset.bioAvatarSignature = signature;
    target.replaceChildren(face);
  }

  function renderAll() {
    const descriptor = avatarDescriptor();
    renderInto(accountButton, descriptor);
    renderInto(document.getElementById('bioDialogAvatar'), descriptor);
  }

  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      renderAll();
    });
  }

  const observer = new MutationObserver(scheduleRender);
  observer.observe(accountButton, { childList:true });
  const dialogAvatar = document.getElementById('bioDialogAvatar');
  if (dialogAvatar) observer.observe(dialogAvatar, { childList:true });

  window.addEventListener('storage', (event) => {
    if ([NAME_KEY, AVATAR_KEY, IMAGE_KEY].includes(event.key)) scheduleRender();
  });
  window.addEventListener('scicanvas-avatar-changed', scheduleRender);
  window.addEventListener('focus', scheduleRender);
  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());

  renderAll();
  getClient().then(async (client) => {
    if (!client) return;
    const { data } = await client.auth.getSession();
    currentUser = data.session?.user || null;
    renderAll();
    const listener = client.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      scheduleRender();
    });
    authSubscription = listener.data.subscription;
  }).catch(() => renderAll());
})();
