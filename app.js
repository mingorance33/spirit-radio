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
let phrases = [];

// --- SISTEMA DE AUDIO Y ANÁLISIS ---
let visualWindow = null;
let audioCtx, analyser, dataArray;

function initAudioAnalysis() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        
        // Conexión de nodos
        const sourceStatic = audioCtx.createMediaElementSource(staticNoise);
        const sourceRadio = audioCtx.createMediaElementSource(radioBank);
        
        sourceStatic.connect(analyser);
        sourceRadio.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        analyser.fftSize = 256; 
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
}

function sendDataToVisualizer() {
    if (visualWindow && !visualWindow.closed && running) {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculamos el volumen real (0 a 255)
        let total = 0;
        for(let i = 0; i < dataArray.length; i++) {
            total += dataArray[i];
        }
        let volume = total / dataArray.length;
        
        // Enviamos el volumen multiplicado por 2 para dar más sensibilidad
        visualWindow.postMessage({ 
            type: 'AUDIO_UPDATE', 
            volume: volume * 2 
        }, '*');
    }
}

// --- FUNCIONES ORIGINALES ---
fetch('phrases.json').then(res => res.json()).then(data => phrases = data.phrases);

function updateFrequencyDisplay() {
    if (!dialEl || !dialWrapper || !running || msgEl.classList.contains('evp-active')) return;
    const dialRect = dialEl.getBoundingClientRect();
    const wrapperRect = dialWrapper.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (dialRect.left - wrapperRect.left) / (wrapperRect.width - dialRect.width)));
    msgEl.textContent = `${(153.000 + (percent * 128.000)).toFixed(3)} kHz`;
    
    // MANDAR DATOS CONSTANTEMENTE
    sendDataToVisualizer();
}

function speakTetric(text) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.pitch = 0.1;
    utter.rate = 0.7;
    utter.onstart = () => { msgEl.classList.add('evp-active'); msgEl.textContent = text.toUpperCase(); };
    utter.onend = () => { msgEl.classList.remove('evp-active'); };
    window.speechSynthesis.speak(utter);
}

function playRandomRadioSlice() {
    if (!running) return;
    radioBank.currentTime = Math.random() * (radioBank.duration || 10);
    radioBank.volume = 0.8; // Subimos volumen para que el visualizador lo note más
    radioBank.play().catch(() => {});
    setTimeout(() => { if (running) radioBank.pause(); }, 700 + Math.random() * 1000);
}

function startRadio() {
    initAudioAnalysis();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    running = true;
    btnToggle.textContent = "Detener";
    dialEl.classList.remove('paused-anim');
    displayUpdateId = setInterval(updateFrequencyDisplay, 50);
    
    staticNoise.volume = 0.2;
    staticNoise.play();
    
    radioTimerId = setInterval(playRandomRadioSlice, 12000);
    paranormalTimerId = setInterval(() => {
        if (running && phrases.length > 0) speakTetric(phrases[Math.floor(Math.random() * phrases.length)]);
    }, 20000);
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

btnToggle.onclick = () => {
    if (running) stopRadio(); else startRadio();
};

btnVisualizer.onclick = () => {
    visualWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=500,height=600');
};

// Modal Ayuda
const modal = document.getElementById("infoModal");
document.getElementById("btnInfo").onclick = () => modal.style.display = "block";
document.querySelector(".close").onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };
