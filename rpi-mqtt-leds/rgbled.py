import RPi.GPIO as GPIO
import colorsys
import time
from threading import Thread
import threading

class RGBLed:

    def __init__(self, rgb_pins):
        # initial color
        self.state = 'off'
        self.color = [255, 255, 255]
        self.brightness = 255
        self.effect = 'White'

        self.rgb = []

        # GPIO Setup.
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)

        for i in range(3):
            GPIO.setup(rgb_pins[i], GPIO.OUT)
            self.rgb.append(GPIO.PWM(rgb_pins[i], 100))
        for i in range(3):
            self.rgb[i].start(0)

        # Rainbow thread setup
        self.rainbow_hue = 0.0
        self.rainbow_thread_signal = threading.Event()
        self.rainbow_thread = Thread(target=self.rainbow)
        self.rainbow_thread.start()


    def set_rgb(self, rgb):
        for i in range(3):
            self.rgb[i].ChangeDutyCycle(rgb[i])

    def set(self, params):
        # {"state": "off"}
        # {"state": "on"}
        # {"state": "on", "color": [37, 186, 255]}
        # {"state": "on", "brightness": 136}
        # {"state": "on", "effect": "Rainbow"}
        self.state = params.get('state', self.state)
        self.color = params.get('color', self.color)
        self.brightness = params.get('brightness', self.brightness)
        self.effect = params.get('effect', self.effect)

        self.set_effect()

        if self.state == 'on':
            # Run only of if rainbow thread not running
            if not self.rainbow_thread_signal.is_set():
                # Convert 0-255 range to 0-100.
                rgb = [(x / 255.0) * 100 for x in self.color]
                # Add brightness
                rgb = [x * (self.brightness / 255.0) for x in rgb]
                # Set led color
                self.set_rgb(rgb)
        else:
            self.set_rgb([0, 0, 0])
            # GPIO.cleanup()

    def set_effect(self):
        if self.effect == 'White':
            self.color = [255, 255, 255]
        elif self.effect == 'Halogen':
            self.color = [255, 147, 41]
        
        if self.effect == "Rainbow" and self.state == 'on':
            self.rainbow_hue = 0.0
            self.rainbow_thread_signal.set()
        else:
            self.rainbow_thread_signal.clear()

    def get_status(self):
        # {"state": "on", "color": [246, 245, 206], "brightness": 186, "effect": "rainbow"}
        state = {
            "state": self.state,
            "color": self.color,
            "brightness": self.brightness,
            "effect": self.effect
        }
        return state

    # Thread function
    def rainbow(self):
        while True:
            self.rainbow_thread_signal.wait()
            rgb = colorsys.hsv_to_rgb(self.rainbow_hue, 1, self.brightness / 255.0)
            self.set_rgb([x * 100 for x in rgb])
            
            self.rainbow_hue += 0.0001
            if self.rainbow_hue > 1.0:
            	self.rainbow_hue = 0.0
            time.sleep(0.01)
