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
| **2. Enquête** | Explorer les pièces. Chaque capteur/bouton fait parler un suspect. **Roby fait deux parcours** : vers le vin quand parle l'Héritière (les joueurs le suivent), vers le rack d'épices quand parle le Jardinier (en douce, retrouvé au `vacuum.locate` en remontant). Musique d'ambiance en fond sur le Sonos (duckée par le TTS de l'Héritière). Fausses pistes : fusil (vibration → Héritière paniquée), tiroir couteaux (Majordome innocent) | capteurs (porte/vibration), bouton Zigbee, haut-parleurs localisés, **robot aspirateur** |
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
`1000 = 1 m`). Repère **calibré en live** (29 juillet 2026) :

- Le dock **n'est pas** à `25500, 25500` : il est à ≈ **`[24500, 22500]`**.
- **+Y = vers l'arrière** (du salon vers la salle à manger).
- **−X = vers la gauche** (en regardant depuis le dock).
- **`COORD_DINING = [23500, 31500]`** = 9 m arrière, 1 m à gauche → à ~1 m de
  l'étagère d'alcools forts et de vins. **C'est le point retenu**, et c'est
  amplement suffisant : la cible est une étagère entière, Roby n'a qu'à
  attirer les joueurs dans la bonne zone.
- Tout ce qui est **plus à gauche est refusé** (« could not reach target ») —
  la table de la salle à manger bloque. Essais épuisés, inutile de les
  refaire : `[23000, 31500]`, `[22500, 31500]`, `[22500, 31000]`,
  `[22500, 32500]` (tentative de contournement par l'arrière).
- **Durée du trajet : ~60 s** depuis le dock (chronométré) → `delay: 65 s`
  avant le `vacuum.locate`. Roby est lancé en tâche de fond
  (`script.turn_on`), sinon `mystery_suspect_speak` (mode `queued`) resterait
  bloqué une minute et les autres suspects seraient muets.

### Les deux parcours de Roby

`script.mystery_roby_goto` (mode `restart`, champ `destination`) :

| Parcours | Déclencheur | Destination | Effet voulu |
|---|---|---|---|
| **`wine`** (visible) | 1ʳᵉ réplique de l'**Héritière** (salon, à côté du dock) | étagère d'alcools, `[23500, 31500]` | Roby démarre **sous les yeux des joueurs**, qui le suivent jusqu'au bouton « cliquer pour service » → réveille le Majordome. `locate` × 1 à l'arrivée. |
| **`spices`** (subtil) | 1ʳᵉ réplique du **Jardinier** (atelier, en bas) | rack d'épices, **⚠️ non calibré** | Pendant que les joueurs sont en bas, Roby file **sans bruit** vers le 2ᵉ indice. En remontant ils se demandent où il est passé → `locate` × 4 espacés de 25 s pour le retrouver à l'oreille. |

Le mode `restart` fait que si les suspects sont interrogés dans le désordre,
le 2ᵉ parcours annule proprement le 1ᵉʳ — un seul robot, un seul trajet à la
fois.
- ⚠️ L'état HA du robot **traîne de plusieurs secondes** sur la réalité : ne
  jamais attendre un changement d'état pour synchroniser, garder un `delay:`
  fixe.

## Architecture technique

- Scripts `mystery_*` (start, reset, suspect_speak, roby_goto,
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
5. **Roby** a **deux parcours** : vers le vin quand on interroge l'**Héritière**
   (visible, les joueurs le suivent), et vers le rack d'épices quand on
   interroge le **Jardinier** (subtil, retrouvé au `locate` en remontant).
6. **CCTV** = setup manuel PC dans le bureau (hors HA) ; 3 mp4 flous par suspect.
7. **Coordonnées Roby** : `COORD_DINING = [23500, 31500]` (calibré en live).
8. **v1 conservée** et jouable : garde `input_boolean.escape_v2_active`.

## Reste à faire (voir le dossier `todo/`)

- `todo/manual-before-first-test.md` — préparation manuelle (déploiement,
  capteurs, objets, médias, CCTV).
- `todo/with-claude.md` — à régler avec Claude (calibrage Roby, débrief live,
  clôture de branche).
