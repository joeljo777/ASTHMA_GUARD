/*
  Asthma Guard - ESP32 Firmware
  
  Real-time air quality monitoring with WebSocket broadcasting
  
  Sensors:
  - DHT22 (GPIO4) - Temperature & Humidity
  - GP2Y1010 (ADC35/GPIO35) - PM2.5 dust
  - MQ-135 (ADC34/GPIO34) - Gas quality
  - IRLZ44N (GPIO18 PWM) - Fan control
  
  See HARDWARE_WIRING.md for pin assignments.
*/

#include <WiFi.h>
#include <AsyncWebSocket.h>
#include <ESPAsyncWebServer.h>
#include <DHT.h>

// WiFi Configuration (UPDATE THESE)
#define SSID "YOUR_WIFI_SSID"
#define PASSWORD "YOUR_WIFI_PASSWORD"

// Pin Configuration
#define DHT_PIN 4
#define DUST_SENSOR_PIN 35       // ADC1_CH7
#define GAS_SENSOR_PIN 34        // ADC1_CH6
#define FAN_PIN 18               // PWM
#define DHT_TYPE DHT22

// Sensor Objects
DHT dht(DHT_PIN, DHT_TYPE);

// Web Server
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// Global Variables
float currentTemp = 0;
float currentHum = 0;
float currentPM = 0;
int currentGas = 0;
int currentFan = 0;
bool manualMode = false;

// State Machine Thresholds
const float PM_MODERATE = 0.05;
const float PM_DANGER = 0.15;
const int GAS_MODERATE = 800;
const int GAS_DANGER = 1800;

// Function Prototypes
void initWiFi();
void initWebSocket();
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len);
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len);
void readSensors();
float readPM25();
int readGas();
String getAirQualityState(float pm, int gas);
void broadcastSensorData();
void setFanSpeed(int speed);

// PWM Setup
const int PWM_FREQUENCY = 5000;
const int PWM_RESOLUTION = 8;  // 0-255

// Setup
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\nAsthma Guard - ESP32 Starting...");
  
  // Initialize DHT sensor
  dht.begin();
  
  // Initialize fan PWM
  ledcSetup(0, PWM_FREQUENCY, PWM_RESOLUTION);
  ledcAttachPin(FAN_PIN, 0);
  ledcWrite(0, 0);  // Start with fan off
  
  // Initialize ADC for dust and gas sensors
  analogSetWidth(12);  // 12-bit ADC
  analogSetClockDiv(1);
  
  // WiFi Setup
  initWiFi();
  
  // WebSocket Setup
  initWebSocket();
  
  // Simple HTTP server info page
  server.on("/", HTTP_GET, [](AsyncServerRequest *request) {
    request->send(200, "text/html", 
      "<h1>Asthma Guard ESP32</h1>"
      "<p>WebSocket: ws://ESP_IP/ws</p>"
      "<p>Fan Speed: 0-100%</p>"
      "<p>Status: Connected</p>");
  });
  
  server.begin();
  Serial.println("HTTP Server started");
}

// Main Loop
void loop() {
  // Read sensors every 2 seconds
  static unsigned long lastRead = 0;
  if (millis() - lastRead > 2000) {
    readSensors();
    broadcastSensorData();
    lastRead = millis();
  }
  
  delay(100);
}

// Initialize WiFi
void initWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to WiFi!");
  }
}

// Initialize WebSocket
void initWebSocket() {
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
  Serial.println("WebSocket server initialized at /ws");
}

// WebSocket Event Handler
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("Client %u connected\n", client->id());
      broadcastSensorData();  // Send immediate data
      break;
    case WS_EVT_DISCONNECT:
      Serial.printf("Client %u disconnected\n", client->id());
      break;
    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}

// Handle WebSocket Messages
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo *)arg;
  if (info->final && info->index == 0 && info->len == len && len > 0) {
    data[len] = 0;  // Null terminate
    String msg = (char *)data;
    
    Serial.printf("Received: %s\n", msg.c_str());
    
    // Parse fan speed command: {"fan": 50}
    if (msg.indexOf("\"fan\":") != -1) {
      int fanSpeed = msg.substring(msg.indexOf("\"fan\":") + 6).toInt();
      fanSpeed = constrain(fanSpeed, 0, 100);
      setFanSpeed(fanSpeed);
      manualMode = true;
      Serial.printf("Fan speed set to: %d%%\n", fanSpeed);
    }
  }
}

// Read All Sensors
void readSensors() {
  // Read DHT22
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  
  if (!isnan(h) && !isnan(t)) {
    currentHum = h;
    currentTemp = t;
  } else {
    Serial.println("DHT22 read error!");
  }
  
  // Read PM2.5 (Dust Sensor)
  currentPM = readPM25();
  
  // Read Gas Sensor (MQ-135)
  currentGas = readGas();
  
  // Auto fan control if not in manual mode
  if (!manualMode) {
    String state = getAirQualityState(currentPM, currentGas);
    if (state == "DANGER") {
      setFanSpeed(100);
    } else if (state == "WARNING") {
      setFanSpeed(60);
    } else {
      setFanSpeed(20);
    }
  }
  
  Serial.printf("T:%.1f H:%.0f PM:%.3f G:%d Fan:%d%%\n", currentTemp, currentHum, currentPM, currentGas, currentFan);
}

// Read PM2.5 from GP2Y1010
float readPM25() {
  // Sample the sensor 10 times
  float sum = 0;
  for (int i = 0; i < 10; i++) {
    int val = analogRead(DUST_SENSOR_PIN);
    sum += val;
    delay(10);
  }
  float avgVal = sum / 10.0;
  
  // Convert ADC to voltage (12-bit, 3.3V reference)
  float voltage = (avgVal / 4095.0) * 3.3;
  
  // GP2Y1010 formula: mg/m³ = (V - 0.0356) / 0.01
  float pm25 = max(0.0, (voltage - 0.0356) / 0.01);
  
  return pm25;
}

// Read Gas Sensor (MQ-135)
int readGas() {
  int val = analogRead(GAS_SENSOR_PIN);
  return val;  // Raw ADC value (0-4095)
}

// Determine Air Quality State
String getAirQualityState(float pm, int gas) {
  if (pm > PM_DANGER || gas > GAS_DANGER) return "DANGER";
  if (pm > PM_MODERATE || gas > GAS_MODERATE) return "WARNING";
  return "SAFE";
}

// Set Fan Speed (PWM 0-100)
void setFanSpeed(int speed) {
  speed = constrain(speed, 0, 100);
  currentFan = speed;
  int pwmValue = map(speed, 0, 100, 0, 255);
  ledcWrite(0, pwmValue);
}

// Broadcast Sensor Data via WebSocket
void broadcastSensorData() {
  String state = getAirQualityState(currentPM, currentGas);
  
  String json = "{";
  json += "\"pm\":" + String(currentPM, 3) + ",";
  json += "\"gas\":" + String(currentGas) + ",";
  json += "\"temp\":" + String(currentTemp, 1) + ",";
  json += "\"hum\":" + String(currentHum, 0) + ",";
  json += "\"fan\":" + String(currentFan) + ",";
  json += "\"state\":\"" + state + "\"";
  json += "}";
  
  ws.textAll(json);
}

