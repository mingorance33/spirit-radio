let running = false;
const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const dialEl = document.getElementById("dial");

let phrases = [];
let eqInterval = null;
const trackIds = ['eq-rf', 'eq-kin', 'eq-mag', 'eq-ir'];
const numBars = 200; // 200 barras por sensor

// Generación de barras con gradación de opacidad horizontal
trackIds.forEach(id => {
  const container = document.getElementById(id);
  for (let i = 0; i < numBars; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    // Efecto de gradación horizontal: las barras de los extremos son más tenues
    const opacity = i < 50 ? i/50 : (i > 150 ? (200-i)/50 : 1);
    bar.style.opacity = opacity * 0.8;
    container.appendChild(bar);
  }
});

fetch('phrases.json').then(res => res.json()).then(data => phrases = data.phrases);

function animateEqualizers() {
  if (!running) return;
  trackIds.forEach(id => {
    const bars = document.querySelectorAll(`#${id} .bar`);
    bars.forEach((bar, index) => {
      // Creamos un movimiento orgánico (ondas sutiles + aleatorio)
      const noise = Math.random() * 40;
      const wave = Math.sin(Date.now() * 0.01 + index * 0.1) * 30 + 50;
      const finalHeight = Math.max(5, Math.min(100, wave + noise - 40));
      bar.style.height = `${finalHeight}%`;
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

function start() {
  running = true;
  btnToggle.textContent = "DETENER";
  dialEl.classList.remove('paused-anim');
  document.getElementById("staticNoise").play();
  
  eqInterval = setInterval(animateEqualizers, 60); // 60ms para suavidad
  setInterval(updateFrequency, 50);
  
  // Programación de voces y radio (se mantiene lógica anterior)
  setInterval(() => {
    if (running && phrases.length > 0) {
      const ut = new SpeechSynthesisUtterance(phrases[Math.floor(Math.random() * phrases.length)]);
      ut.lang = 'es-ES'; ut.pitch = 0.2; ut.rate = 0.6;
      msgEl.classList.add('evp-active');
      msgEl.textContent = ut.text.toUpperCase();
      ut.onend = () => msgEl.classList.remove('evp-active');
      window.speechSynthesis.speak(ut);
    }
  }, 20000);
}

function stop() {
  running = false;
  btnToggle.textContent = "INICIAR";
  dialEl.classList.add('paused-anim');
  clearInterval(eqInterval);
  document.getElementById("staticNoise").pause();
  window.speechSynthesis.cancel();
  msgEl.textContent = "OFFLINE";
  msgEl.classList.remove('evp-active');
  document.querySelectorAll('.bar').forEach(b => b.style.height = '5%');
}

btnToggle.onclick = () => {
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  running ? stop() : start();
};

// Modal info
document.getElementById("btnInfo").onclick = () => document.getElementById("infoModal").style.display = "block";
document.querySelector(".close").onclick = () => document.getElementById("infoModal").style.display = "none";
