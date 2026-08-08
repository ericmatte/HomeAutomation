# Escape room v2 — tous les scripts, qui les appelle et quand

> Document de **revue**. Extrait du code réel (`scripts.yaml`, `automations.yaml`)
> le 8 août 2026. Annote directement dedans — coche, biffe, écris en marge — et
> je reporte tes décisions dans le code ensuite.
>
> Convention : **script** = `scripts.yaml`, **automation** = `automations.yaml`.
> Un script ne part **jamais tout seul** : il est toujours appelé par une
> automation, par un autre script, ou par toi à la main.

---

## 1. Le déroulé d'une partie, de bout en bout

| Quand | Ce qui part | Déclenché par |
|---|---|---|
| Tu lances la partie | `mystery_start` | **toi, à la main** |
| ↳ dans la seconde | `mystery_reset_state` | `mystery_start` |
| ↳ t+2 s | Sirène + `mystery_flash_alternate` (fond) | `mystery_start` |
| ↳ t+21 s | Brouhaha des policiers | `mystery_start` |
| ↳ t+33 s | `mystery_inspector_say` **sur le Sonos** — le briefing | `mystery_start` |
| ↳ +26 s | La voiture s'éloigne, 5 s de silence | `mystery_start` |
| ↳ ~t+76 s | `mystery_inspector_say` **au téléphone** — « j'oubliais, les caméras » | `mystery_start` |
| ↳ juste après | `mystery_ambience` (fond) + `mystery_guide_path` vers le bureau | `mystery_start` |
| Un capteur bouge | `mystery_suspect_speak` | automation **Suspect triggers** |
| ↳ 1ʳᵉ fois, Héritière ou Jardinier | `mystery_roby_goto` (fond) | `mystery_suspect_speak` |
| Les 3 témoignages sont pris | `mystery_police_callback` (après 40 s) | automation **Auto autopsy** |
| Un code est tapé au terminal | *(pas de script)* — allume un booléen | automation **Evidence code entered** |
| Les 3 preuves sont enregistrées | `mystery_inspector_say` (téléphone) | automation **Evidence code entered** |
| Un suspect est désigné à l'écran | `mystery_denouement` | automation **Accusation from terminal** |
| Fin de soirée | `reset_after_escape_roome` | **toi, à la main** |

---

## 2. Les scripts, un par un

### 🎬 `mystery_start` — le seul que tu lances toi-même
- **Appelé par** : toi. Rien d'autre.
- **Champ** : `start_delay` (secondes) pour armer la partie et laisser le temps
  aux invités de s'installer.
- **Ce qu'il fait** : lève la garde `escape_v2_active` → remet l'état à zéro →
  bascule la voix du téléphone sur le pipeline v2 → règle le Majordome à 0,75 →
  coupe les automatisations de mouvement **et** la synchro de la lampe
  d'appoint → joue toute la phase 0 → passe en `investigation` → lance
  l'ambiance et la traînée de guidage.
- **Mode** `restart` : le relancer annule proprement la partie en cours.
- [ ] **À réviser** :

### ♻️ `mystery_reset_state` — l'état du jeu, remis à zéro
- **Appelé par** : `mystery_start` (au tout début) et `reset_after_escape_roome`.
- **Ce qu'il remet à zéro** : la phase, les 3 témoignages, les 3 preuves, le
  déverrouillage du terminal, le pavé de codes, l'accusation.
- **Ce qu'il ne touche pas** : `escape_v2_active`. La garde de cohabitation avec
  la v1 appartient au cycle de vie de la partie, pas à son état — seule la fin
  de soirée doit rendre le matériel partagé à la v1.
- [ ] **À réviser** :

### 🗣️ `mystery_inspector_say` — la voix de l'inspecteur
- **Appelé par** : `mystery_start` (×2), `mystery_police_callback`,
  `mystery_hint`, `mystery_denouement` (×2), automation **Evidence code entered**.
- **Champs** : `message`, et `on_sonos` (défaut `false`).
- **Deux canaux** : `on_sonos: true` → TTS sur le Sonos, tout le groupe entend,
  et le script **attend la fin de la réplique** (≈2,3 mots/seconde) sinon le
  média suivant le couperait. `false` → le téléphone sonne, `announce` bloque
  tout seul. Même voix `HenriNeural` des deux côtés.
- [ ] **À réviser** :

### 🚨 `mystery_flash_alternate` — gyrophares et boîte de nuit
- **Appelé par** : `mystery_start` (phase 0, **en tâche de fond**) et
  `mystery_denouement` (final, en tâche de fond).
