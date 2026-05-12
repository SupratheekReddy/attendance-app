// attendance.js — Handle face verification and marking entry/exit
(function () {
  const API_BASE = 'https://theprintshoppe-api.onrender.com';
  // Elements
  const idInputSection = document.getElementById('idInputSection');
  const userIdInput = document.getElementById('userIdInput');
  const startAuthBtn = document.getElementById('startAuthBtn');
  const authSection = document.getElementById('authSection');
  const markBtn = document.getElementById('markBtn');
  const resultCard = document.getElementById('resultCard');
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const resultTime = document.getElementById('resultTime');
  const resultDetail = document.getElementById('resultDetail');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  const statusBar = document.getElementById('statusBar');
  const statusMsg = document.getElementById('statusMsg');

  // State
  let registeredUsers = [];
  let targetUser = null;
  let isCameraReady = false;

  function showStatus(msg, type) {
    const icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    const iconEl = document.getElementById('statusIcon');
    if (iconEl) iconEl.textContent = icons[type] || 'info';

    statusBar.className = 'status-bar show ' + type;
    statusMsg.textContent = msg;
    setTimeout(() => { statusBar.classList.remove('show'); }, 6000);
  }

  function showLoading(show, text = 'Initializing...') {
    loadingText.textContent = text;
    loadingOverlay.classList.toggle('show', show);
  }

  // 1. Initial Load: Fetch all descriptors for validation later
  async function init() {
    showLoading(true, 'Loading facial models...');
    try {
      await FaceSetup.loadModels();
      const res = await fetch(`${API_BASE}/api/auth/descriptors`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Access denied. Must be on office WiFi.');
      
      // Convert raw descriptor arrays back to Float32Array
      registeredUsers = data.map(user => ({
        ...user,
        descriptor: new Float32Array(Object.values(user.faceDescriptor))
      }));
      
      showLoading(false);
    } catch (err) {
      showLoading(false);
      showStatus(err.message, 'error');
    }
  }

  // 2. Step 1: Validate ID
  startAuthBtn.onclick = async () => {
    const id = userIdInput.value.trim().toUpperCase();
    if (!id) return showStatus('Please enter your Employee ID', 'warning');

    targetUser = registeredUsers.find(u => u.userId === id);
    if (!targetUser) return showStatus(`Employee ID "${id}" not found.`, 'error');

    showLoading(true, 'Verifying location...');
    try {
      // Check Geofence BEFORE switching views
      const distance = await GEO.check();
      
      // ID and Location are valid, show camera section
      idInputSection.style.display = 'none';
      authSection.style.display = 'block';
      
      // Give the browser a split second to render the newly visible video element
      setTimeout(() => {
        startCameraFlow(distance);
      }, 100);
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      showLoading(false);
    }
  };

  async function startCameraFlow(distance) {
    showLoading(true, 'Starting camera...');
    try {
      await FaceSetup.startCamera();
      isCameraReady = true;
      showStatus(`Location verified: You are ${distance}m from office.`, 'success');
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  // 3. Step 2: Verification & Marking
  markBtn.onclick = async () => {
    if (!isCameraReady) return showStatus('Camera not ready', 'warning');

    showLoading(true, 'Analyzing face...');
    try {
      // Find face in video
      const detection = await faceapi.detectSingleFace(
        document.getElementById('video'),
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) throw new Error('No face detected. Please look directly at the camera.');

      // Compare with the target user only
      const distance = faceapi.euclideanDistance(detection.descriptor, targetUser.descriptor);
      console.log(`Match distance for ${targetUser.userId}: ${distance.toFixed(4)}`);

      if (distance > 0.45) { // Match threshold
        throw new Error('Face does not match the Employee ID provided.');
      }

      // Match found! Call API to mark attendance
      const res = await fetch(`${API_BASE}/api/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser.userId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      displayResult(result);
      FaceSetup.stopCamera();
      authSection.style.display = 'none';
      isCameraReady = false;
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      showLoading(false);
    }
  };

  function displayResult(data) {
    resultCard.style.display = 'block';
    resultTitle.textContent = data.type === 'entry' ? 'Entry Marked!' : 'Exit Marked!';
    resultIcon.textContent = data.type === 'entry' ? '👋' : '🏃';
    resultIcon.className = 'result-icon ' + (data.type === 'entry' ? 'success' : 'info');
    
    const timeStr = new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    resultTime.textContent = timeStr;
    resultDetail.textContent = data.message;
  }

  init();
})();
