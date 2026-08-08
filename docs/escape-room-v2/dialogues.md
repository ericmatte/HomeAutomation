# Toutes les répliques — « Meurtre au manoir connecté »

> Chaque texte prononcé dans le jeu, tel quel. Réécris directement dans les
> blocs et renvoie-les-moi avec leur numéro (`T7 → nouveau texte`).

---

## 🕵️ L'inspecteur Henri-Onésime de Beauchamp-Latulippe

**T1** — Au début, sur le Sonos. Il coupe ses hommes et s'adresse au groupe.

```
Bonsoir. Inspecteur Henri-Onésime de Beauchamp-Latulippe. Un meurtre a eu lieu ici ce soir, et cette maison a tout enregistré. Je vous nomme détectives. Trouvez-moi le coupable parmi trois suspects : le Jardinier, l'Héritière et le Majordome. Fouillez partout — ces trois-là se trahissent dès qu'on touche à leurs affaires. Bon. Il faut que j'y aille, j'ai un autre appel.
```

**T2** — 5 secondes après son départ, au téléphone.

```
J'oubliais ! Beauchamp-Latulippe. Les caméras de surveillance de la maison sont sur le terminal, dans le bureau au sous-sol. J'ai fait allumer les lumières jusque-là, suivez-les. Et si vous bloquez, demandez-moi un indice.
```

**T3** — Au téléphone, une fois les 3 suspects entendus. Le rapport d'autopsie.

```
Beauchamp-Latulippe à nouveau. Le rapport du légiste : la victime a été empoisonnée. Oubliez le fusil et la scie comme armes du crime. Maintenant, il me faut les trois pièces à conviction : la scie, le fusil et le pot d'épices. Chacune porte un code — tapez-les sur le terminal du bureau.
```

**T4** — Au téléphone, quand la 3ᵉ pièce à conviction est enregistrée.

```
Trois pièces à conviction au dossier. Le dossier confidentiel vient de s'ouvrir sur le terminal : désignez-moi le coupable.
```

**T5** — Bonne réponse.

```
Le Majordome. C'est exact, détective ! Appelez-moi Henri, vous l'avez mérité. Descendez au théâtre : suivez les lumières, et regardez l'écran.
```

**T6** — Mauvaise réponse.

```
Non. Ça ne colle pas, détective. Et c'est Beauchamp-Latulippe. Reprenez le vin, les épices et les alibis. Revenez me voir quand vous serez sûrs.
```

### Ses indices

Sur demande (« indice » au téléphone) ou de lui-même après 6 minutes sans
progrès. Il choisit selon l'avancement.

