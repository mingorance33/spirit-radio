let running = false;
const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const btnVisualizer = document.getElementById("btnVisualizer");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");
const dialEl = document.getElementById("dial");
const dialWrapper = document.querySelector(".dial-wrapper");

let radioTimerId = null;
let paranormalTimerId = null;
let displayUpdateId = null;
let phrases = [];

// --- NUEVA LÓGICA DE AUDIO ---
let visualWindow = null;
let audioCtx, analyser, dataArray;

function initAudioAnalysis() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        
        // Conectar los elementos de audio al analizador
        const sourceStatic = audioCtx.createMediaElementSource(staticNoise);
        const sourceRadio = audioCtx.createMediaElementSource(radioBank);
        
        sourceStatic.connect(analyser);
        sourceRadio.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        analyser.fftSize = 64; // Tamaño pequeño para que las ondas sean más reactivas
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
}

function sendDataToVisualizer() {
    if (visualWindow && !visualWindow.closed && running) {
        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        
        visualWindow.postMessage({
            type: 'AUDIO_UPDATE',
            volume: volume, // Volumen general
            raw: Array.from(dataArray) // Datos de frecuencia
        }, '*');
    }
}

// --- FUNCIONES ORIGINALES MODIFICADAS ---

fetch('phrases.json')
  .then(response => response.json())
  .then(data => phrases = data.phrases);

function updateFrequencyDisplay() {
  if (!dialEl || !dialWrapper || !running || msgEl.classList.contains('evp-active')) return;

  const dialRect = dialEl.getBoundingClientRect();
  const wrapperRect = dialWrapper.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (dialRect.left - wrapperRect.left) / (wrapperRect.width - dialRect.width)));
  
  const currentFreq = (153.000 + (percent * 128.000)).toFixed(3);
  msgEl.textContent = `${currentFreq} kHz`;
  
  // Enviamos datos al visualizador en cada frame de actualización
  sendDataToVisualizer();
}

function playRandomRadioSlice() {
  if (!running) return;
  radioBank.currentTime = Math.random() * (radioBank.duration || 10);
  radioBank.volume = 0.3 + Math.random() * 0.5;
  radioBank.play().catch(() => {});
  setTimeout(() => { if (running) radioBank.pause(); }, 400 + Math.random() * 1000);
}

function startRadio() {
  initAudioAnalysis(); // Inicializar audio al arrancar
  if (audioCtx.state === 'suspended') audioCtx.resume();

  running = true;
  btnToggle.textContent = "Detener";
  dialEl.classList.remove('paused-anim');
  displayUpdateId = setInterval(updateFrequencyDisplay, 50);
  staticNoise.volume = 0.15;
  staticNoise.play().catch(() => {});
  
  playRandomRadioSlice();
  radioTimerId = setInterval(() => { if (running) playRandomRadioSlice(); }, 15000);
}

function stopRadio() {
  running = false;
  btnToggle.textContent = "Iniciar";
  dialEl.classList.add('paused-anim');
  clearInterval(displayUpdateId);
  clearInterval(radioTimerId);
  staticNoise.pause();
  radioBank.pause();
  msgEl.textContent = "OFFLINE";
}

btnToggle.addEventListener("click", () => {
  if (running) stopRadio(); else startRadio();
});

btnVisualizer.addEventListener("click", () => {
    visualWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=500,height=700');
});
