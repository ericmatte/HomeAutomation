import appdaemon.plugins.hass.hassapi as hass
import sys
import threading
import io
from PIL import Image

if sys.version_info < (3, 0):
    from urllib2 import urlopen
else:
    from urllib.request import urlopen


# This script controls one or multiple RGB lights entity color based on the photo attribute of a media player entity
# Based on https://github.com/astone123/appdaemon-apps/blob/master/apps/music_lights.py
class tv_lights_sync(hass.Hass):
 
  def initialize(self):
    self.condition = self.args.get("condition")
    self.lights = self.args["lights"]
    self.listen_state(self.change_lights_color, self.args["media_player"], attribute = self.args.get("photo_attribute", "entity_picture"))

  def change_lights_color(self, entity, attribute, oldUrl, newUrl, kwargs):
    if newUrl != oldUrl and newUrl is not None and self.can_change_colors():
      rgb_colors = self.get_colors(newUrl)
      for i in range(len(self.lights)):
        threading.Thread(target=self.set_light_rgb, args=(self.lights[i], rgb_colors[i])).start()

  def can_change_colors(self):
    return self.condition is None or self.get_state(self.condition["entity"]) == self.condition["state"]

  def set_light_rgb(self, light, color):
    self.turn_on(light, rgb_color=color, brightness=255)

  def get_colors(self, url):
    fd = urlopen(url)
    f = io.BytesIO(fd.read())
    im = Image.open(f)
    palette = im.quantize(colors=len(self.lights)).getpalette()
    return self.extract_colors(palette, len(self.lights))

  def extract_colors(self, palette, colors):
    return [palette[i:i + 3] for i in range(0, colors * 3, 3)]