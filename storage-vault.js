const VAULT_DB = "scicanvas-vault";
const VAULT_VERSION = 1;
const VAULT_STORE = "projects";

function openVault() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VAULT_DB, VAULT_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VAULT_STORE)) db.createObjectStore(VAULT_STORE, { keyPath:"key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function vaultWrite(key, value) {
  const db = await openVault();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VAULT_STORE, "readwrite");
    transaction.objectStore(VAULT_STORE).put({ key, value, updatedAt:Date.now() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function vaultRead(key) {
  const db = await openVault();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VAULT_STORE, "readonly");
    const request = transaction.objectStore(VAULT_STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

function currentProjectIsEmpty() {
  return state.pages?.length === 1 && state.pages[0].objects.length === 0;
}

scheduleSave = function scheduleVaultSave() {
  saveStatus.textContent = "Saving to vault…";
  clearTimeout(scheduleSave.timer);
  scheduleSave.timer = setTimeout(async () => {
    try {
      const data = projectData();
      await vaultWrite("autosave", data);
      const lightweight = JSON.stringify(data);
      if (lightweight.length < 1_500_000) localStorage.setItem("scicanvas-document", snapshot());
      saveStatus.textContent = "Saved to local vault";
    } catch (error) {
      console.error(error);
      saveStatus.textContent = "Vault save failed";
    }
  }, 300);
};

async function restoreVaultIfNeeded() {
  try {
    const record = await vaultRead("autosave");
    if (!record?.value) return;
    if (currentProjectIsEmpty()) restore(record.value);
  } catch (error) {
    console.warn("SciCanvas IndexedDB vault unavailable", error);
  }
}

async function requestPersistentStorage() {
  if (!navigator.storage?.persist) {
    alert("This browser does not expose persistent-storage controls. Project downloads still provide an external backup.");
    return;
  }
  const granted = await navigator.storage.persist();
  alert(granted
    ? "Persistent browser storage is enabled for SciCanvas on this device."
    : "The browser did not grant persistent storage. Keep downloadable project backups for important figures.");
}

const vaultButton = document.createElement("button");
vaultButton.type = "button";
vaultButton.className = "utility-action";
vaultButton.textContent = "Protect browser storage";
vaultButton.addEventListener("click", requestPersistentStorage);
const projectNote = projectDrawer.querySelector(".tool-note");
projectDrawer.querySelector(".utility-body").insertBefore(vaultButton, projectNote);

document.querySelector(".statusbar span:last-child").textContent = "IndexedDB vault enabled";

window.addEventListener("pagehide", () => {
  void vaultWrite("autosave", projectData()).catch(() => {});
});

restoreVaultIfNeeded();
