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

## 🧪 3. Débrief après le premier test live

### ✅ Corrigé suite au 1ᵉʳ test

- [x] **Volume de la sirène** monté de 0,5 à 0,8 ; l'enceinte du Majordome est
      maintenant réglée une fois au démarrage (0,9) au lieu d'à chaque réplique.
- [x] **Gyrophares trop lents** : la boucle inline est devenue
      `script.mystery_flash_alternate`, avec le rythme en paramètre
      (`interval: 0.3` au lieu d'un cycle par seconde) et le nombre de cycles
      déduit de la durée du son.
- [x] **L'inspecteur marmonnait** : « QUI / AVEC QUOI / OÙ » et « EMPOISONNÉE »
      en majuscules étaient épelés lettre à lettre. Tout est repassé en
      minuscules — règle à garder pour tout nouveau texte TTS.
- [x] **Guidage vers les caméras** après le briefing : `script.mystery_guide_path`
      allume une traînée salon → couloir du sous-sol → bureau, et l'inspecteur
      dit d'où suivre. Même mécanique vers l'atelier (tiroir à couteaux) et vers
      le théâtre (final).
- [x] **Roby partait pendant que l'Héritière parlait** : il attend maintenant la
      fin de la réplique (`lead_in_seconds`, estimé à ~2,3 mots/seconde), et
      elle annonce explicitement qu'il mène à l'étagère à vins. Rebouger la
      trappe ne relance pas de 2ᵉ trajet (le drapeau du suspect garde).
- [x] **Maison trop sombre** : `script.mystery_ambience` garde des veilleuses
      partout et fait « respirer » les lampes du salon ; la pièce d'où sort une
      voix s'éclaire pendant la réplique.
- [x] **Le Jardinier marmonnait** : ses répliques passent par le TTS d'Amazon,
      qui mange les élisions familières (« ch'te », « y'arrêtait »). Réécrites en
      mots entiers.
- [x] **Le Majordome disait n'importe quoi** sur le tiroir à couteaux (« le
      Jardinier passe son temps dans cette cuisine ») : il dit maintenant que le
      Jardinier a **volé un couteau**, et envoie les joueurs dehors ou à
      l'atelier.
- [x] **Porte-patio** : le Jardinier **marmonne dans son atelier** pendant que
      le Majordome parle — c'est ce bruit de fond qui révèle où il est.
- [x] **Joueurs laissés à eux-mêmes** : chaque réplique finit par une consigne,
      « indice » au téléphone donne un point de situation calculé sur l'état
      réel de la partie, et l'inspecteur rappelle tout seul après 6 min sans
      progrès (`Mystery - Idle nudge`).
- [x] **Rickroll** déplacé du Sonos vers `media_player.theatre_tv`, et le final
      ne recopie plus la v1 : les 3 toiles tombent en cascade, noir, montée de
      rouge, puis alternance de couleurs pendant la musique.
- [x] **Téléphone peu fiable** → **terminal CCTV** (voir §5).

### 🔍 Reste à valider en live

- [ ] **Vitesse des gyrophares** (`interval` dans `script.mystery_start`) : 0,3 s
      est un compromis entre « ça ressemble enfin à un gyrophare » et le débit
      que le pont Hue encaisse sur 19 s. À monter ou descendre à l'oreille.
- [ ] **Lecture sur la TV du théâtre** : `media_player.play_media` en forme
      plate (`media_content_id` / `media_content_type`). La v1 utilise une forme
      imbriquée générée par l'UI ; si le rickroll ne part pas, c'est le premier
      truc à changer.
- [ ] **Estimation de durée des répliques** (2,3 mots/s) : c'est elle qui règle
      le départ de Roby et le délai de 40 s avant le rappel d'autopsie. À
      vérifier que l'inspecteur ne coupe pas le 3ᵉ suspect.
- [ ] **Ducking Sonos** : la voix de l'Héritière baisse bien la musique
      d'ambiance puis la musique revient (comportement natif attendu).
- [ ] **Enchaînement des phases** de bout en bout (intro → enquête → autopsie
      auto → codes de preuve → accusation au terminal → final).
- [ ] **Chemins de secours** au téléphone : « indice » et « inspecteur ».
- [ ] Ajustements de **dialogues / délais / volumes** selon le ressenti.

## 🖥️ 5. Terminal CCTV (nouveau)

Le téléphone reste bon pour **parler** aux joueurs, mais pas pour les
**écouter**. Les moments décisifs passent donc sur un dashboard HA en plein
écran, sur le PC du bureau.

- [x] Contrat d'entités posé côté HA : `input_text.mystery_code_input`, les 3
      `input_boolean.mystery_evidence_*`, `mystery_terminal_unlocked`,
      `input_select.mystery_accusation_choice`, plus les automations
      `Mystery - Evidence code entered` et `Mystery - Accusation from terminal`.
- [x] Brief de design écrit : [`../cctv-terminal-prompt.md`](../cctv-terminal-prompt.md).
- [ ] Générer le dashboard (Claude Design) et le coller dans HA.
- [ ] Poser les 3 étiquettes-codes sur les objets (voir le todo manuel).

## 🏁 4. Clôture de la branche

- [ ] Décider quoi faire de la branche `escape-2` une fois le jeu validé en
      live : garder / ouvrir une PR / merger sur `main`.
