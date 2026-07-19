(() => {
  if (window.__figureLoomCollaborationAvatarPresenceV1) return;
  window.__figureLoomCollaborationAvatarPresenceV1 = true;

  let activeRoom = null;
  let lastPresence = null;

  function fallbackPicture(entry = {}) {
    const name = String(entry.name || 'Scientist').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const initials = parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase() : (parts[0]?.[0] || 'S').toUpperCase();
    return { kind:'initial', value:initials, label:name, choice:'initial' };
  }

  function localPicture() {
    return window.FigureLoomProfilePicture?.descriptor?.() || fallbackPicture({ name:localStorage.getItem('scicanvas-user-name-v1') });
  }

  function renderPresence(channel = activeRoom) {
    const host = document.getElementById('collabPresence');
    if (!host || !channel?.presenceState) return;
    const entries = Object.values(channel.presenceState() || {}).flat();
    if (!entries.length) return;

    host.replaceChildren();
    entries.forEach(entry => {
      const badge = document.createElement('span');
      badge.className = 'collab-person figureloom-collab-person';
      const avatar = document.createElement('span');
      avatar.className = 'collab-person-avatar';
      avatar.style.setProperty('--collab-person-color', entry.color || 'var(--figureloom-ui-accent,#2f7468)');
      const picture = entry.avatar?.kind ? entry.avatar : fallbackPicture(entry);
      if (window.FigureLoomProfilePicture?.renderInto) window.FigureLoomProfilePicture.renderInto(avatar, picture);
      else avatar.textContent = picture.value;

      const copy = document.createElement('span');
      copy.className = 'collab-person-copy';
      copy.textContent = `${entry.name || 'Scientist'}${entry.role ? ` · ${entry.role}` : ''}`;
      badge.append(avatar, copy);
      host.appendChild(badge);
    });
  }

  function patchRoom(channel) {
    if (!channel || channel.__figureLoomAvatarPresencePatched) return channel;
    channel.__figureLoomAvatarPresencePatched = true;
    activeRoom = channel;

    if (typeof channel.track === 'function') {
      const baseTrack = channel.track.bind(channel);
      channel.track = payload => {
        lastPresence = { ...(payload || {}), avatar:localPicture() };
        return baseTrack(lastPresence);
      };
    }

    if (typeof channel.on === 'function') {
      const baseOn = channel.on.bind(channel);
      channel.on = (type, filter, callback) => {
        if (type !== 'presence' || typeof callback !== 'function') return baseOn(type, filter, callback);
        return baseOn(type, filter, payload => {
          const result = callback(payload);
          requestAnimationFrame(() => renderPresence(channel));
          return result;
        });
      };
    }
    return channel;
  }

  function patchClient(client) {
    if (!client || client.__figureLoomAvatarClientPatched || typeof client.channel !== 'function') return client;
    client.__figureLoomAvatarClientPatched = true;
    const baseChannel = client.channel.bind(client);
    client.channel = (name, config) => {
      const channel = baseChannel(name, config);
      return String(name).startsWith('project-room:') ? patchRoom(channel) : channel;
    };
    return client;
  }

  function patchCloud() {
    const cloud = window.SciCanvasCloud;
    if (!cloud || cloud.__figureLoomAvatarCloudPatched || typeof cloud.getClient !== 'function') return false;
    cloud.__figureLoomAvatarCloudPatched = true;
    const baseGetClient = cloud.getClient.bind(cloud);
    cloud.getClient = async (...args) => patchClient(await baseGetClient(...args));
    return true;
  }

  function install() {
    if (!patchCloud()) {
      setTimeout(install, 80);
      return;
    }
    window.SciCanvasCloud?.getClient?.().then(patchClient).catch(() => {});
  }

  addEventListener('scicanvas-avatar-changed', () => {
    if (activeRoom && lastPresence) {
      activeRoom.track?.({ ...lastPresence, avatar:localPicture() });
      requestAnimationFrame(() => renderPresence(activeRoom));
    }
  });

  const style = document.createElement('style');
  style.id = 'figureloomCollaborationAvatarPresenceStyle';
  style.textContent = `
    .figureloom-collab-person{padding:4px 8px 4px 4px!important}.figureloom-collab-person>i{display:none!important}
    .collab-person-copy{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  `;
  document.head.appendChild(style);

  install();
  window.FigureLoomCollaborationAvatarPresence = Object.freeze({ renderPresence, patchClient });
})();
