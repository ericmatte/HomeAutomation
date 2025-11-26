class AreaBubbleAutoCard extends HTMLElement {
  constructor() {
    super();
    this._initialized = false;
  }

  setConfig(config) {
    if (!config.area) throw new Error("Area is required");
    this.area_id = config.area;
  }

  set hass(hass) {
    this.ha = hass;
    if (!this._initialized) this.updateCard();
    this._initialized = true;
  }

  /** File all hass entities where their area_id or their device's area_id is the same as the area_id */
  getEntities(area) {
    const entities = [];
    for (const entity of Object.values(this.ha.entities)) {
      if ((entity.area_id || this.ha.devices[entity.device_id]?.area_id) === area.area_id) {
        entities.push(entity);
      }
    }
    return entities;
  }

  async updateCard() {
    if (!this.ha?.areas) return;
    const area = this.ha.areas[this.area_id];
    if (!area) {
      this.innerHTML = '<hui-error-card error="Area not found"></hui-error-card>';
      return;
    }

    const temperatureId = area.temperature_entity_id;
    const humidityId = area.humidity_entity_id;

    const entities = this.getEntities(area);
    const subButtons = [];

    if (humidityId) {
      subButtons.push({
        entity: humidityId,
        show_state: true,
        show_background: false,
      });
    }

    if (temperatureId) {
      const relatedClimate = entities.find((e) => {
        if (!e.entity_id.startsWith("climate.")) return false;
        if (e.device_id && e.device_id === this.ha.entities[temperatureId]?.device_id) return true;
        return false;
      });
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

    const covers = entities.filter((e) => e.entity_id.startsWith("cover."));
    for (const cover of covers) {
      subButtons.push({
        entity: cover.entity_id,
        show_state: false,
        show_background: false,
      });
    }

    // Create and render the Bubble Card
    try {
      const helpers = await window.loadCardHelpers();
      const card = helpers.createCardElement({
        type: "custom:bubble-card",
        card_type: "separator",
        name: area.name || this.config.area,
        icon: area.icon || "mdi:home",
        ...(subButtons.length > 0 && { sub_button: subButtons }),
      });

      card.hass = this.ha;
      this.innerHTML = "";
      this.appendChild(card);
    } catch (error) {
      console.error("Error creating Bubble Card:", error);
      this.innerHTML = `<hui-error-card error="Error creating card: ${error.message}"></hui-error-card>`;
    }
  }

  static getConfigElement() {
    return null;
  }

  static getStubConfig() {
    return { area: "" };
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
  description: "Automatically generates bubble cards for entities in an area",
});
