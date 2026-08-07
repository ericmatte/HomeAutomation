# Todo — à faire avec Claude

Ce qui reste à régler ensemble (Claude a accès au ha-mcp mais **pas** à un test
visuel/live — Eric joue et observe, Claude ajuste le code).

## 🤖 1. Calibrer les coordonnées de Roby

- [x] Cible du vin calibrée en live : **`[23000, 31500]`** (9 m arrière,
      1,5 m à gauche du dock). Voir la section « Robot Roby » du `design.md`
      pour le repère complet de la carte.
      Les échecs à gauche venaient d'une **no-go zone** de l'app Roborock, pas
      de la table — zone ajustée par Eric, la cible passe maintenant.
- [x] **Délai de trajet** calé : ~60 s chronométrées du dock à l'étagère, donc
      `delay: 65 s` avant le `locate` (« Hi! I'm over here! »).
      Comme le trajet dure une minute, Roby est lancé via `script.turn_on`
      (non bloquant) et `reset_after_escape_roome` coupe son script au passage.
- [x] **2ᵉ parcours (`spices`, rack d'épices)** calibré en live :
      **`[26700, 31200]`** = 8,7 m arrière, 2,2 m à droite du dock.
      Atteint par paliers depuis un point intermédiaire, l'envoi direct à 9 m
      partant dans la mauvaise direction.
- [x] **Trajet dock → rack d'épices chronométré : ~50 s.** `travel_seconds`
      reste à **100 s**, ce qui laisse 2× de marge sur le plancher technique.
      Le surplus sert au gameplay : les joueurs doivent avoir eu le temps de
      remonter de l'atelier avant le 1ᵉʳ `locate` (qui se répète ensuite 3 fois
      à 25 s d'intervalle, soit une fenêtre d'écoute jusqu'à 175 s).
      ℹ️ C'est bien le départ **depuis le dock** qu'il fallait mesurer, pas
      depuis le vin : l'ordre d'interrogation dépend des joueurs, et le dock
      est le pire cas (~9 m contre ~3,7 m depuis le vin).

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

- [x] **Voix de l'inspecteur** : `HenriNeural` (fr-FR), voix d'homme, distincte
      des 3 suspects. Il s'appelle désormais **Henri-Onésime de
      Beauchamp-Latulippe** — nom pompeux devenu gag récurrent (il exige son
      nom complet, s'agace, puis lâche « appelez-moi Henri » à la victoire).
- [x] **Deux pipelines séparés** (`Escape Room V1: Denise` /
      `Escape Room V2 - Henri`) : chaque jeu bascule
      `select.192_168_0_160_assistant` sur le sien au démarrage.
      `assist_satellite.announce` n'acceptant **aucune** option de voix, c'est
      la seule façon de la choisir — et ça évite que les deux escape rooms se
      contaminent.

## 🧪 3. Débrief après le premier test live (Eric joue → Claude corrige)

Points à valider en live, à corriger ensuite si besoin :

- [ ] **Ducking Sonos** : la voix de l'Héritière baisse bien la musique
      d'ambiance puis la musique revient (comportement natif attendu).
- [ ] **Reconnaissance des noms à l'accusation** (`ask_question` : Jardinier /
      Héritière / Majordome) — vérifier que les 3 noms sont bien captés ; sinon
      enrichir les `sentences`.
- [ ] **Trigger vocal « inspecteur »** lance bien le rappel + l'accusation.
      Le risque principal a été levé : le pipeline v2 utilise maintenant
      `conversation.home_assistant` et non plus Gemini, qui aurait pu avaler la
      phrase avant que `mystery_call_inspector` ne la matche. Reste à confirmer
      en live. Plan B si ça échoue malgré tout : remplacer le déclencheur vocal
      par un capteur physique.
- [ ] **Vidéo finale** `Final Reveal.mp4` : lecture OK sur `media_player.theatre_tv`
      (sinon ajuster `media_content_type` / la source).
- [ ] **Enchaînement des phases** de bout en bout (intro → enquête → autopsie
      auto après les 3 suspects → accusation → final).
- [ ] Ajustements de **dialogues / délais / volumes** selon le ressenti.

## 🏁 4. Clôture de la branche

- [ ] Décider quoi faire de la branche `escape-2` une fois le jeu validé en
      live : garder / ouvrir une PR / merger sur `main`.
