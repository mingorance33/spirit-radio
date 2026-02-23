let phrases = [];
let timerId = null;
let running = false;

const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const intervalInput = document.getElementById("intervalInput");
const noise = document.getElementById("noise");

// Cargar frases desde el JSON
async function loadPhrases() {
  try {
    const res = await fetch("phrases.json");
    const data = await res.json();
    phrases = Array.isArray(data.phrases) ? data.phrases : [];
  } catch (err) {
    console.error(err);
    phrases = [];
  }
}

// Devuelve una frase aleatoria
function getRandomPhrase() {
  if (!phrases.length) return "";
  const idx = Math.floor(Math.random() * phrases.length);
  return phrases[idx];
}

// Muestra una “transmisión”
function transmit() {
  const phrase = getRandomPhrase();
  if (!phrase) {
    msgEl.textContent = "Sin datos en phrases.json";
    return;
  }

  msgEl.textContent = "";

  // Simulamos que “se forma” la frase carácter a carácter
  let i = 0;
  const chars = phrase.split("");
  const typeInterval = setInterval(() => {
    msgEl.textContent += chars[i];
    i++;
    if (i >= chars.length) {
      clearInterval(typeInterval);
    }
  }, 80);
}

// Arrancar / parar radio
function startRadio() {
  if (running) return;
  running = true;
  btnToggle.textContent = "Detener";

  const intervalSec = Math.max(3, Number(intervalInput.value) || 10);
  transmit(); // primera frase inmediata
  timerId = setInterval(transmit, intervalSec * 1000);

  // Intentar reproducir ruido
  noise.volume = 0.4;
  noise.play().catch(() => {
    // Algunos navegadores bloquean el autoplay hasta interacción
  });
}

function stopRadio() {
  running = false;
  btnToggle.textContent = "Iniciar";
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  msgEl.textContent = "Esperando transmisión...";
  noise.pause();
}

// Evento botón
btnToggle.addEventListener("click", () => {
  if (running) {
    stopRadio();
  } else {
    startRadio();
  }
});

// Cargar frases al inicio
loadPhrases();
