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

Choisies et **validées à l'oreille en live**. Tout le jeu est en **`fr-CA`**
(accent québécois) :

| Suspect | Voix | Intention |
|---|---|---|
| 🌿 Jardinier | **voix d'Alexa**, réglée dans l'app Alexa (pas dans le code) | langage de rue, un peu illettré |
| 💎 Héritière | `SylvieNeural` | seule voix féminine fr-CA ; répliques réécrites en **joual bien sacrant** |
| 🤵 Majordome | `ThierryNeural` | guindé, onctueux — contraste voulu avec l'Héritière |

`AntoineNeural` et `JeanNeural` restent libres si on veut changer.

> 🔌 **Le Jardinier ne passe pas par `tts.speak`** mais par
> `notify.send_message` → `notify.echo_speak`. L'intégration `alexa_devices`
> refuse toute URL média (`ValueError('music is not available as a music
> provider')`), donc `tts.speak` échoue **systématiquement** sur l'Echo. C'est
> le TTS d'Amazon qui parle : aucune voix HA Cloud possible, et l'option
> `voice` est sans effet sur ce chemin.
>
> Le SSML (`<prosody>`, `<voice name="Mathieu">`) a été testé comme
> alternative — inutile finalement, la voix se règle directement côté Alexa.

> ⚠️ **Piège majeur** : l'option `voice` exige le **`voice_id` de l'API**
> (`ThierryNeural`), **pas** le nom affiché dans l'UI (`Thierry`). Un nom
> invalide est **ignoré en silence** et HA retombe sur la voix par défaut de
> la langue — c'est ce qui faisait parler le Majordome avec une voix de femme.
>
> 🐛 **Conséquence sur la v1** : `scripts.yaml:363` utilise
> `voice: Denise (whispering)`. Ça ne chuchote donc **pas** — la v1 joue la
> voix par défaut depuis toujours. Non corrigé (on ne touche pas à la v1),
> mais le vrai identifiant serait `DeniseNeural||whispering`.

Le fr-CA n'a **aucune variante émotionnelle** (elles n'existent qu'en fr-FR,
pour Denise et Henri). L'effet « voix paniquée » de l'Héritière passe donc
uniquement par **le texte**, pas par la voix.

Reste à faire :

- [ ] Vérifier que les 3 voix restent distinctes de celle de **l'inspecteur**,
      qui vient du pipeline Assist du téléphone (réglé séparément dans
      Paramètres → Assistants) et non de ces `tts.speak`.

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
