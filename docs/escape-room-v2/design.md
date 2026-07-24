# Escape Room v2 — « Meurtre au manoir connecté » (design)

> Chasse au trésor / escape room domotique, v2. But : showcase du pouvoir de la
> domotique + activité plaisante pour les invités. Refonte complète de la v1
> (« TEA »), même effet d'intrigue et de fun.

## Principes directeurs (contraintes validées)

- 🚫 **On ne touche pas au climate** (thermostats / thermopompe hors-jeu).
- 📢 **Voix simple** : le téléphone **parle** beaucoup (TTS sortant, compris de
  tous) ; ce que le joueur **dit** se limite à des **oui / non** (1 mot,
  robuste). Fini les « phrases secrètes » à réciter (point fragile de la v1).
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
| 💎 **L'Héritière** | Salon (`living_room`) | Fusil (BB gun) | `media_player.sonos` | capteur à ajouter au salon (voir besoins) |
| 🤵 **Le Majordome** | Salle à manger (`dining_room`) | **Poison (verre de vin)** | `media_player.google_home_mini` (à déplacer en salle à manger) | `binary_sensor.patio_door_contact` + vibration |

**Solution (cachée aux joueurs) : le Majordome · le poison · la salle à manger.**

Chaque suspect donne un **alibi** et **accuse** un autre ; un seul ment. Les
**preuves physiques** contredisent les alibis. Le **rapport d'autopsie**
(rappel de la police, phase 3) constate « ni blessure par balle, ni arme
blanche → empoisonnement », ce qui **élimine le fusil et la scie** et pointe
le poison. Le fusil et la scie sont des fausses pistes bien visibles.

## Preuves physiques (déduction)

1. **Arme = poison** :
   - `binary_sensor.vibration_sensor_vibration` déplacé sur une **bouteille de
     vin** (salle à manger). La manipuler → « traces d'une substance dans le
     vin ».
   - **Rack d'épices** avec une épice étiquetée **« POISON »** → la source.
   - Confirmé par le rapport d'autopsie (phase 3).
2. **Lieu = salle à manger** : ouvrir `patio_door` (ou un tiroir équipé du
   contact) → on découvre la **fiole** cachée + la mise en scène.
3. **Coupable = Majordome** : ses **gants tachés** révélés dans la salle à
   manger ; c'est lui qui **sert le vin** (accès au verre). Son alibi ne tient
   pas face aux témoignages croisés.

## Déroulé (6 phases)

| Phase | Ce qui se passe | Entités en vedette |
|---|---|---|
| **0. La police arrive** | Script (délai optionnel). Toutes lumières éteintes → floor lamps salon alternent **bleu/rouge** (gyrophares) → Sonos : **sirènes + brouhaha de policiers** parlant du meurtre, ils disent qu'ils **rappelleront** avec plus de détails, puis repartent (**voiture qui démarre**, floor lamps s'éteignent) → **le téléphone sonne** | `light.left_floor_lamp`, `light.right_floor_lamp`, `media_player.sonos`, toutes lumières |
| **1. Briefing** | L'**inspecteur** (téléphone) explique le meurtre et la mission (QUI/QUOI/OÙ), lance sur la 1ʳᵉ piste. Interaction : « Prêt ? » → oui/non | `assist_satellite` (téléphone, TTS), lumière de guidage |
| **2. Enquête** | Explorer les pièces. Dans chacune, un **capteur déclenché** fait parler le suspect (alibi + oriente) **et** révèle une **preuve**. Les lumières guident. **Roby** quitte son dock et roule vers la salle à manger. Le rack d'épices/le vin/les gants se découvrent | capteurs (porte/vibration), haut-parleurs localisés, RGB, **robot aspirateur**, volets |
| **3. Rappel de la police** | La police **rappelle** (comme promis) avec le **rapport d'autopsie** → empoisonnement → élimine fusil + scie. Relance + sert d'indice si bloqué | téléphone / Sonos, ambiance |
| **4. Accusation** | L'inspecteur énumère suspect → arme → lieu en **oui/non**. 100 % robuste | téléphone |
| **5. Dénouement** | Bonne combinaison → **grand final au théâtre** : TV théâtre, volets, jeu de lumières, musique de victoire. Mauvaise → l'inspecteur recadre et on retente | `media_player.theatre_tv`, volets théâtre, toutes lumières, Sonos |

