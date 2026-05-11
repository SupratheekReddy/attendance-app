// faceSetup.js — Shared camera and face-api initialization
window.FaceSetup = (function () {
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

  async function loadModels() {
    console.log('Loading models from:', MODEL_URL);
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    console.log('Models loaded successfully.');
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      const video = document.getElementById('video');
      if (!video) {
        throw new Error('Video element not found in DOM.');
      }

      video.srcObject = stream;
      
      // Crucial: Wait for video to be ready and play
      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(e => {
            console.warn('Auto-play failed, trying explicit play', e);
            resolve();
          });
        };
      });
    } catch (err) {
      console.error('Camera Error:', err);
      throw new Error(`Could not access camera: ${err.message}`);
    }
  }

  function stopCamera() {
    const video = document.getElementById('video');
    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      video.srcObject = null;
    }
  }

  return { loadModels, startCamera, stopCamera };
})();
