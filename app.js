let running = false;

const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");
const dialEl = document.getElementById("dial");

let radioTimerId = null;
let paranormalTimerId = null;
let phrases = [];

// Cargar frases desde el JSON
fetch('phrases.json')
  .then(response => response.json())
  .then(data => {
    phrases = data.phrases;
  })
  .catch(err => console.error("Error cargando frases:", err));

// Inicializar estado
window.addEventListener('load', () => {
  if (dialEl) dialEl.classList.add('paused-anim');
  if (msgEl) msgEl.textContent = "---.--- kHz";
});

// Función para simular el dial numérico con 3 decimales
function animateFrequency(callback) {
  let steps = 0;
  const maxSteps = 20; // Duración del parpadeo de números
  
  const interval = setInterval(() => {
    // Generar número aleatorio entre 153 y 281 con 3 decimales
    const randomFreq = (Math.random() * (281 - 153) + 153).toFixed(3);
    if (msgEl) msgEl.textContent = `${randomFreq} kHz`;
    
    steps++;
    if (steps >= maxSteps) {
      clearInterval(interval);
      callback(); // Ejecutar la voz cuando el número se detenga
    }
  }, 50);
}

// Función de voz de ultratumba
function speakTetric(text) {
  if (!running || !text || !window.speechSynthesis) return;

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
    if (!running) {
        window.speechSynthesis.cancel();
        return;
    }
    // Efecto visual y físico
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

// Reproducir trozos de radio.mp3
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

// Controles principales
function startRadio() {
  if (running) return;
  running = true;
  btnToggle.textContent = "Detener";

  if (dialEl) dialEl.classList.remove('paused-anim');

  const intervalSec = 25; 

  staticNoise.volume = 0.15;
  staticNoise.play().catch(() => {});

  playRandomRadioSlice();
  
  radioTimerId = setInterval(() => {
      if(running) playRandomRadioSlice();
  }, intervalSec * 1000);

  paranormalTimerId = setInterval(() => {
      if(running && phrases.length > 0) {
          // Primero animamos el número, luego habla
          animateFrequency(() => {
              const idx = Math.floor(Math.random() * phrases.length);
              speakTetric(phrases[idx]);
          });
      }
  }, (intervalSec + 5) * 1000); 
}

function stopRadio() {
  running = false;
  btnToggle.textContent = "Iniciar";

  if (dialEl) dialEl.classList.add('paused-anim');

  clearInterval(radioTimerId);
  clearInterval(paranormalTimerId);
  radioTimerId = null;
  paranormalTimerId = null;

  staticNoise.pause();
  radioBank.pause();
  
  window.speechSynthesis.cancel();

  if (msgEl) msgEl.textContent = "---.--- kHz";
  if (dialEl) dialEl.style.boxShadow = "0 0 8px rgba(0, 255, 255, 0.6)";
}

btnToggle.addEventListener("click", () => {
  const unlock = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(unlock);

  if (running) {
    stopRadio();
  } else {
    startRadio();
  }
});
