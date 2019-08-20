class ButtonEntityRow extends Polymer.Element {
  static get template() {
    return Polymer.html`
<style>
 hui-generic-entity-row {
     margin: var(--ha-themed-slider-margin, initial);
 }
 .flex {
     display: flex;
     align-items: center;
 }
 .flex-box {
     display: flex;
     justify-content: space-evenly;
 }
 paper-button {
     cursor: pointer;
     padding: 8px;
     position: relative;
     display: inline-flex;
     align-items: center;
 }
 .icon-default {
	 color: var(--primary-color);
 }
 .icon-active {
	 color: var(--paper-item-icon-active-color);
 }
 .icon-inactive {
	 color: var(--paper-item-icon-color);
 }
</style>
<template is="dom-repeat" items="[[buttons]]" as="row">
    <div class="flex-box">
        <template is="dom-repeat" items="[[row]]">
            <paper-button on-click="handleButton" style="[[getStyle(item.style)]]" class$="[[getClass(item.state)]]">
                <template is="dom-if" if="{{item.icon}}">
                    <ha-icon icon="[[item.icon]]" style="[[getPadding(item.name)]]"><ha-icon>
                </template>
                {{item.name}}
                <paper-ripple center class$="[[getRippleStyle(item.name)]]"></paper-ripple>
            </paper-button>
        </template>
</template>

    `
  }

  static get properties() {
    return {
      _hass: Object,
      _config: Object,
      buttons: Array,
      stateObj: { type: Object, value: null },
    };
  }

  getClass(state) {
    switch (state) {
      case "on":
        return "icon-active"
      case "off":
        return "icon-inactive"
      default:
        return ""
    }
  }

  getStyle(styles) {
    var style = "";
    for (let index in styles) {
      if (styles.hasOwnProperty(index)) {
        for (let s in styles[index]) {
          style += `${s}: ${styles[index][s]};`;
        }
      }
    }
    return style;
  }

  getPadding(name) {
    return name ? 'padding-right: 5px;' : '';
  }

  getRippleStyle(name) {
    return name ? '' : 'circle';
  }

  makeButtonFromEntity(entity) {
    const parts = entity.split('.')
    const domain = parts[0]
    let service
    switch (domain) {
    case 'light':
    case 'switch':
    case 'script':
    case 'input_boolean':
      service = 'toggle'
      break
    case 'media_player':
      service = 'media_play_pause'
      break
    case 'scene':
      service = 'turn_on'
      break
    default:
      throw new Error(`cannot use ${entity} without a specific action config`)
    }
    return {
      service: `${domain}.${service}`,
      service_data: {
        entity_id: entity
      }
    }
  }
  
  setConfig(config) {
    this._config = config;
    if (!config.buttons) {
      throw new Error("missing buttons")
    }
    if (!Array.isArray(config.buttons)) {
      throw new Error("buttons must be an array")
    }
    if (config.buttons.length <= 0) {
      throw new Error("at least one button required")
    }
    if (!Array.isArray(config.buttons[0])) {
      config.buttons = [config.buttons]
    }
    
    this.buttons = config.buttons.map(row => row.map(button => {
      if (typeof button === "string") {
        return this.makeButtonFromEntity(button)
      }
      if (button.entity) {
        return {
          ...this.makeButtonFromEntity(button.entity),
          icon: button.icon,
          stateIcons: button.state_icons,
          iconColor: button.icon_color,
          style: button.style,
          name: button.name
        }
      }

      if (!button.service) throw new Error("service required")
      if (!button.service_data) button.service_data = {}
      if (!button.name && !button.icon) throw new Error("name or icon required")
      return button
    }))

    
  }

  set hass(hass) {
    this._hass = hass;

    this.buttons = this.buttons.map(row => row.map(button => {
      const state = hass.states[button.service_data.entity_id]

      if (state && state.attributes) {
        button.state = state.state;

        if (button.stateIcons) {
          button.icon = button.stateIcons[state.state] || button.icon
        } else if (!button.icon) {
          button.icon =  state.attributes.icon;
        }

        if (!(button.name || button.icon)) {
          if (state.attributes.friendly_name) {
            button.name = state.attributes.friendly_name
          }
        }
      }

      return {...button}
    }))
  }

  handleButton(evt) {
    const button = evt.model.get('item')
    const svc = button.service.split('.')
    if (svc[0] === "script") {
      const svc2 = button.service_data.entity_id.split('.')
      this._hass.callService(svc2[0], svc2[1]);
    } else {
      this._hass.callService(svc[0], svc[1], button.service_data)
    }
  }


  stopPropagation(ev) {
    ev.stopPropagation();
  }
}

customElements.define('button-entity-row', ButtonEntityRow);
