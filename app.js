let running = false;
const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const btnExit = document.getElementById("btnExit");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");
const dialEl = document.getElementById("dial");
const dialWrapper = document.querySelector(".dial-wrapper");

let radioTimerId = null;
let paranormalTimerId = null;
let displayUpdateId = null;
let phrases = [];
let currentUtterance = null;

fetch('phrases.json')
  .then(response => response.json())
  .then(data => phrases = data.phrases);

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log(`Error al activar pantalla completa: ${err.message}`);
    });
  }
}

function exitFullScreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
}

function updateFrequencyDisplay() {
  if (!dialEl || !dialWrapper || !running || msgEl.classList.contains('evp-active')) return;
  const dialRect = dialEl.getBoundingClientRect();
  const wrapperRect = dialWrapper.getBoundingClientRect();
  const offset = dialRect.left - wrapperRect.left;
  const width = wrapperRect.width - dialRect.width;
  let percent = offset / width;
  percent = Math.max(0, Math.min(1, percent));
  const currentFreq = (153.000 + (percent * 128.000)).toFixed(3);
  msgEl.textContent = `${currentFreq} kHz`;
}

function speakTetric(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.pitch = 0.4;
  utterance.rate = 0.7;
  currentUtterance = utterance;
  msgEl.textContent = text.toUpperCase();
  msgEl.classList.add('evp-active');
  utterance.onend = () => { if (running) msgEl.classList.remove('evp-active'); };
  window.speechSynthesis.speak(utterance);
}

function playRandomRadioSlice() {
  if (!running) return;
  const duration = radioBank.duration;
  if (duration > 0) {
    const randomStart = Math.random() * (duration - 3);
    radioBank.currentTime = randomStart;
    radioBank.volume = 0.4;
    radioBank.play().catch(() => {});
    setTimeout(() => { if (running) radioBank.pause(); }, 2000 + Math.random() * 2000);
  }
}

function startRadio() {
  running = true;
  btnToggle.textContent = "Detener";
  dialEl.classList.remove('paused-anim');
  displayUpdateId = setInterval(updateFrequencyDisplay, 50);
  staticNoise.volume = 0.15;
  staticNoise.play().catch(() => {});
  playRandomRadioSlice();
  radioTimerId = setInterval(() => { if (running) playRandomRadioSlice(); }, 15000);
  paranormalTimerId = setInterval(() => {
    if (running && phrases.length > 0) {
      speakTetric(phrases[Math.floor(Math.random() * phrases.length)]);
    }
  }, 25000);
}

function stopRadio() {
  running = false;
  btnToggle.textContent = "Iniciar";
  dialEl.classList.add('paused-anim');
  clearInterval(displayUpdateId);
  clearInterval(radioTimerId);
  clearInterval(paranormalTimerId);
  staticNoise.pause();
  radioBank.pause();
  window.speechSynthesis.cancel();
  msgEl.textContent = "OFFLINE";
  msgEl.classList.remove('evp-active');
}

btnToggle.addEventListener("click", () => {
  // Activa pantalla completa en móviles
  if (!running) toggleFullScreen();

  const unlock = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(unlock);
  if (running) stopRadio(); else startRadio();
});

// Lógica del botón de salida
btnExit.addEventListener("click", () => {
  stopRadio();
  exitFullScreen();
});

// Modal
const modal = document.getElementById("infoModal");
const btnInfo = document.getElementById("btnInfo");
const spanClose = document.getElementsByClassName("close")[0];
btnInfo.onclick = () => modal.style.display = "block";
spanClose.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };
