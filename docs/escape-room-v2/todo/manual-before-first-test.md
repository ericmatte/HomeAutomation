# Todo — préparation manuelle avant le premier test (côté Eric)

Tout ce qu'Eric fait « à la main » avant de lancer une première partie v2. Le
code (scripts / automations / helpers) est déjà en place sur la branche.

## 🚀 0. Déploiement

- [ ] Basculer HA sur la branche **`escape-2`**.
- [ ] **Redémarrer Home Assistant** (pas juste un reload : les helpers YAML
      `input_select` / `input_boolean` exigent un redémarrage).

## 🔊 1. Haut-parleurs

- [x] Echo (`media_player.workshop_echo`) — atelier (Jardinier). Déjà en place.
- [x] Sonos (`media_player.sonos`) — salon (Héritière + intro police). Déjà là.
- [x] Téléphone (inspecteur) — salon, près du Sonos.
- [x] **Google Home Mini** (`media_player.google_home_mini`) — **déplacer en
      salle à manger** (Majordome). Actuellement dans le bureau.

## 🚪 2. Capteurs / déclencheurs

| À déplacer                 | Entité                                     | Nouvel emplacement                                           | Effet                       |
| -------------------------- | ------------------------------------------ | ------------------------------------------------------------ | --------------------------- |
| Capteur de vibration       | `binary_sensor.vibration_sensor_vibration` | **Trappe d'aération du foyer** (BB gun caché)                | Héritière paniquée          |
| Bouton Zigbee              | device `8317fbc3ea314ec40186f0d8ec39998d`  | **Étagère à vins**, label « cliquer pour service »           | Majordome « service »       |
| ~~Capteur closet chambre~~ | `binary_sensor.knife_drawer_contact`       | **Tiroir à couteaux (cuisine)** — ✅ capteur dédié déjà posé | Majordome feint l'innocence |

- [x] Déplacer le capteur de vibration sur la trappe du foyer (ajuster
      `number.vibration_sensor_sensitivity` au besoin).
- [x] Déplacer le bouton Zigbee sur l'étagère à vins (+ label).
- [x] Tiroir à couteaux : capteur **dédié** `binary_sensor.knife_drawer_contact`
      posé. Plus besoin de déplacer celui du closet, et la porte-patio garde le
      sien.
- [x] Porte atelier (`binary_sensor.door_sensor_contact`) et porte-patio
      (`binary_sensor.patio_door_contact`) : rien à déplacer.

> ⚠️ Bouton Zigbee et capteur de vibration sont **partagés avec la v1**. La
> garde `input_boolean.escape_v2_active` bloque la v1 pendant une partie v2.
> **Termine toujours une partie par `script.reset_after_escape_roome`**, sinon
> la v1 reste bloquée. Ce script remet aussi les deux jeux à zéro et rend au
> téléphone son assistant par défaut.
>
> ℹ️ Ouvrir la porte-patio coupe la thermopompe ~30 s (automation v1
> préexistante, laissée telle quelle) — comportement attendu, sans gravité.

## 🎭 3. Objets physiques

