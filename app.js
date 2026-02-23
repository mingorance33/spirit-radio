let running = false;

const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");
const dialEl = document.getElementById("dial");

let radioTimerId = null;
let paranormalTimerId = null;
let phrases = [];

// 1. Cargar frases desde el JSON
fetch('phrases.json')
  .then(response => response.json())
  .then(data => {
    phrases = data.phrases;
  })
  .catch(err => console.error("Error cargando frases:", err));

// 2. Función de voz de ultratumba
function speakTetric(text) {
  if (!text || !window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Configuración tétrica: muy grave y muy lento
  utterance.lang = 'es-ES'; 
  utterance.pitch = 0.1;  // Tono cavernoso
  utterance.rate = 0.5;   // Velocidad arrastrada
  utterance.volume = 1.0;

  // Buscar una voz masculina si está disponible para mayor profundidad
  const voices = window.speechSynthesis.getVoices();
  const maleVoice = voices.find(v => v.lang.includes('es') && (v.name.includes('Male') || v.name.includes('Google')));
  if (maleVoice) utterance.voice = maleVoice;

  // Evento al empezar a hablar
  utterance.onstart = () => {
    if (msgEl) msgEl.textContent = text;
    if (dialEl) dialEl.style.boxShadow = "0 0 20px #ff0000"; // Dial rojo
    staticNoise.volume = 0.05; // Atenuar ruido para que se entienda la voz
    
    // Vibración tétrica (patrón de pulso largo)
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  // Evento al terminar
  utterance.onend = () => {
    if (dialEl) dialEl.style.boxShadow = "0 0 8px rgba(0, 255, 255, 0.6)";
    staticNoise.volume = 0.15; // Restaurar ruido ambiente
  };

  window.speechSynthesis.speak(utterance);
}

// 3. Reproducir frase aleatoria del JSON
function playRandomParanormalClip() {
  if (phrases.length === 0) return;
  const idx = Math.floor(Math.random() * phrases.length);
  speakTetric(phrases[idx]);
}

// 4. Lógica de radio (trozos de radio.mp3)
function playRandomRadioSlice() {
  if (!radioBank.duration || Number.isNaN(radioBank.duration)) return;

  const total = radioBank.duration;
  const sliceLength = 2; 
  const start = Math.random() * (total - sliceLength);
  const end = start + sliceLength;

  radioBank.currentTime = start;
  radioBank.volume = 0.25; 
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

// 5. Controles de inicio/parada
function startRadio() {
  if (running) return;
  running = true;
  btnToggle.textContent = "Detener";

  const intervalSec = 25; // Tiempo entre psicofonías

  staticNoise.volume = 0.15;
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
  window.speechSynthesis.cancel(); // Silenciar voz inmediatamente
}

// Interacción inicial necesaria para navegadores móviles
btnToggle.addEventListener("click", () => {
  // Desbloqueamos el motor de síntesis con un mensaje vacío
  const unlockSpeech = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(unlockSpeech);

  if (running) {
    stopRadio();
  } else {
    startRadio();
  }
});
