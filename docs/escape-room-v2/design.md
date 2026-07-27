# Escape Room v2 — « Meurtre au manoir connecté » (design)

> Chasse au trésor / escape room domotique, v2. But : showcase du pouvoir de la
> domotique + activité plaisante pour les invités. Refonte complète de la v1
> (« TEA »), même effet d'intrigue et de fun.

## Principes directeurs (contraintes validées)

- 🚫 **On ne touche pas au climate** (thermostats / thermopompe hors-jeu).
- 📢 **Voix simple** : le téléphone **parle** beaucoup (TTS sortant, compris de
  tous) ; ce que le joueur **dit** reste minimal : mots courts (oui/non) et, à
  l'accusation, **le nom d'un des 3 suspects** (reconnu via `ask_question`).
  Fini les « phrases secrètes » à réciter (point fragile de la v1).
- 🔎 Tout le reste de l'interaction passe par le **physique** : capteurs,
  objets, boutons.
- 🏷️ Partie physique légère (dans l'esprit des labels imprimés de la v1) :
  objets à placer + étiquettes imprimées.
- ❌ Pas de NFC (un invité sans l'app HA companion ne déclenche rien en
  scannant un tag).
- Public : petit groupe d'adultes, session ~30-45 min, difficulté modérée.

## Le pitch

Pendant une soirée, un invité a été retrouvé sans vie. La maison intelligente a
**tout capté** avec ses capteurs, mais les preuves sont éparpillées. Le
**téléphone sonne** : un **inspecteur de police** recrute les joueurs comme
détectives. Objectif façon Cluedo : **QUI · AVEC QUOI · OÙ**.

## Suspects, armes, lieux

| Suspect | Lieu (pièce) | Arme (fausse piste) | Voix (haut-parleur) | Déclencheur |
|---|---|---|---|---|
| 🌿 **Le Jardinier** | Atelier / établi (`workshop`) | Scie à main | `media_player.workshop_echo` (Echo, déjà là) | `binary_sensor.door_sensor_contact` (porte atelier) |
| 💎 **L'Héritière** | Salon (`living_room`) | Fusil (BB gun, caché dans la trappe du foyer) | `media_player.sonos` | `binary_sensor.vibration_sensor_vibration` (déplacé sur la trappe du fusil) → **voix paniquée** |
| 🤵 **Le Majordome** | Salle à manger (`dining_room`) | **Poison (vin)** | `media_player.google_home_mini` (à déplacer en salle à manger) | **bouton Zigbee** (`8317fbc3ea314ec40186f0d8ec39998d`, étagère à vins, « cliquer pour service »). Répliques secondaires : porte-patio (`patio_door`) + tiroir à couteaux (`closed_closet_sensor_contact`, fausse piste) |

**Solution (cachée aux joueurs) : le Majordome · le poison · la salle à manger.**

Chaque suspect donne un **alibi** et **accuse** un autre ; un seul ment. Les
**preuves physiques** contredisent les alibis. Le **rapport d'autopsie**
(rappel de la police, phase 3) constate « ni blessure par balle, ni arme
blanche → empoisonnement », ce qui **élimine le fusil et la scie** et pointe
le poison. Le fusil et la scie sont des fausses pistes bien visibles.

## Preuves physiques (déduction)

1. **Arme = poison** :
   - Le **bouton « cliquer pour service »** sur l'étagère à vins déclenche le
     dialogue du Majordome (il a servi le vin toute la soirée).
   - La **bouteille de vin** porte un **label** menant à l'étape suivante
     (inspecter l'assaisonnement / les tiroirs).
   - **Rack d'épices** avec une épice étiquetée **« POISON »** → la source.
   - Confirmé par le rapport d'autopsie (phase 3).
2. **Fausses pistes** :
   - **Fusil (BB gun)** caché dans la **trappe du foyer** ; le déranger (capteur
     de vibration) déclenche la **voix paniquée de l'Héritière**.
   - **Tiroir à couteaux** (capteur closet) : le Majordome feint l'innocence et
     accuse le Jardinier.
3. **Coupable = Majordome** : ses **gants tachés** (indice) ; c'est lui qui
   **sert le vin** (accès au verre). Son alibi ne tient pas face aux
   témoignages croisés + l'autopsie (empoisonnement).

## Déroulé (6 phases)

| Phase | Ce qui se passe | Entités en vedette |
|---|---|---|
| **0. La police arrive** | Script (délai optionnel). Toutes lumières éteintes → floor lamps salon alternent **bleu/rouge** (gyrophares) → Sonos : **sirènes + brouhaha de policiers** parlant du meurtre, ils disent qu'ils **rappelleront** avec plus de détails, puis repartent (**voiture qui démarre**, floor lamps s'éteignent) → **le téléphone sonne** | `light.left_floor_lamp`, `light.right_floor_lamp`, `media_player.sonos`, toutes lumières |
| **1. Briefing** | L'**inspecteur** (téléphone) explique le meurtre et la mission (QUI/QUOI/OÙ), lance sur la 1ʳᵉ piste. Interaction : « Prêt ? » → oui/non | `assist_satellite` (téléphone, TTS), lumière de guidage |
| **2. Enquête** | Explorer les pièces. Chaque capteur/bouton fait parler un suspect. **Quand on interroge le Jardinier, Roby part vers le vin et appelle les joueurs** (`vacuum.locate`, « Hi! I'm over here! »). Musique d'ambiance en fond sur le Sonos (duckée par le TTS de l'Héritière). Fausses pistes : fusil (vibration → Héritière paniquée), tiroir couteaux (Majordome innocent) | capteurs (porte/vibration), bouton Zigbee, haut-parleurs localisés, **robot aspirateur** |
| **3. Rappel de la police** | Une fois les 3 suspects entendus, la police **rappelle** automatiquement avec le **rapport d'autopsie** → empoisonnement → élimine fusil + scie | téléphone / Sonos |
| **4. Accusation** | Le joueur dit **« inspecteur »** au téléphone → l'inspecteur rappelle et demande **le nom du coupable** ; le joueur le prononce (Jardinier / Héritière / Majordome). Seul **QUI** est demandé | téléphone (`assist_satellite`) |
| **5. Dénouement** | Bon coupable → **final cinéma au théâtre** : **rideaux baissés**, **lumière rouge**, **vidéo de révélation** (`Final Reveal.mp4`) sur la TV. Mauvais → l'inspecteur recadre, retour en `autopsy_done`, on retente | `media_player.theatre_tv`, volets théâtre, `light.theatre` |

## Terrain de jeu (pièces en jeu)

- 🛋️ **Salon** (`living_room`) — Héritière / fusil (trappe du foyer + vibration)
  — Sonos, floor lamps RGB, dock de Roby, téléphone.
- 🍽️ **Salle à manger** (`dining_room`) — Majordome / poison — Google Home,
  bouton Zigbee (étagère à vins), `patio_door`, tiroir à couteaux.
- 🔧 **Atelier / établi** (`workshop`) — Jardinier / scie — Echo, porte atelier.
- 🎬 **Théâtre** (`theatre`) — **final cinéma** — TV, volets, `light.theatre`.
- 🖥️ **Bureau d'Eric** — **CCTV** (setup manuel PC : hacker sim + 3 mp4), hors HA.
- 📞 Le **téléphone** (inspecteur) = **au salon, près du Sonos** → hub central.
- 🛏️ **Chambre = no-go** (jamais utilisée).

## Entités clés (référence)

| Rôle | Entity ID |
|---|---|
| Inspecteur (voix bidirectionnelle) | `assist_satellite.192_168_0_160` (Phone) |
| Voix Jardinier | `media_player.workshop_echo` |
| Voix Héritière + intro police | `media_player.sonos` |
| Voix Majordome | `media_player.google_home_mini` |
| Final vidéo | `media_player.theatre_tv` (`Final Reveal.mp4`) |
| Lumière finale théâtre | `light.theatre` (rouge) |
| Gyrophares | `light.left_floor_lamp`, `light.right_floor_lamp` |
| Héritière (fusil, trappe foyer) | `binary_sensor.vibration_sensor_vibration` |
| Majordome « service » | bouton Zigbee device `8317fbc3ea314ec40186f0d8ec39998d` (étagère à vins) |
| Majordome « départ » | `binary_sensor.patio_door_contact` |
| Majordome « innocence » (fausse piste) | `binary_sensor.closed_closet_sensor_contact` (tiroir couteaux) |
| Jardinier | `binary_sensor.door_sensor_contact` (porte atelier) |
| Robot | `vacuum.roborock_s5_7c79_robot_cleaner` (goto + `locate`) |
| Volets final | `cover.theatre_middle_shade`, `cover.theatre_left_shade`, `cover.theatre_right_shade` |
| Garde cohabitation v1/v2 | `input_boolean.escape_v2_active` |

## Robot Roby — déplacement

`vacuum.send_command` / `command: app_goto_target` / `params: [x, y]` (mm,
origine dock = `25500, 25500`, `1000 ≈ 1 m`). Repère fourni par Eric :
`[23500, 25500]` = 2 m en arrière du dock (X décroissant) ; la salle à manger
est +5 m de plus dans la même direction → **`COORD_DINING = [18500, 25500]`**
(estimation, à affiner au calibrage MCP).

## Architecture technique

- Scripts `mystery_*` (start, reset, suspect_speak, roby_to_dining,
  police_callback, accusation, denouement) + automations `Mystery - *`
  (suspect triggers, butler patio, auto autopsy, call inspector, knife drawer).
- Les suspects parlent via **TTS localisé** (`tts.speak` ciblant le haut-parleur
  de leur pièce) — pas de fichiers audio requis pour les dialogues.
- Les **triggers** : `state` (capteurs portes/vibration), `device` (bouton
  Zigbee), `conversation` (mot « inspecteur » pour lancer l'accusation).
- **Entrée vocale du joueur** : minimale — surtout des réponses courtes ;
  l'accusation demande **le nom du coupable** (via `ask_question`, 3 noms
  reconnus). Voir [[project_two_escape_rooms]].
- `input_select.mystery_phase` pilote les phases ; les 3 `input_boolean` suivent
  les suspects interrogés (déclenchent l'autopsie auto).
- **Reset** propre : éteint la garde, réactive les automatisations de mouvement,
  remet Roby au dock, restaure les lumières.

## Décisions finalisées (après itérations)

1. **Héritière** = capteur de vibration sur la trappe du fusil (voix paniquée).
2. **Majordome** = bouton Zigbee « cliquer pour service » (étagère à vins) +
   porte-patio (départ) + tiroir couteaux (fausse piste).
3. **Accusation** = dire « inspecteur » → rappel → nommer le coupable (QUI seul).
4. **Final gagnant** = rideaux baissés + `light.theatre` rouge + `Final Reveal.mp4`.
5. **Roby** part vers le vin + `locate` **quand on interroge le Jardinier**.
6. **CCTV** = setup manuel PC dans le bureau (hors HA) ; 3 mp4 flous par suspect.
7. **Coordonnées Roby** : `COORD_DINING = [18500, 25500]` (à affiner au calibrage).
8. **v1 conservée** et jouable : garde `input_boolean.escape_v2_active`.

## Reste à faire (voir le dossier `todo/`)

- `todo/manual-before-first-test.md` — préparation manuelle (déploiement,
  capteurs, objets, médias, CCTV).
- `todo/with-claude.md` — à régler avec Claude (calibrage Roby, débrief live,
  clôture de branche).
