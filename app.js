let timerId = null;
let running = false;

const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const intervalInput = document.getElementById("intervalInput");

const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");

// Clips paranormales: 1.mp3, 2.mp3, 3.mp3...
const paranormalClips = [
  "1.mp3",
  "2.mp3",
  "3.mp3"
  // añade más: "4.mp3", "5.mp3", ...
];

// Al iniciar, quitamos el texto para que no muestre nada
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

// Una “transmisión”: trozo de radio + clip paranormal
function transmit() {
  playRandomRadioSlice();
  // Ligerísimo retardo para que el paranormal entre justo encima de la radio
  setTimeout(() => {
    playRandomParanormalClip();
  }, 300);
}

// ---------- Control de la “radio” ----------

function startRadio() {
  if (running) return;
  running = true;
  btnToggle.textContent = "Detener";

  const intervalSec = Math.max(3, Number(intervalInput.value) || 10);

  // Estático ambiente continuo
  staticNoise.volume = 0.15;
  staticNoise.play().catch(() => {});

  // Primera transmisión inmediata
  transmit();
  timerId = setInterval(transmit, intervalSec * 1000);
}

function stopRadio() {
  running = false;
  btnToggle.textContent = "Iniciar";
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
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
