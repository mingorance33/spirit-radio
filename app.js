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

// Cargar las frases desde el archivo JSON
fetch('phrases.json')
  .then(response => response.json())
  .then(data => phrases = data.phrases)
  .catch(err => console.error("Error cargando frases:", err));

/**
 * Actualiza el texto de frecuencia (kHz) basándose en la posición del dial.
 * Si hay una frase paranormal activa (clase evp-active), detiene la actualización
 * para que el usuario pueda leer la palabra.
 */
function updateFrequencyDisplay() {
  if (!dialEl || !dialWrapper || !running || msgEl.classList.contains('evp-active')) return;

  const dialRect = dialEl.getBoundingClientRect();
  const wrapperRect = dialWrapper.getBoundingClientRect();

  const offset = dialRect.left - wrapperRect.left;
  const width = wrapperRect.width - dialRect.width;
  let percent = offset / width;

  percent = Math.max(0, Math.min(1, percent));
  
  // Rango de frecuencia LW: 153 a 281 kHz
  const currentFreq = (153.000 + (percent * 128.000)).toFixed(3);
  msgEl.textContent = `${currentFreq} kHz`;
}

/**
 * Reproduce una frase usando síntesis de voz con un tono tétrico.
 */
function speakTetric(text) {
  // Cancelar cualquier voz pendiente para evitar saturación en móviles
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.pitch = 0.3; // Tono muy grave
  utterance.rate = 0.6;  // Velocidad lenta
  
  msgEl.classList.add('evp-active');
  msgEl.textContent = text.toUpperCase();
  
  utterance.onend = () => {
    if (running) msgEl.classList.remove('evp-active');
  };
  
  utterance.onerror = () => {
    if (running) msgEl.classList.remove('evp-active');
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Reproduce un fragmento aleatorio del banco de sonidos de radio.
 */
function playRandomRadioSlice() {
  if (!radioBank.duration) return;
  // Salta a un punto aleatorio (dejando margen al final)
  radioBank.currentTime = Math.random() * (radioBank.duration - 2);
  radioBank.volume = 0.4;
  radioBank.play().catch(() => {});
  
  // Suena durante 2 segundos y se detiene
  setTimeout(() => {
    if (running) radioBank.pause();
  }, 2000);
}

/**
 * Inicia todos los procesos de la aplicación.
 */
function startRadio() {
  running = true;
  btnToggle.textContent = "Detener";
  
  // Iniciar animaciones visuales (Dial y Ondas)
  dialEl.classList.remove('paused-anim');
  document.querySelectorAll('.wave-line').forEach(w => {
    w.style.animationPlayState = 'running';
  });
  
  // Iniciar actualización de kHz
  displayUpdateId = setInterval(updateFrequencyDisplay, 50);
  
  // Ruido estático de fondo (suave)
  staticNoise.volume = 0.15;
  staticNoise.play().catch(() => {});
  
  // Programar fragmentos de radio aleatorios (cada 12 segundos)
  playRandomRadioSlice();
  radioTimerId = setInterval(() => {
    if (running) playRandomRadioSlice();
  }, 12000);
  
  // Programar frases psicofónicas (cada 20 segundos)
  paranormalTimerId = setInterval(() => {
    if (running && phrases.length > 0) {
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      speakTetric(randomPhrase);
    }
  }, 20000);
}

/**
 * Detiene todos los procesos y limpia la interfaz.
 */
function stopRadio() {
  running = false;
  btnToggle.textContent = "Iniciar";
  
  // Pausar animaciones visuales
  dialEl.classList.add('paused-anim');
  document.querySelectorAll('.wave-line').forEach(w => {
    w.style.animationPlayState = 'paused';
  });
  
  // Limpiar intervalos
  clearInterval(displayUpdateId);
  clearInterval(radioTimerId);
  clearInterval(paranormalTimerId);
  
  // Detener sonidos y voz
  staticNoise.pause();
  radioBank.pause();
  window.speechSynthesis.cancel();
  
  // Resetear pantalla
  msgEl.textContent = "OFFLINE";
  msgEl.classList.remove('evp-active');
}

/**
 * Evento del botón principal. Incluye desbloqueo de audio para móviles.
 */
btnToggle.addEventListener("click", () => {
  // Truco para habilitar el motor de voz en iOS/Android bajo interacción del usuario
  const unlock = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(unlock);

  if (running) {
    stopRadio();
  } else {
    startRadio();
  }
});

// --- Lógica del Modal de Información ---
const modal = document.getElementById("infoModal");
const btnInfo = document.getElementById("btnInfo");
const spanClose = document.querySelector(".close");

btnInfo.onclick = () => modal.style.display = "block";
spanClose.onclick = () => modal.style.display = "none";
window.onclick = (event) => {
  if (event.target == modal) modal.style.display = "none";
};
