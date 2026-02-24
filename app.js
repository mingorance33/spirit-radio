let running = false;
const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");
const dialEl = document.getElementById("dial");

let phrases = [];
let eqInterval = null;

// Configuración: 20 barras por canal
const trackIds = ['eq-rf', 'eq-kin', 'eq-mag', 'eq-ir'];
const numBars = 20;

// Crear barras al cargar
trackIds.forEach(id => {
  const container = document.getElementById(id);
  for (let i = 0; i < numBars; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    container.appendChild(bar);
  }
});

fetch('phrases.json')
  .then(res => res.json())
  .then(data => phrases = data.phrases);

function animateEqualizers() {
  if (!running) return;
  trackIds.forEach(id => {
    const bars = document.querySelectorAll(`#${id} .bar`);
    bars.forEach(bar => {
      // Altura aleatoria entre 10% y 100%
      const height = Math.floor(Math.random() * 90) + 10;
      bar.style.height = `${height}%`;
    });
  });
}

function updateFrequency() {
  if (!running || msgEl.classList.contains('evp-active')) return;
  const dialPos = dialEl.offsetLeft;
  const width = dialEl.parentElement.offsetWidth;
  const freq = (153 + (dialPos / width) * 128).toFixed(3);
  msgEl.textContent = `${freq} kHz`;
}

function speak(text) {
  window.speechSynthesis.cancel();
  const ut = new SpeechSynthesisUtterance(text);
  ut.lang = 'es-ES'; ut.pitch = 0.4; ut.rate = 0.7;
  msgEl.classList.add('evp-active');
  msgEl.textContent = text.toUpperCase();
  ut.onend = () => msgEl.classList.remove('evp-active');
  window.speechSynthesis.speak(ut);
}

function start() {
  running = true;
  btnToggle.textContent = "DETENER";
  dialEl.classList.remove('paused-anim');
  staticNoise.play().catch(() => {});
  
  // Intervalos
  eqInterval = setInterval(animateEqualizers, 100);
  setInterval(updateFrequency, 50);
  
  // Sonidos aleatorios
  setInterval(() => {
    if (running) {
      radioBank.currentTime = Math.random() * (radioBank.duration - 2);
      radioBank.play();
      setTimeout(() => radioBank.pause(), 1500);
    }
  }, 10000);

  // Voces
  setInterval(() => {
    if (running && phrases.length > 0) {
      speak(phrases[Math.floor(Math.random() * phrases.length)]);
    }
  }, 22000);
}

function stop() {
  running = false;
  btnToggle.textContent = "INICIAR";
  dialEl.classList.add('paused-anim');
  clearInterval(eqInterval);
  staticNoise.pause();
  radioBank.pause();
  window.speechSynthesis.cancel();
  msgEl.textContent = "OFFLINE";
  msgEl.classList.remove('evp-active');
  // Bajar todas las barras
  document.querySelectorAll('.bar').forEach(b => b.style.height = '10%');
}

btnToggle.onclick = () => {
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  running ? stop() : start();
};

// Modal
const modal = document.getElementById("infoModal");
document.getElementById("btnInfo").onclick = () => modal.style.display = "block";
document.querySelector(".close").onclick = () => modal.style.display = "none";
