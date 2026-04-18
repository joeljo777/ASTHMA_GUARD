# 🛡️ Asthma Guard - Smart Air Quality Monitor

A real-time air quality monitoring system with WiFi connectivity, web-based dashboard, and cloud integration using Firebase.

## 📋 Project Overview

Asthma Guard is an IoT-based air quality monitoring device that tracks temperature, humidity, gas pollution (MQ-135), and PM2.5 dust levels. The system provides real-time feedback through both a local HTTP dashboard and a cloud-based Firebase web application.

**Status:** ✅ Fully operational with local and cloud dashboards

---

## 🔧 Hardware Requirements

### Microcontroller
- **ESP32 Dev Module** (or compatible ESP32 board)
- USB cable for programming and power

### Sensors
| Sensor | Model | Function | GPIO |
|--------|-------|----------|------|
| Temperature/Humidity | DHT22 | Temp & Humidity | GPIO4 |
| Gas Quality | MQ-135 | Air Quality (ADC) | GPIO35 (ADC1_CH7) |
| Dust PM2.5 | GP2Y1010AU0F | Dust Detection | GPIO34 (ADC1_CH6) |
| Fan Control | IRLZ44N MOSFET | PWM Fan | GPIO18 |
| Alert | Buzzer | Audio Alert | GPIO23 |
| Dust LED | 20mA LED | Dust Sensor LED | GPIO25 |

### Power Supply
- 5V USB power for ESP32
- Additional 12V supply for fan (optional)

---

## 📦 Software Setup

### Prerequisites
- Arduino IDE (v1.8.13 or later)
- ESP32 Board Package installed
- USB drivers for CH340/CP2102 (depending on ESP32 variant)

### Required Libraries
Install via Arduino IDE → Sketch → Include Library → Manage Libraries:

```
- DHT Sensor Library by Adafruit
- WebServer (built-in with ESP32 core)
- WiFi (built-in with ESP32 core)
```

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/joeljo777/ASTHMA_GUARD.git
   cd ASTHMA_GUARD
   ```

2. **Open Arduino IDE:**
   - File → Open → `arduino/esp32/asthma_guard.ino`

3. **Configure WiFi credentials:**
   ```cpp
   const char* ssid = "DIC2026 - 1350";
   const char* password = "DIC@2026";
   ```

4. **Select Board:**
   - Tools → Board → esp32 → "ESP32 Dev Module"
   - Tools → Port → Select COM port for your ESP32

5. **Upload:**
   - Click Upload (Ctrl+U) or Sketch → Upload
   - Wait for "Upload complete" message

6. **Monitor Serial:**
   - Tools → Serial Monitor (Ctrl+Shift+M)
   - Baud rate: 115200
   - You should see the startup sequence with the ESP32 IP address

---

## 🖥️ Dashboard Access

### Option 1: Local Dashboard (Fastest)
Direct access from the ESP32:

```
http://172.18.100.152
```

**Features:**
- ✅ Real-time sensor readings
- ✅ Instant updates (no cloud delay)
- ✅ Works without internet
- ✅ Responsive design

### Option 2: Cloud Dashboard (Firebase)
Access from anywhere:

```
https://asthma-951fb.web.app
```

**Steps to connect:**
1. Open the Firebase dashboard
2. Enter ESP32 address: `http://172.18.100.152`
3. Click **CONNECT**
4. Data streams in real-time

**Features:**
- ✅ Access from anywhere
- ✅ Historical data logging to Firestore
- ✅ Analytics dashboard with time-range filters (24h/7d/30d)
- ✅ Real-time gauge visualization

---

## 🔌 API Endpoints

### Get Current Sensor Data
```http
GET http://172.18.100.152/api/data
```

**Response:**
```json
{
  "temp": 26.5,
  "hum": 52.0,
  "mq": 380,
  "dust": 0.000,
  "status": "GOOD AIR QUALITY"
}
```

### HTML Dashboard
```http
GET http://172.18.100.152/
```

Returns embedded HTML dashboard with live polling

---

## 📊 Data Format

### Temperature & Humidity (DHT22)
- **Temperature:** -40°C to 80°C, 0.5°C accuracy
- **Humidity:** 0-100% RH, 2% accuracy

### Gas Quality (MQ-135)
- **Raw ADC:** 0-4095 (12-bit)
- **Voltage:** 0-3.3V
- **Status:** GOOD (< 1000 ADC), BAD (> 1500 ADC)

### Dust PM2.5 (GP2Y1010)
- **Output Voltage:** 0-3.3V
- **Density:** mg/m³ (converted from voltage)
- **Baseline:** ~2.5V (no dust)

---

## 🚨 Alert System

### Fan Control
| Air Quality | Fan State |
|------------|-----------|
| GOOD | OFF |
| MODERATE | ON |
| BAD | ON |

### Buzzer
- **ON:** When fan is running (pulsing every 250ms)
- **OFF:** When air quality is good

---

## 📊 Sensor Readings (Mock Data Cycle)

The current firmware cycles through mock data for demonstration:

1. **Steps 1-3:** Good air quality (Normal operations)
2. **Steps 4-5:** Bad air quality (High pollution)
3. **Step 6:** Return to good quality (Improvement)
4. **Step 7:** Temperature spike (Uncomfort alert)
5. **Step 8+:** Return to baseline (Cycle repeats)

