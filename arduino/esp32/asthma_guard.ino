/*
  Asthma Guard - ESP32 Firmware
  
  Real-time air quality monitoring with WebSocket broadcasting
  
  Sensors:
  - DHT22 (GPIO4) - Temperature & Humidity
  - GP2Y1010 (ADC35/GPIO35) - PM2.5 dust
  - MQ-135 (ADC34/GPIO34) - Gas quality
  - IRLZ44N (GPIO18 PWM) - Fan control
*/

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <DHT.h>
#include <WebServer.h>

// WiFi Credentials
const char* ssid = "DIC2026 - 1350";
const char* password = "DIC@2026";

// PIN DEFINITIONS
#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ135_PIN 35
#define DUST_VO_PIN 34
#define DUST_LED_PIN 25
#define FAN_CTRL_PIN 18
#define BUZZER_PIN 23

DHT dht(DHTPIN, DHTTYPE);
WebSocketsServer webSocket = WebSocketsServer(81);
WebServer server(80);  // HTTP server on port 80

// Sensor Variables
const int samplingTime = 280;
const int deltaTime    = 40;
const int sleepTime    = 9680;
float dustBaseline = 0.0;
unsigned long lastReadTime = 0;
unsigned long lastBuzzerTime = 0;
const unsigned long sensorInterval = 1000;
const unsigned long buzzerInterval = 300;
String currentAirStatus = "UNKNOWN";

// Store current readings
float currentTemp = 0;
float currentHum = 0;
float currentDust = 0;
int currentGas = 0;

// Control Functions
void fanOn() { digitalWrite(FAN_CTRL_PIN, LOW); }
void fanOff() { digitalWrite(FAN_CTRL_PIN, HIGH); }
void buzzerOn() { digitalWrite(BUZZER_PIN, HIGH); }
void buzzerOff() { digitalWrite(BUZZER_PIN, LOW); }

float readDustVoltage() {
  digitalWrite(DUST_LED_PIN, LOW);
  delayMicroseconds(samplingTime);
  int raw = analogRead(DUST_VO_PIN);
  delayMicroseconds(deltaTime);
  digitalWrite(DUST_LED_PIN, HIGH);
  delayMicroseconds(sleepTime);
  return raw * (3.3 / 4095.0);
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("\n\n========== ASTHMA GUARD STARTUP ==========");

  // --- Sensor Initialization ---
  dht.begin();
  pinMode(DUST_LED_PIN, OUTPUT);
  digitalWrite(DUST_LED_PIN, HIGH);
  pinMode(FAN_CTRL_PIN, OUTPUT);
  fanOff();
  pinMode(BUZZER_PIN, OUTPUT);
  buzzerOff();
  analogReadResolution(12);

  Serial.println("1. Sensors initialized");

  float sum = 0.0;
  for (int i = 0; i < 20; i++) {
    sum += readDustVoltage();
    delay(50);
  }
  dustBaseline = sum / 20.0;
  Serial.println("2. Dust baseline calibrated");

  // --- WiFi Setup ---
  Serial.print("3. Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.setTxPower(WIFI_POWER_11dBm);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println("");
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("4. WiFi connected! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("ERROR: WiFi connection failed!");
    return;
  }

  // --- WebSocket Setup ---
  webSocket.begin();
  Serial.println("5. WebSocket ready (port 81)");

  // --- HTTP Server Setup ---
  server.on("/", handleRoot);
  server.on("/api/data", handleData);
  server.on("/api/data", HTTP_OPTIONS, handleCORS);  // Preflight CORS request
  server.on("/", HTTP_OPTIONS, handleCORS);           // Preflight CORS for root
  server.begin();
  Serial.println("6. HTTP server ready (port 80)");

  Serial.println("\n========== SUCCESS ==========");
  Serial.print("OPEN BROWSER: http://");
  Serial.println(WiFi.localIP());
  Serial.println("=========================================\n");
}

// CORS Handler - Allow cross-origin requests from Firebase
void handleCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

// HTML Dashboard Handler - SIMPLIFIED
void handleRoot() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Type", "text/html; charset=utf-8");
  server.send(200, "text/html", getHTML());
}

String getHTML() {
  String html = "<!DOCTYPE html>";
  html += "<html><head>";
  html += "<meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>Asthma Guard</title>";
  html += "<style>";
  html += "body{background:#0a0e27;color:#00ff88;font-family:Arial;margin:0;padding:20px}";
  html += ".container{max-width:1200px;margin:0 auto}";
  html += "h1{text-align:center;color:#00d4ff}";
  html += ".gauges{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;margin:20px 0}";
  html += ".gauge{background:rgba(0,255,136,0.1);border:1px solid #00ff88;padding:15px;text-align:center;border-radius:8px}";
  html += ".value{font-size:28px;color:#00ff88;font-weight:bold}";
  html += ".label{font-size:12px;color:#888;margin-top:8px}";
  html += "#status{text-align:center;padding:10px;background:rgba(0,255,136,0.2);margin:10px 0;border-radius:5px;font-weight:bold}";
  html += "</style></head><body>";
  html += "<div class='container'>";
  html += "<h1>Shield Asthma Guard</h1>";
  html += "<div id='status'>Connecting...</div>";
  html += "<div class='gauges'>";
  html += "<div class='gauge'><div class='value' id='temp'>-</div><div class='label'>Temp (C)</div></div>";
  html += "<div class='gauge'><div class='value' id='hum'>-</div><div class='label'>Humidity (%)</div></div>";
  html += "<div class='gauge'><div class='value' id='mq'>-</div><div class='label'>Gas</div></div>";
  html += "<div class='gauge'><div class='value' id='dust'>-</div><div class='label'>Dust (mg/m3)</div></div>";
  html += "<div class='gauge'><div class='value' id='status_val'>-</div><div class='label'>Status</div></div>";
  html += "</div></div>";
  html += "<script>";
  html += "function upd(d){document.getElementById('temp').textContent=(d.temp||0).toFixed(1);document.getElementById('hum').textContent=(d.hum||0).toFixed(0);document.getElementById('mq').textContent=d.mq||0;document.getElementById('dust').textContent=(d.dust||0).toFixed(2);document.getElementById('status_val').textContent=d.status||'?'}";
  html += "function poll(){fetch('/api/data').then(r=>r.json()).then(d=>{upd(d);document.getElementById('status').textContent='✓ Live';setTimeout(poll,1000)}).catch(e=>{document.getElementById('status').textContent='✗ Error';setTimeout(poll,3000)})}";
  html += "poll();";
  html += "</script>";
  html += "</body></html>";
  return html;
}