**T7** — Il manque des témoignages. *(`{qui}` = « le Jardinier », ou « le Jardinier et l'Héritière »…)*

```
Il me manque encore le témoignage de {qui}. Repassez donc par les caméras du bureau, elles en disent plus long que moi.
```

**T8** — Les 3 témoignages sont pris, l'autopsie n'est pas encore arrivée.

```
Vous avez les trois témoignages. Ne bougez pas, je vous rappelle.
```

**T9** — Il manque des pièces à conviction. *(`{n}` = 0, 1 ou 2 · `{qui}` = les suspects concernés)*

```
{n} pièce(s) à conviction sur trois. Il me manque celle de {qui}. Les caméras du bureau montrent chacun avec son arme — regardez-les encore, vous saurez quoi chercher.
```

**T10** — Les 3 pièces sont au dossier.

```
Les trois pièces sont au dossier. Désignez le coupable sur le terminal.
```

**T11** — Pendant l'accusation.

```
Je vous écoute : désignez le coupable sur le terminal.
```

**T12** — Aucune partie en cours.

```
Il n'y a pas d'enquête en cours, détective.
```

### Ses réponses courtes au téléphone

**T13** — Quand on demande un indice, avant qu'il rappelle.

```
Un instant, détective, je consulte mon dossier.
```

**T14** — Quand on dit « inspecteur » pour accuser.

```
Parfait, détective. Je vais dire à l'inspecteur de vous rappeler tout de suite.
```

**T15** — Sa question d'accusation, au téléphone. *(chemin de secours ; normalement l'accusation se fait à l'écran)*

```
Eh alors, détective ! Henri-Onésime de Beauchamp-Latulippe à l'appareil. Avez-vous trouvé le coupable ? Dites-moi son nom : est-ce le Jardinier, l'Héritière, ou le Majordome ?
```

---

## 🌿 Le Jardinier — atelier au sous-sol, sur l'Echo

> ⚠️ Sa voix passe par le TTS d'Amazon, qui **mange les élisions familières**
> (« ch'te », « y'arrêtait »). Garde les mots entiers, sinon il marmonne.

**T16** — Première fois qu'on ouvre la porte de l'atelier.

```
Hé, c'est quoi cette histoire de détective ? Moi, j'ai rien vu, je te le jure. J'ai passé la soirée ici, dans l'atelier, à aiguiser ma scie. Tranquille. Mais si tu veux mon avis, le Majordome, lui, il arrêtait pas de tourner autour de la salle à manger avec sa bouteille de vin. Ça, c'est louche. Monte donc voir de ce côté-là. Et fais pas attention à mon robot, il fait sa ronde.
```

**T17** — Les fois suivantes.

```
Je te l'ai déjà dit. J'étais dans l'atelier toute la soirée. Cherche ailleurs. Va voir le Majordome et sa bouteille de vin.
```

**T18** — Marmonnements dans son atelier, pendant que le Majordome parle à la porte-patio. Sert à révéler où il se trouve.

```
Hmm hmm... voyons voir... non, pas celle-là... mais où c'est que j'ai mis ça, donc... hmm... ah, tiens... non, non... mmmh... bon, bon, bon...
```

---

## 💎 L'Héritière — salon, sur le Sonos

Elle a **deux déclencheurs**. L'entrée en matière change, la suite est la même.

**T19** — Première fois, si on touche à la trappe du foyer (le fusil).

```
Heille, mon fusil ?! Ben voyons donc, c'est pas ça que vous pensez pantoute ! OK, oui, je l'ai caché dans la trappe du foyer, mais je m'en suis jamais servie, j'vous le jure !
```

**T20** — Première fois, si on ouvre la porte de la buanderie (sa robe tachée).

```
Heille ! Fouillez pas dans mon linge sale, vous autres ! Ma robe de soirée est là-dedans, pis oui, elle est tachée. Mais c'est du vin, ça, pas du sang ! On m'en a renversé un plein verre dessus.
```

**T21** — La suite, enchaînée après T19 **ou** T20. C'est elle qui lance le robot.

```
Si vous cherchez de quoi avancer, c'est pas moi qu'il faut regarder. Moi, j'irais fouiller l'étagère à vins — il doit bien se cacher quelque chose là-dedans. Tenez, je pars mon robot, il s'en va justement par là. Suivez-le.
```

**T22** — Les fois suivantes, quel que soit le déclencheur.

```
Heille, tabarnak, lâchez mes affaires tranquilles ! Ni le fusil ni ma robe ont rapport là-dedans, je vous le jure. Pis arrêtez de me niaiser avec ça : mon robot est déjà parti vous montrer où chercher, à l'étagère à vins.
```

---

## 🤵 Le Majordome — salle à manger, sur le Google Home

**T23** — Première fois qu'on clique le bouton de service sur l'étagère à vins.

```
Vous avez sonné pour le service ? À votre entière disposition. J'ai servi le vin toute la soirée, comme il se doit. Un service irréprochable. L'Héritière, en revanche, ne décolérait pas contre la victime : une sordide histoire d'héritage. Et puisque vous fouillez, examinez donc cette étagère à vins, les tiroirs de la cuisine et le rack d'épices. On trouve parfois des choses surprenantes dans une maison.
```

**T24** — Les fois suivantes.

```
Le service, toujours le service. Le vin était... parfait. Enfin, presque. Regardez donc du côté des épices.
```

**T25** — Quand on ouvre la porte-patio. Le Jardinier marmonne (T18) en même temps.

```
Oh, vous partez déjà voir le Jardinier ? Il est en bas, dans son atelier : écoutez, on l'entend bricoler d'ici. Mais avant cela, prenez donc le temps d'examiner cette étagère à vins et les tiroirs de la cuisine. On trouve parfois des choses bien surprenantes dans une maison. Moi, je n'ai rien à cacher, bien entendu.
```

**T26** — Quand on ouvre le tiroir à couteaux. Fausse piste.

```
Un couteau manquant dans ce tiroir ? Mon Dieu... je n'y toucherais jamais, voyons. Le service, uniquement le service. Mais puisque vous fouillez : c'est le Jardinier qui a pris ce couteau, je l'ai vu le glisser sous son tablier en repartant. Allez donc le lui demander vous-même. Il traîne dehors, ou en bas dans son atelier.
```
