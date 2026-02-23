let running = false;

const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");
const dialEl = document.getElementById("dial");
const dialWrapper = document.querySelector(".dial-wrapper");

let radioTimerId = null;
let paranormalTimerId = null;
let displayUpdateId = null; // Nuevo timer para los kHz constantes
let phrases = [];

// Cargar frases
fetch('phrases.json')
  .then(response => response.json())
  .then(data => phrases = data.phrases)
  .catch(err => console.error("Error frases:", err));

// --- LÓGICA DEL DIAL EN TIEMPO REAL ---

function updateFrequencyDisplay() {
  if (!dialEl || !dialWrapper) return;

  // Obtenemos la posición actual de la línea del dial respecto al contenedor
  const dialRect = dialEl.getBoundingClientRect();
  const wrapperRect = dialWrapper.getBoundingClientRect();

  // Calculamos el porcentaje de avance (0 a 1)
  const offset = dialRect.left - wrapperRect.left;
  const width = wrapperRect.width - dialRect.width;
  let percent = offset / width;

  // Limitar entre 0 y 1 por seguridad
  percent = Math.max(0, Math.min(1, percent));

  // Mapear el porcentaje al rango 153.000 - 281.000
  const minFreq = 153;
  const maxFreq = 281;
  const currentFreq = (minFreq + (percent * (maxFreq - minFreq))).toFixed(3);

  msgEl.textContent = `${currentFreq} kHz`;
}

// --- SÍNTESIS DE VOZ TÉTRICA ---

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
    msgEl.classList.add('evp-active'); // Poner números en rojo
    staticNoise.volume = 0.05;
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
  };

  utterance.onend = () => {
    msgEl.classList.remove('evp-active'); // Volver a cian
    if (running) staticNoise.volume = 0.15;
  };

  window.speechSynthesis.speak(utterance);
}

// --- LÓGICA DE AUDIO ---

function playRandomRadioSlice() {
  if (!running || !radioBank.duration) return;
  const start = Math.random() * (radioBank.duration - 2);
  radioBank.currentTime = start;
  radioBank.volume = 0.25;
  radioBank.play().catch(() => {});
  setTimeout(() => { if (!running) radioBank.pause(); }, 2000);
}

// --- CONTROL DE INICIO / PARADA ---

function startRadio() {
  if (running) return;
  running = true;
  btnToggle.textContent = "Detener";

  // Iniciar movimiento visual
  dialEl.classList.remove('paused-anim');

  // 1. Actualización constante de kHz (independiente de todo)
  displayUpdateId = setInterval(updateFrequencyDisplay, 50);

  // 2. Ruido de fondo
  staticNoise.volume = 0.15;
  staticNoise.play().catch(() => {});

  // 3. Intervalos de Radio y Voces
  playRandomRadioSlice();
  radioTimerId = setInterval(playRandomRadioSlice, 20000);

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

  // Pausar visuales
  dialEl.classList.add('paused-anim');
  
  // Limpiar todos los procesos
  clearInterval(displayUpdateId);
  clearInterval(radioTimerId);
  clearInterval(paranormalTimerId);
  
  staticNoise.pause();
  radioBank.pause();
  window.speechSynthesis.cancel();

  msgEl.classList.remove('evp-active');
  // No borramos el número para que se quede "congelado" donde paró
}

btnToggle.addEventListener("click", () => {
  const unlock = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(unlock);
  if (running) stopRadio(); else startRadio();
});

// Inicializar pausado
window.addEventListener('load', () => {
  dialEl.classList.add('paused-anim');
  updateFrequencyDisplay(); // Mostrar frecuencia inicial
});
