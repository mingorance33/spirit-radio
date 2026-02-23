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

// 2. Función de voz de ultratumba (Mejorada para detenerse)
function speakTetric(text) {
  // Si la app se detuvo mientras se procesaba la función, abortamos
  if (!running || !text || !window.speechSynthesis) return;

  // Cancelar cualquier voz previa para evitar colas infinitas
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  utterance.lang = 'es-ES'; 
  utterance.pitch = 0.1;  
  utterance.rate = 0.5;   
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const maleVoice = voices.find(v => v.lang.includes('es') && (v.name.includes('Male') || v.name.includes('Google')));
  if (maleVoice) utterance.voice = maleVoice;

  utterance.onstart = () => {
    if (!running) { // Verificación de seguridad de último segundo
        window.speechSynthesis.cancel();
        return;
    }
    if (msgEl) msgEl.textContent = text;
    if (dialEl) dialEl.style.boxShadow = "0 0 20px #ff0000";
    staticNoise.volume = 0.05;
    
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  utterance.onend = () => {
    if (dialEl) dialEl.style.boxShadow = "0 0 8px rgba(0, 255, 255, 0.6)";
    if (running) staticNoise.volume = 0.15;
  };

  window.speechSynthesis.speak(utterance);
}

// 3. Reproducir trozos de radio.mp3
function playRandomRadioSlice() {
  if (!running || !radioBank.duration || Number.isNaN(radioBank.duration)) return;

  const total = radioBank.duration;
  const sliceLength = 2; 
  const start = Math.random() * (total - sliceLength);
  const end = start + sliceLength;

  radioBank.currentTime = start;
  radioBank.volume = 0.25; 
  radioBank.play().catch(() => {});

  const stopTimer = setInterval(() => {
    if (radioBank.currentTime >= end || radioBank.paused || !running) {
      radioBank.pause();
      clearInterval(stopTimer);
    }
  }, 50);
}

// 4. Controles principales (Blindados)
function startRadio() {
  if (running) return;
  running = true;
  btnToggle.textContent = "Detener";

  const intervalSec = 25; 

  staticNoise.volume = 0.15;
  staticNoise.play().catch(() => {});

  // Ejecución inmediata
  playRandomRadioSlice();
  
  radioTimerId = setInterval(() => {
      if(running) playRandomRadioSlice();
  }, intervalSec * 1000);

  // Programar voces
  paranormalTimerId = setInterval(() => {
      if(running && phrases.length > 0) {
          const idx = Math.floor(Math.random() * phrases.length);
          speakTetric(phrases[idx]);
      }
  }, (intervalSec + 5) * 1000); 
}

function stopRadio() {
  running = false;
  btnToggle.textContent = "Iniciar";

  // Limpiar todos los intervalos inmediatamente
  clearInterval(radioTimerId);
  clearInterval(paranormalTimerId);
  radioTimerId = null;
  paranormalTimerId = null;

  // Detener todos los audios
  staticNoise.pause();
  staticNoise.currentTime = 0;
  radioBank.pause();
  
  // ¡IMPORTANTE! Cancelar la voz de raíz
  window.speechSynthesis.cancel();

  if (msgEl) msgEl.textContent = "";
  if (dialEl) dialEl.style.boxShadow = "0 0 8px rgba(0, 255, 255, 0.6)";
}

btnToggle.addEventListener("click", () => {
  // Truco para iOS: siempre intentar hablar algo vacío para ganar permiso
  const unlock = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(unlock);

  if (running) {
    stopRadio();
  } else {
    startRadio();
  }
});
