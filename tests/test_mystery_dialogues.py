"""Les répliques des suspects sont des templates Jinja2 : on les rend ici comme
Home Assistant le ferait, pour vérifier que la version tout public l'est vraiment
— ni sacres ni joual — et que la version originale n'a pas été édulcorée au
passage.

    python3 -m unittest discover -s tests
"""

import unittest
from pathlib import Path

import yaml
from jinja2 import Template

ROOT = Path(__file__).resolve().parent.parent

SWEARS = [
    "tabarnak",
    "calice",
    "câlice",
    "soulon",
    "miséricorde",
]

# Marqueurs de joual : régionalismes, négations avalées et élisions familières.
# Ce que le TTS prononcerait comme du québécois plutôt que du français standard.
# Chacun est un fragment exact de la version originale — assez long pour ne pas
# se déclencher sur la forme corrigée (« il arrêtait pas » et non « arrêtait
# pas », qui matcherait aussi « il n'arrêtait pas »).
JOUAL = [
    "icite",
    "pantoute",
    "heille",
    "chill man",
    "drama",
    "niaiser",
    "vous autres",
    "ben voyons",
    "ben distinguée",
    "y'er",
    "y'avait",
    "j'te ",
    "j'vous",
    "j'lai",
    "pis oui",
    "pis arrêtez",
    "toute qu'un",
    "où c'est que",
    "c'est pas",
    "il arrêtait pas",
    "on va pas",
    "! fouillez pas",
    "ça prouve rien",
    "c'est rien que",
    "j'ai rien vu",
    "je m'en suis jamais servie",
    "ont rapport",
    "meilleur bouteille",
    "aller donc voir",
]

SUSPECTS = ("gardener", "heiress", "butler")
VARIANTS = ("", "laundry")


class UnknownTagLoader(yaml.SafeLoader):
    """configuration.yaml est truffé de !secret / !include, sans intérêt ici."""


UnknownTagLoader.add_multi_constructor("!", lambda loader, suffix, node: None)


def load(name, loader=yaml.SafeLoader):
    with open(ROOT / name, encoding="utf-8") as handle:
        return yaml.load(handle, Loader=loader)


SCRIPTS = load("scripts.yaml")
CONFIG = load("configuration.yaml", UnknownTagLoader)
AUTOMATIONS = {item["id"]: item for item in load("automations.yaml") if "id" in item}
VARIABLES = SCRIPTS["mystery_suspect_speak"]["variables"]


def render(which, suspect, kid_friendly, variant="", gun_seen=False, dress_seen=False):
    """Rend `first_line` / `repeat_line` en chaînant les variables comme HA le fait.

    Les variables d'un script sont rendues dans l'ordre et voient les
    précédentes : la variante et son sélecteur passent donc par le même chemin
    qu'en production.
    """
    context = {
        "suspect": suspect,
        "variant": variant,
        "kid_friendly": kid_friendly,
        "heiress_gun_seen": gun_seen,
        "heiress_dress_seen": dress_seen,
    }
    for key in (f"{which}_original", f"{which}_kid", which):
        context[key] = Template(VARIABLES[key]).render(**context)
    return context[which]


def every_line(kid_friendly):
    """Toutes les répliques atteignables, tous suspects et états confondus."""
    for suspect in SUSPECTS:
        for variant in VARIANTS:
            yield render("first_line", suspect, kid_friendly, variant=variant)
            for gun_seen in (False, True):
                for dress_seen in (False, True):
                    yield render(
                        "repeat_line",
                        suspect,
                        kid_friendly,
                        variant=variant,
                        gun_seen=gun_seen,
                        dress_seen=dress_seen,
                    )


def inspector_messages(steps):
    """Les répliques de l'inspecteur, y compris dans les branches if/then/else."""
    for step in steps:
        if not isinstance(step, dict):
            continue
        if step.get("action") == "script.mystery_inspector_say":
            yield step["data"]["message"]
        for branch in ("then", "else", "sequence"):
            if isinstance(step.get(branch), list):
                yield from inspector_messages(step[branch])


def render_inspector(message, kid_friendly):
    def is_state(entity_id, state):
        assert entity_id == "input_boolean.mystery_kid_friendly", entity_id
        return state == ("on" if kid_friendly else "off")

    return Template(message).render(is_state=is_state)


def custom_lines(kid_friendly):
    """Les répliques ponctuelles, passées en dur par les automations."""
    for automation in AUTOMATIONS.values():
        for action in automation.get("actions", []):
            if action.get("action") != "script.mystery_suspect_speak":
                continue
            data = action.get("data", {})
            if not data.get("custom_line"):
                continue
            if kid_friendly and data.get("custom_line_kid"):
                yield data["custom_line_kid"]
            else:
                yield data["custom_line"]


