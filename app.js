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

fetch('phrases.json')
  .then(response => response.json())
  .then(data => phrases = data.phrases);

function updateFrequencyDisplay() {
  if (!dialEl || !dialWrapper || !running) return;
  const dialRect = dialEl.getBoundingClientRect();
  const wrapperRect = dialWrapper.getBoundingClientRect();
  const offset = dialRect.left - wrapperRect.left;
  const width = wrapperRect.width - dialRect.width;
  let percent = offset / width;
  percent = Math.max(0, Math.min(1, percent));
  
  const minFreq = 153.000;
  const maxFreq = 281.000;
  const currentFreq = (minFreq + (percent * (maxFreq - minFreq))).toFixed(3);
  msgEl.textContent = `${currentFreq} kHz`;
}

function speakTetric(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.pitch = 0.4;
  utterance.rate = 0.7;
  
  msgEl.classList.add('evp-active');
  msgEl.textContent = text.toUpperCase();
  window.speechSynthesis.speak(utterance);
  
  utterance.onend = () => {
    if (running) msgEl.classList.remove('evp-active');
  };
}

function playRandomRadioSlice() {
  if (!radioBank.duration) return;
  radioBank.currentTime = Math.random() * (radioBank.duration - 2);
  radioBank.volume = 0.4;
  radioBank.play();
  setTimeout(() => { if (running) radioBank.pause(); }, 2000);
}

function startRadio() {
  running = true;
  btnToggle.textContent = "Detener";
  // Quita la pausa para que empiece a moverse
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
  // Añade la pausa para detener el dial
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
  if (running) stopRadio(); else startRadio();
});

const modal = document.getElementById("infoModal");
const btnInfo = document.getElementById("btnInfo");
const spanClose = document.querySelector(".close");

btnInfo.onclick = () => modal.style.display = "block";
spanClose.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };
