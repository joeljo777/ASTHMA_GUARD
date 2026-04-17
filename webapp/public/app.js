// Enhanced Asthma Guard Dashboard
let ws = null;
let manualMode = false;
let mockEnabled = false;
let mockTimerId = null;

// State machine thresholds
const THRESHOLDS = {
  PM_MODERATE: 0.05,
  PM_DANGER: 0.15,
  GAS_MODERATE: 800,
  GAS_DANGER: 1800
};

// Initialize Chart.js
function initChart() {
  const ctx = document.getElementById('pmChart').getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'PM2.5 (mg/m³)',
        data: [],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#555' } }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'mg/m³' },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: {
          grid: { color: 'rgba(0,0,0,0.05)' }
        }
      }
    }
  });
}

const chart = initChart();

// Update status banner
function setStatus(text, state) {
  const banner = document.getElementById('statusBanner');
  banner.className = 'status-banner ' + (state || 'safe');
  document.getElementById('statusText').textContent = text;
}

// Determine air quality state
function getState(pm, gas) {
  if (pm > THRESHOLDS.PM_DANGER || gas > THRESHOLDS.GAS_DANGER) return 'DANGER';
  if (pm > THRESHOLDS.PM_MODERATE || gas > THRESHOLDS.GAS_MODERATE) return 'WARNING';
  return 'SAFE';
}

// Get state color
function getStateColor(state) {
  if (state === 'DANGER') return 'danger';
  if (state === 'WARNING') return 'warn';
  return 'safe';
}

// Determine gauge color based on percentage (Green -> Yellow -> Red)
function getGaugeColor(percentage) {
  if (percentage < 33) return '#00ff88'; // Green - Safe
  if (percentage < 66) return '#ffff00'; // Yellow - Warning
  return '#ff4444'; // Red - Danger
}

// Animate circular gauge with gradient background
function animateGauge(circleId, percentage, maxPercentage = 100) {
  const circle = document.getElementById(circleId);
  if (circle) {
    const circumference = 2 * Math.PI * 50; // radius=50
    const normalizedPercentage = (percentage / maxPercentage) * 100;
    const angle = (360 * normalizedPercentage) / 100;
    const offset = circumference * (1 - angle / 360);
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = offset;
    // Update progress fill color but keep it visible against gradient
    circle.style.stroke = getGaugeColor(normalizedPercentage);
  }
}

// Format timestamp
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Update UI with sensor readings
function updateUI(data) {
  // Map ESP32 fields to dashboard fields
  // ESP32 sends: {dust, mq, temp, hum, status}
  // Dashboard uses: pm, gas, temp, hum, fan, state
  const pm = parseFloat(data.dust || data.pm) || 0;
  const gas = parseInt(data.mq || data.gas) || 0;
  const temp = parseFloat(data.temp);
  const hum = parseFloat(data.hum);
  const fan = parseInt(data.fan) || 0;
  const state = data.status || data.state || getState(pm, gas);

  console.log('Parsed values - PM:', pm, 'Gas:', gas, 'Temp:', temp, 'Hum:', hum, 'State:', state); // DEBUG

  // Update gauge values
  const pmValEl = document.getElementById('pmVal');
  const gasValEl = document.getElementById('gasVal');
  const fanValEl = document.getElementById('fanVal');
  
  pmValEl.textContent = pm.toFixed(3);
  gasValEl.textContent = gas;
  document.getElementById('tempVal').textContent = !isNaN(temp) ? temp.toFixed(1) : '—';
  document.getElementById('humVal').textContent = !isNaN(hum) ? hum.toFixed(0) : '—';
  fanValEl.textContent = fan;

  // Animate gauges with dynamic colors
  animateGauge('pmGauge', pm, 0.5);
  animateGauge('gasGauge', gas, 3000);
  animateGauge('fanGauge', fan, 100);
  
  // Update gauge value colors dynamically
  const pmColor = getGaugeColor((pm / 0.5) * 100);
  const gasColor = getGaugeColor((gas / 3000) * 100);
  const fanColor = getGaugeColor(fan);
  
  pmValEl.style.color = pmColor;
  gasValEl.style.color = gasColor;
  fanValEl.style.color = fanColor;

  // Parse state to get color class
  let stateClass = 'safe';
  if (state.includes('POOR') || state === 'DANGER') stateClass = 'danger';
  else if (state.includes('MODERATE') || state === 'WARNING') stateClass = 'warn';
  
  // Update state display
  const stateEl = document.getElementById('stateDisplay');
  stateEl.textContent = state;
  stateEl.className = 'state-value ' + stateClass;

  // Update chart
  const now = formatTime(new Date());
  chart.data.labels.push(now);
  chart.data.datasets[0].data.push(pm);
  if (chart.data.labels.length > 30) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update('none'); // no animation for smooth updates

  // Update timestamp
  document.getElementById('lastUpdate').textContent = now;

  // Handle alerts based on ESP32 status
  const alertBox = document.getElementById('alertBox');
  if (state.includes('POOR')) {
    alertBox.style.display = 'block';
    document.getElementById('alertText').textContent = '⚠️ POOR AIR QUALITY: Fan activated!';
  } else if (state.includes('MODERATE')) {
    alertBox.style.display = 'block';
    document.getElementById('alertText').textContent = '⚠️ MODERATE AIR QUALITY: Monitoring...';
  } else {
    alertBox.style.display = 'none';
  }

  // Push to Firestore if configured
  pushReadingToFirestore(Object.assign({ ts: Date.now() }, data));
}

