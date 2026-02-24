let running = false;
const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const dialEl = document.getElementById("dial");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");

let phrases = [];
let audioIntervals = []; // Para limpiar todos los audios al parar

// 1. Generar 200 barras por canal
const trackIds = ['eq-rf', 'eq-kin', 'eq-mag', 'eq-ir'];
trackIds.forEach(id => {
  const container = document.getElementById(id);
  for (let i = 0; i < 200; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.opacity = i < 40 ? i/40 : (i > 160 ? (200-i)/40 : 1);
    container.appendChild(bar);
  }
});

fetch('phrases.json').then(res => res.json()).then(data => phrases = data.phrases);

function animateBars() {
  if (!running) return;
  trackIds.forEach((id, tIdx) => {
    const bars = document.querySelectorAll(`#${id} .bar`);
    const time = Date.now() * 0.001;
    bars.forEach((bar, i) => {
      // Movimiento independiente por canal (tIdx)
      const freq = 0.2 + (tIdx * 0.1);
      const h = Math.sin(time * freq + i * 0.1) * 40 + 50 + (Math.random() * 20);
      bar.style.height = Math.max(10, Math.min(100, h)) + "%";
    });
  });
  requestAnimationFrame(animateBars);
}

function speakParanormal() {
  if (!running || phrases.length === 0) return;
  window.speechSynthesis.cancel();
  const text = phrases[Math.floor(Math.random() * phrases.length)];
  const ut = new SpeechSynthesisUtterance(text);
  ut.lang = 'es-ES'; ut.pitch = 0.3; ut.rate = 0.6;
  msgEl.classList.add('evp-active');
  msgEl.textContent = text.toUpperCase();
  ut.onend = () => { if(running) msgEl.classList.remove('evp-active'); };
  window.speechSynthesis.speak(ut);
}

function playRadioSlice() {
  if (!running) return;
  radioBank.currentTime = Math.random() * (radioBank.duration - 2);
  radioBank.volume = 0.3;
  radioBank.play().catch(()=>{});
  setTimeout(() => { if(running) radioBank.pause(); }, 2000);
}

function start() {
  running = true;
  btnToggle.textContent = "DETENER";
  dialEl.classList.remove('paused-anim');
  staticNoise.play().catch(()=>{});
  
  animateBars();
  
  // kHz Update
  audioIntervals.push(setInterval(() => {
    if (!msgEl.classList.contains('evp-active')) {
      const pos = dialEl.offsetLeft / dialEl.parentElement.offsetWidth;
      msgEl.textContent = (153 + pos * 128).toFixed(3) + " kHz";
    }
  }, 50));

  // Radio slices cada 12s
  audioIntervals.push(setInterval(playRadioSlice, 12000));
  
  // Voces cada 20s
  audioIntervals.push(setInterval(speakParanormal, 20000));
  
  playRadioSlice(); // Primera vez
}

function stop() {
  running = false;
  btnToggle.textContent = "INICIAR";
  dialEl.classList.add('paused-anim');
  staticNoise.pause();
  radioBank.pause();
  window.speechSynthesis.cancel();
  audioIntervals.forEach(clearInterval);
  audioIntervals = [];
  msgEl.textContent = "OFFLINE";
  msgEl.classList.remove('evp-active');
  document.querySelectorAll('.bar').forEach(b => b.style.height = "10%");
}

btnToggle.onclick = () => {
  // Desbloqueo de audio para móvil
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  running ? stop() : start();
};
