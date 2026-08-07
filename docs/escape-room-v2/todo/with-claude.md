# Todo — à faire avec Claude

Ce qui reste à régler ensemble (Claude a accès au ha-mcp mais **pas** à un test
visuel/live — Eric joue et observe, Claude ajuste le code).

## 🤖 1. Calibrer les coordonnées de Roby

- [x] Cible `app_goto_target` calibrée en live : **`COORD_DINING =
      [23500, 31500]`** (9 m arrière, 1 m à gauche du dock). Voir la section
      « Robot Roby » du `design.md` pour le repère complet de la carte.
      Plus à gauche = bloqué par la table de la salle à manger.
- [x] **Délai de trajet** calé : ~60 s chronométrées du dock à l'étagère, donc
      `delay: 65 s` avant le `locate` (« Hi! I'm over here! »).
      Comme le trajet dure une minute, Roby est lancé via `script.turn_on`
      (non bloquant) et `mystery_reset` coupe son script au passage.
- [ ] ⚠️ **Calibrer le 2ᵉ parcours (`spices`, rack d'épices)** — la coordonnée
      `[26500, 31500]` dans `script.mystery_roby_goto` est un **placeholder
      inventé**, il va très probablement répondre « could not reach target ».
      Même méthode qu'avant : Eric dit la position du rack d'épices par rapport
      au dock (distance vers l'arrière + gauche/droite), Claude envoie les
      `app_goto_target` via le MCP, on affine.
      Chronométrer aussi le trajet pour ajuster `travel_seconds` (100 s posés
      d'avance, à valider : il faut que les joueurs soient remontés de
      l'atelier avant le 1ᵉʳ `locate`).

## 🎙️ 2. Voix TTS des 3 suspects

Une voix par suspect est **posée dans `mystery_suspect_speak`** (variable
`voice`, passée en `options: { voice: ... }`) :

| Suspect | Voix | Intention |
|---|---|---|
| 🌿 Jardinier | `Maurice` | bourru, terre à terre |
| 💎 Héritière | `Denise (excited)` puis `Denise` | paniquée sur la réplique du fusil, calmée au rappel |
| 🤵 Majordome | `Alain` | guindé, onctueux |

> ⚠️ Le format attendu est le **nom affiché** (`Denise (excited)`), **pas** le
> `voice_id` de l'API (`DeniseNeural||excited`). C'est ce que fait la v1
> (`scripts.yaml`, action « Indice »).

Autres voix disponibles sur `tts.home_assistant_cloud` si besoin de changer :

- **fr-FR** — hommes : Alain, Claude, Henri, Jerome, Maurice, Yves ·
  femmes : Brigitte, Celeste, Coralie, Denise, Eloise, Jacqueline, Josephine,
  Yvette.
- **fr-CA** (accent québécois, choix plus limité) : Antoine, Jean, Thierry,
  Sylvie.
- **Variantes émotionnelles**, pour Denise et Henri seulement : `(cheerful)`,
  `(sad)`, `(whispering)`, `(excited)`.

Reste à faire :

- [ ] Valider les 3 voix **à l'oreille** et les changer si elles ne collent pas.
- [ ] Vérifier qu'elles restent distinctes de celle de **l'inspecteur** (qui
      passe par le pipeline du téléphone, pas par ce script).

## 🧪 3. Débrief après le premier test live (Eric joue → Claude corrige)

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

## 🏁 4. Clôture de la branche

- [ ] Décider quoi faire de la branche `escape-2` une fois le jeu validé en
      live : garder / ouvrir une PR / merger sur `main`.