// Push reading to Firestore
function pushReadingToFirestore(doc) {
  if (!window.FIREBASE_CONFIG || Object.keys(window.FIREBASE_CONFIG).length === 0) return;
  if (!window.firebase || !window.firebase.firestore) return;
  try {
    const db = firebase.firestore();
    // Normalize ESP32 field names for consistent Firestore storage
    const normalized = {
      pm: parseFloat(doc.dust || doc.pm) || 0,
      gas: parseInt(doc.mq || doc.gas) || 0,
      temp: parseFloat(doc.temp) || 0,
      hum: parseFloat(doc.hum) || 0,
      status: doc.status || doc.state || 'UNKNOWN',
      ts: doc.ts || Date.now()
    };
    db.collection('readings').add(normalized).catch(e => console.warn('Firestore error:', e));
  } catch (e) {
    console.warn(e);
  }
}

// HTTP Polling connection (instead of WebSocket for cloud access)
let pollingInterval = null;
let isPolling = false;

function connectHTTP(url) {
  // Extract base URL from input (e.g., "http://172.18.100.152" from "http://172.18.100.152/api/data")
  let baseUrl = url.trim();
  if (baseUrl.includes('/api/data')) {
    baseUrl = baseUrl.replace('/api/data', '');
  }
  if (!baseUrl.startsWith('http')) {
    baseUrl = 'http://' + baseUrl;
  }

  const apiUrl = baseUrl + '/api/data';
  
  if (isPolling) {
    // Stop polling
    clearInterval(pollingInterval);
    isPolling = false;
    pollingInterval = null;
    setStatus('Disconnected', '');
    document.getElementById('connectBtn').textContent = 'Connect';
    return;
  }

  // Start polling
  isPolling = true;
  document.getElementById('connectBtn').textContent = 'Disconnect';
  setStatus('Connecting...', 'safe');

  const poll = async () => {
    try {
      const response = await fetch(apiUrl, { 
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const data = await response.json();
      console.log('ESP32 data received via HTTP:', data); // DEBUG
      setStatus('Connected', 'safe');
      updateUI(data);
    } catch (e) {
      console.error('Polling error details:', {
        message: e.message,
        name: e.name,
        url: apiUrl,
        type: typeof e
      });
      
      // Show detailed error message
      let errorMsg = 'Connection Error';
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        errorMsg = 'Network Error - Check if ESP32 is online and WiFi is connected';
      } else if (e.message.includes('CORS')) {
        errorMsg = 'CORS Error - Try using local dashboard instead';
      } else if (e.message.includes('HTTP 404')) {
        errorMsg = 'ESP32 Error 404 - Not Found';
      } else if (e.message.includes('HTTP')) {
        errorMsg = e.message;
      }
      
      setStatus(errorMsg, 'danger');
      console.warn('Current attempt status:', errorMsg);
    }
  };

  // Poll immediately and then every 1 second
  poll();
  pollingInterval = setInterval(poll, 1000);
}

// Mock data generation (for testing)
function generateMockData() {
  return {
    pm: (Math.random() * 0.5).toFixed(3),
    gas: Math.floor(Math.random() * 2000),
    temp: (20 + Math.random() * 10).toFixed(1),
    hum: (40 + Math.random() * 40).toFixed(0),
    fan: Math.floor(Math.random() * 100),
    state: Math.random() > 0.7 ? 'WARNING' : 'SAFE'
  };
}

// Start mock data stream
function startMockData() {
  mockEnabled = true;
  document.getElementById('mockBtn').textContent = 'Stop Mock Data';
  mockTimerId = setInterval(() => {
    updateUI(generateMockData());
  }, 2000);
}

// Stop mock data stream
function stopMockData() {
  mockEnabled = false;
  document.getElementById('mockBtn').textContent = 'Mock Data (Test)';
  if (mockTimerId) clearInterval(mockTimerId);
}

// Event Listeners
document.getElementById('connectBtn').addEventListener('click', () => {
  const url = document.getElementById('wsUrl').value.trim();
  if (!url) {
    alert('Enter ESP32 address (e.g., http://172.18.100.152 or 172.18.100.152)');
  } else {
    connectHTTP(url);
  }
});

document.getElementById('mockBtn').addEventListener('click', () => {
  if (mockEnabled) stopMockData();
  else startMockData();
});

// Fan slider
document.getElementById('fanSlider').addEventListener('input', (e) => {
  const val = e.target.value;
  document.getElementById('sliderValue').textContent = val + '%';
  // Note: Fan control via HTTP POST would need ESP32 support
  // For now, this is for display only in polling mode
});

// Auto/Manual mode toggle
document.getElementById('autoBtn').addEventListener('click', () => {
  manualMode = false;
  document.getElementById('autoBtn').classList.add('active');
  document.getElementById('manualBtn').classList.remove('active');
  // Note: Mode control via HTTP POST would need ESP32 support
});

document.getElementById('manualBtn').addEventListener('click', () => {
  manualMode = true;
  document.getElementById('manualBtn').classList.add('active');
  document.getElementById('autoBtn').classList.remove('active');
  // Note: Mode control via HTTP POST would need ESP32 support
});

// Analytics Dashboard Functions
let analyticsChart = null;

function initAnalyticsChart() {
  const ctx = document.getElementById('analyticsChart');
  if (!ctx) return;
  
  const ctxCanvas = ctx.getContext('2d');
  analyticsChart = new Chart(ctxCanvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'PM2.5 Historical (mg/m³)',
        data: [],
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#00ff88',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true, 
          labels: { color: '#00d4ff', font: { size: 12 } }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'mg/m³' },
          grid: { color: 'rgba(0,255,136,0.1)' },
          ticks: { color: '#888' }
        },
        x: {
          grid: { color: 'rgba(0,255,136,0.1)' },
          ticks: { color: '#888' }
        }
      }
    }
  });
}

