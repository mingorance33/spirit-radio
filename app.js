let running = false;
const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const btnVisualizer = document.getElementById("btnVisualizer");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");
const dialEl = document.getElementById("dial");
const dialWrapper = document.querySelector(".dial-wrapper");

let radioTimerId = null;
let paranormalTimerId = null;
let displayUpdateId = null;
let visualizerInterval = null;
let visualizerWindow = null;
let phrases = [];
let currentUtterance = null;

fetch('phrases.json')
  .then(response => response.json())
  .then(data => phrases = data.phrases);

// Control de ventana externa
btnVisualizer.addEventListener('click', () => {
    visualizerWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=600,height=400');
});

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

  // Enviar pulso de actualización a la ventana secundaria
  if (visualizerWindow && !visualizerWindow.closed) {
      visualizerWindow.postMessage({ type: 'UPDATE' }, '*');
  }
}

function speakTetric(text) {
  window.speechSynthesis.cancel();
  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = 'es-ES';
  currentUtterance.pitch = 0.4;
  currentUtterance.rate = 0.7;
  
  msgEl.classList.add('evp-active');
  msgEl.textContent = text.toUpperCase();
  
  // Notificar a la ventana secundaria que hay un EVP activo
  if (visualizerWindow && !visualizerWindow.closed) {
      visualizerWindow.postMessage({ type: 'EVP_START' }, '*');
  }
  
  currentUtterance.onend = () => {
    msgEl.classList.remove('evp-active');
    if (visualizerWindow && !visualizerWindow.closed) {
        visualizerWindow.postMessage({ type: 'EVP_END' }, '*');
    }
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
  
  displayUpdateId = setInterval(updateFrequencyDisplay, 80);
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
  
  if (visualizerWindow && !visualizerWindow.closed) {
      visualizerWindow.postMessage({ type: 'STOP' }, '*');
  }

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
  const unlock = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(unlock);
  if (running) stopRadio(); else startRadio();
});
