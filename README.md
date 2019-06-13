# Home Automation with Home Assistant

Home automation is a great way to enable the full potential of your house, and [Home Assistant](https://www.home-assistant.io/) is one of the simplest way to do it!

So this project is a summary of what I did to control my house.
I also have left my configuration files to give you some examples.

## Sub Projects

- [appdaemon](appdaemon): TV lights sync
- [esphome](esphome): Small projects using ESP8266
- [google-home](google-home): Convert your Raspberry Pi into a DIY Google Home
- [homeassistant](homeassistant): My home assistant configuration
- [motion](motion): Connect a USB camera to home assistant
- [rf-transmitter-receiver](rf-transmitter-receiver): Scan/send RF signals
- archive (other micro-projects that have become obsolete)
    - [rpi-mqtt-leds](archive/rpi-mqtt-leds)
    - [toggle-lights-with-windows-connection](archive/toggle-lights-with-windows-connection)


## Other interesting projects

- [esp-mqtt-rgb-led](https://github.com/corbanmailloux/esp-mqtt-rgb-led): MQTT RGB LEDs Using JSON for Home Assistant


## The Power of Home Assistant

To see what you can do with Home Assistant on your Raspberry Pi, navigate to their list of components:

[https://home-assistant.io/components/](https://home-assistant.io/components/)

## Useful commands

Restart server
```
$ sudo systemctl restart home-assistant
```

View logs
```
$ sudo journalctl -u home-assistant@homeassistant.service -f
```