// JSON API Handler
void handleData() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Type", "application/json");
  
  String json = "{";
  json += "\"temp\":" + String(currentTemp, 1) + ",";
  json += "\"hum\":" + String(currentHum, 1) + ",";
  json += "\"mq\":" + String(currentGas) + ",";
  json += "\"dust\":" + String(currentDust, 3) + ",";
  json += "\"status\":\"" + currentAirStatus + "\"";
  json += "}";
  server.send(200, "application/json", json);
}

void loop() {
  webSocket.loop(); // Required for WebSocket communication
  server.handleClient(); // Handle HTTP requests

  unsigned long now = millis();
  if (now - lastReadTime < sensorInterval) return;
  lastReadTime = now;

  // Sensor Reading Logic
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  
  // FIX: Replace NaN with 0 to ensure valid JSON
  if (isnan(temperature)) temperature = 0;
  if (isnan(humidity)) humidity = 0;
  
  // Store for API access
  currentTemp = temperature;
  currentHum = humidity;
  
  int mq135Raw = analogRead(MQ135_PIN);
  currentGas = mq135Raw;
  
  float mq135Voltage = mq135Raw * (3.3 / 4095.0);
  float dustVoltage = readDustVoltage();
  float dustDelta = dustVoltage - dustBaseline;
  if (dustDelta < 0) dustDelta = 0;
  float dustDensity = dustDelta * 0.17;
  
  // Store for API access
  currentDust = dustDensity;

  String mqStatus;
  String dustStatus;
  String comfortStatus;

  // Status Logic
  if (mq135Raw < 1500) mqStatus = "GOOD";
  else if (mq135Raw < 2500) mqStatus = "MODERATE";
  else mqStatus = "POOR";

  if (dustVoltage < (dustBaseline + 0.05)) dustStatus = "GOOD";
  else if (dustVoltage < (dustBaseline + 0.20)) dustStatus = "MODERATE";
  else dustStatus = "POOR";

  if (temperature > 0 && humidity > 0) {
    if (temperature >= 20 && temperature <= 30 && humidity >= 40 && humidity <= 60) comfortStatus = "COMFORTABLE";
    else comfortStatus = "NOT COMFORTABLE";
  } else comfortStatus = "DHT ERROR";

  if (mqStatus == "POOR" || dustStatus == "POOR") {
    currentAirStatus = "POOR AIR QUALITY";
    fanOn();
    if (now - lastBuzzerTime >= buzzerInterval) {
      buzzerOn(); delay(100); buzzerOff();
      lastBuzzerTime = now;
    }
  } else if (mqStatus == "MODERATE" || dustStatus == "MODERATE") {
    currentAirStatus = "MODERATE AIR QUALITY";
    fanOn();
    buzzerOff();
  } else {
    currentAirStatus = "GOOD AIR QUALITY";
    fanOff();
    buzzerOff();
  }

  // --- BROADCAST DATA TO WEBAPP (Always valid JSON) ---
  String jsonPayload = "{";
  jsonPayload += "\"temp\":" + String(temperature, 1) + ",";
  jsonPayload += "\"hum\":" + String(humidity, 1) + ",";
  jsonPayload += "\"mq\":" + String(mq135Raw) + ",";
  jsonPayload += "\"dust\":" + String(dustDensity, 3) + ",";
  jsonPayload += "\"status\":\"" + currentAirStatus + "\"";
  jsonPayload += "}";
  
  // FIX: Use correct WebSocketsServer broadcast format
  webSocket.broadcastTXT((uint8_t *) jsonPayload.c_str(), jsonPayload.length());

  // Serial Output
  Serial.println("\n========== SENSOR READINGS ==========");
  if (temperature == 0 || humidity == 0) {
    Serial.println("DHT22: Failed to read from sensor");
  } else {
    Serial.print("Temperature: "); Serial.print(temperature, 1); Serial.println(" C");
    Serial.print("Humidity: "); Serial.print(humidity, 1); Serial.println(" %");
    Serial.print("Room Status: "); Serial.println(comfortStatus);
  }
  Serial.print("MQ-135 Raw: "); Serial.print(mq135Raw);
  Serial.print(" | Air Quality: "); Serial.println(mqStatus);
  Serial.print("Dust Voltage: "); Serial.print(dustVoltage, 3);
  Serial.print(" | Level: "); Serial.println(dustStatus);
  Serial.print("Overall Air Status: "); Serial.println(currentAirStatus);
  Serial.print("JSON Broadcast: "); Serial.println(jsonPayload);
  Serial.println("=====================================");
}

