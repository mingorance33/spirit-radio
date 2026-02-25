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
let currentUtterance = null; // Referencia global para evitar que el móvil la borre

fetch('phrases.json')
  .then(response => response.json())
  .then(data => phrases = data.phrases);

function updateFrequencyDisplay() {
  // CRÍTICO: Si el mensaje está en rojo (hablando), NO actualizamos los kHz
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
  // Cancelamos cualquier voz anterior para que no se amontonen en el móvil
  window.speechSynthesis.cancel();

  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = 'es-ES';
  currentUtterance.pitch = 0.4;
  currentUtterance.rate = 0.7;
  
  // Primero aplicamos el estado visual
  msgEl.classList.add('evp-active');
  msgEl.textContent = text.toUpperCase();
  
  // Evento cuando termina de hablar
  currentUtterance.onend = () => {
    msgEl.classList.remove('evp-active');
  };

  // Por si hay errores en el motor de voz del móvil
  currentUtterance.onerror = () => {
    msgEl.classList.remove('evp-active');
  };

  window.speechSynthesis.speak(currentUtterance);
}

function playRandomRadioSlice() {
  if (!radioBank.duration) return;
  radioBank.currentTime = Math.random() * (radioBank.duration - 2);
  radioBank.volume = 0.4;
  radioBank.play().catch(()=>{});
  setTimeout(() => { if (running) radioBank.pause(); }, 2000);
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
  // DESBLOQUEO DE VOZ (Truco para móviles)
  const unlock = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(unlock);

  if (running) stopRadio(); else startRadio();
});

// Modal
const modal = document.getElementById("infoModal");
const btnInfo = document.getElementById("btnInfo");
const spanClose = document.querySelector(".close");
btnInfo.onclick = () => modal.style.display = "block";
spanClose.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };
