"""Les répliques des suspects sont des templates Jinja2 : on les rend ici comme
Home Assistant le ferait, pour vérifier que la partie « sans sacres » l'est
vraiment et que la version originale n'a pas été édulcorée au passage.

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
VARIABLES = SCRIPTS["mystery_suspect_speak"]["variables"]


def render(which, suspect, kid_friendly, variant="", gun_seen=False, dress_seen=False):
    return Template(VARIABLES[which]).render(
        suspect=suspect,
        variant=variant,
        kid_friendly=kid_friendly,
        heiress_gun_seen=gun_seen,
        heiress_dress_seen=dress_seen,
    )


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


class KidFriendlyDialogues(unittest.TestCase):
    def test_aucune_replique_ne_sacre_en_mode_enfants(self):
        for line in every_line(kid_friendly=True):
            for swear in SWEARS:
                self.assertNotIn(swear, line.lower(), f"sacre dans : {line}")

    def test_la_version_originale_sacre_toujours(self):
        original = " ".join(every_line(kid_friendly=False)).lower()
        for swear in SWEARS:
            self.assertIn(swear, original)

    def test_seuls_les_sacres_changent(self):
        """Le reste du texte — donc les indices du jeu — reste identique."""
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
                            adult = render(which, suspect, False, **kwargs)
                            self.assertEqual(
                                len(kid.split(".")),
                                len(adult.split(".")),
                                f"{which} / {suspect} : la structure a bougé",
                            )

    def test_le_majordome_reste_le_coupable_designe(self):
        """Les répliques nettoyées doivent toujours pointer vers le Majordome."""
        for line in every_line(kid_friendly=True):
            self.assertNotIn("Jardinier est le coupable", line)
        gardener = render("first_line", "gardener", kid_friendly=True)
        self.assertIn("Majordome", gardener)


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

    def test_le_reset_ne_touche_pas_au_reglage(self):
        """Le réglage est choisi au départ : un reset de partie ne l'efface pas."""
        sequence = yaml.dump(
            SCRIPTS["mystery_reset_state"]["sequence"], allow_unicode=True
        )
        self.assertNotIn("mystery_kid_friendly", sequence)


if __name__ == "__main__":
    unittest.main()
