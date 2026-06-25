import yaml

DIR = "/config/www/floorplan"

def invert_percent(str, offset = 0):
    return "{}%".format(100 - float(str.strip('%')) + offset)

def rotate(element):
    if element["type"] == "icon":
        element["tap_action"]["navigation_path"] = element["tap_action"]["navigation_path"].replace("180", "90")
        return element

    top = invert_percent(element["style"]["left"], 2)
    left = element["style"]["top"]
    element["style"]["top"] = top
    element["style"]["left"] = left
    return element

def invert(element):
    if element["type"] == "icon":
        return element

    element["style"]["top"] = invert_percent(element["style"]["top"], 2)
    element["style"]["left"] = invert_percent(element["style"]["left"], 1)
    return element


with open(DIR+"/floorplan-90.yaml", "r") as stream:
    yml = yaml.safe_load(stream)

elements = yml["elements"]

rotated_floorplan = yml
rotated_floorplan["image"] = rotated_floorplan["image"].replace("90", "180")
rotated_floorplan["elements"] = [rotate(e) for e in rotated_floorplan["elements"]]

with open(DIR+'/floorplan-180.yaml', 'w') as file:
    file.write(yaml.dump(rotated_floorplan))


rotated_floorplan["image"] = rotated_floorplan["image"].replace("180", "360")
rotated_floorplan["elements"] = [invert(e) for e in rotated_floorplan["elements"]]

with open(DIR+'/floorplan-360.yaml', 'w') as file:
    file.write(yaml.dump(rotated_floorplan))