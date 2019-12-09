import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import * as util from "../common/utils";
import { me as appbit } from "appbit";
import { today } from "user-activity";
import { HeartRateSensor } from "heart-rate";
import { BodyPresenceSensor } from "body-presence";
import { display } from "display";
import { battery } from "power";

const endingByCount = (count, ending) =>
  count === 1
    ? `${count} ${ending}`
    : `${count} ${ending}s`

clock.granularity = "minutes";

const bg = document.getElementById("bg")
const clockHours = document.getElementById("clock-hours");
const clockMinutes = document.getElementById("clock-minutes");
const infoButton = document.getElementById("info-button");
const infoLabel = document.getElementById("info-label");
const batteryIndicator = document.getElementById("battery-indicator");

let screen = 0
let fns = []
let hrm

if (appbit.permissions.granted("access_heart_rate") && HeartRateSensor) {
  hrm = new HeartRateSensor({ frequency: 1 }) 
}

if (appbit.permissions.granted("access_activity")) {
  fns.push((element) => {
    const update = () => {
      element.text = endingByCount(today.adjusted.steps, "step")
    }
    return ["step", update, update]
  })
  fns.push((element) => {
    const update = () => {
      element.text = `${(today.adjusted.distance / 1000).toFixed(1)} km`
    }
    return ["dist", update, update]
  })
}

if (hrm) {
  let onScreen = false
  
  const start = () => {
    if (onScreen) hrm.start()
  }
  const stop = () => {
    hrm.stop()
  }
  
  if (BodyPresenceSensor) {
    const body = new BodyPresenceSensor();
    body.addEventListener("reading", () => {
      if (body.present) {
        start()
      } else {
        stop()
      }
    });
    body.start();
  }

  display.addEventListener("change", () => {
    display.on ? start() : stop();
  });

  fns.push((element) => {
    const onRead = () => {
      element.text = `${hrm.heartRate}`
    }
    return [
      "heart",
      () => {
        onScreen = true
        hrm.addEventListener("reading", onRead);
        start();
      },
      () => {},
      () => {
        onScreen = false
        hrm.removeEventListener("reading", onRead);
        stop();
      }
    ]
  })
}

let screenUpdateHandler
let screenDetachHandler

const update = () => screenUpdateHandler && screenUpdateHandler()
const detach = () => screenDetachHandler && screenDetachHandler()

infoButton.onclick = (event) => {
  if (screenDetachHandler) screenDetachHandler()
  screen = (screen + 1) % fns.length
  const [id, attach, update, detach] = fns[screen](infoLabel)
  bg.href = `snoop-bg-${id}.jpg`
  screenUpdateHandler = update
  screenDetachHandler = detach
  attach()
}

clock.ontick = (event) => {
  const today = event.date;
  const hours = today.getHours()
  
  clockHours.text = preferences.clockDisplay === "12h"
    ? util.zeroPad(hours % 12 || 12)
    : util.zeroPad(hours)
  clockMinutes.text = util.zeroPad(today.getMinutes())
  update()
}

const updateBatteryIndicator = () => {
  if (battery.charging) 
    batteryIndicator.style.fill = "#0DE111"
  else if (battery.chargeLevel > 40)
    batteryIndicator.style.fill = "#212121"
  else if (battery.chargeLevel > 20)
    batteryIndicator.style.fill = "#E1AC0D"
  else if (battery.chargeLevel > 10)
    batteryIndicator.style.fill = "#E12824"
  else
    batteryIndicator.style.fill = "#671015"
}

updateBatteryIndicator()
battery.onchange = updateBatteryIndicator