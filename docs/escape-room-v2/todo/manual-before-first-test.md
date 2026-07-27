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
- [ ] **Google Home Mini** (`media_player.google_home_mini`) — **déplacer en
      salle à manger** (Majordome). Actuellement dans le bureau.

## 🚪 2. Capteurs / déclencheurs

| À déplacer | Entité | Nouvel emplacement | Effet |
|---|---|---|---|
| Capteur de vibration | `binary_sensor.vibration_sensor_vibration` | **Trappe d'aération du foyer** (BB gun caché) | Héritière paniquée |
| Bouton Zigbee | device `8317fbc3ea314ec40186f0d8ec39998d` | **Étagère à vins**, label « cliquer pour service » | Majordome « service » |
| Capteur closet chambre | `binary_sensor.closed_closet_sensor_contact` | **Tiroir à couteaux (cuisine)** | Majordome feint l'innocence |

- [ ] Déplacer le capteur de vibration sur la trappe du foyer (ajuster
      `number.vibration_sensor_sensitivity` au besoin).
- [ ] Déplacer le bouton Zigbee sur l'étagère à vins (+ label).
- [ ] Déplacer le capteur closet sur le tiroir à couteaux.
- [x] Porte atelier (`binary_sensor.door_sensor_contact`) et porte-patio
      (`binary_sensor.patio_door_contact`) : rien à déplacer.

> ⚠️ Bouton Zigbee et capteur de vibration sont **partagés avec la v1**. La
> garde `input_boolean.escape_v2_active` bloque la v1 pendant une partie v2.
> **Termine toujours une partie par `script.mystery_reset`**, sinon la v1 reste
> bloquée.
>
> ℹ️ Ouvrir la porte-patio coupe la thermopompe ~30 s (automation v1
> préexistante, laissée telle quelle) — comportement attendu, sans gravité.

## 🎭 3. Objets physiques

- [ ] **Bouteille de vin** sur l'étagère + **label** vers l'étape suivante
      (ex. « ce vin a un goût étrange… inspectez l'assaisonnement / les tiroirs »).
- [ ] **BB gun (fusil)** caché dans la **trappe du foyer** (capteur de vibration
      dessus) — fausse piste de l'Héritière.
- [ ] **Fiole de poison** cachée (tiroir / derrière la porte-patio).
- [ ] **Rack d'épices** avec une épice étiquetée **« POISON »**.
- [ ] **Gants tachés** du Majordome (indice coupable) — salle à manger.
- [ ] **Scie à main** bien visible à l'atelier (fausse piste du Jardinier).
- [ ] **Labels imprimés** : label « cliquer pour service » (étagère à vins),
      label de la bouteille de vin, autres énigmes/cartes.

## 📺 4. CCTV — setup manuel PC dans le bureau (hors HA)

- [ ] Ouvrir sur les **2 écrans PC** en plein écran :
      <https://www.whitescreen.online/hacker-simulator/>.
- [ ] Un **dossier Explorateur** nommé **« CCTV - Vidéos de surveillance »**
      contenant **3 fichiers .mp4** ouvrables (1 par suspect, flous/mystérieux,
      chacun le montrant avec son arme potentielle).

## 🎵 5. Fichiers médias à uploader dans HA

Dans **Paramètres → Media → local** (`media-source://media_source/local/`).
**Noms EXACTS** (référencés par le code) :

| Nom de fichier exact | Usage | Statut |
|---|---|---|
| `Police Sirens.mp3` | Phase 0 — sirènes | à trouver |
| `Police Radio Chatter.mp3` | Phase 0 — brouhaha policiers (enregistré par Eric) | à enregistrer |
| `Car Drive Away.mp3` | Phase 0 — la police repart | à trouver |
| `Phone Ringing.mp3` | Phase 0→1 + rappel autopsie | à trouver |
| `Investigation Ambience.mp3` | Enquête — musique de fond (Sonos, duckée par le TTS). **Fichier long** (5-10 min), pas de boucle. | à trouver |
| `Wrong Answer Sting.mp3` | Mauvaise accusation (court) | à trouver |
| `Final Reveal.mp4` | **Final gagnant** — vidéo de révélation du Majordome (TV théâtre) | à produire |

> Les dialogues des suspects et de l'inspecteur sont en **TTS** : aucun fichier
> à fournir.
