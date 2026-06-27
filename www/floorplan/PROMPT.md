# Prompt — génération d'un rendu isométrique d'étage

Utilise ce fichier pour demander à une IA (ChatGPT, Claude, Gemini…) de t'aider à
produire l'image isométrique de chaque étage. Remplis les sections `[PLACEHOLDER]`
avant d'envoyer.

---

## Ce que tu fournis à l'IA

Joins à ton message :

- [ ] Croquis à main levée de l'étage (avec dimensions notées)
- [ ] Photos de chaque pièce
- [ ] Liste des pièces et de leur mobilier principal
- [ ] (Optionnel) Fichier SweetHome3D `.sh3d` si tu l'as déjà commencé

---

## Prompt — étape 1 : plan 2D à l'échelle (SweetHome3D)

> Je veux créer un plan 2D à l'échelle dans **SweetHome3D** pour pouvoir en exporter
> un rendu isométrique de type « Sims / dollhouse » (toit retiré, vue en plongée à 45°).
>
> Voici mes documents :
> - Croquis : [joint en pièce jointe]
> - Photos des pièces : [jointes en pièce jointe]
> - Dimensions approximatives (relevées au ruban) :
>
> ```
> [EXEMPLE — remplace par tes mesures]
> Salon : ~5,2 m × 4,1 m
> Cuisine ouverte : ~3,8 m × 3,5 m
> Couloir : ~1,2 m × 4,0 m
> ...
> ```
>
> Guide-moi pas à pas pour :
> 1. Créer les murs à l'échelle dans SweetHome3D à partir de ces dimensions.
> 2. Placer les ouvertures (portes, fenêtres) selon les photos.
> 3. Ajouter le mobilier principal (canapé, lit, table, etc.) en m'aidant des photos.
> 4. Configurer la caméra en vue isométrique 45° avec le toit retiré.
> 5. Exporter le rendu final en PNG haute résolution.

---

## Prompt — étape 2 : stylisation AI (optionnel)

Une fois le rendu SweetHome3D exporté, tu peux lui donner un style « Sims » plus
soigné via un outil de génération d'image (img2img ou style transfer).

> J'ai un rendu isométrique 3D d'un étage de maison (joint en pièce jointe).
> Retravaille-le dans un style **Sims / illustration isométrique** :
> - Couleurs vives mais douces (palette pastel chaude).
> - Contours nets, légèrement stylisés (pas photoréaliste).
> - Ombres douces, éclairage uniforme venant d'en haut à gauche.
> - Toit retiré, vue plongeante exactement à **45°** (ne pas modifier l'angle).
> - Conserve exactement le **même angle de caméra, le même zoom et le même cadrage**
>   que l'original — les proportions et positions des pièces ne doivent pas changer.
>
> Résolution cible : **[LARGEUR] × [HAUTEUR] px** (ex. 2048 × 2048).
>
> ⚠️ Cette image sera **gelée** (frozen) : une fois validée, aucune régénération
> ne sera faite, car des coordonnées de hotspots seront positionnées dessus.

---

## Contraintes à respecter absolument

| Contrainte | Pourquoi |
|---|---|
| **Même angle / zoom pour chaque étage** | Les étages s'affichent comme un dollhouse cohérent dans le dashboard. |
| **Ne pas régénérer après gel** | Les hotspots HA sont positionnés en % sur l'image ; régénérer décale tout. |
| **PNG sans transparence** | Format attendu par `picture-elements`. |
| **Nommage** : `main.png`, `upstairs.png` | Correspond aux chemins dans `config.yaml`. |

---

## Checklist avant de geler l'image

- [ ] Toutes les pièces de l'étage sont visibles et reconnaissables.
- [ ] L'angle est identique à celui des autres étages.
- [ ] La résolution est suffisante (≥ 1024 px de large recommandé).
- [ ] L'image est copiée dans `houses/new-house/floors/<id>.png`.
- [ ] Le générateur tourne sans erreur : `python core/generate.py houses/new-house`.
- [ ] L'éditeur visuel (`core/editor/index.html`) charge l'image correctement.
