# Asthma Guard — Hardware Wiring & Schematic Reference

This document details the physical connections for the Asthma Guard ESP32 prototype.

---

## ESP32 Pin Assignments

| Component | ESP32 Pin | Type | Notes |
|-----------|-----------|------|-------|
| DHT22 Data | GPIO 4 | Digital | Requires 10k pull-up resistor to 3.3V |
| MQ-135 (Gas) | GPIO 34 | Analog (ADC1) | 5V VCC, 3.3V logic; ADC range 0–4095 |
| GP2Y1010 (Dust) | GPIO 35 | Analog (ADC1) | Analog output for PM2.5 estimation |
| IRLZ44N Gate | GPIO 18 | PWM Output | Pulse-width modulation for fan speed |
| Status LED | GPIO 2 | Digital | Internal blue LED (WiFi status indicator) |
| GND | GND | Power | Common ground for all modules |

---

## Power Supply

- **Battery**: 3.7V 3000mAh Li-Po
- **Boost Converter**: [MT3608](https://datasheetspdf.com/datasheet/MT3608.html)
- **Output**: Stable 5V for sensors and fan
- **Common Ground**: All components share a single ground plane

**Boost Converter Connections:**
- IN+: Li-Po Battery (+)
- IN−: Battery GND
- OUT+: 5V rail → Sensor VCC, Fan VCC
- OUT−: 5V GND → Common GND with ESP32

---

## Sensor Wiring Details

### DHT22 (Temp & Humidity)
```
DHT22 Pin 1 → 3.3V
DHT22 Pin 2 → GPIO 4 (+ 10k pull-up to 3.3V)
DHT22 Pin 4 → GND
```

### MQ-135 (Air Quality)
```
VCC → 5V (from MT3608)
GND → Common GND
A0  → GPIO 34 (Analog)
```

**Calibration Notes:**
- MQ-135 has adjustable potentiometer for sensitivity
- Raw ADC reading ~800–1800 typical for ambient air
- Requires ~24h warm-up for stable readings

### GP2Y1010 (Dust/PM2.5)
```
VCC → 5V
LED−  → GND
LED+  → GPIO 32 (optional, PWM for pulsed measurement)
Vo   → GPIO 35 (Analog)
GND  → Common GND
```

**Note:** This sensor outputs analog voltage proportional to PM2.5 concentration. Mapping depends on load resistor (typically 10k).

---

## Motor Driver & Fan

### IRLZ44N MOSFET
```
Gate  → GPIO 18 (PWM)
Drain → −12V or 5V supply (see below)
Source → Fan negative
```

### Centrifugal Blower Fan (5V, ~2A)
```
VCC (+) → 5V (through MOSFET Drain/Source for PWM control)
GND (−) → Common GND
```

**PWM Frequency:** 20 kHz (inaudible)  
**Duty Cycle:** 0–100% → 0–100% fan speed

**Caution:** IRLZ44N is Logic Level MOSFET; ensure you do NOT use standard IRFZ44N (would require 10V gate drive).

---

## Mechanical Airflow Assembly

```
Ambient Air Inlet (Side/Bottom Vents)
    ↓
[Sensor Detection Zone (MQ-135, GP2Y1010)]
    ↓
Layer 1: HEPA Filter (removes PM2.5)
    ↓
Layer 2: Activated Carbon (removes VOCs)
    ↓
Centrifugal Blower (PWM-controlled)
    ↓
Clean Air Exhaust (directed toward user face)
```

**Filter Replacement:** Monitor pressure drop across filters; typically replace every 2–4 weeks in high-pollution environments.

---

## Proto-Board Layout Hints

### Recommended Organization
1. **Power Plane:** Dedicate one side for 5V rail and GND (thick traces advised)
2. **Sensor Cluster:** MQ-135, GP2Y1010, and ADCs near GPIO 34/35
3. **Signal Layer:** DHT22 on GPIO 4, with pull-up positioned close to the sensor
4. **Motor Control:** MOSFET + gate resistor (10–100Ω) physically near GPIO 18 to reduce noise

### Capacitors (Noise Filtering)
- 100µF electrolytic across 5V supply near MT3608 output
- 10µF ceramic across 3.3V ESP32 VCC
- 100nF ceramic near each sensor VCC pin (local bypass)

---

## Schematic (ASCII Reference)

```
   [Li-Po Battery 3.7V]
          |
          | MT3608 (Boost)
          | 
        [5V Rail]
       /       \
    Sensors   Blower Fan
       |         |
   (VCC)     (VCC)
       |         |
   [Adafruit   [IRLZ44N
    MQ-135]    MOSFET]
       |         |
   [ADC34]   [GPIO18]
       |         |
    [ESP32]-----[ESP32]
       |
   [DHT22]
       |
   [GPIO4]
       |
   [ESP32]
       |
    [GND]------- (Common Ground)
```

---

## Test Checklist Before Deployment

- [ ] DHT22 reads temperature & humidity in Serial Monitor
- [ ] MQ-135 ADC value is in expected range (800–1800 ambient)
- [ ] GP2Y1010 ADC responds to blowing/blocking the sensor
- [ ] Fan runs at 50% when AQ threshold is crossed
- [ ] Fan runs at 100% when hazard threshold is crossed
- [ ] Manual override command stops fan or sets custom speed
- [ ] Serial output shows no I2C or ADC read errors
- [ ] Boost converter outputs stable 5V under load
- [ ] ESP32 connects to WiFi and Web Dashboard returns readings

---

## Safety Notes

- **Never short 5V and GND** on the filter stack (risk of filter blower failure)
- **Solder carefully** around the MOSFET to avoid bridging Gate–Drain
- **Test with multimeter** before connecting battery: confirm boost converter outputs 5.0 ± 0.3V
- **Polarity check**: Li-Po battery connections must be correct; reversing will destroy MT3608

Enjoy building your Asthma Guard!