- **Champs** : `light_a`, `light_b`, `color_a`, `color_b`, `cycles`, `interval`.
- **Réglages actuels** : phase 0 → `cycles: 9`, `interval: 0.3`, floor lamps
  bleu/rouge. Final → `cycles: 20`, `interval: 0.6`, théâtre + lampe métal.
- **Pourquoi des cycles et pas une durée** : les floor lamps sont des Govee,
  lentes à répondre ; le temps réel d'un cycle c'est `interval` **plus** la
  latence de quatre appels de service. Une durée voulue ne veut rien dire.
- [ ] **À réviser** :

### 💡 `mystery_guide_path` — la traînée de lumières à suivre
- **Appelé par** : `mystery_start` (vers le bureau), `mystery_police_callback`
  (vers la salle à manger), `mystery_denouement` (vers le théâtre), automation
  **Knife drawer** (vers l'atelier).
- **Champs** : `lights` (liste, dans l'ordre de marche), `trail_brightness_pct`
  (défaut 15).
- Chaque lampe clignote 3 fois à son tour, puis **reste en veilleuse** : le
  chemin se construit sous leurs yeux et reste visible pour les retardataires.
- ⚠️ **Bloquant** : ~3,5 s par lampe. L'appelant attend.
- [ ] **À réviser** :

### 🕯️ `mystery_ambience` — musique + lumières d'enquête
- **Appelé par** : `mystery_start`, `mystery_police_callback`,
  `mystery_denouement` (mauvaise accusation). Toujours **en tâche de fond**.
- **Ce qu'il fait** : Sonos à 0,52 + `Investigation Ambience.mp3`, veilleuses
  à 6 % (chandelier, pendants, cuisine), puis les floor lamps « respirent »
  entre deux teintes sombres.
- **S'arrête tout seul** quand la phase quitte `investigation` /
  `autopsy_done` / `accusation`, ou après 450 cycles (~2 h) si la partie est
  abandonnée sans reset.
- [ ] **À réviser** :

### 🎭 `mystery_suspect_speak` — faire parler un suspect
- **Appelé par** : automations **Suspect triggers**, **Butler at patio door**
  (deux fois : marmonnements du Jardinier + réplique du Majordome), **Knife
  drawer red herring**.
- **Champs** : `suspect` (`gardener`/`heiress`/`butler`), `custom_line`
  (réplique ponctuelle qui ne compte pas comme témoignage), `variant`
  (`laundry` pour l'Héritière — change seulement l'entrée en matière).
- **Enceintes** : Jardinier → Echo via `notify` (l'intégration Alexa refuse
  `tts.speak`), Héritière → Sonos, Majordome → Google Home.
- **Effets de bord d'un vrai témoignage** : allume le drapeau du suspect, et
  pour l'Héritière/le Jardinier lance `mystery_roby_goto` en tâche de fond.
- **Mode** `queued`, max 5.
- [ ] **À réviser** :

### 🤖 `mystery_roby_goto` — les deux parcours du robot
- **Appelé par** : `mystery_suspect_speak` seulement, en tâche de fond.
- **Champs** : `destination` (`wine`/`spices`), `lead_in_seconds` (attend que le
  suspect finisse de parler avant de démarrer).
- `wine` → 65 s de trajet, 1 `locate`. `spices` → 100 s, 4 `locate` espacés
  de 25 s.
- **Mode** `restart` : un seul robot, le 2ᵉ parcours annule le 1ᵉʳ.
- [ ] **À réviser** :

### ☎️ `mystery_police_callback` — le rapport d'autopsie
- **Appelé par** : automation **Auto autopsy**, 40 s après le 3ᵉ témoignage.
- Coupe le Sonos → passe en `autopsy_done` → l'inspecteur appelle (poison,
  oubliez le fusil et la scie, rapportez les 3 pièces) → relance l'ambiance →
  allume le chemin vers la salle à manger.
- [ ] **À réviser** :

### 💬 `mystery_hint` — l'indice à la demande
- **Appelé par** : automations **Hint on request** (mot « indice ») et **Idle
  nudge** (6 min sans progrès).
- Texte calculé sur l'état réel : dit **qui** il reste à faire parler, ou de qui
  il manque la pièce à conviction, et renvoie systématiquement aux caméras.
  Ne donne jamais l'endroit ni le geste.
- [ ] **À réviser** :

### ⚖️ `mystery_accusation` — l'accusation **au téléphone** (secours)
- **Appelé par** : automation **Call inspector** uniquement.
- Passe en `accusation`, pose la question par `ask_question` (3 noms reconnus),
  puis appelle `mystery_denouement`.
- ⚠️ C'est le **chemin de secours**. Le chemin normal est le terminal.
- [ ] **À réviser** :

### 🎬 `mystery_denouement` — la fin
- **Appelé par** : `mystery_accusation` (téléphone) et automation **Accusation
  from terminal** (écran).
- **Champ** : `accused` (id du suspect). La solution (`culprit: butler`) n'est
  écrite **qu'ici**.
- **Bon** : phase `solved` → l'inspecteur félicite → chemin vers le théâtre →
  les 3 toiles tombent en cascade → montée de rouge → rickroll sur la TV →
  alternance de couleurs.
- **Mauvais** : retour en `autopsy_done` → sting coupé à 3 s → l'inspecteur
  recadre → l'ambiance repart.
- [ ] **À réviser** :

### 🧹 `reset_after_escape_roome` — fin de soirée (v1 **et** v2)
- **Appelé par** : toi, à la main.
- Réactive les automatisations de mouvement et la synchro de lampe → coupe
  **tous** les `script.mystery_*` par template → `mystery_reset_state` → éteint
  `escape_v2_active` → volumes à 0,35 → rend l'assistant par défaut au
  téléphone → renvoie Roby au dock → applique la scène de reset.
- [ ] **À réviser** :

---

## 3. Les automations, et ce qui les réveille

| Automation | Déclencheur | Phase requise | Appelle |
|---|---|---|---|
| **Suspect triggers** | porte atelier · vibration trappe · **porte buanderie** · bouton Zigbee | `investigation` | `mystery_suspect_speak` |
| **Butler at patio door** | porte-patio ouverte | `investigation` | `mystery_suspect_speak` ×2 |
| **Knife drawer red herring** | tiroir à couteaux ouvert | `investigation` | `mystery_suspect_speak` + `mystery_guide_path` |
| **Auto autopsy** | les 3 drapeaux de témoignage à « on » | `investigation` | `mystery_police_callback` (après 40 s) |
| **Evidence code entered** | `input_text.mystery_code_input` change | **aucune** | allume une preuve, puis `mystery_inspector_say` à 3/3 |
| **Accusation from terminal** | `input_select.mystery_accusation_choice` ≠ `none` | **aucune** (mais terminal déverrouillé) | `mystery_denouement` |
| **Call inspector** | bouton Zigbee **ou** mot « inspecteur » | `autopsy_done` | `mystery_accusation` |
| **Hint on request** | mot « indice » | **aucune** (mais `escape_v2_active`) | `mystery_hint` |
| **Idle nudge** | changement de phase ou de drapeau, puis 6 min de silence | `investigation`/`autopsy_done` | `mystery_hint` |

**Le bouton Zigbee de l'étagère à vins sert à deux choses**, départagées par la
phase : en `investigation` il réveille le Majordome, en `autopsy_done` il appelle
l'inspecteur pour l'accusation.

---

## 4. Points que je te soumets

Des choix que j'ai faits seul et qui méritent ton avis — coche ou biffe.

- [ ] **Les codes de preuve marchent à n'importe quelle phase.** « Evidence code
      entered » n'a aucune condition de phase : on peut taper un code avant même
      que la partie commence. Faut-il exiger `investigation`/`autopsy_done` ?
- [ ] **L'accusation au terminal aussi.** Elle n'exige que le déverrouillage du
      dossier, pas une phase précise. En pratique le déverrouillage suffit,
      mais dis-moi si tu veux la borner.
- [ ] **Les 3 codes suffisent pour finir, sans l'autopsie.** Un groupe rapide
      pourrait trouver les 3 objets avant même le rappel du légiste. Voulu ?
- [ ] **Le délai de 40 s avant l'autopsie** est un majorant calé sur la plus
      longue réplique (82 mots). S'il coupe encore le 3ᵉ suspect, il faut le
      monter.
- [ ] **`mystery_guide_path` bloque son appelant** (~3,5 s par lampe). Au
      dénouement ça retarde la fermeture des rideaux d'une dizaine de secondes.
      Le passer en tâche de fond là aussi ?
- [ ] **Le chemin d'accusation au téléphone existe toujours** en parallèle du
      terminal. À garder tant que le terminal n'a pas fait ses preuves, à
      supprimer ensuite ?

---

## 5. Ce que je ne peux pas vérifier d'ici

Rappel : je n'ai pas d'accès visuel ni sonore à la maison. Tout ce qui suit se
valide en jouant.

- Le rythme des gyrophares (`cycles` / `interval`) sur des Govee.
- Que `HenriNeural` sorte correctement sur le Sonos (voix fr-FR dans un jeu
  fr-CA).
- L'estimation de 2,3 mots/seconde qui cale le départ de Roby, l'attente du
  Sonos et le délai d'autopsie.
- Les volumes relatifs entre sirène (0,8), brouhaha (0,4), ambiance (0,52),
  Majordome (0,75).
- La lecture du rickroll sur `media_player.theatre_tv`.