class VersionToutPublic(unittest.TestCase):
    def assertPropre(self, line, banned):
        for word in banned:
            self.assertNotIn(word, line.lower(), f"« {word} » dans : {line}")

    def test_aucun_sacre_dans_les_temoignages(self):
        for line in every_line(kid_friendly=True):
            self.assertPropre(line, SWEARS)

    def test_aucun_joual_dans_les_temoignages(self):
        for line in every_line(kid_friendly=True):
            self.assertPropre(line, JOUAL)

    def test_les_repliques_ponctuelles_sont_nettoyees(self):
        for line in custom_lines(kid_friendly=True):
            self.assertPropre(line, SWEARS + JOUAL)

    def test_le_denouement_evite_le_joual(self):
        """Seule réplique de l'inspecteur en joual : « j'ai trouvé de quoi qui »."""
        messages = list(inspector_messages(SCRIPTS["mystery_denouement"]["sequence"]))
        victoire = next(m for m in messages if "C'est exact" in m)
        self.assertIn("quelque chose qui", render_inspector(victoire, True))
        self.assertIn("de quoi qui", render_inspector(victoire, False))

    def test_les_autres_repliques_de_l_inspecteur_sont_deja_standard(self):
        """Il parle un français soutenu partout ailleurs — rien à décliner."""
        for message in inspector_messages(SCRIPTS["mystery_denouement"]["sequence"]):
            if "C'est exact" in message:
                continue
            for word in SWEARS + JOUAL:
                self.assertNotIn(word, message.lower(), f"« {word} » dans : {message}")


class VersionOriginale(unittest.TestCase):
    def test_elle_sacre_toujours(self):
        original = " ".join(every_line(kid_friendly=False)).lower()
        for swear in SWEARS:
            self.assertIn(swear, original)

    def test_elle_parle_toujours_joual(self):
        original = " ".join(every_line(kid_friendly=False)).lower()
        for marker in ("icite", "pantoute", "heille", "y'er"):
            self.assertIn(marker, original)

    def test_les_repliques_ponctuelles_gardent_leur_accent(self):
        self.assertIn("où c'est que", " ".join(custom_lines(kid_friendly=False)))

    def test_chaque_marqueur_de_joual_vise_vraiment_une_replique(self):
        """Sinon un marqueur mal orthographié passerait tous les tests."""
        corpus = " ".join(
            list(every_line(kid_friendly=False)) + list(custom_lines(kid_friendly=False))
        ).lower()
        for marker in SWEARS + JOUAL:
            self.assertIn(marker, corpus, f"« {marker} » ne vise plus rien")


class MemeEnquete(unittest.TestCase):
    """Seule la formulation change : l'intrigue est la même des deux côtés."""

    INDICES = {
        "gardener": ["scie", "Majordome", "atelier", "robot"],
        "heiress": ["fusil", "trappe", "vin", "robot"],
        "butler": ["vin", "Héritière", "buanderie", "héritage"],
    }

    def test_chaque_temoignage_garde_ses_indices(self):
        for suspect, indices in self.INDICES.items():
            for kid_friendly in (True, False):
                line = render("first_line", suspect, kid_friendly)
                for indice in indices:
                    self.assertIn(
                        indice.lower(),
                        line.lower(),
                        f"{suspect} (kid={kid_friendly}) a perdu « {indice} »",
                    )

    def test_la_robe_reste_l_entree_en_matiere_de_la_buanderie(self):
        for kid_friendly in (True, False):
            line = render("first_line", "heiress", kid_friendly, variant="laundry")
            self.assertIn("robe", line.lower())
            self.assertIn("linge sale", line.lower())

    def test_les_deux_versions_ont_le_meme_nombre_de_phrases(self):
        for suspect in SUSPECTS:
            for variant in VARIANTS:
                for gun_seen in (False, True):
                    for dress_seen in (False, True):
                        for which in ("first_line", "repeat_line"):
                            kwargs = dict(
                                variant=variant,
                                gun_seen=gun_seen,
                                dress_seen=dress_seen,
                            )
                            kid = render(which, suspect, True, **kwargs)
                            original = render(which, suspect, False, **kwargs)
                            self.assertEqual(
                                len(kid.split(".")),
                                len(original.split(".")),
                                f"{which} / {suspect} : la structure a bougé",
                            )


class ScriptWiring(unittest.TestCase):
    def test_le_helper_existe(self):
        self.assertIn("mystery_kid_friendly", CONFIG["input_boolean"])

    def test_le_script_de_depart_expose_la_case_a_cocher(self):
        field = SCRIPTS["mystery_start"]["fields"]["kid_friendly"]
        self.assertIn("boolean", field["selector"])
        self.assertFalse(field["default"])

    def test_le_script_de_depart_pose_le_helper(self):
        sequence = yaml.dump(SCRIPTS["mystery_start"]["sequence"], allow_unicode=True)
        self.assertIn("input_boolean.mystery_kid_friendly", sequence)
        self.assertIn("kid_friendly | default(false) | bool", sequence)

    def test_le_mode_est_lu_depuis_le_helper(self):
        self.assertIn(
            "input_boolean.mystery_kid_friendly", VARIABLES["kid_friendly"]
        )

    def test_le_reset_ne_touche_pas_au_reglage(self):
        """Le réglage est choisi au départ : un reset de partie ne l'efface pas."""
        sequence = yaml.dump(
            SCRIPTS["mystery_reset_state"]["sequence"], allow_unicode=True
        )
        self.assertNotIn("mystery_kid_friendly", sequence)

    def test_la_replique_ponctuelle_retombe_sur_l_originale(self):
        """Sans variante fournie, `custom_line` sert dans les deux versions."""
        template = Template(VARIABLES["spoken_custom_line"])
        self.assertEqual(
            template.render(kid_friendly=True, custom_line="A", custom_line_kid=""),
            "A",
        )
        self.assertEqual(
            template.render(kid_friendly=True, custom_line="A", custom_line_kid="B"),
            "B",
        )
        self.assertEqual(
            template.render(kid_friendly=False, custom_line="A", custom_line_kid="B"),
            "A",
        )


if __name__ == "__main__":
    unittest.main()
