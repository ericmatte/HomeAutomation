# Raspberry Pi MQTT controlled Leds

This small project allow you to control leds using the software GPIOs directly onto the Raspberry Pi, with Home Assistant.

## Getting Started

Simply edit mqtt.py.
- Choose the broker correspondind to Home Assistant (127.0.0.1 if on the same Raspberry Pi).
- Select a topic to connect with.
- You can now run the code.

### Automatically start the script at boot

To do so, you will need to create a service for the script.
Please refer to [this great tutorial](https://www.digitalocean.com/community/tutorials/how-to-use-systemctl-to-manage-systemd-services-and-units) by Digital Ocean.

Simply copy the script **ledstrip.service** into **/etc/systemd/system/**.
Into this file, you can specify a path for the python to execute. I recommend to use a virtualenv for python (mine is called **mqtt_venv**).

### Useful commands

Reload the configuration
```
sudo systemctl daemon-reload
```

Enable the service to boot with the Pi
```
sudo systemctl enable ledstrip.service
```

Start the service
```
sudo systemctl start ledstrip.service
```

Check the status of the service
```
sudo systemctl status ledstrip.service
```