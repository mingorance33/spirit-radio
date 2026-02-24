let running = false;
const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");

let radioTimerId = null;
let paranormalTimerId = null;

const paranormalClipSources = ["1.mp3", "2.mp3", "3.mp3"];
let paranormalAudios = [];
let paranormalsInitialized = false;

function initParanormalAudios() {
  if (paranormalsInitialized) return;
  paranormalAudios = paranormalClipSources.map(src => {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = 0.95;
    return a;
  });
  paranormalsInitialized = true;
}

function playRandomParanormalClip() {
  if (!paranormalAudios.length) return;
  const idx = Math.floor(Math.random() * paranormalAudios.length);
  const audio = paranormalAudios[idx];
  audio.currentTime = 0;
  audio.play().catch(() => {});
  msgEl.textContent = "COINCIDENCIA DETECTADA...";
  setTimeout(() => { if(running) msgEl.textContent = "SINTONIZANDO..."; }, 3000);
}

function playRandomRadioSlice() {
  if (!radioBank.duration) return;
  const start = Math.random() * (radioBank.duration - 2);
  radioBank.currentTime = start;
  radioBank.volume = 0.35;
  radioBank.play().catch(() => {});
  setTimeout(() => { radioBank.pause(); }, 2000);
}

function startRadio() {
  if (running) return;
  running = true;
  btnToggle.textContent = "Detener";
  msgEl.textContent = "SINTONIZANDO...";
  staticNoise.volume = 0.15;
  staticNoise.play().catch(() => {});
  
  playRandomRadioSlice();
  radioTimerId = setInterval(playRandomRadioSlice, 30000);
  
  setTimeout(() => {
    playRandomParanormalClip();
    paranormalTimerId = setInterval(playRandomParanormalClip, 30000);
  }, 30000);
}

function stopRadio() {
  running = false;
  btnToggle.textContent = "Iniciar";
  msgEl.textContent = "OFFLINE";
  clearInterval(radioTimerId);
  clearInterval(paranormalTimerId);
  staticNoise.pause();
  radioBank.pause();
}

btnToggle.addEventListener("click", () => {
  initParanormalAudios();
  if (running) stopRadio(); else startRadio();
});

// Lógica del Modal Informativo
const modal = document.getElementById("infoModal");
const btnInfo = document.getElementById("btnInfo");
const spanClose = document.querySelector(".close");

btnInfo.onclick = () => { modal.style.display = "block"; };
spanClose.onclick = () => { modal.style.display = "none"; };
window.onclick = (event) => {
  if (event.target == modal) { modal.style.display = "none"; }
};
