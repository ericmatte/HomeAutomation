# Installation

https://appdaemon.readthedocs.io/en/latest/INSTALL.html

Clone this folder into `/home/pi/appdaemon`

## Appdaemon

```
$ python3 -m venv appdaemon_env
$ source appdaemon_env/bin/activate
$ sudo apt-get install libtiff5-dev zlib1g-dev libfreetype6-dev liblcms2-dev libwebp-dev libharfbuzz-dev libfribidi-dev tcl8.6-dev tk8.6-dev python-tk
$ pip3 install appdaemon Pillow
$ sudo chown -R pi:pi /home/pi/appdaemon
```

## Start at reboot

```
$ cp appdaemon@appdaemon.service /etc/systemd/system/appdaemon@appdaemon.service
$ sudo systemctl daemon-reload
$ sudo systemctl enable appdaemon@appdaemon.service --now
```

# Testing

You can test that the app is working like so:

```
(appdaemon_env) pi@hassbian:~/appdaemon $ python3 -m appdaemon.admain -c "/home/pi/appdaemon/conf/"
```