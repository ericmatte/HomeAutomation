#!/usr/bin/env python

from __future__ import print_function

import argparse
import os.path
import json
import requests
import secrets

import google.oauth2.credentials
import RPi.GPIO as GPIO
from google.assistant.library import Assistant
from google.assistant.library.event import EventType
from google.assistant.library.file_helpers import existing_file

USE_GPIO = False
API_URL = secrets.domain+'/api/{command}?api_password='+secrets.api_password

class BindingLight:

    def __init__(self, light_id, listen_color):
        self.light_id = light_id
        self.listen_color = listen_color
        self.previous_state = None

    def __post(self, state, data):
        data["entity_id"] = self.light_id
        u = API_URL.format(command='services/light/turn_'+state)
        print(u)
        print(data)
        r = requests.post(u, json=data)
        print(r)

    def get_current_state(self):
        return requests.get(API_URL.format(command='states/'+self.light_id)).json()

    def restore_state(self):
        current_state = self.get_current_state()
        if current_state["attributes"].get("rgb_color", [255, 255, 255]) != self.listen_color:
            print("no change to state")
            return # Exit if light was changed not by the software

        if self.previous_state is None or self.previous_state.get('state') != "on":
            self.__post('off', {"transition": 1})
            print("turned off")
        else:
            self.__post('on', {
                "rgb_color": self.previous_state["attributes"].get("rgb_color", [255, 255, 255]),
                # "transition": 0  # Not working as of HA v0.66.0
            })
            print("turned on")

    def toggle(self, state, transition=0):
        print('self.listen_color')
        print(self.listen_color)
        self.__post(state, {"rgb_color": self.listen_color, "transition": transition})

    def flash(self):
        self.__post('on', {"rgb_color": [255,0,0], "effect": "Flash"})

    def colorfade(self):
        self.__post('on', {"effect": "ColorFade Fast"})


light = BindingLight(secrets.light_id, [36,255,255])

if USE_GPIO:
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(25, GPIO.OUT)

def on_conversation_started():
    if USE_GPIO:
        GPIO.output(25,True)

    light.previous_state = light.get_current_state()
    light.toggle('on')

def on_recognizing_speech(text):
    light.colorfade()
    requests.post(API_URL.format(command='services/mqtt/publish'),
        json={"retain": "True", "topic": secrets.google_assistant_notification_id, "payload": text})

def on_misunderstanding():
    light.flash()

def on_responding_started():
    pass

def on_conversation_finished():
    if USE_GPIO:
        GPIO.output(25, False)

    light.restore_state()

def process_event(event):
    """Pretty prints events.
    Prints all events that occur with two spaces between each new
    conversation and a single space between turns of a conversation.
    Args:
        event(event.Event): The current event to process.
    """
    print(event)

    if event.type == EventType.ON_CONVERSATION_TURN_STARTED:
        on_conversation_started()

    if event.type == EventType.ON_RECOGNIZING_SPEECH_FINISHED:
        on_recognizing_speech(event.args['text'])

    if event.type == EventType.ON_CONVERSATION_TURN_TIMEOUT:
        on_misunderstanding()

    if event.type == EventType.ON_RESPONDING_STARTED:
        on_responding_started()

    if (event.type == EventType.ON_CONVERSATION_TURN_FINISHED and
            event.args and not event.args['with_follow_on_turn']):
        on_conversation_finished()

    print()

def main():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument('--credentials', type=existing_file,
                        metavar='OAUTH2_CREDENTIALS_FILE',
                        default=os.path.join(
                            os.path.expanduser('/home/pi/.config'),
                            'google-oauthlib-tool',
                            'credentials.json'
                        ),
                        help='Path to store and read OAuth2 credentials')
    args = parser.parse_args()
    with open(args.credentials, 'r') as f:
        credentials = google.oauth2.credentials.Credentials(token=None,
                                                            **json.load(f))

    with Assistant(credentials, "Pi-Assistant") as assistant:
        for event in assistant.start():
            process_event(event)


if __name__ == '__main__':
    main()
