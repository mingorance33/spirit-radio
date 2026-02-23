let running = false;

const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");

const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");

// Timer para trozos de radio
let radioTimerId = null;
// Timer para clips paranormales (después del primer intervalo)
let paranormalTimerId = null;

// Clips paranormales: 1.mp3, 2.mp3, 3.mp3...
const paranormalClips = [
  "1.mp3",
  "2.mp3",
  "3.mp3"
  // añade más: "4.mp3", "5.mp3", ...
];

// No mostramos texto
if (msgEl) {
  msgEl.textContent = "";
}

// ---------- Utilidades de audio ----------

// Clip paranormal aleatorio (nuevo Audio para que puedan solaparse)
function playRandomParanormalClip() {
  if (!paranormalClips.length) return;
  const idx = Math.floor(Math.random() * paranormalClips.length);
  const src = paranormalClips[idx];
  const audio = new Audio(src);
  audio.volume = 0.95; // volumen alto
  audio.play().catch(() => {});
}

// Reproduce un trozo aleatorio de 2 segundos de radio.mp3
function playRandomRadioSlice() {
  if (!radioBank.duration || Number.isNaN(radioBank.duration)) {
    // Si aún no se ha cargado la duración, esperamos al evento y reintentamos
    radioBank.addEventListener(
      "loadedmetadata",
      () => {
        playRandomRadioSlice();
      },
      { once: true }
    );
    return;
  }

  const total = radioBank.duration; // en segundos
  const sliceLength = 2; // duración del trozo

  if (total <= sliceLength) {
    // Si el archivo es muy corto, lo reproducimos tal cual
    radioBank.currentTime = 0;
    radioBank.play().catch(() => {});
    return;
  }

  // Elegimos un inicio aleatorio que deje 2s hasta el final
  const start = Math.random() * (total - sliceLength);
  const end = start + sliceLength;

  radioBank.currentTime = start;
  radioBank.volume = 0.35; // volumen bajo/medio
  radioBank.play().catch(() => {});

  // Parar justo a los 2 segundos
  const stopTimer = setInterval(() => {
    if (radioBank.currentTime >= end || radioBank.paused) {
      radioBank.pause();
      clearInterval(stopTimer);
    }
  }, 50);
}

// Una “transmisión” de radio: solo trozo de radio
function transmitRadio() {
  playRandomRadioSlice();
}

// Programa los clips paranormales para que empiecen tras el primer intervalo
function scheduleParanormals(intervalSec) {
  // Espera el primer intervalo completo antes de sonar
  setTimeout(() => {
    // Primera vez
    playRandomParanormalClip();

    // Luego cada intervalo fijo
    paranormalTimerId = setInterval(playRandomParanormalClip, intervalSec * 1000);
  }, intervalSec * 1000);
}

// ---------- Control de la “radio” ----------

function startRadio() {
  if (running) return;
  running = true;
  btnToggle.textContent = "Detener";

  const intervalSec = 30; // 30 segundos fijo

  // Estático ambiente continuo
  staticNoise.volume = 0.15;
  staticNoise.play().catch(() => {});

  // Radio: primera transmisión inmediata
  transmitRadio();
  radioTimerId = setInterval(transmitRadio, intervalSec * 1000);

  // Paranormales: empiezan después del primer intervalo
  scheduleParanormals(intervalSec);
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
}

// Botón (también sirve para desbloquear audio en móvil)
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
