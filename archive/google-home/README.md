*The Google Assistant Library for Python is deprecated as of June 28th, 2019*

The new method (which is not compatible with this code):
https://developers.google.com/assistant/sdk/guides/service/python/

# Install Google Home Into Your Raspberry Pi

## Tutorial

https://www.makeuseof.com/tag/diy-google-home-assistant-raspberry-pi/


## Installation

```
python3 -m venv google_env
pip install -r requirements.txt
```

## Google

https://developers.google.com/assistant/sdk/reference/library/python/ (*Deprecated*)

### Other commands

#### Device registration
```
googlesamples-assistant-devicetool --project-id PROJECT_ID register-device --device DEVICE_NAME --model DEVICE_MODEL_ID --client-type SERVICE
```