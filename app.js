let running = false;

const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");
const dialEl = document.getElementById("dial");
const dialWrapper = document.querySelector(".dial-wrapper");

let radioTimerId = null;
let paranormalTimerId = null;
let displayUpdateId = null;
let phrases = [];

// Cargar frases del JSON
fetch('phrases.json')
  .then(response => response.json())
  .then(data => phrases = data.phrases)
  .catch(err => console.error("Error frases:", err));

// --- 1. LÓGICA DEL DIAL (kHz SIEMPRE ACTIVOS) ---
function updateFrequencyDisplay() {
  if (!dialEl || !dialWrapper || !running) return;

  const dialRect = dialEl.getBoundingClientRect();
  const wrapperRect = dialWrapper.getBoundingClientRect();

  const offset = dialRect.left - wrapperRect.left;
  const width = wrapperRect.width - dialRect.width;
  let percent = offset / width;

  percent = Math.max(0, Math.min(1, percent));

  const minFreq = 153.000;
  const maxFreq = 281.000;
  const currentFreq = (minFreq + (percent * (maxFreq - minFreq))).toFixed(3);

  msgEl.textContent = `${currentFreq} kHz`;
}

// --- 2. LÓGICA DE RADIO (FRAGMENTOS DE 2 SEG) ---
function playRandomRadioSlice() {
  if (!running || !radioBank.duration) return;

  // Elegir un punto aleatorio asegurando que queden al menos 2 seg de audio
  const sliceLength = 2; 
  const startTime = Math.random() * (radioBank.duration - sliceLength);
  
  radioBank.currentTime = startTime;
  radioBank.volume = 0.3; // Volumen de la "emisora" captada
  
  // Reproducir
  radioBank.play().catch(e => console.log("Error play radio:", e));

  // Forzar la parada exactamente 2 segundos después
  setTimeout(() => {
    radioBank.pause();
  }, sliceLength * 1000);
}

// --- 3. SÍNTESIS DE VOZ TÉTRICA ---
function speakTetric(text) {
  if (!running || !text || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  utterance.lang = 'es-ES'; 
  utterance.pitch = 0.1;  
  utterance.rate = 0.5;   
  utterance.volume = 1.0;

  utterance.onstart = () => {
    if (!running) { window.speechSynthesis.cancel(); return; }
    msgEl.classList.add('evp-active');
    staticNoise.volume = 0.05; // Baja el estático mientras habla
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
  };

  utterance.onend = () => {
    msgEl.classList.remove('evp-active');
    if (running) staticNoise.volume = 0.15;
  };

  window.speechSynthesis.speak(utterance);
}

// --- 4. CONTROLES ---
function startRadio() {
  if (running) return;
  running = true;
  btnToggle.textContent = "Detener";
  dialEl.classList.remove('paused-anim');

  // Actualizar kHz constantemente
  displayUpdateId = setInterval(updateFrequencyDisplay, 50);

  // Ruido estático constante de fondo
  staticNoise.volume = 0.15;
  staticNoise.play().catch(() => {});

  // Ejecutar primer fragmento de radio inmediatamente
  playRandomRadioSlice();
  
  // Programar fragmentos de radio cada 15 segundos
  radioTimerId = setInterval(() => {
    if (running) playRandomRadioSlice();
  }, 15000);

  // Programar frases tétricas cada 25 segundos
  paranormalTimerId = setInterval(() => {
    if (running && phrases.length > 0) {
      const idx = Math.floor(Math.random() * phrases.length);
      speakTetric(phrases[idx]);
    }
  }, 25000);
}

function stopRadio() {
  running = false;
  btnToggle.textContent = "Iniciar";
  dialEl.classList.add('paused-anim');
  
  clearInterval(displayUpdateId);
  clearInterval(radioTimerId);
  clearInterval(paranormalTimerId);
  
  staticNoise.pause();
  radioBank.pause(); // Detiene el fragmento de radio si estaba sonando
  window.speechSynthesis.cancel();

  msgEl.classList.remove('evp-active');
}

btnToggle.addEventListener("click", () => {
  // Desbloqueo de audio para móviles
  const unlock = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(unlock);
  
  if (running) stopRadio(); else startRadio();
});

window.addEventListener('load', () => {
  dialEl.classList.add('paused-anim');
  msgEl.textContent = "153.000 kHz";
});
