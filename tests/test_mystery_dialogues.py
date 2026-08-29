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


def hardcoded_lines(node):
    """Les répliques écrites en dur dans un script, où qu'elles soient."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key in ("message", "custom_line") and isinstance(value, str):
                yield value
            else:
                yield from hardcoded_lines(value)
    elif isinstance(node, list):
        for value in node:
            yield from hardcoded_lines(value)


def render_kid_off(text):
    """Rend une réplique en mode normal ; les autres templates restent bruts."""
    if "mystery_kid_friendly" not in text:
        return text
    return render_inspector(text, kid_friendly=False)


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


class EnqueteContinueApresLesTemoignages(unittest.TestCase):
    """Régression : une fois les 3 témoignages recueillis, le jeu passe en phase
    `autopsy_done` pour la chasse aux preuves — les suspects (porte du Jardinier,
    fusil/robe de l'Héritière, bouton du Majordome) doivent rester réactifs
    jusqu'à ce que les 3 codes de preuve soient entrés, pas seulement pendant
    `investigation`.
    """

    def conditions(self):
        return AUTOMATIONS["mystery_suspect_triggers"]["conditions"]

    def test_les_suspects_repondent_aussi_en_autopsy_done(self):
        phase_condition = next(
            c for c in self.conditions() if c["entity_id"] == "input_select.mystery_phase"
        )
        self.assertIn("investigation", phase_condition["state"])
        self.assertIn("autopsy_done", phase_condition["state"])

    def test_les_suspects_se_taisent_une_fois_le_terminal_debloque(self):
        terminal_condition = next(
            c
            for c in self.conditions()
            if c["entity_id"] == "input_boolean.mystery_terminal_unlocked"
        )
        self.assertEqual(terminal_condition["state"], "off")


class HeriereFusilUneSeuleFois(unittest.TestCase):
    """Régression : le capteur de vibration (indice du fusil) ne doit parler
    qu'une fois. Contrairement à la buanderie, qui peut se répéter, chaque
    nouvelle vibration après la première ne doit plus rien déclencher.
    """

    def guard_template(self):
        actions = AUTOMATIONS["mystery_suspect_triggers"]["actions"]
        step = next(a for a in actions if a.get("condition") == "template")
        return Template(step["value_template"])

    def render(self, trigger_id, gun_seen):
        def is_state(entity_id, state):
            assert entity_id == "input_boolean.mystery_heiress_gun_seen"
            return gun_seen == (state == "on")

        trigger = type("Trigger", (), {"id": trigger_id})()
        return self.guard_template().render(trigger=trigger, is_state=is_state) == "True"

    def test_premiere_vibration_passe(self):
        self.assertTrue(self.render("heiress", gun_seen=False))

    def test_vibrations_suivantes_sont_bloquees(self):
        self.assertFalse(self.render("heiress", gun_seen=True))

    def test_la_buanderie_n_est_jamais_bloquee_par_ce_garde(self):
        self.assertTrue(self.render("heiress_laundry", gun_seen=True))
        self.assertTrue(self.render("heiress_laundry", gun_seen=False))


class VersionOriginaleIntacte(unittest.TestCase):
    """Filet de sécurité : option décochée, le jeu doit être mot pour mot celui
    d'avant l'ajout du mode tout public.

    L'instantané a été généré depuis b8d7bb0, le commit qui précède ce mode. Il
    couvre les 32 rendus de témoignages et les 25 répliques en dur (inspecteur,
    marmonnements, dénouement). S'il casse, c'est que la version originale a
    bougé — soit c'est voulu et il faut régénérer le fichier, soit c'est une
    fuite du mode tout public dans la partie normale.
    """

    @staticmethod
    def snapshot():
        with open(ROOT / "tests/fixtures/mystery_original_lines.txt", encoding="utf-8") as f:
            return dict(row.rstrip("\n").split("\t", 1) for row in f if row.strip())

    def test_les_temoignages_sont_inchanges(self):
        expected = self.snapshot()
        for key, before in expected.items():
            kind, _, rest = key.partition("|")
            if kind == "message":
                continue
            suspect, variant, gun, dress = rest.split("|")
            now = render(
                kind,
                suspect,
                kid_friendly=False,
                variant=variant,
                gun_seen=bool(int(gun)),
                dress_seen=bool(int(dress)),
            )
            self.assertEqual(" ".join(now.split()), before, f"{key} a changé")

    def test_les_repliques_en_dur_sont_inchangees(self):
        expected = {v for k, v in self.snapshot().items() if k.startswith("message|")}
        actual = set()
        for name, script in SCRIPTS.items():
            if not name.startswith("mystery_"):
                continue
            for text in hardcoded_lines(script):
                actual.add(" ".join(render_kid_off(text).split()))
        self.assertEqual(expected, actual)


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
        self.assertTrue(field["required"])

    def test_le_script_de_depart_pose_le_helper(self):
        sequence = yaml.dump(SCRIPTS["mystery_start"]["sequence"], allow_unicode=True)
        self.assertIn("input_boolean.mystery_kid_friendly", sequence)
        self.assertIn("kid_friendly | bool", sequence)

    def test_les_champs_du_script_de_depart_sont_obligatoires(self):
        """Aucun défaut : chaque appel doit fournir explicitement les 3 valeurs."""
        for name, field in SCRIPTS["mystery_start"]["fields"].items():
            self.assertNotIn("default", field, f"{name} a encore un défaut")
            self.assertTrue(field["required"], f"{name} devrait être obligatoire")

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

    def test_le_helper_vrais_acteurs_existe(self):
        self.assertIn("mystery_real_actors", CONFIG["input_boolean"])

    def test_le_script_de_depart_expose_le_toggle_vrais_acteurs(self):
        field = SCRIPTS["mystery_start"]["fields"]["real_actors"]
        self.assertIn("boolean", field["selector"])
        self.assertTrue(field["required"])

    def test_le_script_de_depart_pose_le_helper_vrais_acteurs(self):
        sequence = yaml.dump(SCRIPTS["mystery_start"]["sequence"], allow_unicode=True)
        self.assertIn("input_boolean.mystery_real_actors", sequence)
        self.assertIn("real_actors | bool", sequence)

    def test_le_reset_ne_touche_pas_au_reglage_vrais_acteurs(self):
        sequence = yaml.dump(
            SCRIPTS["mystery_reset_state"]["sequence"], allow_unicode=True
        )
        self.assertNotIn("mystery_real_actors", sequence)

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


class VraisActeursCoupentLaVoixSaufMajordome(unittest.TestCase):
    """Régression : le toggle "Real actors" ne doit museler que le Jardinier et
    l'Héritière — le Majordome, sans acteur, garde toujours sa voix synthétique.
    """

    def voice_enabled(self, suspect, real_actors):
        def is_state(entity_id, state):
            assert entity_id == "input_boolean.mystery_real_actors"
            return real_actors == (state == "on")

        template = Template(VARIABLES["voice_enabled"])
        return template.render(suspect=suspect, is_state=is_state) == "True"

    def test_sans_vrais_acteurs_tout_le_monde_parle(self):
        for suspect in SUSPECTS:
            self.assertTrue(self.voice_enabled(suspect, real_actors=False))

    def test_avec_vrais_acteurs_le_jardinier_et_l_heritiere_se_taisent(self):
        self.assertFalse(self.voice_enabled("gardener", real_actors=True))
        self.assertFalse(self.voice_enabled("heiress", real_actors=True))

    def test_avec_vrais_acteurs_le_majordome_parle_quand_meme(self):
        self.assertTrue(self.voice_enabled("butler", real_actors=True))

    def test_le_halo_de_l_heritiere_ne_depend_pas_de_la_voix(self):
        """Vrais acteurs ou pas, le lustre monte pendant qu'elle parle : le halo
        est de la mise en scène, pas de la sortie audio."""
        steps = SCRIPTS["mystery_suspect_speak"]["sequence"]
        glow = [s for s in steps if "mystery_sonos_glow" in yaml.dump(s)]
        self.assertEqual(len(glow), 1, "le halo devrait apparaître une seule fois")
        self.assertNotIn("voice_enabled", yaml.dump(glow[0]))
        self.assertIn("heiress", glow[0]["if"])


class DenouementSurLeMurDImages(unittest.TestCase):
    """Régression : la révélation finale se joue sur l'écran du terminal, plus
    au théâtre — aucune animation de lumière/rideau ni la TV du théâtre.
    """

    def sequence_text(self):
        return yaml.dump(SCRIPTS["mystery_denouement"]["sequence"], allow_unicode=True)

    def test_aucune_reference_au_theatre(self):
        sequence = self.sequence_text()
        for entity in (
            "media_player.theatre_tv",
            "light.theatre",
            "cover.theatre_left_shade",
            "cover.theatre_middle_shade",
            "cover.theatre_right_shade",
            "light.wooden_lamp",
            "light.metal_lamp",
            "light.bad_light",
        ):
            self.assertNotIn(entity, sequence, f"{entity} encore référencé dans le dénouement")

    def test_la_video_est_envoyee_par_evenement(self):
        success_steps = SCRIPTS["mystery_denouement"]["sequence"][0]["then"]
        reveal = next(s for s in success_steps if "event" in s)
        self.assertEqual(reveal["event"], "mystery_terminal_reveal")
        self.assertEqual(
            reveal["event_data"]["media_content_id"],
            "media-source://media_source/local/Final Reveal.mp4",
        )


if __name__ == "__main__":
    unittest.main()


class LaRevelationSurvitAUnRechargement(unittest.TestCase):
    """Régression : l'événement `mystery_terminal_reveal` se perd si le terminal
    n'est pas ouvert. Un helper garde la vidéo pour que la carte la retrouve.
    """

    MEDIA = "media-source://media_source/local/Final Reveal.mp4"

    def test_le_helper_existe(self):
        self.assertIn("mystery_reveal_media", CONFIG["input_text"])

    def test_le_denouement_ecrit_la_video_dans_le_helper(self):
        success_steps = SCRIPTS["mystery_denouement"]["sequence"][0]["then"]
        setter = next(
            s for s in success_steps
            if s.get("target", {}).get("entity_id") == "input_text.mystery_reveal_media"
        )
        self.assertEqual(setter["action"], "input_text.set_value")
        self.assertEqual(setter["data"]["value"], self.MEDIA)

    def test_le_reset_vide_le_helper(self):
        """Sinon la partie suivante rouvrirait sur la révélation de la précédente."""
        setter = next(
            s for s in SCRIPTS["mystery_reset_state"]["sequence"]
            if s.get("target", {}).get("entity_id") == "input_text.mystery_reveal_media"
        )
        self.assertEqual(setter["data"]["value"], "")

    def test_la_carte_lit_le_helper(self):
        card = (ROOT / "www/custom-lovelace/mystery-terminal-card.js").read_text(
            encoding="utf-8"
        )
        self.assertIn('revealMedia: "input_text.mystery_reveal_media"', card)


class TourDHonneurApresLaVideo(unittest.TestCase):
    """Le théâtre est hors-jeu, mais la musique de victoire et les lumières de
    fête restent — déclenchées par la carte quand la vidéo se termine.
    """

    def test_le_script_existe(self):
        self.assertIn("mystery_victory_lap", SCRIPTS)

    def test_il_joue_la_musique_et_allume_les_lampes(self):
        sequence = yaml.dump(SCRIPTS["mystery_victory_lap"]["sequence"], allow_unicode=True)
        self.assertIn("Jamie Foxx", sequence)
        self.assertIn("media_player.sonos", sequence)
        self.assertIn("prism", sequence)

    def test_il_ne_touche_plus_a_la_tv_du_theatre(self):
        sequence = yaml.dump(SCRIPTS["mystery_victory_lap"]["sequence"], allow_unicode=True)
        self.assertNotIn("theatre", sequence)

    def test_la_carte_le_declenche_a_la_fin_de_la_video(self):
        card = (ROOT / "www/custom-lovelace/mystery-terminal-card.js").read_text(
            encoding="utf-8"
        )
        finish = card.split("_finishReveal() {", 1)[1].split("\n  }", 1)[0]
        self.assertIn("script.mystery_victory_lap", finish)
