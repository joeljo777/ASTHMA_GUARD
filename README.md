<<<<<<< HEAD
# ASTHMA_GUARD
An ESP32-powered wearable air purifier that monitors AQI, dust, and gases in real-time, featuring a closed-loop filtration system and a live web dashboard.
=======
# Asthma Guard — Web Dashboard + ESP32 Firmware

This workspace contains a complete web dashboard (Firebase-integrated), ESP32 Arduino firmware, and deployment guides for the Asthma Guard project.

## 📁 Project Structure

### Web Dashboard
- [webapp/public/index.html](webapp/public/index.html) — Real-time UI with gauges, charting, and manual controls
- [webapp/public/app.js](webapp/public/app.js) — WebSocket client & Firestore integration
- [webapp/public/styles.css](webapp/public/styles.css) — Responsive styling
- [webapp/public/firebase-config.js](webapp/public/firebase-config.js) — Firebase credentials placeholder

### ESP32 Firmware
- [arduino/esp32/asthma_guard.ino](arduino/esp32/asthma_guard.ino) — Sensor readings, PWM control, WebSocket server

### Documentation
- [QUICK_START.md](QUICK_START.md) — Get running in 5 minutes
- [SETUP.md](SETUP.md) — Complete Firebase & Arduino setup guide
- [HARDWARE_WIRING.md](HARDWARE_WIRING.md) — Pin assignments & circuit reference

---

## 🚀 Get Started

**For the impatient:** Follow [QUICK_START.md](QUICK_START.md) (5 min).

**For the thorough:** Read [SETUP.md](SETUP.md) (comprehensive step-by-step).

---

## Features

✅ Real-time air quality gauges (PM2.5, Gas, Temp, Humidity)  
✅ Historical PM2.5 line chart (last 30 readings)  
✅ Manual fan override toggle  
✅ Firebase Firestore data logging  
✅ WebSocket-based updates (no page refresh)  
✅ 3-tier state machine (Safe → Warning → Danger)  
✅ Responsive mobile-friendly design

---

## Architecture

```
Ambient Air → [MQ-135, GP2Y1010, DHT22] → ESP32 (WebSocket Server)
                                              ↓
                    ┌─────────────────────────┼
                    ↓                         ↓
                Dashboard (Real-time)    Firestore (Cloud DB)
>>>>>>> a16c5fe (Initial commit: project scaffold, frontend, docs, and stub firmware)
