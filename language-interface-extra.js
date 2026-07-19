(() => {
  if (window.__figureLoomInterfaceExtraV1) return;
  window.__figureLoomInterfaceExtraV1 = true;

  const languages = ['en','nb','pl','de','fr','es','it','pt','nl'];
  const rows = [
    ['Untitled figure','Figur uten tittel','Rysunek bez tytułu','Unbenannte Abbildung','Figure sans titre','Figura sin título','Figura senza titolo','Figura sem título','Naamloze figuur'],
    ['Fit the whole page in the workspace','Tilpass hele siden til arbeidsområdet','Dopasuj całą stronę do obszaru roboczego','Ganze Seite in den Arbeitsbereich einpassen','Ajuster toute la page à l’espace de travail','Ajustar toda la página al área de trabajo','Adatta l’intera pagina all’area di lavoro','Ajustar toda a página à área de trabalho','Hele pagina in de werkruimte passen'],
    ['Editor tools','Redigeringsverktøy','Narzędzia edytora','Editorwerkzeuge','Outils de l’éditeur','Herramientas del editor','Strumenti dell’editor','Ferramentas do editor','Editorhulpmiddelen'],
    ['Account and project gallery','Konto og prosjektgalleri','Konto i galeria projektów','Konto und Projektgalerie','Compte et galerie de projets','Cuenta y galería de proyectos','Account e galleria progetti','Conta e galeria de projetos','Account en projectgalerij'],
    ['Project gallery','Prosjektgalleri','Galeria projektów','Projektgalerie','Galerie de projets','Galería de proyectos','Galleria progetti','Galeria de projetos','Projectgalerij'],
    ['Sign in','Logg inn','Zaloguj się','Anmelden','Se connecter','Iniciar sesión','Accedi','Iniciar sessão','Aanmelden'],
    ['Sign out','Logg ut','Wyloguj się','Abmelden','Se déconnecter','Cerrar sesión','Esci','Terminar sessão','Afmelden'],
    ['Projects','Prosjekter','Projekty','Projekte','Projets','Proyectos','Progetti','Projetos','Projecten'],
    ['New project','Nytt prosjekt','Nowy projekt','Neues Projekt','Nouveau projet','Nuevo proyecto','Nuovo progetto','Novo projeto','Nieuw project'],
    ['Open project','Åpne prosjekt','Otwórz projekt','Projekt öffnen','Ouvrir le projet','Abrir proyecto','Apri progetto','Abrir projeto','Project openen'],
    ['Save project','Lagre prosjekt','Zapisz projekt','Projekt speichern','Enregistrer le projet','Guardar proyecto','Salva progetto','Guardar projeto','Project opslaan'],
    ['Rename project','Gi prosjektet nytt navn','Zmień nazwę projektu','Projekt umbenennen','Renommer le projet','Renombrar proyecto','Rinomina progetto','Renomear projeto','Project hernoemen'],
    ['Delete project','Slett prosjekt','Usuń projekt','Projekt löschen','Supprimer le projet','Eliminar proyecto','Elimina progetto','Eliminar projeto','Project verwijderen'],
    ['Project name','Prosjektnavn','Nazwa projektu','Projektname','Nom du projet','Nombre del proyecto','Nome del progetto','Nome do projeto','Projectnaam'],
    ['Close panel','Lukk panel','Zamknij panel','Bereich schließen','Fermer le panneau','Cerrar panel','Chiudi pannello','Fechar painel','Paneel sluiten'],
    ['Done','Ferdig','Gotowe','Fertig','Terminé','Listo','Fatto','Concluído','Gereed'],
    ['Help','Hjelp','Pomoc','Hilfe','Aide','Ayuda','Aiuto','Ajuda','Help'],
    ['No results','Ingen resultater','Brak wyników','Keine Ergebnisse','Aucun résultat','Sin resultados','Nessun risultato','Sem resultados','Geen resultaten'],
    ['Loading…','Laster…','Ładowanie…','Wird geladen…','Chargement…','Cargando…','Caricamento…','A carregar…','Laden…'],
    ['Try again','Prøv igjen','Spróbuj ponownie','Erneut versuchen','Réessayer','Intentar de nuevo','Riprova','Tentar novamente','Opnieuw proberen'],
    ['Copy','Kopier','Kopiuj','Kopieren','Copier','Copiar','Copia','Copiar','Kopiëren'],
    ['Paste','Lim inn','Wklej','Einfügen','Coller','Pegar','Incolla','Colar','Plakken'],
    ['Duplicate','Dupliser','Duplikuj','Duplizieren','Dupliquer','Duplicar','Duplica','Duplicar','Dupliceren'],
    ['Lock','Lås','Zablokuj','Sperren','Verrouiller','Bloquear','Blocca','Bloquear','Vergrendelen'],
    ['Unlock','Lås opp','Odblokuj','Entsperren','Déverrouiller','Desbloquear','Sblocca','Desbloquear','Ontgrendelen'],
    ['Group','Grupper','Grupuj','Gruppieren','Grouper','Agrupar','Raggruppa','Agrupar','Groeperen'],
    ['Ungroup','Opphev gruppering','Rozgrupuj','Gruppierung aufheben','Dissocier','Desagrupar','Separa','Desagrupar','Groep opheffen'],
    ['Align','Juster','Wyrównaj','Ausrichten','Aligner','Alinear','Allinea','Alinhar','Uitlijnen'],
    ['Distribute','Fordel','Rozmieść','Verteilen','Répartir','Distribuir','Distribuisci','Distribuir','Verdelen'],
    ['Rotate','Roter','Obróć','Drehen','Faire pivoter','Girar','Ruota','Rodar','Draaien'],
    ['Width','Bredde','Szerokość','Breite','Largeur','Ancho','Larghezza','Largura','Breedte'],
    ['Height','Høyde','Wysokość','Höhe','Hauteur','Alto','Altezza','Altura','Hoogte'],
    ['Font','Skrift','Czcionka','Schriftart','Police','Fuente','Carattere','Tipo de letra','Lettertype'],
    ['Font size','Skriftstørrelse','Rozmiar czcionki','Schriftgröße','Taille de police','Tamaño de fuente','Dimensione carattere','Tamanho da letra','Lettergrootte'],
    ['Bold','Fet','Pogrubienie','Fett','Gras','Negrita','Grassetto','Negrito','Vet'],
    ['Italic','Kursiv','Kursywa','Kursiv','Italique','Cursiva','Corsivo','Itálico','Cursief'],
    ['Underline','Understrek','Podkreślenie','Unterstreichen','Souligner','Subrayar','Sottolinea','Sublinhado','Onderstrepen'],
    ['Text color','Tekstfarge','Kolor tekstu','Textfarbe','Couleur du texte','Color del texto','Colore del testo','Cor do texto','Tekstkleur'],
    ['Background','Bakgrunn','Tło','Hintergrund','Arrière-plan','Fondo','Sfondo','Fundo','Achtergrond'],
    ['Border','Ramme','Obramowanie','Rahmen','Bordure','Borde','Bordo','Contorno','Rand'],
    ['Theme','Tema','Motyw','Design','Thème','Tema','Tema','Tema','Thema'],
    ['Template','Mal','Szablon','Vorlage','Modèle','Plantilla','Modello','Modelo','Sjabloon'],
    ['Insert','Sett inn','Wstaw','Einfügen','Insérer','Insertar','Inserisci','Inserir','Invoegen'],
    ['Remove','Fjern','Usuń','Entfernen','Retirer','Quitar','Rimuovi','Remover','Verwijderen'],
    ['Zoom','Zoom','Powiększenie','Zoom','Zoom','Zoom','Zoom','Zoom','Zoom'],
    ['Center','Sentrer','Wyśrodkuj','Zentrieren','Centrer','Centrar','Centra','Centrar','Centreren'],
    ['Navigator','Navigator','Nawigator','Navigator','Navigateur','Navegador','Navigatore','Navegador','Navigator'],
    ['Dock','Fest','Zadokuj','Andocken','Ancrer','Acoplar','Ancora','Acoplar','Vastzetten'],
    ['Previous','Forrige','Poprzedni','Zurück','Précédent','Anterior','Precedente','Anterior','Vorige'],
    ['Next','Neste','Dalej','Weiter','Suivant','Siguiente','Successivo','Seguinte','Volgende'],
    ['Import file','Importer fil','Importuj plik','Datei importieren','Importer un fichier','Importar archivo','Importa file','Importar ficheiro','Bestand importeren'],
    ['Export project','Eksporter prosjekt','Eksportuj projekt','Projekt exportieren','Exporter le projet','Exportar proyecto','Esporta progetto','Exportar projeto','Project exporteren']
  ];

  function normalize(code) {
    const value = String(code || 'en').toLowerCase();
    return languages.find(language => value === language || value.startsWith(`${language}-`)) || 'en';
  }

  function install() {
    const base = window.FigureLoomInterfacePhrases;
    if (!base || base.__figureLoomExtraPhrases) return;

    const tables = Object.fromEntries(languages.map((language, index) => [
      language,
      Object.fromEntries(rows.map(row => [row[0], row[index]]))
    ]));

    window.FigureLoomInterfacePhrases = Object.freeze({
      __figureLoomExtraPhrases:true,
      translate(code, phrase) {
        const language = normalize(code);
        return tables[language]?.[phrase] || base.translate(code, phrase);
      },
      has(phrase) {
        return Object.prototype.hasOwnProperty.call(tables.en, phrase) || base.has(phrase);
      }
    });

    dispatchEvent(new CustomEvent('figureloom-interface-phrases-ready'));
  }

  if (window.FigureLoomInterfacePhrases) install();
  else addEventListener('figureloom-interface-phrases-ready', install, { once:true });
})();
