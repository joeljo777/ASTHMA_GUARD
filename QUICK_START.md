# Asthma Guard — Quick Start (5 minutes)

**Prerequisite:** Have your Firebase project credentials and ESP32 board flashed with the provided firmware.

---

## 1. Firebase Config
Copy your Firebase Web config into `webapp/public/firebase-config.js`:

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

---

## 2. Deploy Dashboard
```powershell
npm install -g firebase-tools
cd webapp
firebase login
firebase init hosting
firebase deploy --only hosting
```

→ You'll get a `https://your-project.web.app` URL.

---

## 3. Flash ESP32
1. Set `WIFI_SSID` and `WIFI_PASS` in `arduino/esp32/asthma_guard.ino`
2. Use Arduino IDE (Tools → Board: ESP32 Dev Module, select Port, Upload)
3. Check Serial Monitor for: `WiFi connected: 192.168.x.x`

---

## 4. Connect
1. Open the deployed dashboard
2. In the **WebSocket URL** field, enter: `ws://192.168.x.x:81` (replace x.x with your ESP32 IP)
3. Click **Connect**
4. Watch real-time data and Firestore logging

---

**Done!** 🎉 For detailed setup, see [SETUP.md](SETUP.md).
