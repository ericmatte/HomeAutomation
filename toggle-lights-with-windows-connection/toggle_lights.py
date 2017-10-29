import requests
import sys
import secrets

hass = secrets.domain+'/api/services/{type}/{state}?api_password='+secrets.api_password

args = sys.argv[1:]
state = args[0] if len(args) != 0 else 'toggle' # 'turn_off'

if state in ['turn_on', 'turn_off', 'toggle']:
    requests.post(hass.format(type='switch', state=state), json={"entity_id": "switch.eric_desktop"})
