const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);

const nameWithoutAreaPrefix = (name, area) => capitalize(name.replace(`${area.name} `, ""));

class AreaBubbleAutoCard extends HTMLElement {
  constructor() {
    super();
    this._initialized = false;
  }

  setConfig(config) {
    this.floor_id = config.floor;
    if (this.floor_id === undefined) throw new Error("Floor is required");
  }

  set hass(hass) {
    this.ha = hass;
    this.updateCard();
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

  getEntityName(entity) {
    if (entity.name) return entity.name;

    const state = this.ha.states?.[entity.entity_id];
    if (state?.attributes?.friendly_name) return state.attributes.friendly_name;

    return entity.entity_id.split(".").pop().replace(/_/g, " ");
  }

  async updateCard() {
    if (!this.ha?.floors || !this.ha?.areas) return;

    const items = [];

    try {
      const helpers = await window.loadCardHelpers();

      // Loop through each area in the floor
      Object.values(this.ha.areas).forEach((area) => {
        if (area.floor_id !== this.floor_id) return;

        const temperatureId = area.temperature_entity_id;
        const humidityId = area.humidity_entity_id;

        const entities = this.getEntities(area);
        const subButtons = [];

        entities.forEach((sensor) => {
          if (!sensor.entity_id.startsWith("binary_sensor.") || sensor.hidden) return;

          subButtons.push({
            entity: sensor.entity_id,
            show_state: false,
            show_background: false,
          });
        });

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

        entities.forEach((cover) => {
          if (!cover.entity_id.startsWith("cover.") || cover.hidden) return;

          subButtons.push({
            entity: cover.entity_id,
            tap_action: { action: "toggle" },
            hold_action: { action: "more-info" },
          });
        });

        const areaWrapper = document.createElement("div");
        areaWrapper.style.marginBottom = "32px";

        const header = helpers.createCardElement({
          type: "custom:bubble-card",
          card_type: "separator",
          name: area.name,
          icon: area.icon,
          ...(subButtons.length > 0 && { sub_button: subButtons }),
        });
        header.hass = this.ha;
        areaWrapper.appendChild(header);

        // Create separate bubble cards for each light in the area
        const lightCards = [];
        entities.forEach((light) => {
          if (!light.entity_id.startsWith("light.") || light.hidden) return;

          lightCards.push({
            type: "custom:bubble-card",
            card_type: "button",
            button_type: "slider",
            entity: light.entity_id,
            name: nameWithoutAreaPrefix(this.getEntityName(light), area),
            rows: "1",
            card_layout: "large",
          });
        });

        if (lightCards.length > 0) {
          const lightsContainer = document.createElement("div");
          lightsContainer.style.display = "flex";
          lightsContainer.style.gap = "8px";
          lightsContainer.style.flexWrap = "wrap";

          lightCards.forEach((lightConfig) => {
            const lightCard = helpers.createCardElement(lightConfig);
            lightCard.hass = this.ha;
            lightCard.style.width = "calc(50% - 4px)";
            lightsContainer.appendChild(lightCard);
          });

          areaWrapper.appendChild(lightsContainer);
        }

        items.push(areaWrapper);
      });

      // Create and render bubble cards directly
      this.innerHTML = "";
      items.forEach((item) => {
        this.appendChild(item);
      });
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