function getTimeRangeMs(range) {
  const now = Date.now();
  switch(range) {
    case '24h': return now - (24 * 60 * 60 * 1000);
    case '7d': return now - (7 * 24 * 60 * 60 * 1000);
    case '30d': return now - (30 * 24 * 60 * 60 * 1000);
    default: return now - (24 * 60 * 60 * 1000);
  }
}

function formatAnalyticsTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function updateAnalyticsStats(readings) {
  if (!readings || readings.length === 0) {
    document.getElementById('avgPM').textContent = '—';
    document.getElementById('peakPM').textContent = '—';
    document.getElementById('minPM').textContent = '—';
    return;
  }

  const pmValues = readings
    .map(r => parseFloat(r.pm) || 0)
    .filter(v => v > 0);
  
  if (pmValues.length === 0) {
    document.getElementById('avgPM').textContent = '—';
    document.getElementById('peakPM').textContent = '—';
    document.getElementById('minPM').textContent = '—';
    return;
  }

  const avg = pmValues.reduce((a, b) => a + b, 0) / pmValues.length;
  const peak = Math.max(...pmValues);
  const min = Math.min(...pmValues);

  document.getElementById('avgPM').textContent = avg.toFixed(3);
  document.getElementById('peakPM').textContent = peak.toFixed(3);
  document.getElementById('minPM').textContent = min.toFixed(3);
}

