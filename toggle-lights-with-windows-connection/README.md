# Toggle Lights When You Connect/Disconnect from Your Computer

Home Assistant accepts post requests for controlling your components.
We can use this to send an action to turn on the lights around our desktop computer when connecting on Windows.

## Getting Started

Modify the simple script **toggle_lights.py** to matches your lights and your Home Assistant ip.

## Create New Tasks

On Windows, open the Task Scheduler.

From there, create a task and give it name.

Go into the **Triggers** tab, and add a new trigger.
Before sending the post request to Home Assistant, we need to wait for the computer to connect to the internet. That is the trigger we will use.
To trigger the task on connection to internet, use theses settings:
- **Begin the task:** On a event
- **Basic:** Checked
- **Log:** Microsoft-Windows-NetworkProfile/Operational
- **Source:** NetworkProfile
- **Event ID:** 10000

On the **Actions** tab, add a new action.
- **Program/script**: The full path to your pythonw.exe
*Note: We use here pythonw.exe instead of python.exe because it won't show a command line prompt when the script runs.*
- **Add arguments**: The full path to your script + the state for the lights
*ex.: D:\HomeAutomation\toggle-lights-with-windows-connection\toggle_lights.py on*
