let running = false;

const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");

const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");

// Timers
let radioTimerId = null;
let paranormalTimerId = null;

// Frases desde phrases.json
let phrases = [];

// Web Speech API (TTS)
const synth = window.speechSynthesis;

// ---------- Cargar frases ----------

async function loadPhrases() {
  try {
    const res = await fetch("phrases.json");
    const data = await res.json();
    phrases = Array.isArray(data.phrases) ? data.phrases : [];
  } catch (err) {
    console.error("Error cargando phrases.json", err);
    phrases = [];
  }
}

function getRandomPhrase() {
  if (!phrases.length) return "";
  const idx = Math.floor(Math.random() * phrases.length);
  return phrases[idx];
}

// ---------- Voz tenebrosa ----------

function speakCreepy(text) {
  if (!text || !("speechSynthesis" in window)) return;

  // Cancelar cualquier locución anterior
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);

  utter.lang = "es-ES";

  // Parámetros base tenebrosos
  const baseRate = 0.6;  // lento
  const basePitch = 0.4; // grave

  // Pequeña variación aleatoria para que no suene igual siempre
  const rateJitter = (Math.random() - 0.5) * 0.1;   // ±0.05
  const pitchJitter = (Math.random() - 0.5) * 0.1;  // ±0.05

  utter.rate = Math.max(0.4, baseRate + rateJitter);
  utter.pitch = Math.max(0.1, basePitch + pitchJitter);
  utter.volume = 1.0;

  synth.speak(utter);
}

// ---------- Audio de radio ----------

function playRandomRadioSlice() {
  if (!radioBank.duration || Number.isNaN(radioBank.duration)) {
    radioBank.addEventListener(
      "loadedmetadata",
      () => {
        playRandomRadioSlice();
      },
      { once: true }
    );
    return;
  }

  const total = radioBank.duration;
  const sliceLength = 2; // segundos

  if (total <= sliceLength) {
    radioBank.currentTime = 0;
    radioBank.play().catch(() => {});
    return;
  }

  const start = Math.random() * (total - sliceLength);
  const end = start + sliceLength;

  radioBank.currentTime = start;
  radioBank.volume = 0.35;
  radioBank.play().catch(() => {});

  const stopTimer = setInterval(() => {
    if (radioBank.currentTime >= end || radioBank.paused) {
      radioBank.pause();
      clearInterval(stopTimer);
    }
  }, 50);
}

// Solo trozo de radio
function transmitRadio() {
  playRandomRadioSlice();
}

// Después del primer intervalo, empezar a “hablar”
function scheduleParanormalVoices(intervalSec) {
  setTimeout(() => {
    // Primera vez
    const phrase = getRandomPhrase();
    speakCreepy(phrase);

    // Luego cada intervalo
    paranormalTimerId = setInterval(() => {
      const p = getRandomPhrase();
      speakCreepy(p);
    }, intervalSec * 1000);
  }, intervalSec * 1000);
}

// ---------- Control general ----------

function startRadio() {
  if (running) return;
  running = true;
  btnToggle.textContent = "Detener";

  const intervalSec = 30; // 30 s fijo

  // Estático ambiente
  staticNoise.volume = 0.15;
  staticNoise.play().catch(() => {});

  // Radio: primer trozo inmediato
  transmitRadio();
  radioTimerId = setInterval(transmitRadio, intervalSec * 1000);

  // Voces: empiezan tras el primer intervalo
  scheduleParanormalVoices(intervalSec);
}

function stopRadio() {
  running = false;
  btnToggle.textContent = "Iniciar";

  if (radioTimerId) {
    clearInterval(radioTimerId);
    radioTimerId = null;
  }
  if (paranormalTimerId) {
    clearInterval(paranormalTimerId);
    paranormalTimerId = null;
  }

  staticNoise.pause();
  radioBank.pause();
  synth.cancel();
}

// Botón (desbloquea audio y voz en móvil)
btnToggle.addEventListener("click", () => {
  // Intento de play para desbloquear audio en iOS/Android
  staticNoise.play().catch(() => {});
  radioBank.play().catch(() => {
    radioBank.pause();
  });

  if (running) {
    stopRadio();
  } else {
    startRadio();
  }
});

// Al cargar: limpiar texto y cargar frases
if (msgEl) msgEl.textContent = "";
loadPhrases();
