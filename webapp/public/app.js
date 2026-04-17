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

// Animate circular gauge
function animateGauge(circleId, percentage, maxPercentage = 100) {
  const circle = document.getElementById(circleId);
  if (circle) {
    const circumference = 2 * Math.PI * 50; // radius=50
    const angle = (360 * percentage) / maxPercentage;
    const offset = circumference * (1 - angle / 360);
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = offset;
  }
}

// Format timestamp
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Update UI with sensor readings
function updateUI(data) {
  const pm = parseFloat(data.pm) || 0;
  const gas = parseInt(data.gas) || 0;
  const temp = parseFloat(data.temp);
  const hum = parseFloat(data.hum);
  const fan = parseInt(data.fan) || 0;
  const state = data.state || getState(pm, gas);

  // Update gauge values
  document.getElementById('pmVal').textContent = pm.toFixed(2);
  document.getElementById('gasVal').textContent = gas;
  document.getElementById('tempVal').textContent = !isNaN(temp) ? temp.toFixed(1) : '—';
  document.getElementById('humVal').textContent = !isNaN(hum) ? hum.toFixed(0) : '—';
  document.getElementById('fanVal').textContent = fan;

  // Animate gauges
  animateGauge('pmGauge', pm, 1.0);
  animateGauge('gasGauge', gas, 2000);
  animateGauge('fanGauge', fan, 100);

  // Update state display
  const stateEl = document.getElementById('stateDisplay');
  stateEl.textContent = state;
  stateEl.className = 'state-value ' + getStateColor(state);

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

  // Handle alerts
  const alertBox = document.getElementById('alertBox');
  if (state === 'DANGER') {
    alertBox.style.display = 'block';
    document.getElementById('alertText').textContent = '⚠️ DANGER: Activate fan immediately!';
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
    db.collection('readings').add(doc).catch(e => console.warn('Firestore error:', e));
  } catch (e) {
    console.warn(e);
  }
}

// WebSocket connection
function connectWS(url) {
  if (ws) { ws.close(); ws = null; }
  try {
    ws = new WebSocket(url);
    ws.onopen = () => {
      setStatus('Connected', 'safe');
      document.getElementById('connectBtn').textContent = 'Disconnect';
    };
    ws.onclose = () => {
      setStatus('Disconnected', '');
      document.getElementById('connectBtn').textContent = 'Connect';
    };
    ws.onerror = (e) => {
      console.error('WebSocket error:', e);
      setStatus('Connection Error', 'danger');
    };
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        updateUI(data);
      } catch (e) {
        console.warn('Invalid JSON:', msg.data);
      }
    };
  } catch (e) {
    console.error(e);
    setStatus('Connection Failed', 'danger');
  }
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
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    const url = document.getElementById('wsUrl').value.trim();
    if (url) connectWS(url);
    else alert('Enter WebSocket URL (e.g., ws://192.168.1.50:81)');
  } else {
    ws.close();
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
  if (manualMode && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ cmd: 'fan', value: parseInt(val) }));
  }
});

// Auto/Manual mode toggle
document.getElementById('autoBtn').addEventListener('click', () => {
  manualMode = false;
  document.getElementById('autoBtn').classList.add('active');
  document.getElementById('manualBtn').classList.remove('active');
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ cmd: 'mode', value: 'auto' }));
  }
});

document.getElementById('manualBtn').addEventListener('click', () => {
  manualMode = true;
  document.getElementById('manualBtn').classList.add('active');
  document.getElementById('autoBtn').classList.remove('active');
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ cmd: 'mode', value: 'manual' }));
  }
});

// Initialize Firebase
if (window.FIREBASE_CONFIG && Object.keys(window.FIREBASE_CONFIG).length > 0) {
  try {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    console.log('Firebase initialized');
  } catch (e) {
    console.warn('Firebase already initialized or config missing:', e);
  }
}
