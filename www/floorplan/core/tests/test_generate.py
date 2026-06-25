import sys
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import generate  # noqa: E402


@pytest.fixture
def style():
    return {"icon_scale": 1.35, "background": "rgba(255, 255, 255, 0.3)"}


# --- build_entity_elements -------------------------------------------------


def test_simple_light_produces_one_state_icon(style):
    elements = generate.build_entity_elements(
        {"entity": "light.kitchen", "left": "31.8%", "top": "49.5%"}, style
    )

    assert len(elements) == 1
    icon = elements[0]
    assert icon["type"] == "state-icon"
    assert icon["entity"] == "light.kitchen"
    assert icon["style"]["left"] == "31.8%"
    assert icon["style"]["top"] == "49.5%"
    assert icon["style"]["background-color"] == style["background"]


def test_tap_action_defaults_to_toggle(style):
    [icon] = generate.build_entity_elements(
        {"entity": "light.kitchen", "left": "1%", "top": "1%"}, style
    )
    assert icon["tap_action"] == {"action": "toggle"}


def test_tap_action_can_be_overridden(style):
    [icon] = generate.build_entity_elements(
        {"entity": "vacuum.roby", "left": "1%", "top": "1%", "tap_action": "more-info"},
        style,
    )
    assert icon["tap_action"] == {"action": "more-info"}


def test_icon_scale_comes_from_style(style):
    [icon] = generate.build_entity_elements(
        {"entity": "light.kitchen", "left": "1%", "top": "1%"}, style
    )
    assert "scale(1.35)" in icon["style"]["transform"]


def test_entity_with_labels_produces_icon_plus_labels(style):
    elements = generate.build_entity_elements(
        {
            "entity": "climate.heat_pump",
            "left": "57%",
            "top": "37%",
            "labels": [
                {"attribute": "current_temperature"},
                {"attribute": "temperature", "position": "bottom"},
            ],
        },
        style,
    )

    icon = elements[0]
    labels = elements[1:]
    assert icon["type"] == "state-icon"
    # climate badges use a pill shape, not a 50% circle
    assert icon["style"]["border-radius"] == "999px"
    assert len(labels) == 2
    assert all(label["type"] == "state-label" for label in labels)
    assert labels[0]["attribute"] == "current_temperature"
    assert labels[1]["attribute"] == "temperature"
    # labels share the icon anchor point
    assert all(label["style"]["left"] == "57%" for label in labels)


def test_service_button(style):
    elements = generate.build_entity_elements(
        {
            "service": "scene.turn_on",
            "service_data": {"entity_id": "scene.turn_off_everything"},
            "left": "91%",
            "top": "72%",
        },
        style,
    )
    [button] = elements
    assert button["type"] == "service-button"
    assert button["service"] == "scene.turn_on"
    assert button["service_data"] == {"entity_id": "scene.turn_off_everything"}


# --- build_floor_card ------------------------------------------------------


def test_floor_card_has_image_and_meta_marker(style):
    floor = {
        "id": "main",
        "name": "Rez-de-chaussée",
        "image": "/local/x/main.png",
        "default": True,
        "entities": [{"entity": "light.kitchen", "left": "1%", "top": "1%"}],
    }
    card = generate.build_floor_card(floor, style)

    assert card["type"] == "picture-elements"
    assert card["image"] == "/local/x/main.png"

    marker = card["elements"][0]
    assert marker["style"]["display"] == "none"
    assert marker["title"].startswith("floorplan-meta:main:")
    assert "Rez-de-chaussée" in marker["title"]
    assert marker["title"].endswith(":default")
    # entity element follows the marker
    assert card["elements"][1]["entity"] == "light.kitchen"


def test_non_default_floor_marker_has_no_default_suffix(style):
    floor = {"id": "up", "name": "Étage", "image": "x", "entities": []}
    card = generate.build_floor_card(floor, style)
    assert card["elements"][0]["title"] == "floorplan-meta:up:Étage"


# --- build_card ------------------------------------------------------------


def test_build_card_wraps_one_picture_card_per_floor():
    config = {
        "house": "new-house",
        "floors": [
            {"id": "main", "name": "RDC", "image": "a", "entities": []},
            {"id": "up", "name": "Étage", "image": "b", "entities": []},
        ],
    }
    card = generate.build_card(config)
    assert card["type"] == "vertical-stack"
    assert len(card["cards"]) == 2
    assert [c["image"] for c in card["cards"]] == ["a", "b"]


def test_build_card_applies_default_style_when_missing():
    config = {
        "floors": [
            {
                "id": "main",
                "name": "RDC",
                "image": "a",
                "entities": [{"entity": "light.x", "left": "1%", "top": "1%"}],
            }
        ]
    }
    card = generate.build_card(config)
    icon = card["cards"][0]["elements"][1]
    assert icon["style"]["background-color"] == generate.DEFAULT_STYLE["background"]


def test_output_is_yaml_serializable():
    config = {
        "floors": [
            {
                "id": "main",
                "name": "RDC",
                "image": "a",
                "entities": [
                    {
                        "entity": "climate.x",
                        "left": "1%",
                        "top": "1%",
                        "labels": [{"attribute": "temperature"}],
                    }
                ],
            }
        ]
    }
    dumped = yaml.safe_dump(generate.build_card(config), allow_unicode=True)
    assert yaml.safe_load(dumped)["type"] == "vertical-stack"