- [x] **Bouteille de vin** sur l'étagère + **label** vers l'étape suivante
      (ex. « ce vin a un goût étrange… inspectez l'assaisonnement / les tiroirs »).
- [x] **BB gun (fusil)** caché dans la **trappe du foyer** (capteur de vibration
      dessus) — fausse piste de l'Héritière.
- [ ] **Fiole de poison** cachée (tiroir / derrière la porte-patio).
- [x] **Rack d'épices** avec une épice étiquetée **« POISON »**.
- [ ] **Gants tachés** du Majordome (indice coupable) — salle à manger.
- [x] **Scie à main** bien visible à l'atelier (fausse piste du Jardinier).
- [x] **Labels imprimés** : label « cliquer pour service » (étagère à vins),
      label de la bouteille de vin, autres énigmes/cartes.

## 📺 4. CCTV — setup manuel PC dans le bureau (hors HA)

- [x] Ouvrir sur les **2 écrans PC** en plein écran :
      <https://www.whitescreen.online/hacker-simulator/>.
- [x] Un **dossier Explorateur** nommé **« CCTV - Vidéos de surveillance »**
      contenant **3 fichiers .mp4** ouvrables (1 par suspect, flous/mystérieux,
      chacun le montrant avec son arme potentielle).

## 🎵 5. Fichiers médias à uploader dans HA

Dans **Paramètres → Media → local** (`media-source://media_source/local/`).
**Noms EXACTS** (référencés par le code) :

| Nom de fichier exact         | Usage                                                                                             | Statut        |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ------------- |
| `Police Sirens.mp3`          | Phase 0 — sirènes                                                                                 | à trouver     |
| `Police Radio Chatter.mp3`   | Phase 0 — brouhaha policiers (enregistré par Eric)                                                | à enregistrer |
| `Car Drive Away.mp3`         | Phase 0 — la police repart                                                                        | à trouver     |
| `Phone Ringing.mp3`          | Phase 0→1 + rappel autopsie                                                                       | à trouver     |
| `Investigation Ambience.mp3` | Enquête — musique de fond (Sonos, duckée par le TTS). **Fichier long** (5-10 min), pas de boucle. | à trouver     |
| `Wrong Answer Sting.mp3`     | Mauvaise accusation (court)                                                                       | à trouver     |
| `Final Reveal.mp4`           | **Final gagnant** — vidéo de révélation du Majordome (TV théâtre)                                 | à produire    |

> Les dialogues des suspects et de l'inspecteur sont en **TTS** : aucun fichier
> à fournir.

### Liens suggérés (Pixabay — libre de droits, sans attribution)

Télécharger en MP3, puis **renommer exactement** comme dans le tableau ci-dessus.

| Fichier                      | Choix recommandé                                                                                        | Durée | Alternatives                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Police Sirens.mp3`          | [Police Siren Sound Effect](https://pixabay.com/sound-effects/film-special-effects-police-siren-sound-effect-240674/) | 0:18  | [Siren, Police](https://pixabay.com/sound-effects/film-special-effects-siren-police-279029/) (1:25) · [Police siren](https://pixabay.com/sound-effects/police-siren-21498/) (1:10)        |
| `Police Radio Chatter.mp3`   | Enregistré par Eric (~12 s)                                                                             | ~0:12 | [Police radio chatter](https://pixabay.com/sound-effects/film-special-effects-police-radio-chatter-30048/) (0:23) · [Police & Fire Scanner](https://pixabay.com/sound-effects/city-los-angeles-south-bay-police-and-fire-scanner-14646/) (4:14) |
| `Car Drive Away.mp3`         | [car pulling away](https://pixabay.com/sound-effects/city-car-pulling-away-36978/)                       | 0:07  | [Diesel car driving away](https://pixabay.com/sound-effects/city-diesel-car-driving-away-345713/) (0:07) · [Car moving away](https://pixabay.com/sound-effects/city-car-moving-away-290805/) (0:10) |
| `Phone Ringing.mp3`          | [Old Telephone Ring 2](https://pixabay.com/sound-effects/film-special-effects-old-telephone-ring-2-259004/) | 0:05  | [Telephone Ring (W48)](https://pixabay.com/sound-effects/household-telephone-ring-old-german-w48-83246/) (0:05) · [rotary phone ring medium](https://pixabay.com/sound-effects/film-special-effects-rotary-phone-ring-medium-103869/) (0:06) |
| `Investigation Ambience.mp3` | [Cinematic Dark Ambient](https://pixabay.com/music/horror-scene-cinematic-dark-ambient-503450/)          | 7:24  | [Dark Ambient Soundscape](https://pixabay.com/music/horror-scene-dark-ambient-soundscape-575774/) (5:05) · [Dark Scary Ambience](https://pixabay.com/music/ambient-dark-scary-ambience-567213/) (4:50) |
| `Wrong Answer Sting.mp3`     | [Appearance 010](https://pixabay.com/sound-effects/film-special-effects-appearance-010-141077/)          | 0:03  | [Suspense sting](https://pixabay.com/sound-effects/film-special-effects-suspense-sting-377243/) (0:05) · [Horror sting](https://pixabay.com/sound-effects/horror-horror-sting-25237/) (0:14) |

⏱️ **Contraintes de durée** imposées par `script.mystery_start` (les
`play_media` successifs sur le Sonos se coupent les uns les autres) :

| Son                    | Fenêtre avant d'être coupé | Note                                                                 |
| ---------------------- | -------------------------- | -------------------------------------------------------------------- |
| `Police Sirens`        | ~18-20 s (gyrophares)      | 0:18 tombe pile ; un fichier plus long est coupé net, sans gravité.  |
| `Police Radio Chatter` | 12 s                       | Viser ~12 s à l'enregistrement.                                      |
| `Car Drive Away`       | ~3 s                       | Un 0:07 est coupé en plein fade-out → **rogner à ~3 s** (Audacity).  |
| `Phone Ringing`        | ~3 s avant le TTS          | Le TTS joue sur le téléphone, pas le Sonos : la sonnerie déborde 2 s dessus. Rogner à ~3 s ou allonger le `delay` à 6 s. |
| `Wrong Answer Sting`   | 2 s                        | Prendre un sting court (≤ 3 s).                                      |
