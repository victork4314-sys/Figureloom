(() => {
  if (window.__figureLoomSettingsGentleFixV3) return;
  window.__figureLoomSettingsGentleFixV3 = true;

  const translationLanguages = ["en", "nb", "pl", "de", "fr", "es", "it", "pt", "nl"];
  const translationRows = [
  [
    "Settings sections",
    "Innstillingskategorier",
    "Sekcje ustawień",
    "Einstellungsbereiche",
    "Sections des paramètres",
    "Secciones de configuración",
    "Sezioni delle impostazioni",
    "Secções das definições",
    "Instellingscategorieën"
  ],
  [
    "Projects",
    "Prosjekter",
    "Projekty",
    "Projekte",
    "Projets",
    "Proyectos",
    "Progetti",
    "Projetos",
    "Projecten"
  ],
  [
    "Home",
    "Hjem",
    "Strona główna",
    "Start",
    "Accueil",
    "Inicio",
    "Home",
    "Início",
    "Start"
  ],
  [
    "Add",
    "Legg til",
    "Dodaj",
    "Hinzufügen",
    "Ajouter",
    "Añadir",
    "Aggiungi",
    "Adicionar",
    "Toevoegen"
  ],
  [
    "Illustrations",
    "Illustrasjoner",
    "Ilustracje",
    "Illustrationen",
    "Illustrations",
    "Ilustraciones",
    "Illustrazioni",
    "Ilustrações",
    "Illustraties"
  ],
  [
    "Arrange",
    "Ordne",
    "Rozmieść",
    "Anordnen",
    "Organiser",
    "Organizar",
    "Disponi",
    "Organizar",
    "Schikken"
  ],
  [
    "Style",
    "Stil",
    "Styl",
    "Stil",
    "Style",
    "Estilo",
    "Stile",
    "Estilo",
    "Stijl"
  ],
  [
    "Charts",
    "Diagrammer",
    "Wykresy",
    "Diagramme",
    "Graphiques",
    "Gráficos",
    "Grafici",
    "Gráficos",
    "Grafieken"
  ],
  [
    "Check",
    "Kontroller",
    "Sprawdź",
    "Prüfen",
    "Vérifier",
    "Revisar",
    "Controlla",
    "Verificar",
    "Controleren"
  ],
  [
    "Settings",
    "Innstillinger",
    "Ustawienia",
    "Einstellungen",
    "Paramètres",
    "Configuración",
    "Impostazioni",
    "Definições",
    "Instellingen"
  ],
  [
    "Share",
    "Del",
    "Udostępnij",
    "Teilen",
    "Partager",
    "Compartir",
    "Condividi",
    "Partilhar",
    "Delen"
  ],
  [
    "Create, open, switch, save, and disconnect projects",
    "Opprett, åpne, bytt mellom, lagre og koble fra prosjekter",
    "Twórz, otwieraj, przełączaj, zapisuj i odłączaj projekty",
    "Projekte erstellen, öffnen, wechseln, speichern und trennen",
    "Créer, ouvrir, changer, enregistrer et déconnecter des projets",
    "Crear, abrir, cambiar, guardar y desconectar proyectos",
    "Creare, aprire, cambiare, salvare e disconnettere i progetti",
    "Criar, abrir, alternar, guardar e desligar projetos",
    "Projecten maken, openen, wisselen, opslaan en loskoppelen"
  ],
  [
    "Project",
    "Prosjekt",
    "Projekt",
    "Projekt",
    "Projet",
    "Proyecto",
    "Progetto",
    "Projeto",
    "Project"
  ],
  [
    "Open now",
    "Åpne prosjekter",
    "Otwarte projekty",
    "Geöffnete Projekte",
    "Projets ouverts",
    "Proyectos abiertos",
    "Progetti aperti",
    "Projetos abertos",
    "Geopende projecten"
  ],
  [
    "Current",
    "Gjeldende",
    "Bieżący",
    "Aktuell",
    "Actuel",
    "Actual",
    "Corrente",
    "Atual",
    "Huidig"
  ],
  [
    "New",
    "Ny",
    "Nowy",
    "Neu",
    "Nouveau",
    "Nuevo",
    "Nuovo",
    "Novo",
    "Nieuw"
  ],
  [
    "Open",
    "Åpne",
    "Otwórz",
    "Öffnen",
    "Ouvrir",
    "Abrir",
    "Apri",
    "Abrir",
    "Openen"
  ],
  [
    "Save",
    "Lagre",
    "Zapisz",
    "Speichern",
    "Enregistrer",
    "Guardar",
    "Salva",
    "Guardar",
    "Opslaan"
  ],
  [
    "Open projects",
    "Åpne prosjekter",
    "Otwarte projekty",
    "Geöffnete Projekte",
    "Projets ouverts",
    "Proyectos abiertos",
    "Progetti aperti",
    "Projetos abertos",
    "Geopende projecten"
  ],
  [
    "Local project",
    "Lokalt prosjekt",
    "Projekt lokalny",
    "Lokales Projekt",
    "Projet local",
    "Proyecto local",
    "Progetto locale",
    "Projeto local",
    "Lokaal project"
  ],
  [
    "Not connected",
    "Ikke tilkoblet",
    "Niepołączony",
    "Nicht verbunden",
    "Non connecté",
    "Sin conexión",
    "Non connesso",
    "Não ligado",
    "Niet verbonden"
  ],
  [
    "Disconnect",
    "Koble fra",
    "Odłącz",
    "Trennen",
    "Déconnecter",
    "Desconectar",
    "Disconnetti",
    "Desligar",
    "Loskoppelen"
  ],
  [
    "Reconnect",
    "Koble til igjen",
    "Połącz ponownie",
    "Erneut verbinden",
    "Reconnecter",
    "Volver a conectar",
    "Riconnetti",
    "Voltar a ligar",
    "Opnieuw verbinden"
  ],
  [
    "Open current cloud project in another window",
    "Åpne gjeldende skyprosjekt i et annet vindu",
    "Otwórz bieżący projekt w chmurze w innym oknie",
    "Aktuelles Cloud-Projekt in einem anderen Fenster öffnen",
    "Ouvrir le projet cloud actuel dans une autre fenêtre",
    "Abrir el proyecto actual en la nube en otra ventana",
    "Apri il progetto cloud corrente in un’altra finestra",
    "Abrir o projeto atual na nuvem noutra janela",
    "Huidig cloudproject in een ander venster openen"
  ],
  [
    "Close this project from the open list without deleting it",
    "Lukk dette prosjektet fra listen over åpne prosjekter uten å slette det",
    "Zamknij ten projekt na liście otwartych bez usuwania go",
    "Dieses Projekt aus der Liste der geöffneten Projekte schließen, ohne es zu löschen",
    "Fermer ce projet dans la liste des projets ouverts sans le supprimer",
    "Cerrar este proyecto de la lista de abiertos sin eliminarlo",
    "Chiudi questo progetto dall’elenco dei progetti aperti senza eliminarlo",
    "Fechar este projeto na lista de projetos abertos sem o eliminar",
    "Dit project uit de lijst met geopende projecten sluiten zonder het te verwijderen"
  ],
  [
    "Untitled project",
    "Prosjekt uten tittel",
    "Projekt bez tytułu",
    "Unbenanntes Projekt",
    "Projet sans titre",
    "Proyecto sin título",
    "Progetto senza titolo",
    "Projeto sem título",
    "Naamloos project"
  ],
  [
    "Draft saved on this device",
    "Utkast lagret på denne enheten",
    "Wersja robocza zapisana na tym urządzeniu",
    "Entwurf auf diesem Gerät gespeichert",
    "Brouillon enregistré sur cet appareil",
    "Borrador guardado en este dispositivo",
    "Bozza salvata su questo dispositivo",
    "Rascunho guardado neste dispositivo",
    "Concept op dit apparaat opgeslagen"
  ],
  [
    "Saved to cloud",
    "Lagret i skyen",
    "Zapisano w chmurze",
    "In der Cloud gespeichert",
    "Enregistré dans le cloud",
    "Guardado en la nube",
    "Salvato nel cloud",
    "Guardado na nuvem",
    "Opgeslagen in de cloud"
  ],
  [
    "Preparing new project…",
    "Klargjør nytt prosjekt…",
    "Przygotowywanie nowego projektu…",
    "Neues Projekt wird vorbereitet…",
    "Préparation du nouveau projet…",
    "Preparando nuevo proyecto…",
    "Preparazione del nuovo progetto…",
    "A preparar o novo projeto…",
    "Nieuw project voorbereiden…"
  ],
  [
    "Saving before creating project…",
    "Lagrer før nytt prosjekt opprettes…",
    "Zapisywanie przed utworzeniem projektu…",
    "Vor dem Erstellen des Projekts wird gespeichert…",
    "Enregistrement avant la création du projet…",
    "Guardando antes de crear el proyecto…",
    "Salvataggio prima di creare il progetto…",
    "A guardar antes de criar o projeto…",
    "Opslaan voordat het project wordt gemaakt…"
  ],
  [
    "New local project",
    "Nytt lokalt prosjekt",
    "Nowy projekt lokalny",
    "Neues lokales Projekt",
    "Nouveau projet local",
    "Nuevo proyecto local",
    "Nuovo progetto locale",
    "Novo projeto local",
    "Nieuw lokaal project"
  ],
  [
    "Switching projects…",
    "Bytter prosjekt…",
    "Przełączanie projektów…",
    "Projekt wird gewechselt…",
    "Changement de projet…",
    "Cambiando de proyecto…",
    "Cambio di progetto…",
    "A mudar de projeto…",
    "Van project wisselen…"
  ],
  [
    "Saving before switching…",
    "Lagrer før bytte…",
    "Zapisywanie przed przełączeniem…",
    "Vor dem Wechsel wird gespeichert…",
    "Enregistrement avant le changement…",
    "Guardando antes de cambiar…",
    "Salvataggio prima del cambio…",
    "A guardar antes de mudar…",
    "Opslaan vóór het wisselen…"
  ],
  [
    "Live project connected",
    "Direkteprosjekt tilkoblet",
    "Połączono projekt na żywo",
    "Live-Projekt verbunden",
    "Projet en direct connecté",
    "Proyecto en directo conectado",
    "Progetto live connesso",
    "Projeto em direto ligado",
    "Liveproject verbonden"
  ],
  [
    "Local project open",
    "Lokalt prosjekt åpent",
    "Projekt lokalny otwarty",
    "Lokales Projekt geöffnet",
    "Projet local ouvert",
    "Proyecto local abierto",
    "Progetto locale aperto",
    "Projeto local aberto",
    "Lokaal project geopend"
  ],
  [
    "Saving project…",
    "Lagrer prosjekt…",
    "Zapisywanie projektu…",
    "Projekt wird gespeichert…",
    "Enregistrement du projet…",
    "Guardando proyecto…",
    "Salvataggio del progetto…",
    "A guardar o projeto…",
    "Project opslaan…"
  ],
  [
    "Saved as cloud project",
    "Lagret som skyprosjekt",
    "Zapisano jako projekt w chmurze",
    "Als Cloud-Projekt gespeichert",
    "Enregistré comme projet cloud",
    "Guardado como proyecto en la nube",
    "Salvato come progetto cloud",
    "Guardado como projeto na nuvem",
    "Opgeslagen als cloudproject"
  ],
  [
    "Saving before disconnect…",
    "Lagrer før frakobling…",
    "Zapisywanie przed odłączeniem…",
    "Vor dem Trennen wird gespeichert…",
    "Enregistrement avant la déconnexion…",
    "Guardando antes de desconectar…",
    "Salvataggio prima della disconnessione…",
    "A guardar antes de desligar…",
    "Opslaan vóór het loskoppelen…"
  ],
  [
    "Disconnected · latest state saved",
    "Frakoblet · siste tilstand lagret",
    "Odłączono · zapisano najnowszy stan",
    "Getrennt · letzter Stand gespeichert",
    "Déconnecté · dernier état enregistré",
    "Desconectado · último estado guardado",
    "Disconnesso · ultimo stato salvato",
    "Desligado · estado mais recente guardado",
    "Losgekoppeld · laatste status opgeslagen"
  ],
  [
    "Closing local project…",
    "Lukker lokalt prosjekt…",
    "Zamykanie projektu lokalnego…",
    "Lokales Projekt wird geschlossen…",
    "Fermeture du projet local…",
    "Cerrando proyecto local…",
    "Chiusura del progetto locale…",
    "A fechar o projeto local…",
    "Lokaal project sluiten…"
  ],
  [
    "Local canvas · no project open",
    "Lokalt lerret · ingen prosjekter åpne",
    "Lokalne płótno · brak otwartego projektu",
    "Lokale Zeichenfläche · kein Projekt geöffnet",
    "Toile locale · aucun projet ouvert",
    "Lienzo local · ningún proyecto abierto",
    "Tela locale · nessun progetto aperto",
    "Tela local · nenhum projeto aberto",
    "Lokaal canvas · geen project geopend"
  ],
  [
    "No projects open yet",
    "Ingen prosjekter er åpne ennå",
    "Brak otwartych projektów",
    "Noch keine Projekte geöffnet",
    "Aucun projet ouvert pour le moment",
    "Aún no hay proyectos abiertos",
    "Nessun progetto aperto",
    "Ainda não há projetos abertos",
    "Nog geen projecten geopend"
  ],
  [
    "No cloud project connected",
    "Ingen skyprosjekter tilkoblet",
    "Brak połączonego projektu w chmurze",
    "Kein Cloud-Projekt verbunden",
    "Aucun projet cloud connecté",
    "No hay ningún proyecto en la nube conectado",
    "Nessun progetto cloud connesso",
    "Nenhum projeto na nuvem ligado",
    "Geen cloudproject verbonden"
  ],
  [
    "Local draft · save to cloud when ready",
    "Lokalt utkast · lagre i skyen når det er klart",
    "Wersja robocza lokalna · zapisz w chmurze, gdy będzie gotowa",
    "Lokaler Entwurf · in der Cloud speichern, sobald er fertig ist",
    "Brouillon local · enregistrer dans le cloud lorsqu’il est prêt",
    "Borrador local · guardar en la nube cuando esté listo",
    "Bozza locale · salva nel cloud quando è pronta",
    "Rascunho local · guardar na nuvem quando estiver pronto",
    "Lokaal concept · sla op in de cloud wanneer het klaar is"
  ],
  [
    "Live collaboration connected",
    "Direktesamarbeid tilkoblet",
    "Połączono współpracę na żywo",
    "Live-Zusammenarbeit verbunden",
    "Collaboration en direct connectée",
    "Colaboración en directo conectada",
    "Collaborazione live connessa",
    "Colaboração em direto ligada",
    "Live samenwerking verbonden"
  ],
  [
    "Disconnected · latest state kept locally",
    "Frakoblet · siste tilstand beholdt lokalt",
    "Odłączono · najnowszy stan zachowano lokalnie",
    "Getrennt · letzter Stand lokal behalten",
    "Déconnecté · dernier état conservé localement",
    "Desconectado · último estado guardado localmente",
    "Disconnesso · ultimo stato conservato in locale",
    "Desligado · estado mais recente mantido localmente",
    "Losgekoppeld · laatste status lokaal bewaard"
  ],
  [
    "Local canvas",
    "Lokalt lerret",
    "Lokalne płótno",
    "Lokale Zeichenfläche",
    "Toile locale",
    "Lienzo local",
    "Tela locale",
    "Tela local",
    "Lokaal canvas"
  ],
  [
    "local draft",
    "lokalt utkast",
    "wersja robocza lokalna",
    "lokaler Entwurf",
    "brouillon local",
    "borrador local",
    "bozza locale",
    "rascunho local",
    "lokaal concept"
  ],
  [
    "disconnected",
    "frakoblet",
    "odłączony",
    "getrennt",
    "déconnecté",
    "desconectado",
    "disconnesso",
    "desligado",
    "losgekoppeld"
  ],
  [
    "Saving…",
    "Lagrer…",
    "Zapisywanie…",
    "Wird gespeichert…",
    "Enregistrement…",
    "Guardando…",
    "Salvataggio…",
    "A guardar…",
    "Opslaan…"
  ]
];

  function normalizeLanguage(code) {
    const value = String(code || 'en').toLowerCase();
    return translationLanguages.find(language => value === language || value.startsWith(`${language}-`)) || 'en';
  }

  function installTranslationCorrections() {
    const base = window.FigureLoomInterfacePhrases;
    if (!base || base.__figureLoomSettingsCorrectionsV1) return;

    const tables = Object.fromEntries(translationLanguages.map((language, index) => [
      language,
      Object.fromEntries(translationRows.map(row => [row[0], row[index]]))
    ]));

    window.FigureLoomInterfacePhrases = Object.freeze({
      __figureLoomExtraPhrases:true,
      __figureLoomSettingsCorrectionsV1:true,
      translate(code, phrase) {
        const language = normalizeLanguage(code);
        return tables[language]?.[phrase] || base.translate(code, phrase);
      },
      has(phrase) {
        return Object.prototype.hasOwnProperty.call(tables.en, phrase) || base.has(phrase);
      }
    });

    dispatchEvent(new CustomEvent('figureloom-interface-phrases-ready'));
  }

  function placeSettingsBesideCheck() {
    const tabs = document.querySelector('.ribbon-tabs');
    const check = tabs?.querySelector('.ribbon-tab[data-tab="review"]');
    const settings = document.getElementById('settingsRibbonButton');
    if (!tabs || !check || !settings) return false;

    settings.classList.add('settings-ribbon-button');
    if (check.nextElementSibling !== settings) check.insertAdjacentElement('afterend', settings);
    return true;
  }

  function installGentleStyles() {
    document.getElementById('figureloomSettingsGentleStyle')?.remove();
    const style = document.createElement('style');
    style.id = 'figureloomSettingsGentleStyle';
    style.textContent = `
      #settingsRibbonButton{
        position:relative!important;
        height:38px!important;
        margin-left:0!important;
        flex:0 0 auto!important;
        padding:0 15px!important;
        border:0!important;
        border-bottom:0!important;
        border-radius:0!important;
        background:transparent!important;
        color:#65738a!important;
        font-weight:400!important;
        box-shadow:none!important;
      }
      #settingsRibbonButton::before{
        content:none!important;
        display:none!important;
        margin:0!important;
      }
      #settingsRibbonButton:hover{
        color:#334e79!important;
        background:rgba(75,116,165,.07)!important;
        box-shadow:none!important;
      }
      #settingsRibbonButton:focus-visible{
        outline:2px solid rgba(65,105,193,.35)!important;
        outline-offset:-3px!important;
        border-radius:7px!important;
      }
      html[data-figureloom-theme="dark"] #settingsRibbonButton{
        color:#bbc1c9!important;
        background:transparent!important;
      }
      html[data-figureloom-theme="dark"] #settingsRibbonButton:hover{
        color:#fff!important;
        background:#31363e!important;
      }
      html[data-figureloom-readable-font="1"] :where(
        .titlebar,.ribbon-tabs,.ribbon,.left-panel,.right-panel,.statusbar,.canvas-toolbar,
        .utility-drawer,.drawer,dialog,.modal,.figureloom-settings-page,.figureloom-chat-shell
      ){font-family:Verdana,Geneva,Arial,sans-serif!important}
      html[data-figureloom-readable-font="1"] :where(button,input,select,textarea){
        font-family:Verdana,Geneva,Arial,sans-serif!important
      }
    `;
    document.head.appendChild(style);
  }

  function placeSoon() {
    requestAnimationFrame(placeSettingsBesideCheck);
    setTimeout(placeSettingsBesideCheck, 100);
    setTimeout(placeSettingsBesideCheck, 500);
  }

  function init() {
    installTranslationCorrections();
    installGentleStyles();
    placeSoon();

    const tabs = document.querySelector('.ribbon-tabs');
    if (tabs) new MutationObserver(placeSettingsBesideCheck).observe(tabs, { childList:true });

    addEventListener('figureloom-settings-ready', () => {
      installTranslationCorrections();
      placeSoon();
    });
    addEventListener('figureloom-stable-ready', placeSoon);
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
