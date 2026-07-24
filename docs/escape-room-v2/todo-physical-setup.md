# Escape Room v2 — Todo installation physique (côté Eric)

Tout ce qui doit être fait « à la main » dans la maison / dans HA avant que le
jeu tourne. Le code (scripts, automations, scènes) est géré séparément.

## 🔊 1. Placement des haut-parleurs (voix des suspects)

- [x] **Echo** (`media_player.workshop_echo`) — reste à l'**atelier/établi**
      (Jardinier). ✔️ déjà en place.
- [x] **Sonos** (`media_player.sonos`) — reste au **salon** (Héritière + intro
      police). ✔️ déjà en place.
- [ ] **Google Home Mini** (`media_player.google_home_mini`) — **déplacer en
      salle à manger** (Majordome). Actuellement dans le bureau.
- [x] **Téléphone** (inspecteur) — Dans le salon, près du Sonos.

## 🚪 2. Capteurs

- [ ] **Capteur de vibration** (`binary_sensor.vibration_sensor_vibration`) —
      **déplacer sur une bouteille de vin** en salle à manger (comme la boîte
      de thé en v1). Ajuster la sensibilité si besoin
      (`number.vibration_sensor_sensitivity`).
- [ ] **`patio_door`** (salle à manger) — utilisé tel quel comme « porte/tiroir
      à ouvrir ». ✔️ rien à déplacer.
- [ ] **Porte de l'atelier** (`binary_sensor.door_sensor_contact`) — utilisée
      telle quelle pour déclencher le Jardinier. ✔️
- [ ] **Déclencheur du salon** (Héritière) : le même bouton que dans Escape Room v1 (bouton Zigbee) qui appelait le Echo avec "hey par ici..."

## 🎭 3. Objets physiques à préparer

- [ ] **Bouteille de vin** (avec le capteur de vibration dessous/dessus) — salle
      à manger. C'est l'arme réelle (poison dans le vin).
- [ ] **Verre de vin** (déco, sur la table). Optionnel.
- [ ] **Fiole de poison** cachée derrière `patio_door` / dans le tiroir équipé.
- [ ] **Rack d'épices** avec une épice étiquetée **« POISON »** (source du
      poison). Idée validée par Eric.
- [ ] **Gants tachés** du Majordome (indice coupable) — salle à manger.
- [ ] **BB gun (fusil)** bien visible au **salon** (fausse piste de l'Héritière).
- [ ] **Scie à main** bien visible à l'**atelier** (fausse piste du Jardinier).
- [ ] **Cartes / labels imprimés** : noms des suspects, éventuelles énigmes,
      « scène de crime » — à finaliser une fois le script écrit.

## 🎵 4. Trames sonores à uploader dans Home Assistant

Uploader dans **Paramètres → Media → local** (chemin
`media-source://media_source/local/`). **Nomme les fichiers EXACTEMENT ainsi**
(le code les référencera par ces noms) :

| Nom de fichier exact         | Usage                                            | As-tu déjà ? |
| ---------------------------- | ------------------------------------------------ | ------------ |
| `Police Sirens.mp3`          | Phase 0 — gyrophares/sirènes                     | non          |
| `Police Radio Chatter.mp3`   | Phase 0 — brouhaha des policiers (si pas en TTS) | non          |
| `Car Drive Away.mp3`         | Phase 0 — la police repart                       | non          |
| `Phone Ringing.mp3`          | Phase 0→1 — le téléphone sonne                   | non          |
| `Investigation Ambience.mp3` | Phase 2 — musique d'enquête tendue (boucle)      | non          |
| `Dramatic Reveal.mp3`        | Phase 5 — révélation du coupable                 | non          |
| `Victory Theme.mp3`          | Phase 5 — victoire                               | non          |
| `Wrong Answer Sting.mp3`     | Phase 4 — mauvaise accusation (court)            | non          |

> Les **dialogues des suspects et de l'inspecteur** sont générés en **TTS** :
> aucun fichier à fournir pour eux. Le brouhaha des policiers (phase 0) peut
> aussi être scripté en TTS multi-voix si tu préfères ne pas chercher un
> fichier — à décider.

**Coche la colonne « As-tu déjà ? »** et dis-moi lesquels manquent ; on
ajustera (je peux aussi adapter les noms si tu as déjà des fichiers proches).

## 🤖 5. Roby (calibrage des coordonnées)

- [ ] À l'implémentation : on calibre `COORD_DINING` ensemble (je pilote Roby
      via le MCP, tu regardes où il s'arrête, on affine). Rien à préparer
      d'avance, sauf t'assurer que le dock est accessible et la carte à jour.

## ✅ 6. Décisions rapides attendues de ta part

1. Déclencheur du **salon** : capteur de mouvement déplacé **ou** bouton Zigbee ?
2. Trames sonores : lesquelles as-tu déjà (tableau ci-dessus) ?
3. Brouhaha policiers phase 0 : **fichier audio** ou **TTS scripté** ?
