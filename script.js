const grid = document.getElementById("glyphGrid");
const uploadBtn = document.getElementById("uploadBtn");
const importBtn = document.getElementById("importBtn");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");

const imageUpload = document.getElementById("imageUpload");
const glyphImport = document.getElementById("glyphImport");

const previewCanvas = document.getElementById("previewCanvas");
const ctx = previewCanvas.getContext("2d");

const slotText = document.getElementById("slotText");
const unicodeText = document.getElementById("unicodeText");
const glyphText = document.getElementById("glyphText");

const chatPreview = document.getElementById("chatPreview");
const actionbarPreview = document.getElementById("actionbarPreview");

const copyGlyph = document.getElementById("copyGlyph");
const deleteSlotBtn = document.getElementById("deleteSlotBtn");

const downloadTexture = document.getElementById("downloadTexture");
const downloadAddon = document.getElementById("downloadAddon");

const sheetSelect = document.getElementById("sheetSelect");
const sizeSelect = document.getElementById("sizeSelect");

const STORAGE_KEY = "glyph_project_v4";

const slots = new Array(256).fill(null);

let selectedSlot = -1;
let selectedGlyph = "";
let selectedUnicode = "";
let draggedSlot = null;

function saveProject() {
  const data = {
    slots,
    sheet: sheetSelect.value,
    size: sizeSelect.value
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  alert("Proyecto guardado");
}

function loadProject() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const data = JSON.parse(saved);

    for (let i = 0; i < 256; i++) {
      slots[i] = data.slots?.[i] ?? null;
    }

    if (data.sheet) sheetSelect.value = data.sheet;
    if (data.size) sizeSelect.value = data.size;
  } catch (err) {
    console.error(err);
  }
}

saveBtn.onclick = saveProject;

resetBtn.onclick = () => {
  for (let i = 0; i < 256; i++) slots[i] = null;

  selectedSlot = -1;
  selectedGlyph = "";
  selectedUnicode = "";

  slotText.textContent = "-";
  unicodeText.textContent = "-";
  glyphText.textContent = "-";
  chatPreview.textContent = "Chat: -";
  actionbarPreview.textContent = "Actionbar: -";

  ctx.clearRect(0, 0, 256, 256);

  localStorage.removeItem(STORAGE_KEY);

  createGrid();
  alert("Proyecto reseteado");
};

loadProject();
function createGrid() {
  grid.innerHTML = "";

  for (let i = 0; i < 256; i++) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.draggable = true;
    slot.dataset.index = i;

    slot.onclick = () => {
      selectedSlot = i;
      updateInfo(i);
      drawPreview();
    };

    slot.oncontextmenu = (e) => {
      e.preventDefault();
      slots[i] = null;
      createGrid();
    };

    slot.ondragstart = () => {
      draggedSlot = i;
      slot.classList.add("dragging");
    };

    slot.ondragend = () => {
      slot.classList.remove("dragging");
    };

    slot.ondragover = (e) => {
      e.preventDefault();
    };

    slot.ondrop = () => {
      if (draggedSlot === null || draggedSlot === i) return;

      [slots[i], slots[draggedSlot]] = [slots[draggedSlot], slots[i]];
      createGrid();
    };

    if (slots[i]) {
      const img = document.createElement("img");
      img.src = slots[i];
      slot.appendChild(img);
    }

    grid.appendChild(slot);
  }
}

function updateInfo(index) {
  const sheet = sheetSelect.value;
  const hex = index.toString(16).toUpperCase().padStart(2, "0");

  selectedUnicode = `${sheet}${hex}`;
  selectedGlyph = String.fromCodePoint(parseInt(selectedUnicode, 16));

  slotText.textContent = index;
  unicodeText.textContent = "\\u" + selectedUnicode;
  glyphText.textContent = selectedGlyph;

  chatPreview.textContent = "Chat: " + selectedGlyph;
  actionbarPreview.textContent = "Actionbar: " + selectedGlyph;
}

function drawPreview() {
  ctx.clearRect(0, 0, 256, 256);

  if (selectedSlot === -1 || !slots[selectedSlot]) return;

  const img = new Image();

  img.onload = () => {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, 256, 256);
  };

  img.src = slots[selectedSlot];
}

