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

# We are binding Google Home to the kitchen rgb lights
light_id = 'light.kitchen_rgb_lights'
light_url = secrets.domain+'/api/services/{domain}/{service}?api_password='+secrets.api_password
light_state_url = secrets.domain+'/api/states/{entity_id}?api_password='+secrets.api_password

class GlobalVariables():
    user_request_kitchen_ligths = False
    previous_state = None

    def reset(self):
        self.user_request_kitchen_ligths = False
        self.previous_state = None


global_vars = GlobalVariables()

GPIO.setmode(GPIO.BCM)
GPIO.setup(25, GPIO.OUT)

def on_conversation_started():
    GPIO.output(25,True)

    if global_vars.previous_state is None:
        global_vars.previous_state = requests.get(light_state_url.format(entity_id=light_id)).json()

    requests.post(light_url.format(domain='light', service='turn_on'), json={"entity_id": light_id, "rgb_color": [0,255,255], "transition": 0})

def on_recognizing_speech(text):
    if 'kitchen' in text:
        global_vars.user_request_kitchen_ligths = True

    requests.post(secrets.domain+'/api/services/mqtt/publish?api_password='+secrets.api_password,
        json={"retain": "True", "topic": "home-assistant/google-home", "payload": text})

def on_misunderstanding():
    requests.post(light_url.format(domain='light', service='turn_on'), json={"entity_id": light_id, "rgb_color": [255,0,0], "effect": "Flash"})

def on_responding_started():
    requests.post(light_url.format(domain='light', service='turn_on'), json={"entity_id": light_id, "effect": "ColorFade Fast"})

def on_conversation_finished():
    GPIO.output(25, False)

    if not global_vars.user_request_kitchen_ligths:
        json_data = {"entity_id": light_id, "transition": 1}
        if global_vars.previous_state is None or global_vars.previous_state.get('state') != "on":
            service = 'turn_off'
        else:
            service = 'turn_on'
            json_data["brightness"] = global_vars.previous_state["attributes"].get("brightness", 255)
            json_data["rgb_color"] = global_vars.previous_state["attributes"].get("rgb_color", [255, 255, 255])

        requests.post(light_url.format(domain='light', service=service), json=json_data)
    global_vars.reset()

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

    with Assistant(credentials) as assistant:
        for event in assistant.start():
            process_event(event)


if __name__ == '__main__':
    main()
