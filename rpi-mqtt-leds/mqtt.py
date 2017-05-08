import json
import paho.mqtt.client as mqtt
import paho.mqtt.publish as publish
from rgbled import RGBLed
import time

broker = '127.0.0.1'
topic = 'home-assistant/led-strip/'
rgb_led = RGBLed([22, 23, 24])  # [17, 18, 27]

# The callback for when the client receives a CONNACK response from the server.
def on_connect(client, userdata, flags, rc):
    print("Connected with result code "+str(rc))

    # Subscribing in on_connect() means that if we lose the connection and
    # reconnect then subscriptions will be renewed.
    client.subscribe(topic+'set')
    send_status()

# The callback for when a PUBLISH message is received from the server.
def on_message(client, userdata, msg):
    print(msg.topic+" "+str(msg.payload))

    params = json.loads(msg.payload.decode())
    rgb_led.set(params)
    send_status()

def send_status():
    client.publish(topic+'status', json.dumps(rgb_led.get_status()))

# Send messages in a loop
client = mqtt.Client("ha-client")
client.on_connect = on_connect
client.on_message = on_message

def connect():
    try:
        client.connect(broker)
    except:
        print('Broker server not available. Retrying in 5 seconds.')
        time.sleep(5)
        connect()
connect()

# Blocking call that processes network traffic, dispatches callbacks and
# handles reconnecting.
# Other loop*() functions are available that give a threaded interface and a
# manual interface.
client.loop_forever()