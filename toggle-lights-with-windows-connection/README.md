# Toggle Lights When You Connect/Disconnect from Your Computer

Home Assistant accepts post requests for controlling your components.
We can use this to send an action to trigger the lights state of our desktop computer lights when connecting to Windows.

## Getting Started

Modify the simple script **toggle_lights.py** to matches your lights and your Home Assistant ip.

## Create New Tasks

On Windows, open the Task Scheduler.

From there, you will create two tasks. Theses are the two **triggers** you will need:
- **On local disconnect from any user session**
- **On local connection from any user session**

On the **actions** tab, add a new action.
- **Program/script**: The full path to your pythonw.exe
*Note: We use here pythonw.exe instead of python.exe because it won't show a command line prompt when the script runs.*
- **Add arguments**: The full path to your script + the state for the lights
*ex.: D:\HomeAutomation\toggle-lights-with-windows-connection\toggle_lights.py on*
