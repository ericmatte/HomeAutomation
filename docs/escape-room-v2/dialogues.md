# Toutes les répliques — « Meurtre au manoir connecté »

> Chaque texte prononcé dans le jeu, tel qu'il est dans le code. Réécris
> directement dans les blocs et renvoie-les-moi avec leur numéro
> (`T7 → nouveau texte`).
>
> La numérotation ne bouge pas entre les révisions : T4, T14 et T15 ont été
> retirés du jeu mais gardent leur place, pour que les anciens numéros
> continuent de désigner la même chose.

**Où sort chaque voix** — 📞 téléphone (salon) · 🔊 Sonos (salon, tout le groupe
entend) · 🖥️ terminal du bureau (sous-sol, texte affiché **et** voix).

---

## 🕵️ L'inspecteur Henri-Onésime de Beauchamp-Latulippe

**T1** 🔊 — Au début, sur le Sonos. Il coupe ses hommes et s'adresse au groupe.
_(`{nom}` = le champ **Player name** de `script.mystery_start`. Laissé vide, la
salutation saute et il enchaîne directement.)_

```
Bonsoir. Ici inspecteur Henri-Onésime de Beauchamp-Latulippe. Vous devez être {nom}. Enchanté de faire votre connaissance. Un meurtre a eu lieu ici ce soir, et la maison a tout enregistré! Je vous nomme détectives. Trouvez-moi le coupable parmi trois suspects : le Jardinier, l'Héritière et le Majordome. Fouillez partout — ces trois-là se trahissent dès qu'on touche à leurs affaires. Bon. Il faut que j'y aille, j'ai un autre appel.
```

**T2** 📞 — 8 secondes après son départ.

```
Ici Inspecteur Beauchamp-Latulippe. J'oubliais ! Les caméras de surveillance de la maison sont sur le terminal, dans le bureau au sous-sol. J'ai fait allumer les lumières jusque-là, suivez-les. Et si vous bloquez, demandez-moi un indice au téléphone.
```

**T3** 📞 — 12 secondes après les 3 suspects entendus: Le rapport d'autopsie.

```
Beauchamp-Latulippe à nouveau. J'ai eu le rapport de l'autopsie : la victime a été empoisonnée. Avez-vous trouvé les trois pièces à conviction possible ? Dès que vous les avez, tapez-les sur le terminal du bureau.
```

**T4** — ~~Annonce téléphonique au 3ᵉ code~~ · **retirée**. Les joueurs sont au
sous-sol, le téléphone est au salon. Le terminal joue sa séquence de
déverrouillage à l'écran, ça suffit.

**T5** 🖥️ — Bonne réponse.

```
Le Majordome. C'est exact, détective ! Appelez-moi Henri, vous l'avez mérité. Descendez au théâtre, j'ai trouvé de quoi qui pourrait vous intéresser : suivez les lumières, et regardez l'écran.
```

**T6** 🖥️ — Mauvaise réponse.

```
Non. Ça ne colle pas, détective. Et c'est Beauchamp-Latulippe. Reprenez le vin et les alibis. Revenez me voir quand vous serez sûrs.
```

### Ses indices

Sur demande (« indice » au téléphone) ou de lui-même après 6 minutes sans
progrès. Il choisit selon l'avancement.

