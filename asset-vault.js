let personalAssets = [];

function addImageFromVault(asset) {
  pushHistory();
  const item = {
    id: uid(),
    type: "image",
    name: asset.name,
    x: 420,
    y: 240,
    width: asset.width || 300,
    height: asset.height || 220,
    src: asset.src,
    fill: "#ffffff",
    stroke: "#26324a",
    opacity: 1,
    rotation: 0,
    visible: true,
    metadata: {
      source: "User upload",
      license: asset.license || "Not specified",
      notes: asset.notes || "Verify permission and attribution before publication."
    }
  };
  state.objects.push(item);
  state.selectedId = item.id;
  render();
  scheduleSave();
}

const personalDrawer = createDrawer("personalAssetDrawer", "My uploads", "Reusable images stored on this device");
const personalBody = personalDrawer.querySelector(".utility-body");

const uploadAgain = document.createElement("button");
uploadAgain.type = "button";
uploadAgain.className = "utility-action primary";
uploadAgain.textContent = "Upload another asset";
uploadAgain.addEventListener("click", () => document.getElementById("assetFile").click());
personalBody.appendChild(uploadAgain);

const personalGrid = document.createElement("div");
personalGrid.className = "personal-grid";
personalBody.appendChild(personalGrid);

const personalStyle = document.createElement("style");
personalStyle.textContent = `
  .personal-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}.personal-card{overflow:hidden;border:1px solid #d4dde8;border-radius:9px;background:white}.personal-preview{height:100px;display:grid;place-items:center;background:#f3f6fa}.personal-preview img{max-width:100%;max-height:100%;object-fit:contain}.personal-copy{padding:8px}.personal-copy strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.personal-actions{display:grid;grid-template-columns:1fr auto;gap:5px;margin-top:7px}.personal-actions button{border:1px solid #ccd6e2;border-radius:6px;background:#f8fafc;padding:6px;font-size:10px}.personal-empty{padding:24px 8px;text-align:center;color:#7a8698;font-size:12px;grid-column:1/-1}
`;
document.head.appendChild(personalStyle);

function renderPersonalAssets() {
  personalGrid.replaceChildren();
  if (!personalAssets.length) {
    const empty = document.createElement("p");
    empty.className = "personal-empty";
    empty.textContent = "No saved uploads yet. Upload an image or SVG from the Science library.";
    personalGrid.appendChild(empty);
    return;
  }

  personalAssets.forEach(asset => {
    const card = document.createElement("article");
    card.className = "personal-card";
    card.innerHTML = `<div class="personal-preview"><img alt="" src="${asset.src}"></div><div class="personal-copy"><strong title="${asset.name}">${asset.name}</strong><div class="personal-actions"></div></div>`;
    const actions = card.querySelector(".personal-actions");
    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.textContent = "Add to canvas";
    useButton.addEventListener("click", () => addImageFromVault(asset));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      if (!confirm(`Delete “${asset.name}” from My uploads? Existing figures keep their embedded copy.`)) return;
      personalAssets = personalAssets.filter(item => item.id !== asset.id);
      await vaultWrite("user-assets", personalAssets);
      renderPersonalAssets();
    });
    actions.append(useButton, deleteButton);
    personalGrid.appendChild(card);
  });
}

async function loadPersonalAssets() {
  try {
    const record = await vaultRead("user-assets");
    personalAssets = Array.isArray(record?.value) ? record.value : [];
    renderPersonalAssets();
  } catch (error) {
    console.warn("Could not load personal asset vault", error);
  }
}

async function saveUploadedAsset(file) {
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const dimensions = await new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve({ width:image.naturalWidth, height:image.naturalHeight });
    image.onerror = () => resolve({ width:300, height:220 });
    image.src = src;
  });

  const ratio = Math.min(1, 360 / Math.max(dimensions.width, dimensions.height));
  const asset = {
    id: uid(),
    name: file.name,
    type: file.type || "image",
    src,
    width: Math.max(80, Math.round(dimensions.width * ratio)),
    height: Math.max(60, Math.round(dimensions.height * ratio)),
    createdAt: new Date().toISOString(),
    license: "Not specified"
  };
  personalAssets.unshift(asset);
  await vaultWrite("user-assets", personalAssets);
  renderPersonalAssets();
}

const assetInput = document.getElementById("assetFile");
assetInput.addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (file) saveUploadedAsset(file).catch(error => console.error("Could not save upload", error));
}, true);

const myUploadsButton = document.createElement("button");
myUploadsButton.type = "button";
myUploadsButton.textContent = "My uploads";
myUploadsButton.addEventListener("click", () => personalDrawer.classList.toggle("open"));
scienceDrawer.querySelector(".science-search").appendChild(myUploadsButton);
scienceDrawer.querySelector(".science-search").style.gridTemplateColumns = "1fr auto auto";

loadPersonalAssets();
