(() => {
  if (window.__figureLoomSvgOnlyAllPagesV1) return;
  window.__figureLoomSvgOnlyAllPagesV1 = true;

  const PPTX_BUTTON_ID = 'figureloomExportAllPagesPptxV6';
  const SVG_ZIP_BUTTON_ID = 'figureloomExportAllPagesSvgZipV2';
  const JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  let jsZipPromise = null;

  function ensureJsZip() {
    if (typeof window.JSZip === 'function') return Promise.resolve(window.JSZip);
    if (jsZipPromise) return jsZipPromise;

    jsZipPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = JSZIP_CDN;
      script.async = true;
      script.onload = () => typeof window.JSZip === 'function'
        ? resolve(window.JSZip)
        : reject(new Error('The SVG ZIP packer loaded without its browser export.'));
      script.onerror = () => reject(new Error('Could not load the SVG ZIP packer. Check the connection and try again.'));
      document.head.appendChild(script);
    });

    return jsZipPromise;
  }

  function decodeSvgDataUri(dataUri) {
    const value = String(dataUri || '');
    const comma = value.indexOf(',');
    if (comma < 0 || !/^data:image\/svg\+xml/i.test(value)) {
      throw new Error('One exported page did not contain valid SVG data.');
    }

    const header = value.slice(0, comma);
    const payload = value.slice(comma + 1);
    if (/;base64/i.test(header)) {
      const binary = atob(payload);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return decodeURIComponent(payload);
  }

  function svgZipFileName(pptxName) {
    const base = String(pptxName || 'FigureLoom.pptx')
      .replace(/\.pptx$/i, '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .trim() || 'FigureLoom';
    return `${base}-editable-svg-pages.zip`;
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  class SvgOnlySlide {
    constructor(index) {
      this.index = index;
      this.images = [];
      this.notes = [];
      this.background = null;
    }

    addImage(options = {}) {
      this.images.push({ ...options });
      return this;
    }

    addNotes(notes) {
      this.notes.push(notes);
      return this;
    }
  }

  class SvgOnlyPresentation {
    constructor() {
      this._slides = [];
      this.layout = '';
      this.author = 'FigureLoom';
      this.company = 'FigureLoom';
      this.title = 'FigureLoom';
      this.subject = 'FigureLoom editable SVG pages';
      this.lang = 'en-US';
    }

    defineLayout() {
      return this;
    }

    addSlide() {
      const slide = new SvgOnlySlide(this._slides.length + 1);
      this._slides.push(slide);
      return slide;
    }

    async createSvgZipBlob() {
      if (!this._slides.length) throw new Error('This project does not contain any pages.');
      const JSZip = await ensureJsZip();
      const zip = new JSZip();

      this._slides.forEach((slide, index) => {
        const image = slide.images[0];
        if (!image?.data) throw new Error(`Page ${index + 1} did not contain SVG data.`);
        const source = decodeSvgDataUri(image.data);
        if (!source.includes('<svg')) throw new Error(`Page ${index + 1} did not contain valid SVG.`);
        zip.file(`page-${String(index + 1).padStart(3, '0')}.svg`, source);
      });

      const blob = await zip.generateAsync({
        type:'blob',
        mimeType:'application/zip',
        compression:'DEFLATE',
        compressionOptions:{ level:6 }
      });
      if (!blob?.size) throw new Error('The all-pages SVG ZIP was empty.');
      return blob;
    }

    async write(options = {}) {
      const blob = await this.createSvgZipBlob();
      const outputType = String(options.outputType || options.type || 'blob').toLowerCase();
      if (outputType === 'arraybuffer') return blob.arrayBuffer();
      if (outputType === 'uint8array') return new Uint8Array(await blob.arrayBuffer());
      return blob;
    }

    async writeFile(options = {}) {
      const fileName = svgZipFileName(options.fileName);
      const blob = await this.createSvgZipBlob();
      downloadBlob(blob, fileName);
      return fileName;
    }
  }

  function installSvgOnlyConverter() {
    window.PptxGenJS = SvgOnlyPresentation;
    window.__figureLoomLibraryPromise_PptxGenJS = Promise.resolve(SvgOnlyPresentation);
  }

  function updateExportLabels() {
    const button = document.getElementById(PPTX_BUTTON_ID);
    if (button) {
      const text = button.textContent || '';
      if (text.includes('Building PowerPoint')) {
        button.innerHTML = '<strong>Packing SVG pages…</strong><small>Creating one separate SVG file per page</small>';
      } else if (text.includes('PowerPoint failed')) {
        button.innerHTML = '<strong>Saving SVG pages…</strong><small>Creating one separate SVG file per page</small>';
      } else if (!button.disabled || text.includes('PowerPoint')) {
        button.innerHTML = '<strong>Export all pages as SVG (.zip)</strong><small>One separate editable SVG file per page</small>';
      }
    }

    const duplicate = document.getElementById(SVG_ZIP_BUTTON_ID);
    if (duplicate) {
      duplicate.hidden = true;
      duplicate.setAttribute('aria-hidden', 'true');
      duplicate.style.setProperty('display', 'none', 'important');
    }

    ['officeExportFlatPptx', 'officeExportPptx'].forEach(id => {
      const officeButton = document.getElementById(id);
      if (!officeButton) return;
      officeButton.innerHTML = '<strong>Export all pages as SVG (.zip)</strong><small>One separate editable SVG file per page</small>';
    });
  }

  installSvgOnlyConverter();
  updateExportLabels();

  const observer = new MutationObserver(() => {
    installSvgOnlyConverter();
    updateExportLabels();
  });
  observer.observe(document.body, { childList:true, subtree:true, characterData:true });

  window.FigureLoomSvgOnlyAllPagesExport = Object.freeze({
    SvgOnlyPresentation,
    ensureJsZip,
    updateExportLabels
  });
})();
