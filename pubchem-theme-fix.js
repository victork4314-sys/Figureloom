(() => {
  const style = document.createElement('style');
  style.textContent = `
    .pubchem-hero{
      border-color:#d3dce8!important;
      background:linear-gradient(135deg,#edf3ff,#f8fbff)!important;
    }
    .pubchem-hero strong{color:#263a64!important}
    .pubchem-hero span{color:#687896!important}
    .pubchem-hero a{
      border-color:#9bb5eb!important;
      color:#315aa8!important;
    }
    .pubchem-search input{border-color:#cad4e1!important}
    .pubchem-search button,
    #packSources [data-pack="pubchem"] .primary{
      border-color:#2563eb!important;
      background:#2563eb!important;
      color:#fff!important;
    }
    .pubchem-quick button,
    .pubchem-suggestions button{
      border-color:#cdd7e4!important;
      color:#315aa8!important;
    }
    .pubchem-quick button:hover,
    .pubchem-suggestions button:hover{
      border-color:#547fd5!important;
      background:#edf3ff!important;
    }
    .pubchem-status{color:#667386!important}
    .pubchem-card{border-color:#d4dde8!important}
    .pubchem-preview{border-bottom-color:#edf3ff!important}
    .pubchem-copy span{color:#263a64!important}
    .pubchem-copy small{color:#788496!important}
    .pubchem-actions button,
    .pubchem-actions a{
      border-color:#c9d4e2!important;
      background:#f7f9fc!important;
      color:#315aa8!important;
    }
    .pubchem-actions button:hover{
      background:#edf3ff!important;
      border-color:#7899da!important;
    }
    .pubchem-empty{color:#667386!important}
    .pubchem-inline-status{
      border-color:#cbd5e1!important;
      background:#f8fafc!important;
      color:#52627a!important;
    }
  `;
  document.head.appendChild(style);
})();
