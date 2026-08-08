# Brief de design — Terminal de vidéosurveillance (dashboard Home Assistant)

> Ce fichier est un **prompt** à copier-coller tel quel dans Claude Design.
> Le livrable attendu est le YAML du dashboard, pas ce document.

---

## Contexte

Je monte une escape room maison, **« Meurtre au manoir connecté »** : une chasse au
meurtrier façon Cluedo, jouée dans une vraie maison domotisée avec Home Assistant.
Des adultes, une session de 30 à 45 minutes, **tout en français**.

Trois suspects, chacun avec une pièce et une arme potentielle :

| Suspect | Pièce | Arme | Objet-indice physique |
|---|---|---|---|
| Le Jardinier | Atelier au sous-sol | Scie | Une scie à main étiquetée |
| L'Héritière | Salon | Fusil (BB gun) | Un fusil caché dans la trappe du foyer |
| Le Majordome | Salle à manger | Poison | Un pot d'épices marqué « POISON » |

(Le coupable est le Majordome, mais le dashboard ne doit évidemment rien en laisser paraître.)

Un inspecteur de police guide les joueurs par téléphone (synthèse vocale). Au premier
test live, **la reconnaissance vocale du téléphone s'est révélée peu fiable et
frustrante**. Je déplace donc les interactions clés du téléphone vers un écran.

## Objectif

Génère un **dashboard Home Assistant custom** qui joue le rôle de **terminal de
vidéosurveillance** d'un poste de sécurité.

Il tourne **en plein écran, dans un navigateur, sur le PC de sécurité du bureau au
sous-sol**. C'est le **seul écran du jeu** : il doit avoir l'air d'un vrai poste de
surveillance un peu daté, **pas** d'un dashboard domotique.

## Écrans et fonctions attendus

### 1. Galerie des enregistrements CCTV

Trois vidéos `.mp4`, une par suspect (images floues et mystérieuses, chacun avec son
arme potentielle). Les fichiers sont **déjà dans le media source de Home Assistant** ;
prévois des emplacements clairement identifiés où je collerai les chemins.
Le terminal doit permettre d'ouvrir et de lire chaque vidéo (plein écran ou grande
modale, gros bouton de lecture). Présente-les comme **CAM 01 / CAM 02 / CAM 03**
avec horodatage et libellé de zone.

### 2. Saisie des codes de preuve

Chaque objet-indice physique porte une **étiquette imprimée avec un code à 4 chiffres**.
Les joueurs trouvent l'objet, lisent le code, le tapent sur le terminal.

- **Pavé numérique cliquable** (0-9, effacer, valider) — pas seulement un champ texte.
  Le kiosque n'a pas de clavier pratique : **tout doit se piloter à la souris**.
- Grosses touches, cible de clic généreuse, retour visuel au survol et au clic.
- Les chiffres saisis s'affichent en gros, façon afficheur de terminal.
- À la validation, le code est écrit dans `input_text.mystery_code_input` ;
  une automation Home Assistant le valide puis remet le champ à vide.
  **Le dashboard ne valide rien lui-même.**

### 3. Retour visuel de progression

C'est le cœur de la boucle de jeu : **je trouve un objet dans la maison → je reviens au
terminal → je tape son code**. Le terminal doit rendre cette boucle immédiatement
lisible, même pour quelqu'un qui arrive en courant.

- **Trois emplacements de preuve** affichés en permanence, pilotés par les trois
  `input_boolean` d'évidence.
- Quand un code est validé, un **crochet vert (✓)** apparaît sur l'emplacement
  correspondant, avec une **animation de validation nette et satisfaisante** — ça doit
  se voir de l'autre bout de la pièce et donner envie d'aller chercher le suivant.
- Un **compteur de progression bien visible en permanence** : « 2 / 3 PREUVES
  ENREGISTRÉES ». D'un coup d'œil, on sait combien il en reste.
- Les emplacements **non encore trouvés restent affichés mais anonymisés** : case vide,
  « ??? », « PREUVE NON IDENTIFIÉE ». Les joueurs voient qu'il manque quelque chose
  sans savoir quoi. Une fois trouvé, l'emplacement révèle l'objet et le suspect associé.
- Quand le **3e crochet** tombe : **transition marquée**. Le compteur passe à 3/3 et le
  dossier confidentiel **se déverrouille visiblement à l'écran** (séquence de
  déverrouillage, changement d'état système, bascule de couleur) — ce n'est pas un
  simple menu qui apparaît en silence.

