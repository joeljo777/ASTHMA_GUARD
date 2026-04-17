# Asthma Guard — Complete Setup Guide

This guide walks you through configuring Firebase, deploying the web dashboard, and flashing the ESP32 firmware.

---

## Part 1: Firebase Project Setup

### 1.1 Create a Firebase Project
1. Go to [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Click **Add Project**, follow the wizard.
3. Name it (e.g., `asthma-guard`), enable Google Analytics if desired, then **Create Project**.

### 1.2 Register a Web App
1. In your Firebase project, click **+Add app** → **Web** `</>`
2. Register as `Asthma Guard Dashboard`
3. Firebase will generate a config snippet. **Copy the entire `const firebaseConfig = {...}` object.**

### 1.3 Enable Firestore
1. In the Firebase console, go to **Build** → **Firestore Database**
2. Click **Create database**
3. Start in **Test mode** (allows read/write without auth for now; move to **Production** rules later)
4. Choose a region (e.g., `us-central1`) and **Create**

### 1.4 Paste Config into `firebase-config.js`
Edit `webapp/public/firebase-config.js`:

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};
```

---

## Part 2: Web Dashboard Deployment

### 2.1 Install Firebase CLI
```powershell
npm install -g firebase-tools
```

### 2.2 Initialize Hosting (one-time)
From the `webapp` folder:
```powershell
cd webapp
firebase login
firebase init hosting
```

**Prompts:**
- Project: select your Firebase project
- Public directory: `public`
- Configure as SPA: `y`
- Overwrite `public/index.html`: `n` (keep ours)

### 2.3 Deploy to Firebase Hosting
```powershell
firebase deploy --only hosting
```

After success, you'll see a URL like `https://asthma-guard-xxxxx.web.app/`. Open it in a browser.

### 2.4 Local Testing (Optional)
To test locally before deploying:
```powershell
firebase serve --only hosting
```
Open `http://localhost:5000` in your browser.

---

## Part 3: Arduino IDE & ESP32 Setup

### 3.1 Install Arduino IDE
Download from [https://www.arduino.cc/en/software](https://www.arduino.cc/en/software)

### 3.2 Add ESP32 Board Support
1. File → Preferences → Additional Boards Manager URLs
2. Add: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Tools → Board Manager → Search `esp32` → Install (by Espressif Systems)

### 3.3 Install Required Libraries
1. Sketch → Include Library → Manage Libraries
2. Search and install:
   - **DHT sensor library** (by Adafruit)
   - **WebSockets** (by Markus Sattler)

### 3.4 Configure the Sketch
Edit `arduino/esp32/asthma_guard.ino`:
- Change `WIFI_SSID` and `WIFI_PASS` to your network credentials
- Verify pin assignments match your wiring (DHT22 on GPIO4, ADC on GPIO34/35, MOSFET on GPIO18)

### 3.5 Flash the Board
1. Plug ESP32 into USB
2. Tools → Board: `ESP32 Dev Module`
3. Tools → Port: select your COM port
4. Sketch → Upload

Monitor the upload in the **Serial Monitor** (Tools → Serial Monitor, 115200 baud). You should see:
```
WiFi connected: 192.168.x.x
```

---

## Part 4: Connect Dashboard to ESP32

### 4.1 Find ESP32 IP Address
In the Serial Monitor, look for the line like `WiFi connected: 192.168.1.50`

### 4.2 Open Dashboard
1. Go to your deployed Firebase Hosting URL (or local `http://localhost:5000`)
2. In the **"WebSocket URL"** field, enter: `ws://192.168.1.50:81`
3. Click **Connect**
4. You should see:
   - Status changes to **Connected**
   - Real-time data (PM2.5, Gas, Temp, Humidity, Fan %)
   - Historical PM2.5 chart (last 30 updates)

### 4.3 Test Manual Override
- Click **"Manual Override: OFF"** to toggle
- Fan should respond to the manual command
- Check Serial Monitor on ESP32 for debug output

---

## Part 5: Verify Firestore Data

1. Go to Firebase Console → **Firestore Database**
2. You should see a `readings` collection with documents containing timestamps and sensor data
3. Each document auto-created when the dashboard receives updates from ESP32

---

## Part 6: Troubleshooting

### Dashboard won't connect to ESP32
- Confirm ESP32 is on the same network (check Serial Monitor for IP)
- Ensure you're using the correct format: `ws://192.168.x.x:81` (note: `ws://`, not `http://`)
- Check firewall isn't blocking port 81

### Firestore data not appearing
- Open Firebase Console → Firestore → ensure database is in **Test mode**
- Open browser DevTools (F12) → Console to check for Firebase initialization errors
- Verify `firebase-config.js` has the correct credentials

### ESP32 won't connect to WiFi
- Double-check SSID/PASS in the Arduino sketch
- Ensure network is 2.4GHz (ESP32 doesn't support 5GHz)
- Check Serial Monitor for errors

### DHT22 or sensors reading as NaN
- Verify GPIO pins and wiring match the sketch
- Check pull-up resistors (DHT22 needs 10k on data line)
- Restart ESP32 and monitor Serial output

---

## Part 7: Next Steps / Production

1. **Firestore Security Rules**: Move from Test mode to Production rules (require auth or limit to your IP)
2. **Backend Cloud Function** (optional): Create a Firebase Cloud Function to store readings server-side if not using the web UI
3. **Mobile App**: Extend the dashboard to React Native or Flutter for mobile access
4. **OTA Updates**: Implement Over-The-Air firmware updates for the ESP32

---

Enjoy your Asthma Guard Dashboard!