## Terrain de jeu (pièces en jeu)

- 🛋️ **Salon** (`living_room`) — Héritière / fusil — Sonos, floor lamps RGB,
  dock de Roby.
- 🍽️ **Salle à manger** (`dining_room`) — Majordome / poison — Google Home,
  `patio_door`, bouteille de vin (vibration).
- 🔧 **Atelier / établi** (`workshop`) — Jardinier / scie — Echo, porte atelier.
- 🎬 **Théâtre** (`theatre`) — **grand final** — TV, volets, lumières.
- 📞 Le **téléphone** (inspecteur) = point de départ/retour.
- 🛏️ **Chambre = no-go** (jamais utilisée).

## Entités clés (référence)

| Rôle | Entity ID |
|---|---|
| Inspecteur (voix bidirectionnelle) | `assist_satellite.192_168_0_160` (Phone) |
| Voix Jardinier | `media_player.workshop_echo` |
| Voix Héritière + intro police | `media_player.sonos` |
| Voix Majordome | `media_player.google_home_mini` |
| Final vidéo | `media_player.theatre_tv` |
| Gyrophares | `light.left_floor_lamp`, `light.right_floor_lamp` |
| Preuve arme | `binary_sensor.vibration_sensor_vibration` (→ bouteille de vin) |
| Déclencheur salle à manger | `binary_sensor.patio_door_contact` |
| Déclencheur atelier | `binary_sensor.door_sensor_contact` |
| Robot | `vacuum.roborock_s5_7c79_robot_cleaner` |
| Volets final | `cover.theatre_middle_shade`, `cover.theatre_left_shade`, `cover.theatre_right_shade` |
| Bouton téléphone (MQTT) | device `8317fbc3ea314ec40186f0d8ec39998d` |

## Robot Roby — déplacement

`vacuum.send_command` / `command: app_goto_target` / `params: [x, y]` (mm,
origine dock ≈ `25500, 25500`, `1000 ≈ 1 m`). Coordonnées de la salle à manger
`COORD_DINING` à **calibrer** à l'implémentation (piloter via MCP + observer, ou
via la carte HACS `xiaomi-vacuum-map-card`).

## Architecture technique

- Réutilise le squelette v1 : un **script** `escape_room` (renommé v2) pour
  l'intro + le lancement, une **automation** multi-trigger (`choose`) pour la
  logique de jeu, une **scène** + un **script de reset**.
- Les suspects parlent via **TTS localisé** (`tts.speak` / `notify.*` ciblant le
  haut-parleur de leur pièce) — pas de fichiers audio requis pour les
  dialogues.
- Les **triggers** : `state` sur les capteurs (portes, vibration), `conversation`
  (uniquement oui/non), `device` (bouton téléphone).
- Un **helper d'état** (input_text/input_select ou variables de script) suit la
  progression (indices trouvés) pour piloter les phases et l'accusation.
- **Reset** propre : réactive les automatisations de mouvement désactivées
  pendant le jeu, remet Roby au dock, restaure les lumières.

## Points ouverts (à finaliser avec l'utilisateur)

1. **Déclencheur du salon** (Héritière) : déplacer un capteur de mouvement au
   salon **ou** dédier un bouton Zigbee. → décision requise.
2. **Coordonnées Roby** : calibrage à l'implémentation.
3. **Trames sonores** : voir `todo-physical-setup.md` (noms de fichiers).
4. Position physique du **téléphone** (point de départ/retour).