**Update Interval:** 4 seconds

---

## 🔌 Hardware Connections

```
ESP32 Pin    │ Component      │ Function
─────────────┼────────────────┼─────────────────
GPIO4        │ DHT22 Data     │ Temperature/Humidity
GPIO35 (A7)  │ MQ-135 ADC     │ Gas Sensor Input
GPIO34 (A6)  │ GP2Y1010 ADC   │ Dust Voltage Input
GPIO25       │ GP2Y1010 LED   │ Dust LED Control
GPIO18       │ IRLZ44N Gate   │ PWM Fan Control
GPIO23       │ Buzzer +       │ Audio Alert
GND          │ All GND pins   │ Ground reference
5V/3.3V      │ Sensor Power   │ Power distribution
```

---

## 📡 WiFi Configuration

The device automatically connects to:
- **SSID:** `DIC2026 - 1350`
- **Password:** `DIC@2026`

**To change WiFi:**
Edit `asthma_guard.ino`:
```cpp
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";
```

---

## 🐛 Known Issues & Limitations

### Current Status
- ✅ WiFi connectivity working
- ✅ HTTP API endpoints responding
- ✅ Local dashboard functional
- ✅ CORS headers enabled for cloud access
- ✅ Mock data cycling for demonstration

### Limitations
- Mock data for testing (no real sensor reading)
- DHT22 library present but not actively reading
- No WebSocket connections (using HTTP polling instead)
- No authentication/user management (future feature)

---

## 🔄 Serial Monitor Output

When powered on, you'll see:
```
========== ASTHMA GUARD STARTUP ==========
1. Sensors initialized
2. Connecting to WiFi: DIC2026 - 1350
3. WiFi connected! IP: 172.18.100.152
4. HTTP server ready (port 80)

========== SUCCESS ==========
OPEN BROWSER: http://172.18.100.152
=========================================

========== SENSOR READINGS ==========
Temperature: 26.5 C
Humidity: 52.0 %
Room Status: COMFORTABLE
MQ-135 Raw: 380 | Air Quality: GOOD
Dust Density: 0.000 mg/m3 | Dust Level: GOOD
Overall Air Status: GOOD AIR QUALITY
Fan State: OFF
=====================================
```

---

## 🚀 Deployment

### Local Testing
Device IP assigned by DHCP on local network.

### Cloud Deployment
Firebase project: `asthma-951fb`
- Hosting: https://asthma-951fb.web.app
- Database: Firestore (readings collection)

---

## 📁 Project Structure

```
ASTHMA_GUARD/
├── arduino/
│   └── esp32/
│       └── asthma_guard.ino        # ESP32 firmware
├── webapp/
│   ├── public/
│   │   ├── index.html              # Main dashboard UI
│   │   ├── app.js                  # Real-time polling logic
│   │   ├── styles.css              # Responsive styling
│   │   └── firebase-config.js       # Firebase config
│   └── firebase.json               # Firebase deployment config
├── README.md                         # This file
└── .gitignore
```

---

## 🔐 Security Notes

- ✅ CORS headers enabled for cloud access
- ✅ No authentication in local mode (LAN only)
- ⚠️ Credentials stored in plain text (local development)
- 🔒 Production: Use environment variables for WiFi credentials

---

## 📝 License

This project is open source. Feel free to fork, modify, and use for personal projects.

---

## 🤝 Contributing

Suggestions and improvements welcome! Please submit issues and pull requests to improve the project.

---

## 📧 Support

For questions or issues:
1. Check the Serial Monitor output
2. Verify WiFi connection: `ping 172.18.100.152`
3. Review browser console (F12) for errors
4. Check the troubleshooting guide below

---

## 🔧 Troubleshooting

### ESP32 won't connect to WiFi
- [ ] Verify SSID and password are correct
- [ ] Check WiFi network is on 2.4GHz (5GHz not supported)
- [ ] Restart ESP32 after WiFi changes

### Browser can't reach `http://172.18.100.152`
- [ ] Confirm computer is on same WiFi network
- [ ] Run `ping 172.18.100.152` in terminal
- [ ] Check Windows Firewall isn't blocking port 80
- [ ] Hard refresh browser (Ctrl+Shift+R)

### Firebase dashboard shows "Connection Error"
- [ ] Ensure CORS headers are enabled on ESP32
- [ ] Verify IP address is correct in input field
- [ ] Check browser console (F12) for detailed errors
- [ ] Try local dashboard first to verify ESP32 is working

### Serial Monitor shows garbled text
- [ ] Set baud rate to **115200**
- [ ] Check USB drivers are installed
- [ ] Try different USB port or cable

---

## 🎯 Future Enhancements

- [ ] Real sensor reading (DHT22, MQ-135, GP2Y1010)
- [ ] User authentication for Firebase
- [ ] Mobile app (React Native)
- [ ] Data export (CSV/Excel)
- [ ] Alert notifications (email/SMS)
- [ ] WeatherAPI integration
- [ ] MQTT support
- [ ] OTA firmware updates

---

**Last Updated:** April 18, 2026
**Version:** 2.0 (WiFi + HTTP API + Mock Data)
                                              ↓
                    ┌─────────────────────────┼
                    ↓                         ↓
                Dashboard (Real-time)    Firestore (Cloud DB)
>>>>>>> a16c5fe (Initial commit: project scaffold, frontend, docs, and stub firmware)
