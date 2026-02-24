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

// Visual variables
const visualModal = document.getElementById("visualModal");
const btnVisual = document.getElementById("btnVisual");
const btnCloseVisual = document.getElementById("closeVisual");
const modalFreq = document.getElementById("modalFreq");
const trackIds = ['eq-rf', 'eq-kin', 'eq-mag', 'eq-ir'];

fetch('phrases.json')
  .then(response => response.json())
  .then(data => phrases = data.phrases);

// Crear las 200 barras
trackIds.forEach(id => {
  const container = document.getElementById(id);
  if (container) {
    for (let i = 0; i < 200; i++) {
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.opacity = i < 40 ? i/40 : (i > 160 ? (200-i)/40 : 1);
      container.appendChild(bar);
    }
  }
});

function updateFrequencyDisplay() {
  if (!dialEl || !dialWrapper || !running || msgEl.classList.contains('evp-active')) return;
  const dialRect = dialEl.getBoundingClientRect();
  const wrapperRect = dialWrapper.getBoundingClientRect();
  const offset = dialRect.left - wrapperRect.left;
  const width = wrapperRect.width - dialRect.width;
  let percent = Math.max(0, Math.min(1, offset / width));
  const currentFreq = (153.000 + (percent * 128.000)).toFixed(3);
  msgEl.textContent = `${currentFreq} kHz`;
  if (modalFreq) modalFreq.textContent = `${currentFreq} kHz`;
}

function animateSensors() {
  if (!running) {
    document.querySelectorAll('.bar').forEach(b => b.style.height = "5%");
    return;
  }
  trackIds.forEach((id, tIdx) => {
    const bars = document.querySelectorAll(`#${id} .bar`);
    const time = Date.now() * 0.001;
    bars.forEach((bar, i) => {
      const speed = 0.1 + (tIdx * 0.06);
      const h = Math.sin(time * speed + i * 0.1) * 35 + 45 + (Math.random() * 15);
      bar.style.height = h + "%";
    });
  });
  requestAnimationFrame(animateSensors);
}

// CORRECCIÓN VOZ: Forzamos la limpieza y recreación del objeto
function speakTetric(text) {
  if (!running) return;
  window.speechSynthesis.cancel(); // Parar cualquier voz anterior
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.pitch = 0.4;
  utterance.rate = 0.7;
  utterance.volume = 1.0;

  msgEl.classList.add('evp-active');
  msgEl.textContent = text.toUpperCase();

  utterance.onend = () => { if (running) msgEl.classList.remove('evp-active'); };
  
  // Pequeño retardo para asegurar que el navegador procese el cancel() anterior
  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 100);
}

function playRandomRadioSlice() {
  if (!radioBank.duration) return;
  radioBank.currentTime = Math.random() * (radioBank.duration - 2);
  radioBank.volume = 0.4;
  radioBank.play().catch(() => {});
  setTimeout(() => { if (running) radioBank.pause(); }, 2000);
}

function startRadio() {
  running = true;
  btnToggle.textContent = "Detener";
  dialEl.classList.remove('paused-anim');
  
  displayUpdateId = setInterval(updateFrequencyDisplay, 50);
  staticNoise.volume = 0.15;
  staticNoise.play().catch(() => {});
  
  animateSensors();
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
  // DESBLOQUEO CRÍTICO: Una frase vacía al hacer click real activa el audio en iOS/Android
  const unlock = new SpeechSynthesisUtterance(" ");
  window.speechSynthesis.speak(unlock);

  if (running) stopRadio(); else startRadio();
});

btnVisual.onclick = () => { visualModal.style.display = "flex"; };
btnCloseVisual.onclick = () => { visualModal.style.display = "none"; };