**T7** 📞 — Il manque des témoignages. _(`{qui}` = « du Jardinier », ou « du Jardinier et de l'Héritière »…)_

```
Il me manque encore le témoignage {qui}. Repassez donc par les caméras du bureau, elles en disent plus long que moi.
```

**T8** 📞 — Les 3 témoignages sont pris, l'autopsie n'est pas encore arrivée.

```
Vous avez les trois témoignages. Ne bougez pas, je vous rappelle.
```

**T9** 📞 — Il manque des pièces à conviction. _(`{n}` = 0, 1 ou 2 · `{qui}` = les suspects concernés)_

```
{n} pièce(s) à conviction sur trois. Il me manque celle {qui}. Les caméras du bureau montrent chacun avec son arme — regardez-les encore, vous saurez quoi chercher.
```

**T10** 📞 — Les 3 pièces sont au dossier.

```
Les trois pièces sont au dossier. Désignez le coupable sur le terminal.
```

**T11** 🖥️ — Pendant l'accusation. Sort sur le terminal, pas au téléphone.

```
Je vous écoute : désignez le coupable sur le terminal.
```

**T12** 📞 — Aucune partie en cours.

```
Il n'y a pas d'enquête en cours, détective.
```

### Sa réponse courte au téléphone

**T13** 📞 — Quand on demande un indice, avant qu'il rappelle.

```
Un instant, détective, je consulte mon dossier.
```

**T14** — ~~« Je vais dire à l'inspecteur de vous rappeler »~~ · **retirée**.

**T15** — ~~Sa question d'accusation au téléphone~~ · **retirée**. L'accusation se
fait uniquement sur le terminal. Le mot « inspecteur » ne déclenche plus rien,
et le bouton de l'étagère à vins ne sert plus qu'à appeler le Majordome.

---

## 🌿 Le Jardinier — atelier au sous-sol, sur l'Echo

> ⚠️ Sa voix passe par le TTS d'Amazon, qui **mange les élisions familières**.
> Si une réplique sort marmonnée, c'est là qu'il faut regarder.

**T16** — Première fois qu'on ouvre la porte de l'atelier.

```
Hé, c'est quoi cette histoire de détective ? Moi, j'ai rien vu, j'te le jure. J'ai passé la soirée icitte, dans l'atelier, à aiguiser ma scie rouge. Ben relaxe. Mais si tu veux mon avis, le Majordome, lui yer louche en tabarnak: il arrêtait pas de tourner autour de la salle à manger avec sa bouteille de vin. Monte donc voir de ce côté-là. Et fais pas attention à mon robot, il fait sa ronde.
```

**T17** — Les fois suivantes.

```
J'te l'ai déjà dit. J'étais dans l'atelier toute la soirée. Cherche ailleurs. Va voir le soulon de Majordome et sa bouteille de vin.
```

**T18** — Marmonnements dans son atelier, pendant que le Majordome parle à la porte-patio. Sert à révéler où il se trouve.

```
Hmm hmm... voyons voir... non, pas celle-là... mais où c'est que j'ai mis ça, donc... hmm... ah, tiens... non, non... mmmh... bon, bon, bon... Hmm hmm... voyons voir... non, pas celle-là... mais où c'est que j'ai mis ça, donc... hmm... ah, tiens... non, non... mmmh... bon, bon, bon...
```

---

## 💎 L'Héritière — salon, sur le Sonos

Elle a **deux déclencheurs**. L'entrée en matière change, la suite est la même.

**T19** — Première fois, si on touche à la trappe du foyer (le fusil).

```
Heille, mon fusil ?! Ben voyons donc, c'est pas ce que vous pensez pantoute ! OK, oui, je l'ai caché dans la trappe du foyer, mais je m'en suis jamais servie, j'vous le jure ! Je suis une femme ben distinguée quand même, on va pas me faire passer pour une calice de criminelle ! Non madame.
```

**T20** — Première fois, si on ouvre la porte de la buanderie (sa robe tachée).

```
Heille ! Fouillez pas dans mon linge sale, vous autres ! Ma robe de soirée est là-dedans, pis oui, elle est tachée. Mais c'est du vin, ça, pas du sang ! On m'en a renversé un plein verre dessus.
```

**T21** — La suite, enchaînée après T19 **ou** T20. C'est elle qui lance le robot.

```
Si vous cherchez de quoi avancer, c'est pas moi qu'il faut regarder. Moi, j'irais fouiller l'étagère à vins — il doit bien se cacher quelque chose là-dedans. Tenez, je pars mon robot, il s'en va justement par là. Suivez-le.
```

**T22** — Les fois suivantes. Le texte dépend de laquelle de ses 2 cachettes a
déjà été trouvée (indépendamment de qui a fourni le tout premier témoignage) :
retrouver l'autre après coup fait passer T22a/T22b à T22c.

**T22a** — Seule la trappe du fusil a été trouvée.

```
Heille, tabarnak, lâchez mes affaires tranquilles ! Le fusil, ça prouve rien pantoute, je vous le jure. Pis arrêtez de me niaiser avec ça : mon robot est déjà parti vous montrer où chercher. J'lai vu le Majordome, y'avait un sac à vin contenant sa meilleur bouteille, y'a clairement laisser des traces de son passage dans le sac !
```

**T22b** — Seule la robe a été trouvée.

```
Heille, tabarnak, lâchez mes affaires tranquilles ! Ma robe, c'est rien que du vin renversé, je vous le jure. Pis arrêtez de me niaiser avec ça : mon robot est déjà parti vous montrer où chercher. J'lai vu le Majordome, y'avait un sac à vin contenant sa meilleur bouteille, y'a clairement laisser des traces de son passage dans le sac !
```

**T22c** — Les deux ont été trouvées.

```
Heille, tabarnak, lâchez mes affaires tranquilles ! Ni le fusil ni ma robe ont rapport là-dedans, je vous le jure. Pis arrêtez de me niaiser avec ça : mon robot est déjà parti vous montrer où chercher. J'lai vu le Majordome, y'avait un sac à vin contenant sa meilleur bouteille, y'a clairement laisser des traces de son passage dans le sac !
```

---

## 🤵 Le Majordome — salle à manger, sur le Google Home

**T23** — Première fois qu'on clique le bouton de service sur l'étagère à vins.

```
Vous avez sonné pour le service ? À votre entière disposition. J'ai servi le vin toute la soirée, comme il se doit. Un service irréprochable. L'Héritière, en revanche, ne décolérait pas contre la victime : une sordide histoire d'héritage. Et puisque vous fouillez, examinez donc la robe de celle-ci dans la buanderie. Elle avait fait toute qu'un drama ce soir au souper !
```

**T24** — Les fois suivantes.

```
Le service, toujours le service. Le vin était... parfait. Enfin, presque. Je n'ai rien vu de suspect de mon côté. Aller donc voir l'Héritière, elle a été bien plus agitée que moi ce soir. Et si vous voulez mon avis, le Jardinier est un peu louche lui aussi. Il traîne toujours dans son atelier, à bricoler.
```

**T25a** — Quand on ouvre la porte-patio. Le Jardinier marmonne (T18) en même temps.

```
Oh, vous partez déjà voir le Jardinier ? Il est en bas, dans son atelier : écoutez, on l'entend bricoler d'ici.
```

_Puis il se tait 13 secondes — le temps de sa réplique (~10 s) plus 3 s de
silence, pour qu'on entende vraiment le Jardinier bricoler._

**T25b** — La suite.

```
Parfois, la porte extérieure est verrouillée, mais vous pouvez toujours passer par le sous-sol. À votre place je me méfierais de lui, il est un peu louche, je vous l'ai dit.
```

**T26** — Quand on ouvre le tiroir à couteaux. Fausse piste.

```
Un couteau manquant dans ce tiroir ? Mon Dieu... je n'y toucherais jamais, voyons. Moi c'est le service, uniquement le service. Mais puisque vous fouillez : c'est le Jardinier qui a pris ce couteau, je l'ai vu le glisser sous son tablier en repartant. Allez donc le lui demander vous-même. Il traîne souvent dehors, ou en bas dans son atelier. Je l'ai vu passer par la porte-patio récemment.
```
