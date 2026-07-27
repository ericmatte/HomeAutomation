# Todo — à faire avec Claude

Ce qui reste à régler ensemble (Claude a accès au ha-mcp mais **pas** à un test
visuel/live — Eric joue et observe, Claude ajuste le code).

## 🤖 1. Calibrer les coordonnées de Roby

- [ ] Trouver la bonne cible `app_goto_target` pour que Roby s'arrête **près du
      vin** (salle à manger). Départ : `COORD_DINING = [18500, 25500]` dans
      `script.mystery_roby_to_dining`.
      → Claude pilote Roby via le MCP (`vacuum.send_command`), Eric regarde où il
      s'arrête, on affine en quelques essais, puis on met à jour le script.
- [ ] Ajuster le **délai de trajet** (18 s par défaut dans
      `mystery_roby_to_dining`) pour que le `locate` (« Hi! I'm over here! »)
      sonne **une fois Roby arrivé**, pas avant.

## 🧪 2. Débrief après le premier test live (Eric joue → Claude corrige)

Points à valider en live, à corriger ensuite si besoin :

- [ ] **Ducking Sonos** : la voix de l'Héritière baisse bien la musique
      d'ambiance puis la musique revient (comportement natif attendu).
- [ ] **Reconnaissance des noms à l'accusation** (`ask_question` : Jardinier /
      Héritière / Majordome) — vérifier que les 3 noms sont bien captés ; sinon
      enrichir les `sentences`.
- [ ] **Trigger vocal « inspecteur »** lance bien le rappel + l'accusation.
- [ ] **Vidéo finale** `Final Reveal.mp4` : lecture OK sur `media_player.theatre_tv`
      (sinon ajuster `media_content_type` / la source).
- [ ] **Enchaînement des phases** de bout en bout (intro → enquête → autopsie
      auto après les 3 suspects → accusation → final).
- [ ] Ajustements de **dialogues / délais / volumes** selon le ressenti.

## 🏁 3. Clôture de la branche

- [ ] Décider quoi faire de la branche `escape-2` une fois le jeu validé en
      live : garder / ouvrir une PR / merger sur `main`.
