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

## 🚪 2. Capteurs et déclencheurs (carte finale)

| Déclencheur | Entité HA | Emplacement à installer | Effet en jeu |
|---|---|---|---|
| Porte atelier | `binary_sensor.door_sensor_contact` | Atelier (inchangé) | Jardinier parle |
| **Capteur de vibration** | `binary_sensor.vibration_sensor_vibration` | **Trappe d'aération du foyer** (où est caché le BB gun) | **Héritière paniquée** |
| **Bouton Zigbee** | device `8317fbc3ea314ec40186f0d8ec39998d` | **Étagère à vins / spiritueux**, label **« cliquer pour service »** | Majordome « service » (marque le Majordome interrogé) |
| Porte-patio | `binary_sensor.patio_door_contact` | Salle à manger (inchangé) | Majordome « départ » (indice : étagère + tiroirs) |
| Capteur closet chambre | `binary_sensor.closed_closet_sensor_contact` | **Tiroir à couteaux (cuisine)** | Majordome feint l'innocence (fausse piste) |

- [ ] Déplacer le **capteur de vibration** sur la **trappe du foyer**. Ajuster
      la sensibilité si besoin (`number.vibration_sensor_sensitivity`).
- [ ] Déplacer le **bouton Zigbee** sur l'**étagère à vins** + label
      « cliquer pour service ».
- [ ] Déplacer le **capteur closet** sur le **tiroir à couteaux**.
- [x] Porte atelier et porte-patio : rien à déplacer.

> ⚠️ Le bouton Zigbee et le capteur de vibration sont **partagés avec la v1**.
> La garde `input_boolean.escape_v2_active` empêche la v1 de réagir pendant une
> partie v2. **Termine toujours une partie v2 par `script.mystery_reset`**,
> sinon la v1 reste bloquée.

## 🎭 3. Objets physiques à préparer

- [ ] **Bouteille de vin** sur l'étagère avec un **label** expliquant l'étape
      suivante (ex. « ce vin a un goût étrange… inspectez l'assaisonnement »).
- [ ] **BB gun (fusil)** caché dans la **trappe d'aération du foyer** (capteur
      de vibration dessus) — fausse piste de l'Héritière.
- [ ] **Fiole de poison** cachée (tiroir / derrière la porte-patio).
- [ ] **Rack d'épices** avec une épice étiquetée **« POISON »** (source du
      poison).
- [ ] **Gants tachés** du Majordome (indice coupable) — salle à manger.
- [ ] **Scie à main** bien visible à l'**atelier** (fausse piste du Jardinier).
- [ ] **Cartes / labels imprimés** : noms des suspects, label « cliquer pour
      service » sur l'étagère, énigmes.

## 📺 4. CCTV — setup manuel dans le bureau d'Eric (avant la partie)

Aucun code HA pour cette partie — préparation manuelle :

- [ ] Ouvrir sur les **2 écrans PC** (plein écran) :
      <https://www.whitescreen.online/hacker-simulator/>.
- [ ] Un **dossier Explorateur** nommé **« CCTV - Vidéos de surveillance »**
      avec **3 fichiers .mp4** ouvrables : 1 par suspect, chacun le montrant
      interagir (flou/mystérieux) avec son arme potentielle.

## 🎵 5. Trames sonores à uploader dans Home Assistant

Uploader dans **Paramètres → Media → local** (`media-source://media_source/local/`).
**Nomme les fichiers EXACTEMENT ainsi** :

| Nom de fichier exact | Usage | As-tu déjà ? |
| --- | --- | --- |
| `Police Sirens.mp3` | Phase 0 — gyrophares/sirènes | non |
| `Police Radio Chatter.mp3` | Phase 0 — brouhaha policiers (**enregistré par Eric**) | à enregistrer |
| `Car Drive Away.mp3` | Phase 0 — la police repart | non |
| `Phone Ringing.mp3` | Phase 0→1 + rappel autopsie — le téléphone sonne | non |
| `Investigation Ambience.mp3` | Enquête — musique de fond (Sonos, duckée par le TTS). **Fichier long** (5-10 min), pas de boucle. | non |
| `Wrong Answer Sting.mp3` | Mauvaise accusation (court) | non |
| `Final Reveal.mp4` | **Final gagnant — vidéo de révélation du Majordome** sur la TV du théâtre (rideaux baissés, lumière rouge). Vidéo produite par Eric. | à produire |

> Les **dialogues des suspects et de l'inspecteur** sont en **TTS** : aucun
> fichier à fournir. `Dramatic Reveal.mp3` / `Victory Theme.mp3` ne sont
> **plus utilisés** (le final passe par la vidéo `Final Reveal.mp4`).

## 🤖 6. Roby (calibrage des coordonnées)

- [ ] Calibrer `COORD_DINING` ensemble (je pilote Roby via le MCP, tu regardes
      où il s'arrête, on affine ; départ `[18500, 25500]`). Roby part vers le
      vin **quand on interroge le Jardinier**, puis fait `locate`
      (« Hi! I'm over here! »). Ajuster aussi le **délai de trajet** (18 s par
      défaut dans `mystery_roby_to_dining`) pour que le `locate` sonne à
      l'arrivée.
