# Home Automation with Home Assistant

<a href="https://www.buymeacoffee.com/ericmatte" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>

Home automation is a great way to enable the full potential of your house, and [Home Assistant](https://www.home-assistant.io/) is one of the simplest way to do it!

So this project is a summary of what I did to control my house.
I also have left my configuration files to give you some examples.

## HACS Projects

- [ad-media-lights-sync](https://github.com/ericmatte/ad-media-lights-sync): Synchronize the color of RGB lights with the thumbnail of a media player

## Sub Projects

- [esphome](esphome): Small projects using ESP8266 devices
- archive (other sub-projects that have become obsolete)
  - [rf-transmitter-receiver](https://github.com/ericmatte/HomeAutomation/tree/first-home/archive/rf-transmitter-receiver): Scan/send RF signals
  - [google-home](https://github.com/ericmatte/HomeAutomation/tree/first-home/archive/google-home): Convert your Raspberry Pi into a DIY Google Home
  - [motion](https://github.com/ericmatte/HomeAutomation/tree/first-home/archive/motion): Connect a USB camera to home assistant
  - [rpi-mqtt-leds](https://github.com/ericmatte/HomeAutomation/tree/first-home/archive/rpi-mqtt-leds)
  - [toggle-lights-with-windows-connection](https://github.com/ericmatte/HomeAutomation/tree/first-home/archive/toggle-lights-with-windows-connection)
  - [esp-mqtt-rgb-led](https://github.com/corbanmailloux/esp-mqtt-rgb-led): MQTT RGB LEDs Using JSON for Home Assistant

## The Power of Home Assistant

To see what you can do with Home Assistant on your Raspberry Pi, navigate to their list of components:

[https://home-assistant.io/components/](https://home-assistant.io/components/)

## Notes

### Xiaomi Roborock

In order to be able to connect the Roborock to Home Assistant, you first need to get the token.

This can be done by downloading the version 5.4.49 of the Mi Home App, and then checking the logs:

- https://www.home-assistant.io/components/vacuum.xiaomi_miio/#retrieving-the-access-token
- https://www.apkmirror.com/apk/xiaomi-inc/mihome/mihome-5-5-49-release/mi-home-5-5-49-android-apk-download/download/
