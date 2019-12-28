import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import { today } from "user-activity";
import { HeartRateSensor } from "heart-rate";
import { BodyPresenceSensor } from "body-presence";
import { display } from "display";
import { me as appbit } from "appbit";

const endingByCount = (count, ending) =>
  count === 1 ? `${count} ${ending}` : `${count} ${ending}s`;

const zeroPad = i => (i < 10 ? `0${i}` : i);

const bg = document.getElementById("bg");
const clockHours = document.getElementById("clock-hours");
const clockMinutes = document.getElementById("clock-minutes");
const infoButton = document.getElementById("info-button");
const infoLabel = document.getElementById("info-label");

let screens = [];
let screenIndex = 0;
let screenId = "";
let attachScreen;
let updateScreen;
let detachScreen;

function attachHeartScreen() {
  clock.granularity = "minutes";
}

function detachHeartScreen() {}

if (appbit.permissions.granted("access_activity")) {
  function updateStepsScreen() {
    infoLabel.text = endingByCount(today.adjusted.steps, "step");
  }

  function attachStepsScreen() {
    clock.granularity = "seconds";
    updateStepsScreen();
  }

  function detachStepsScreen() {}

  function updateDistanceScreen() {
    infoLabel.text = `${(today.adjusted.distance / 1000).toFixed(1)} km`;
  }

  function attachDistanceScreen() {
    clock.granularity = "minutes";
    updateDistanceScreen();
  }

  function detachDistanceScreen() {}

  screens.push([
    "step",
    attachStepsScreen,
    updateStepsScreen,
    detachStepsScreen
  ]);
  screens.push([
    "dist",
    attachDistanceScreen,
    updateDistanceScreen,
    detachDistanceScreen
  ]);
}

if (appbit.permissions.granted("access_heart_rate") && HeartRateSensor) {
  const hrm = new HeartRateSensor({ frequency: 1 });
  const body = BodyPresenceSensor ? new BodyPresenceSensor() : null;

  function onHrmRead() {
    infoLabel.text = `${hrm.heartRate} bpm`;
  }

  function updateHeartScreen() {}

  let heartScreenAttached = false;

  function attachHeartScreen() {
    if (heartScreenAttached) return;
    heartScreenAttached = true;
    clock.granularity = "minutes";
    infoLabel.text = "";
    hrm.addEventListener("reading", onHrmRead);
    hrm.start();
  }

  function detachHeartScreen() {
    heartScreenAttached = false;
    infoLabel.text = "";
    hrm.removeEventListener("reading", onHrmRead);
    hrm.stop();
  }

  screens.push([
    "heart",
    attachHeartScreen,
    updateHeartScreen,
    detachHeartScreen
  ]);
}

function updateClock(event) {
  const today = event.date;
  const hours = today.getHours();

  clockHours.text =
    preferences.clockDisplay == "12h"
      ? zeroPad(hours % 12 || 12)
      : zeroPad(hours);
  clockMinutes.text = zeroPad(today.getMinutes());

  updateScreen();
}

function changeScreen() {
  if (detachScreen) detachScreen();
  screenIndex = (screenIndex + 1) % screens.length;
  const [id, attach, update, detach] = screens[screenIndex];
  bg.href = `snoop-bg-${id}.png`;
  screenId = id;
  attachScreen = attach;
  updateScreen = update;
  detachScreen = detach;
  attachScreen();
}

changeScreen();

display.addEventListener("change", () => {
  display.on ? attachScreen() : detachScreen();
});

clock.granularity = "minutes";
clock.ontick = updateClock;

infoButton.onclick = changeScreen;

if (BodyPresenceSensor) {
  const body = new BodyPresenceSensor();
  body.addEventListener("reading", () => {
    if (screenId == "heart") body.present ? attachScreen() : detachScreen();
  });
  body.start();
}
