const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);

const nameWithoutAreaPrefix = (name, area) => capitalize(name.replace(`${area.name} `, ""));

const nameWithoutStairs = (name) => capitalize(name.replace("Upstairs", "").replace("Downstairs", ""));

class AreaBubbleAutoCard extends HTMLElement {
  constructor() {
    super();
    this._initialized = false;
  }

  setConfig(config) {
    this.floorId = config.floor;
    if (this.floorId === undefined) throw new Error("Floor is required");
    this.customCards = config.custom_cards || {};
  }

  set hass(hass) {
    this.ha = hass;
    this.updateCard();
  }

  /** Find all hass entities where their area_id or their device's area_id matches the area_id */
  getEntities(area) {
    return Object.values(this.ha.entities).filter(
      (entity) => (entity.area_id || this.ha.devices[entity.device_id]?.area_id) === area.area_id
    );
  }

  getEntityName(entity) {
    if (entity.name) return entity.name;

    const state = this.ha.states?.[entity.entity_id];
    if (state?.attributes?.friendly_name) return state.attributes.friendly_name;

    return entity.entity_id.split(".").pop().replace(/_/g, " ");
  }

  createCard(parent, helpers, params) {
    const card = helpers.createCardElement(params);
    card.hass = this.ha;
    parent.appendChild(card);
    return card;
  }

  createSubButtons(entities, area) {
    const subButtons = [];
    const { temperature_entity_id: temperatureId, humidity_entity_id: humidityId } = area;

    entities.forEach((sensor) => {
      if (!sensor.entity_id.startsWith("binary_sensor.") || sensor.hidden) return;

      subButtons.push({ entity: sensor.entity_id });
    });

    if (humidityId) {
      subButtons.push({
        entity: humidityId,
        show_state: true,
        show_background: false,
      });
    }

    if (temperatureId) {
      const temperatureEntity = this.ha.entities[temperatureId];
      const relatedClimate = entities.find(
        (e) => e.entity_id.startsWith("climate.") && e.device_id && e.device_id === temperatureEntity?.device_id
      );

      subButtons.push(
        relatedClimate
          ? {
              entity: relatedClimate.entity_id,
              show_attribute: true,
              attribute: "current_temperature",
              show_icon: false,
              state_background: false,
              show_background: false,
            }
          : {
              entity: temperatureId,
              show_icon: false,
              show_state: true,
              show_background: false,
            }
      );
    }

    entities.forEach((cover) => {
      if (!cover.entity_id.startsWith("cover.") || cover.hidden) return;

      subButtons.push({
        entity: cover.entity_id,
        tap_action: { action: "toggle" },
        hold_action: { action: "more-info" },
      });
    });

    return subButtons;
  }

  createHeaderCard(areaWrapper, helpers, area, entities) {
    const subButtons = this.createSubButtons(entities, area);
    const header = {
      type: "custom:bubble-card",
      card_type: "separator",
      name: nameWithoutStairs(area.name),
      icon: area.icon,
      ...(subButtons.length > 0 && { sub_button: subButtons }),
    };
    this.createCard(areaWrapper, helpers, header);
  }

  createContent(areaWrapper, helpers, entities, area) {
    const container = document.createElement("div");
    container.style.cssText = "display: flex; gap: 8px; flex-wrap: wrap";

    this.customCards[area.area_id]?.forEach((card) => {
      const cardElement = this.createCard(container, helpers, card);
      cardElement.style.width = "100%";
    });

    entities.forEach((light) => {
      if (!light.entity_id.startsWith("light.") || light.hidden) return;

      const lightCard = this.createCard(container, helpers, {
        type: "custom:bubble-card",
        card_type: "button",
        button_type: "slider",
        entity: light.entity_id,
        name: nameWithoutAreaPrefix(this.getEntityName(light), area),
        rows: "1",
        card_layout: "large",
      });
      lightCard.style.width = "calc(50% - 4px)";
    });

    if (container.children.length > 0) {
      areaWrapper.appendChild(container);
    }
  }

  async updateCard() {
    if (!this.ha?.floors || !this.ha?.areas) return;

    try {
      const helpers = await window.loadCardHelpers();
      const fragment = document.createDocumentFragment();

      Object.values(this.ha.areas).forEach((area) => {
        if (area.floor_id !== this.floorId) return;

        const areaWrapper = document.createElement("div");
        areaWrapper.style.marginBottom = "32px";

        const entities = this.getEntities(area);
        this.createHeaderCard(areaWrapper, helpers, area, entities);
        this.createContent(areaWrapper, helpers, entities, area);

        fragment.appendChild(areaWrapper);
      });

      this.innerHTML = "";
      this.appendChild(fragment);
    } catch (error) {
      console.error("Error creating Bubble Card:", error);
      this.innerHTML = `<hui-error-card error="Error creating card: ${error.message}"></hui-error-card>`;
    }
  }

  static getConfigElement() {
    return null;
  }

  static getStubConfig() {
    return { floor: "" };
  }

  getCardSize() {
    return 1;
  }
}

customElements.define("area-bubble-auto-card", AreaBubbleAutoCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "area-bubble-auto-card",
  name: "Area Bubble Auto Card",
  description: "Automatically generates bubble cards for all areas in a floor",
});
