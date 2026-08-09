# Todo — à valider en jouant, puis clôturer

Ce qui ne peut pas se trancher depuis le code : Claude a le ha-mcp mais **aucun
test visuel/live**. Eric joue et observe, Claude ajuste.

> Le calibrage de Roby, le choix des voix TTS et les correctifs du 1ᵉʳ test live
> sont faits et documentés dans [`../design.md`](../design.md) (sections
> « Robot Roby » et « Architecture technique »). L'historique détaillé de ces
> itérations vit dans les commits de la branche.

## 🔍 1. Reste à valider en live

- [ ] **Vitesse des gyrophares** (`interval` dans `script.mystery_start`) : 0,3 s
      est un compromis entre « ça ressemble enfin à un gyrophare » et le débit
      que le pont Hue encaisse. À monter ou descendre à l'oreille.
- [ ] **Lecture sur la TV du théâtre** : `media_player.play_media` en forme
      plate (`media_content_id` / `media_content_type`). La v1 utilise une forme
      imbriquée générée par l'UI ; si `Final Reveal.mp4` ou la chanson ne
      partent pas, c'est le premier truc à changer.
- [ ] **Estimation de durée des répliques** (2,3 mots/s) : c'est elle qui règle
      le départ de Roby et le délai avant le rappel d'autopsie. À vérifier que
      l'inspecteur ne coupe pas le 3ᵉ suspect.
- [ ] **Ducking Sonos** : la voix de l'Héritière baisse bien la musique
      d'ambiance puis la musique revient (comportement natif attendu).
- [ ] **Enchaînement des phases** de bout en bout (intro → enquête → autopsie
      auto → codes de preuve → accusation au terminal → final).
- [ ] **Chemins de secours** au téléphone : « indice » et « inspecteur ».
- [ ] Ajustements de **dialogues / délais / volumes** selon le ressenti
      (les textes vivent dans [`../dialogues.md`](../dialogues.md)).

## 🏁 2. Clôture de la branche

- [ ] Décider quoi faire de la branche `escape-2` une fois le jeu validé en
      live : garder / ouvrir une PR / merger sur `main`.
