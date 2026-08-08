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
| 💎 **L'Héritière** | Salon (`living_room`) | Fusil (BB gun, caché dans la trappe du foyer) | `media_player.sonos` | `binary_sensor.vibration_sensor_vibration` (trappe du fusil) **ou** `binary_sensor.laundry_door_open` (déplacé sur son coffre à bijoux) → **voix paniquée** |
| 🤵 **Le Majordome** | Salle à manger (`dining_room`) | **Poison (vin)** | `media_player.google_home_mini` (à déplacer en salle à manger) | **bouton Zigbee** (`8317fbc3ea314ec40186f0d8ec39998d`, étagère à vins, « cliquer pour service »). Répliques secondaires : porte-patio (`patio_door`) + tiroir à couteaux (`knife_drawer_contact`, fausse piste) |

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
| **0. La police arrive** | Script (délai optionnel). Toutes lumières éteintes → floor lamps salon alternent **bleu/rouge** (gyrophares, `script.mystery_flash_alternate`) → Sonos : **sirènes + brouhaha de policiers** parlant du meurtre, ils disent qu'ils **rappelleront**, puis repartent (**voiture qui démarre**, floor lamps s'éteignent) → **le téléphone sonne** | `light.left_floor_lamp`, `light.right_floor_lamp`, `media_player.sonos`, toutes lumières |
| **1. Briefing** | L'**inspecteur** (téléphone) explique le meurtre et la mission (qui / avec quoi / où), puis envoie les joueurs au **terminal CCTV du bureau** : une **traînée de lumières** s'allume jusque-là (`script.mystery_guide_path`). L'**ambiance lumineuse** démarre (`script.mystery_ambience`) | `assist_satellite` (téléphone, TTS), `light.hallway_lights` → `light.downstairs_hallway_light` → `light.office` |
| **2. Enquête** | Explorer les pièces. Chaque capteur/bouton fait parler un suspect, et **la pièce d'où sort la voix s'éclaire**. **Roby fait deux parcours** : vers le vin quand parle l'Héritière (les joueurs le suivent), vers le rack d'épices quand parle le Jardinier (en douce, retrouvé au `vacuum.locate`). Il part **après** la réplique, pour ne pas être manqué. Musique d'ambiance sur le Sonos. Fausses pistes : fusil et coffre à bijoux (Héritière), tiroir couteaux (Majordome innocent) | capteurs (porte/vibration/contact), bouton Zigbee, haut-parleurs localisés, **robot aspirateur** |
| **3. Rappel de la police** | Une fois les 3 suspects entendus, la police **rappelle** automatiquement avec le **rapport d'autopsie** → empoisonnement → élimine fusil + scie comme armes, et demande les **3 pièces à conviction** | téléphone / Sonos |
| **4. Collecte + accusation** | Les 3 objets (scie, fusil, pot d'épices) portent une **étiquette-code**. Les joueurs les tapent sur le **terminal CCTV** : crochet vert, compteur « 2 / 3 ». À 3/3, le **dossier confidentiel** se déverrouille et ils y **désignent le coupable à l'écran**. Chemin de secours : dire « inspecteur » au téléphone, ou cliquer le bouton de l'étagère à vins | `input_text.mystery_code_input`, `input_boolean.mystery_evidence_*`, `input_select.mystery_accusation_choice` |
| **5. Dénouement** | Bon coupable → **final cinéma au théâtre** : les 3 toiles tombent **l'une après l'autre** comme un rideau, noir, puis la **lumière rouge monte** et la musique part sur la **TV du théâtre**, avec les lampes en alternance de couleurs. ⏸️ En attendant `Final Reveal.mp4`, c'est un rickroll. Mauvais → l'inspecteur recadre, retour en `autopsy_done`, on retente | volets théâtre, `light.theatre`, `light.metal_lamp`, `media_player.theatre_tv` |

## Terrain de jeu (pièces en jeu)

- 🛋️ **Salon** (`living_room`) — Héritière / fusil (trappe du foyer + vibration)
  — Sonos, floor lamps RGB, dock de Roby, téléphone.
- 🍽️ **Salle à manger** (`dining_room`) — Majordome / poison — Google Home,
  bouton Zigbee (étagère à vins), `patio_door`, tiroir à couteaux.
- 🔧 **Atelier / établi** (`workshop`) — Jardinier / scie — Echo, porte atelier.
- 🎬 **Théâtre** (`theatre`) — **final cinéma** — TV, volets, `light.theatre`.
- 🖥️ **Bureau d'Eric** (sous-sol) — **terminal CCTV** : dashboard HA plein écran
  sur le PC. Poste de commande du jeu (vidéos, codes de preuve, accusation).
- 📞 Le **téléphone** (inspecteur) = **au salon, près du Sonos** → hub central.
- 🛏️ **Chambre = no-go** (jamais utilisée).

## Entités clés (référence)

| Rôle | Entity ID |
|---|---|
| Terminal CCTV — code tapé | `input_text.mystery_code_input` |
| Terminal CCTV — pièces à conviction | `input_boolean.mystery_evidence_saw` / `_gun` / `_poison` |
| Terminal CCTV — dossier confidentiel | `input_boolean.mystery_terminal_unlocked` |
| Terminal CCTV — accusation | `input_select.mystery_accusation_choice` |
| Inspecteur (voix bidirectionnelle) | `assist_satellite.192_168_0_160` (Phone) |
| Voix Jardinier | `notify.echo_speak` (⚠️ **pas** `tts.speak` — voir ci-dessous) |
| Voix Héritière + intro police | `media_player.sonos` |
| Voix Majordome | `media_player.google_home_mini` |
| Final vidéo | `media_player.theatre_tv` (`Final Reveal.mp4`) |
| Lumière finale théâtre | `light.theatre` (rouge) |
| Gyrophares | `light.left_floor_lamp`, `light.right_floor_lamp` |
| Héritière (fusil, trappe foyer) | `binary_sensor.vibration_sensor_vibration` |
| Majordome « service » | bouton Zigbee device `8317fbc3ea314ec40186f0d8ec39998d` (étagère à vins) |
| Majordome « départ » | `binary_sensor.patio_door_contact` |
| Majordome « innocence » (fausse piste) | `binary_sensor.knife_drawer_contact` (tiroir couteaux) |
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
- **`COORD wine = [23000, 31500]`** = 9 m arrière, 1,5 m à gauche → devant
  l'étagère d'alcools forts et de vins.
- **`COORD spices = [26700, 31200]`** = 8,7 m arrière, 2,2 m à droite → au rack
  d'épices.
- 🚧 **Attention aux no-go zones.** Une longue série de cibles à gauche a
  échoué (« could not reach target ») : ce n'était **pas** la table de la salle
  à manger comme on l'avait d'abord cru, mais une **zone interdite tracée dans
  l'app Roborock**. `app_goto_target` hérite de ces zones et refuse d'y entrer.
  Après ajustement de la zone par Eric, `[23000, 31500]` passe. Si une cible
  est refusée sans obstacle physique évident, **vérifier les no-go zones avant
  de conclure**.
- Envoyer Roby directement à 9 m peut le faire partir dans la mauvaise
  direction ; procéder **par paliers** depuis un point intermédiaire fonctionne
  mieux pour calibrer.
- **Durées chronométrées depuis le dock** : ~55-60 s vers le vin, ~50 s vers
  les épices. D'où `delay: 65 s` (vin) et `100 s` (épices, marge volontaire
  pour laisser aux joueurs le temps de remonter de l'atelier).
  ⚠️ Toujours mesurer **depuis le dock** : l'ordre d'interrogation dépend des
  joueurs, et le dock est le pire cas (~9 m, contre ~3,7 m depuis le vin).
- Roby est lancé en tâche de fond (`script.turn_on`), sinon
  `mystery_suspect_speak` (mode `queued`) resterait bloqué une minute et les
  autres suspects seraient muets.

### Les deux parcours de Roby

`script.mystery_roby_goto` (mode `restart`, champ `destination`) :

| Parcours | Déclencheur | Destination | Effet voulu |
|---|---|---|---|
| **`wine`** (visible) | 1ʳᵉ réplique de l'**Héritière** (salon, à côté du dock) | étagère d’alcools, `[23000, 31500]` | Roby démarre **sous les yeux des joueurs**, qui le suivent jusqu'au bouton « cliquer pour service » → réveille le Majordome. `locate` × 1 à l'arrivée. |
| **`spices`** (subtil) | 1ʳᵉ réplique du **Jardinier** (atelier, en bas) | rack d'épices, `[26700, 31200]` | Pendant que les joueurs sont en bas, Roby file **sans bruit** vers le 2ᵉ indice. En remontant ils se demandent où il est passé → `locate` × 4 espacés de 25 s pour le retrouver à l'oreille. |

Le mode `restart` fait que si les suspects sont interrogés dans le désordre,
le 2ᵉ parcours annule proprement le 1ᵉʳ — un seul robot, un seul trajet à la
fois.
- ⚠️ L'état HA du robot **traîne de plusieurs secondes** sur la réalité : ne
  jamais attendre un changement d'état pour synchroniser, garder un `delay:`
  fixe.

## Architecture technique

- Scripts `mystery_*` (start, suspect_speak, roby_goto, police_callback, hint,
  accusation, denouement) + automations `Mystery - *` (suspect triggers, butler
  patio, knife drawer, auto autopsy, call inspector, hint request, idle nudge,
  evidence code, terminal accusation).
- **Trois briques de lumière réutilisables**, paramétrées plutôt que recopiées :
  - `script.mystery_flash_alternate` — deux lampes qui alternent deux couleurs.
    Le nombre de cycles se **déduit de la durée voulue** (`duration` /
    `interval`), donc le jeu de lumière se cale tout seul sur la longueur d'un
    son. Sert aux gyrophares (phase 0) et à la boîte de nuit du final.
  - `script.mystery_guide_path` — une liste de lampes qui clignotent l'une
    après l'autre puis **restent en veilleuse** : une traînée que les joueurs
    suivent. Sert à envoyer vers le bureau, vers l'atelier, vers le théâtre.
  - `script.mystery_ambience` — veilleuses partout + les lampes du salon qui
    « respirent » entre deux teintes sombres. La boucle **s'arrête d'elle-même**
    quand `input_select.mystery_phase` quitte l'enquête.
- **Guidage** : le reproche principal du premier test était qu'on est laissé à
  soi-même. Trois filets : chaque réplique de suspect finit par une consigne
  explicite, « indice » au téléphone déclenche `script.mystery_hint` (texte
  calculé depuis l'état réel du jeu), et `Mystery - Idle nudge` fait rappeler
  l'inspecteur tout seul après 6 min sans progrès.
- Les suspects parlent via **TTS localisé** (`tts.speak` ciblant le haut-parleur
  de leur pièce) — pas de fichiers audio requis pour les dialogues.
- ⚠️ **Exception, le Jardinier** : son Echo utilise l'intégration
  `alexa_devices`, qui refuse toute URL média
  (`ValueError('music is not available as a music provider')`). `tts.speak` y
  échoue **toujours**. Il passe donc par `notify.send_message` →
  `notify.echo_speak`, c'est-à-dire le TTS d'Amazon : sa voix se choisit dans
  l'app Alexa, pas dans le code, et l'option `voice` y est sans effet.
- 🎭 **Registres de langue** volontairement contrastés : l'Héritière parle en
  joual bien sacrant, le Jardinier en langage de rue, le Majordome dans un
  français guindé. C'est ce qui distingue les personnages autant que les voix.
- Les **triggers** : `state` (capteurs portes/vibration), `device` (bouton
  Zigbee), `conversation` (mot « inspecteur » pour lancer l'accusation).
- **Entrée du joueur** : le premier test live a montré que la reconnaissance
  vocale du téléphone est trop peu fiable pour porter des moments décisifs. Le
  **terminal CCTV du bureau** (dashboard HA plein écran, brief dans
  `cctv-terminal-prompt.md`) devient donc le poste de commande : on y regarde
  les enregistrements, on y tape les **codes des 3 pièces à conviction**, et
  c'est là qu'on **désigne le coupable**. Le téléphone garde la voix de
  l'inspecteur (sortante, fiable) et deux chemins de secours seulement : dire
  « indice », dire « inspecteur ». Voir [[project_two_escape_rooms]].
- **Gate de fin** : les 3 codes de preuve, pas les 3 témoignages. Trouver les
  objets est ce qui ouvre le dossier confidentiel.
- `input_select.mystery_phase` pilote les phases ; les 3 `input_boolean` suivent
  les suspects interrogés (déclenchent l'autopsie auto).
- **Reset** propre : éteint la garde, réactive les automatisations de mouvement,
  remet Roby au dock, restaure les lumières.

## Décisions finalisées (après itérations)

1. **Héritière** = capteur de vibration sur la trappe du fusil **+ contact sur
   son coffre à bijoux** (voix paniquée dans les deux cas ; seule l'entrée en
   matière change, via le champ `variant`).
2. **Majordome** = bouton Zigbee « cliquer pour service » (étagère à vins) +
   porte-patio (départ, doublé des **marmonnements du Jardinier** dans l'atelier
   pour révéler où il se trouve) + tiroir couteaux (fausse piste).
3. **Accusation** = sur le **terminal CCTV**, après les 3 codes de preuve.
   Secours : dire « inspecteur », ou cliquer le bouton de l'étagère à vins.
4. **Final gagnant** = les 3 toiles tombent en cascade, noir, montée de rouge,
   puis musique sur la **TV du théâtre** + alternance de couleurs.
5. **Roby** a **deux parcours** : vers le vin quand on interroge l'**Héritière**
   (visible, les joueurs le suivent), et vers le rack d'épices quand on
   interroge le **Jardinier** (subtil, retrouvé au `locate` en remontant).
6. **CCTV** = dashboard HA custom en plein écran sur le PC du bureau ; 3 mp4
   flous par suspect + pavé de codes + dossier confidentiel.
7. **Coordonnées Roby** (calibrées en live) : vin `[23000, 31500]`,
   épices `[26700, 31200]`.
8. **v1 conservée** et jouable : garde `input_boolean.escape_v2_active`.

## Reste à faire (voir le dossier `todo/`)

- `todo/manual-before-first-test.md` — préparation manuelle (déploiement,
  capteurs, objets, médias, CCTV).
- `todo/with-claude.md` — à régler avec Claude (calibrage Roby, débrief live,
  clôture de branche).
