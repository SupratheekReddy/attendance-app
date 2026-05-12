// register.js — Handle new user registration
(function () {
  const API_BASE = 'https://theprintshoppe-api.onrender.com';
  // Elements
  const detailsSection = document.getElementById('detailsSection');
  const cameraSection = document.getElementById('cameraSection');
  const userNameInput = document.getElementById('userName');
  const userIdInput = document.getElementById('userId');
  const startCamBtn = document.getElementById('startCamBtn');
  const registerBtn = document.getElementById('registerBtn');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  const statusBar = document.getElementById('statusBar');
  const statusMsg = document.getElementById('statusMsg');

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
    
    // Auto hide after 6 seconds for location errors as they are long
    setTimeout(() => { 
      statusBar.classList.remove('show');
    }, 6000);
  }

  function showLoading(show, text = 'Processing...') {
    loadingText.textContent = text;
    loadingOverlay.classList.toggle('hidden', !show);
    loadingOverlay.classList.toggle('flex', show);
  }

  // Step 1: Switch to Camera
  startCamBtn.onclick = async () => {
    const name = userNameInput.value.trim();
    const id = userIdInput.value.trim().toUpperCase();

    if (!name || !id) return alert('Please enter both Name and ID');

    showLoading(true, 'Verifying location...');
    try {
      await GEO.check();
      
      detailsSection.classList.add('hidden');
      cameraSection.classList.remove('hidden');
      
      // Tiny delay to ensure video element is rendered
      setTimeout(() => {
        startCameraFlow();
      }, 100);
    } catch (err) {
      showStatus(err.message || 'Location verification failed', 'error');
    } finally {
      showLoading(false);
    }
  };

  async function startCameraFlow() {
    showLoading(true, 'Starting camera...');
    try {
      await FaceSetup.loadModels();
      await FaceSetup.startCamera();
      showStatus('Camera ready. Please look at the frame.', 'success');
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  // Step 2: Capture and Register
  registerBtn.onclick = async () => {
    showLoading(true, 'Capturing face data...');
    try {
      const video = document.getElementById('video');
      const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) throw new Error('No face detected. Try again.');

      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userNameInput.value.trim(),
          userId: userIdInput.value.trim().toUpperCase(),
          faceDescriptor: Array.from(detection.descriptor)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Registration successful!');
      FaceSetup.stopCamera();
      window.location.href = '/';
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      showLoading(false);
    }
  };

})();
