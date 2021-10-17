import appdaemon.plugins.hass.hassapi as hass
import appdaemon.plugins.mqtt.mqttapi as mqtt
import json
import time

from threading import Thread

SLEEP_THRESHOLD = 0.250

COMMANDS = {
    "power": "Turn on Window AC",
    "mode": "Turn on Window AC Mode",
    "fan_mode": "Turn on Window AC Fan Speed",
    "sleep": "Turn on Window AC Sleep",
    "timer": "Turn on Window AC Timer",
    "eco": "Turn on Window AC Eco",
    "increase_temp": "Turn on Light on Window AC",
    "decrease_temp": "Turn on Swing on Window AC"
}

MODES = ["auto", "cool", "dry", "fan_only"]

FAN_MODES = ["auto", "low", "medium", "high"]


""" Custom AppDaemon app to control a simple AC unit using Meross IR blaster and Google Assistant Relay throught MQTT """
class IrAcUnit(hass.Hass):
    def initialize(self):
        args = self.args
        self.unit_name = args["name"]
        self.unique_id = args["unique_id"]
        self.entity_id = "climate.{}".format(self.unique_id)
        
        self.mode_topic = "/climate/{id}/mode".format(id=self.unique_id)
        self.fan_mode_topic = "/climate/{id}/fan_mode".format(id=self.unique_id)
        self.temperature_topic = "/climate/{id}/temperature".format(id=self.unique_id)
        self.power_topic = "/climate/{id}/power".format(id=self.unique_id)
        
        ac_unit_attributes = {
            # "schema": "json",
            "name": self.unit_name,
            "unique_id": self.unique_id,
            "send_if_off": True,
            "mode_command_topic": self.mode_topic,
            "fan_mode_command_topic": self.fan_mode_topic,
            "temperature_command_topic": self.temperature_topic,
            "max_temp": 30,
            "min_temp": 17,
            "fan_modes": FAN_MODES,
            "modes": MODES + ["off"]
        }

        # Create/Update climate unit using mqtt discovery
        config_topic = "homeassistant/climate/{id}/config".format(id=self.entity_id)
        # self.call_service("mqtt/publish", topic=config_topic, payload=json.dumps(ac_unit_attributes))

        self.current_temperature = int(float(self.get_state(entity_id=self.entity_id, attribute="temperature")))
        self.current_fan_mode = self.get_state(entity_id=self.entity_id, attribute="fan_mode")
        self.current_mode = self.get_state(entity_id=self.entity_id, attribute="state")
        if self.current_mode == "off":
            self.current_mode = MODES[0]

        mqtt = self.get_plugin_api("MQTT")
        mqtt.listen_event(self.mode_callback, "MQTT_MESSAGE", topic=self.mode_topic)
        mqtt.listen_event(self.fan_mode_callback, "MQTT_MESSAGE", topic=self.fan_mode_topic)
        mqtt.listen_event(self.temperature_callback, "MQTT_MESSAGE", topic=self.temperature_topic)
        mqtt.listen_event(self.power_callback, "MQTT_MESSAGE", topic=self.power_topic)

        self.log("'{}' initialized.".format(self.entity_id))

    def mode_callback(self, event_name, data, kwargs):
        mode = data["payload"]
        mode_i = MODES.index(self.current_mode)
        if mode == "off":
            return # mode 'off' is handled by self.power_callback

        while self.current_mode != mode:
            mode_i += 1
            self.current_mode = MODES[mode_i % len(MODES)]
            self.send_command(COMMANDS["mode"], "Mode: {}".format(self.current_mode))

    def fan_mode_callback(self, event_name, data, kwargs):
        fan_mode = data["payload"]
        mode_i = FAN_MODES.index(self.current_fan_mode)
        if self.current_mode not in ["cool", "fan_only"]:
            return # Only enabled for cool mode

        self.send_command(COMMANDS["fan_mode"], "Cycling fan mode")
        # while self.current_fan_mode != fan_mode:
        #     mode_i += 1
        #     self.current_fan_mode = FAN_MODES[mode_i % len(FAN_MODES)]
        #     self.send_command(COMMANDS["fan_mode"], "Fan mode: {}".format(self.current_fan_mode))

    def temperature_callback(self, event_name, data, kwargs):
        temperature = int(float(data["payload"]))
        step = 1 if self.current_temperature < temperature else -1
        cmd = COMMANDS["increase_temp"] if step == 1 else COMMANDS["decrease_temp"]

        while self.current_temperature != temperature:
            self.current_temperature += step
            self.send_command(cmd, "Temperature: {}".format(self.current_temperature))

    def power_callback(self, event_name, data, kwargs):
        power = data["payload"]
        self.send_command(COMMANDS["power"], "Power: {}".format(power))

    def send_command(self, command, log_message):
        self.log(log_message)
        self.call_service("rest_command/assistant_relay", command=command)
        # self.log("assistant_relay: '{}'".format(command))
        time.sleep(SLEEP_THRESHOLD)