function loadAnalyticsData(range) {
  if (!window.FIREBASE_CONFIG || Object.keys(window.FIREBASE_CONFIG).length === 0) {
    document.getElementById('chartInfo').textContent = 'Firebase not configured';
    return;
  }
  
  if (!window.firebase || !window.firebase.firestore) {
    document.getElementById('chartInfo').textContent = 'Loading...';
    return;
  }

  try {
    const db = firebase.firestore();
    const startTime = getTimeRangeMs(range);

    // Update button states
    document.querySelectorAll('.btn-range').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-range="${range}"]`).classList.add('active');

    document.getElementById('chartInfo').textContent = 'Loading historical data...';

    db.collection('readings')
      .where('ts', '>=', startTime)
      .orderBy('ts', 'asc')
      .limit(500)
      .get()
      .then(snapshot => {
        const readings = snapshot.docs.map(doc => doc.data());

        if (readings.length === 0) {
          document.getElementById('chartInfo').textContent = 'No data available for this period';
          if (analyticsChart) {
            analyticsChart.data.labels = [];
            analyticsChart.data.datasets[0].data = [];
            analyticsChart.update();
          }
          return;
        }

        // Group by hour and calculate average
        const grouped = {};
        readings.forEach(r => {
          const date = new Date(r.ts);
          const hourKey = date.toLocaleDateString('en-US') + ' ' + 
                         (date.getHours().toString().padStart(2, '0') + ':00');
          if (!grouped[hourKey]) {
            grouped[hourKey] = [];
          }
          grouped[hourKey].push(parseFloat(r.pm) || 0);
        });

        const labels = Object.keys(grouped);
        const data = labels.map(key => {
          const values = grouped[key];
          return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(3);
        });

        if (analyticsChart) {
          analyticsChart.data.labels = labels;
          analyticsChart.data.datasets[0].data = data;
          analyticsChart.update();
        }

        updateAnalyticsStats(readings);
        document.getElementById('chartInfo').textContent = 
          `Showing ${readings.length} readings (${labels.length} hours)`;
      })
      .catch(error => {
        console.error('Error loading analytics data:', error);
        document.getElementById('chartInfo').textContent = 'Error loading data: ' + error.message;
      });
  } catch (e) {
    console.error('Analytics error:', e);
    document.getElementById('chartInfo').textContent = 'Error: ' + e.message;
  }
}

// Analytics Event Listeners
function initAnalyticsDashboard() {
  // Initialize chart
  initAnalyticsChart();

  // Time range buttons
  document.querySelectorAll('.btn-range').forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.getAttribute('data-range');
      loadAnalyticsData(range);
    });
  });

  // Load default range on page load
  setTimeout(() => loadAnalyticsData('24h'), 1000);
}

// Initialize Firebase
if (window.FIREBASE_CONFIG && Object.keys(window.FIREBASE_CONFIG).length > 0) {
  try {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    console.log('Firebase initialized');
    // Initialize analytics dashboard after Firebase is ready
    setTimeout(() => initAnalyticsDashboard(), 500);
  } catch (e) {
    console.warn('Firebase already initialized or config missing:', e);
    setTimeout(() => initAnalyticsDashboard(), 500);
  }
}