Feedback **net et immédiat** aussi en cas d'échec : « CODE INVALIDE », rouge, secousse.
Le refus peut être déduit du fait que le champ se vide sans qu'aucune preuve ne change.

### 4. Menu caché « Dossier confidentiel »

Invisible ou visiblement scellé tant que `input_boolean.mystery_terminal_unlocked` est
`off` (état **« SYSTÈME VERROUILLÉ »**). Quand il passe à `on`, le dossier s'ouvre de
façon spectaculaire et donne accès à **l'écran d'accusation finale** :

- Trois grandes cartes-suspects (portrait, nom, pièce, arme) — cliquables.
- Cliquer une carte écrit la valeur correspondante dans
  `input_select.mystery_accusation_choice`, ce qui déclenche le dénouement du jeu.
- Prévois une confirmation avant l'envoi (c'est irréversible côté fiction).

## Contrat d'entités Home Assistant (à respecter exactement)

Ces helpers existent déjà. Le dashboard s'appuie dessus et **ne déclenche rien d'autre** :
toute la logique de jeu vit dans les automations Home Assistant.

| Entité | Rôle |
|---|---|
| `input_text.mystery_code_input` | Code tapé sur le pavé. Une automation le valide puis le remet à vide. |
| `input_boolean.mystery_evidence_saw` | Preuve « scie du Jardinier » déverrouillée |
| `input_boolean.mystery_evidence_gun` | Preuve « fusil de l'Héritière » déverrouillée |
| `input_boolean.mystery_evidence_poison` | Preuve « pot d'épices POISON » déverrouillée |
| `input_boolean.mystery_terminal_unlocked` | `on` quand les 3 preuves sont trouvées → débloque le dossier confidentiel |
| `input_select.mystery_accusation_choice` | Options : `none`, `gardener`, `heiress`, `butler`. Le dashboard écrit le choix. |
| `input_select.mystery_phase` | État du jeu : `idle`, `investigation`, `autopsy_done`, `accusation`, `solved` |

`mystery_phase` peut servir à adapter l'ambiance du terminal (bandeau de statut,
message d'attente en `idle`, mode alerte en `accusation`), mais le dashboard ne doit
jamais l'écrire.

## Contraintes techniques

- Dashboard **Home Assistant** (vue en YAML, éditeur brut).
- Rendu pensé pour un **plein écran de PC de bureau, paysage ~1920×1080** :
  **aucun scroll vertical**, tout tient dans l'écran, lisible à quelques mètres.
- **Aucune interaction au clavier** : souris uniquement.
- **Bubble Card est déjà installé via HACS** et peut être utilisé.
  Sinon, cartes natives (`markdown`, `picture-elements`, `button`, `conditional`,
  `custom:button-card` si tu le juges utile) + `card-mod` et/ou un thème sombre.
  Indique clairement toute ressource HACS supplémentaire requise.
- **Toute l'interface est en français.**

## Direction artistique

Direction claire, exécution libre :

- Poste de sécurité crédible et un peu daté, **ambiance nocturne**.
- Typographie **monospace**, palette **vert ou ambre sur noir** (ou une variante que tu
  juges plus forte).
- Horodatages qui défilent, léger **bruit vidéo / scanlines**, libellés `CAM 01/02/03`,
  bandeau d'état système, compteur de preuves.
- **« SYSTÈME VERROUILLÉ »** bien visible tant que le dossier confidentiel est scellé.

L'important : que ça fasse **frissonner un peu**, tout en restant **utilisable sous
pression** — gros boutons, hiérarchie visuelle évidente, feedback immédiat.
Pas d'effet qui gêne la lecture ou ralentit une action.

## Livrable attendu

1. Le **YAML complet du dashboard**, prêt à coller dans l'éditeur brut de Home Assistant.
2. Le **CSS / thème** s'il y en a (thème HA, ou `card-mod` inline), avec où le mettre.
3. La liste des **ressources HACS** nécessaires, s'il y en a au-delà de Bubble Card.
4. Les **emplacements à compléter** clairement marqués (chemins des 3 `.mp4`, images de
   portraits des suspects si tu en utilises).
5. Une note courte sur ce qu'il reste à vérifier en conditions réelles — je n'ai pas
   d'aperçu automatisé, je teste tout à la main sur le vrai kiosque.
