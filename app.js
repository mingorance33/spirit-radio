let running = false;

const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");

let radioTimerId = null;
let paranormalTimerId = null;

// --- Configuración de Frases y Voz ---
let phrases = [];

// Cargar las frases del JSON al iniciar
fetch('phrases.json')
  .then(response => response.json())
  .then(data => {
    phrases = data.phrases;
  });

function speakTetric(text) {
  if (!text) return;

  // Mostrar el texto en pantalla (opcional, puedes comentarlo si prefieres secreto)
  if (msgEl) msgEl.textContent = text;

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Configuración para voz "tétrica"
  utterance.lang = 'es-ES'; 
  utterance.pitch = 0.1;  // Muy grave
  utterance.rate = 0.6;   // Muy lento
  utterance.volume = 1;

  // Intentar seleccionar una voz masculina si está disponible (suelen sonar más roncas al bajar el pitch)
  const voices = window.speechSynthesis.getVoices();
  const maleVoice = voices.find(voice => voice.lang.includes('es') && voice.name.toLowerCase().includes('google'));
  if (maleVoice) utterance.voice = maleVoice;

  window.speechSynthesis.speak(utterance);
}

// Reproduce una frase aleatoria
function playRandomParanormalClip() {
  if (phrases.length === 0) return;
  const idx = Math.floor(Math.random() * phrases.length);
  speakTetric(phrases[idx]);
}

// --- El resto de tus funciones se mantienen igual ---

function playRandomRadioSlice() {
  if (!radioBank.duration || Number.isNaN(radioBank.duration)) return;

  const total = radioBank.duration;
  const sliceLength = 2; 

  if (total <= sliceLength) {
    radioBank.currentTime = 0;
    radioBank.play().catch(() => {});
    return;
  }

  const start = Math.random() * (total - sliceLength);
  const end = start + sliceLength;

  radioBank.currentTime = start;
  radioBank.volume = 0.25; // Bajamos un poco para que se oiga la voz
  radioBank.play().catch(() => {});

  const stopTimer = setInterval(() => {
    if (radioBank.currentTime >= end || radioBank.paused) {
      radioBank.pause();
      clearInterval(stopTimer);
    }
  }, 50);
}

function transmitRadio() {
  playRandomRadioSlice();
}

function scheduleParanormals(intervalSec) {
  setTimeout(() => {
    playRandomParanormalClip();
    paranormalTimerId = setInterval(playRandomParanormalClip, intervalSec * 1000);
  }, intervalSec * 1000);
}

function startRadio() {
  if (running) return;
  running = true;
  btnToggle.textContent = "Detener";

  const intervalSec = 20; // Bajamos a 20s para que sea más dinámico

  staticNoise.volume = 0.1;
  staticNoise.play().catch(() => {});

  transmitRadio();
  radioTimerId = setInterval(transmitRadio, intervalSec * 1000);
  scheduleParanormals(intervalSec);
}

function stopRadio() {
  running = false;
  btnToggle.textContent = "Iniciar";
  if (radioTimerId) clearInterval(radioTimerId);
  if (paranormalTimerId) clearInterval(paranormalTimerId);
  staticNoise.pause();
  radioBank.pause();
  window.speechSynthesis.cancel(); // Detener el habla si está activa
}

btnToggle.addEventListener("click", () => {
  // En móviles es CRUCIAL que el primer sonido ocurra dentro de un click
  // Despertamos el motor de síntesis
  const vaceo = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(vaceo);

  if (running) {
    stopRadio();
  } else {
    startRadio();
  }
});
