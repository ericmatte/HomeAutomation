import requests
import sys

hass = 'http://192.168.1.199:8123/api/services/{type}/{state}?api_password=myHass'

args = sys.argv[1:]
state = args[0] if len(args) != 0 else 'toggle' # 'turn_off'

if state in ['turn_on', 'turn_off', 'toggle']:
    requests.post(hass.format(type='switch', state=state), json={"entity_id": "group.bedroom"})
    requests.post(hass.format(type='light', state=state), json={"entity_id": "group.bedroom"})
