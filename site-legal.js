(() => {
  if (document.getElementById('figureloomLegalFooter')) return;
  const footer = document.createElement('div');
  footer.id = 'figureloomLegalFooter';
  footer.setAttribute('aria-label', 'Figureloom legal and project links');
  footer.innerHTML = `
    <span>Figureloom · open scientific figure workspace</span>
    <span><a href="./legal.html">Privacy & legal</a><a href="https://github.com/victork4314-sys/SciCanvas" target="_blank" rel="noreferrer">Source</a></span>
  `;
  document.body.appendChild(footer);

  const style = document.createElement('style');
  style.id = 'figureloomLegalFooterStyle';
  style.textContent = `
    #figureloomLegalFooter{position:fixed;z-index:34;right:12px;bottom:31px;display:flex;align-items:center;gap:13px;max-width:min(560px,calc(100vw - 24px));padding:6px 10px;border:1px solid rgba(105,125,151,.22);border-radius:999px;background:rgba(249,252,253,.88);box-shadow:0 7px 20px rgba(40,58,83,.09);backdrop-filter:blur(12px);color:#778599;font-size:8px;line-height:1.2;pointer-events:auto}
    #figureloomLegalFooter>span:last-child{display:flex;gap:8px;white-space:nowrap}#figureloomLegalFooter a{color:#536f91;text-decoration:none;font-weight:750}#figureloomLegalFooter a:hover{text-decoration:underline}
    @media(max-width:680px){#figureloomLegalFooter{left:8px;right:8px;bottom:29px;justify-content:space-between;border-radius:11px}#figureloomLegalFooter>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
  `;
  document.head.appendChild(style);
})();