deleteSlotBtn.onclick = () => {
  if (selectedSlot === -1) return;

  slots[selectedSlot] = null;

  ctx.clearRect(0, 0, 256, 256);
  glyphText.textContent = "-";
  unicodeText.textContent = "-";

  createGrid();
};
uploadBtn.onclick = () => imageUpload.click();
importBtn.onclick = () => glyphImport.click();

imageUpload.onchange = (event) => {
  const files = [...event.target.files];

  files.forEach(file => {
    const reader = new FileReader();

    reader.onload = e => {
      const emptySlot = slots.findIndex(slot => slot === null);

      if (emptySlot !== -1) {
        slots[emptySlot] = e.target.result;
        createGrid();
      }
    };

    reader.readAsDataURL(file);
  });
};

glyphImport.onchange = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    const img = new Image();

    img.onload = () => {
      const glyphSize = img.width / 16;
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");

      tempCanvas.width = glyphSize;
      tempCanvas.height = glyphSize;

      for (let i = 0; i < 256; i++) {
        const x = (i % 16) * glyphSize;
        const y = Math.floor(i / 16) * glyphSize;

        tempCtx.clearRect(0, 0, glyphSize, glyphSize);
        tempCtx.drawImage(
          img,
          x, y,
          glyphSize, glyphSize,
          0, 0,
          glyphSize, glyphSize
        );

        slots[i] = tempCanvas.toDataURL("image/png");
      }

      createGrid();
    };

    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
};

copyGlyph.onclick = async () => {
  if (!selectedGlyph) return;

  try {
    await navigator.clipboard.writeText(selectedGlyph);
    alert("Glyph copiado");
  } catch {
    alert("No se pudo copiar");
  }
};

function buildTextureCanvas() {
  const size = Number(sizeSelect.value);
  const canvas = document.createElement("canvas");
  const textureCtx = canvas.getContext("2d");

  canvas.width = size * 16;
  canvas.height = size * 16;

  textureCtx.imageSmoothingEnabled = false;

  return { canvas, textureCtx, size };
}

downloadTexture.onclick = () => {
  const { canvas, textureCtx, size } = buildTextureCanvas();

  let loaded = 0;
  const total = slots.filter(Boolean).length;

  if (total === 0) {
    alert("No hay glyphs");
    return;
  }

  slots.forEach((data, index) => {
    if (!data) return;

    const img = new Image();

    img.onload = () => {
      const x = (index % 16) * size;
      const y = Math.floor(index / 16) * size;

      textureCtx.drawImage(img, x, y, size, size);
      loaded++;

      if (loaded === total) {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `glyph_${sheetSelect.value}.png`;
        a.click();
      }
    };

    img.src = data;
  });
};
downloadAddon.onclick = async () => {
  const { canvas, textureCtx, size } = buildTextureCanvas();

  let loaded = 0;
  const total = slots.filter(Boolean).length;

  if (total === 0) {
    alert("No hay glyphs");
    return;
  }

  slots.forEach((data, index) => {
    if (!data) return;

    const img = new Image();

    img.onload = async () => {
      const x = (index % 16) * size;
      const y = Math.floor(index / 16) * size;

      textureCtx.drawImage(img, x, y, size, size);
      loaded++;

      if (loaded === total) {
        const zip = new JSZip();
        const sheet = sheetSelect.value;

        const manifest = {
          format_version: 2,
          header: {
            name: "Glyph Pack",
            description: "Generated with Bedrock Glyph Generator",
            uuid: crypto.randomUUID(),
            version: [1, 0, 0],
            min_engine_version: [1, 21, 0]
          },
          modules: [{
            type: "resources",
            uuid: crypto.randomUUID(),
            version: [1, 0, 0]
          }]
        };

        zip.file("manifest.json", JSON.stringify(manifest, null, 2));

        zip.file(
          `font/glyph_${sheet}.png`,
          canvas.toDataURL("image/png").split(",")[1],
          { base64: true }
        );

        const blob = await zip.generateAsync({ type: "blob" });

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "glyph_pack.mcpack";
        a.click();
      }
    };

    img.src = data;
  });
};

sheetSelect.onchange = () => {
  if (selectedSlot !== -1) updateInfo(selectedSlot);
};

sizeSelect.onchange = () => {
  saveProject();
};

createGrid();