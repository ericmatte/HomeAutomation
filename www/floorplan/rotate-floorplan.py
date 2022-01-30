import yaml

DIR = "/config/www/floorplan"

def invert(str, offset = 0):
    return "{}%".format(100 - int(str.strip('%')) + offset)

def rotate(element):
    top = invert(element["style"]["left"], 2)
    left = element["style"]["top"]
    element["style"]["top"] = top
    element["style"]["left"] = left
    return element


with open(DIR+"/floorplan-90.yaml", "r") as stream:
    yml = yaml.safe_load(stream)

elements = yml["elements"]

rotated_floorplan = yml
rotated_floorplan["image"] = rotated_floorplan["image"].replace("90", "180")
rotated_floorplan["elements"] = [rotate(e) for e in rotated_floorplan["elements"]]

with open(DIR+'/floorplan-180.yaml', 'w') as file:
    file.write(yaml.dump(rotated_floorplan))