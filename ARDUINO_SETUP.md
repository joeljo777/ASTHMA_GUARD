# ESP32 Firmware Setup Guide

## Overview

The ESP32 firmware reads sensors in real-time and broadcasts data via WebSocket to your Firebase-hosted dashboard. It includes:
- DHT22 temperature & humidity sensor
- GP2Y1010 PM2.5 dust sensor
- MQ-135 air quality (gas) sensor
- PWM fan control with auto-adjust based on air quality
- WebSocket broadcasting to dashboard

---

## Prerequisites

### Arduino IDE Setup

1. **Install Arduino IDE** (1.8.19 or later)
   - Download: https://www.arduino.cc/en/software

2. **Add ESP32 Board Manager**
   - Open Arduino IDE
   - Go to **File → Preferences**
   - Find "Additional Board Manager URLs"
   - Paste: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Click OK

3. **Install ESP32 Board**
   - Go to **Tools → Board → Board Manager**
   - Search for "ESP32"
   - Install "esp32 by Espressif Systems" (latest version)

### Required Libraries

Open **Sketch → Include Library → Manage Libraries** and install:

1. **DHT sensor library** by Adafruit
   - Search: "DHT"
   - Install: "DHT sensor library by Adafruit"

2. **AsyncWebServer** by me-no-dev
   - Search: "AsyncWebServer"
   - Install: "ESPAsyncWebServer by me-no-dev"

3. **AsyncTCP** by me-no-dev
   - Search: "AsyncTCP"
   - Install: "AsyncTCP by me-no-dev"

---

## Configuration

### WiFi Setup

Edit **arduino/esp32/asthma_guard.ino** and update:

```cpp
#define SSID "YOUR_WIFI_SSID"
#define PASSWORD "YOUR_WIFI_PASSWORD"
```

Replace with your actual WiFi credentials.

### Pin Configuration

The firmware uses these pins (defined at top of file):

```
GPIO 4   → DHT22 (Temp/Humidity)
GPIO 35  → GP2Y1010 (PM2.5)
GPIO 34  → MQ-135 (Gas sensor)
GPIO 18  → Fan control (PWM)
```

If you're using different pins, update these #define values in the sketch.

---

## Upload to ESP32

1. **Connect ESP32 to computer** via USB-C cable

2. **Select ESP32 Board**
   - Tools → Board → ESP32 Dev Module

3. **Select COM Port**
   - Tools → Port → (select your COM port)

4. **Configure Upload Settings**
   - Tools → Upload Speed: 921600
   - Tools → CPU Frequency: 80 MHz
   - Tools → Flash Size: 4MB
   - Tools → Partition Scheme: Default

5. **Upload Sketch**
   - Click **Upload** (or Sketch → Upload)
   - Wait for "Hard resetting via RTS pin..." message

6. **Monitor Serial Output**
   - Tools → Serial Monitor
   - Baud Rate: 115200
   - You should see:
     ```
     Asthma Guard - ESP32 Starting...
     WiFi connected!
     IP Address: 192.168.x.x
     WebSocket server initialized at /ws
     ```

---

## Check WebSocket Connection

1. **Get ESP32 IP Address** from Serial Monitor
   - Example: `192.168.1.50`

2. **In Dashboard**, enter the connection URL:
   - Format: `ws://192.168.1.50:80`
   - Click **Connect**

3. **Verify Connection**
   - Dashboard should show real sensor data
   - Gauges should update every 2 seconds
   - Fan slider should control the physical fan

---

## Sensor Readings

### PM2.5 (Dust) - GP2Y1010
- Output: mg/m³
- Formula: `(Voltage - 0.0356) / 0.01`
- Safe: < 0.05
- Warning: 0.05 - 0.15
- Danger: > 0.15

### Gas Quality - MQ-135
- Output: ADC value (0-4095)
- Safe: < 800
- Warning: 800 - 1800
- Danger: > 1800

### Temperature & Humidity - DHT22
- Temperature: °C
- Humidity: %

### Fan Control
- Auto Mode: Adjusts based on air quality
- Manual Mode: Set via dashboard slider (0-100%)
- PWM Frequency: 5kHz
- Resolution: 8-bit (0-255)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Port not found" | Check USB cable, install CH340 drivers |
| "Failed to connect to WiFi" | Verify SSID/password, check signal strength |
| "WebSocket connection failed" | Check ESP32 IP address, ensure same network |
| "Sensor reads 0" | Verify GPIO pins, check sensor wiring |
| "Fan doesn't respond" | Check MOSFET connection, verify GPIO 18 PWM |

---

## Next Steps

1. Test all sensors with dashboard in **Mock Mode** first
2. Deploy firmware to ESP32
3. Connect dashboard to ESP32 WebSocket
4. Monitor serial output for debugging
5. Adjust sensor thresholds in code if needed

---

## File Structure

```
arduino/
├── esp32/
│   └── asthma_guard.ino       ← Main firmware file
└── README.md                   ← Additional notes
```

Happy building! 🚀
