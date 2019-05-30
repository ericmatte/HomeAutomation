import appdaemon.plugins.hass.hassapi as hass
import sys
import threading

if sys.version_info < (3, 0):
    from urllib2 import urlopen
else:
    from urllib.request import urlopen

import io

from PIL import Image

# This script controls one or multiple RGB lights entity color based on the photo attribute of a media player entity
# Based on https://github.com/astone123/appdaemon-apps/blob/master/apps/music_lights.py
class tv_lights_sync(hass.Hass):
 
  def initialize(self):
    self.lights = self.args["lights"]
    self.listen_state(self.change_led_color, self.args["media_player"], attribute = self.args["photo_attribute"])

  def change_led_color(self, entity, attribute, old, new, kwargs):
    if new != old:
      rgb_colors = self.get_colors(self.args["ha_url"] + new)
      for i in range(len(self.lights)):
        threading.Thread(target=self.set_light_rgb, args=(self.lights[i], rgb_colors[i])).start()

  def set_light_rgb(self, light, color):
    self.turn_on(light, rgb_color=color)

  def get_colors(self, url):
    fd = urlopen(url)
    f = io.BytesIO(fd.read())
    im = Image.open(f)
    palette = im.quantize(colors=len(self.lights)).getpalette()
    return self.extract_colors(palette, len(self.lights))

  def extract_colors(self, palette, colors):
    return [palette[i:i + 3] for i in range(0, colors * 3, 3)]