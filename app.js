/**
 * @file app.js
 * @author José A. Vázquez Mingorance
 * @date 26-02-2025
 * @description Lógica principal de la Spirit Radio LW. Gestiona el barrido aleatorio de audio,
 * el análisis de frecuencias para el visualizador y la síntesis de voz (EVP) con 
 * protocolos de seguridad anti-bloqueo.
 */
let running = false;
const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const btnVisualizer = document.getElementById("btnVisualizer");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");
const dialEl = document.getElementById("dial");
const dialWrapper = document.querySelector(".dial-wrapper");

let radioTimerId = null;
let paranormalTimerId = null; // Usaremos esto para el timeout aleatorio
let displayUpdateId = null;
let phrases = [];
let isSpeaking = false; 

// --- MOTOR DE AUDIO ---
let audioCtx, analyser, dataArray;
let visualWindow = null;

function initAudioAnalysis() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        const sourceStatic = audioCtx.createMediaElementSource(staticNoise);
        const sourceRadio = audioCtx.createMediaElementSource(radioBank);
        sourceStatic.connect(analyser);
        sourceRadio.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 256; 
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
}

async function loadPhrases() {
    try {
        const response = await fetch('phrases.json');
        phrases = await response.json();
    } catch (e) {
        console.error("No se pudieron cargar las frases:", e);
    }
}

function playRandomRadioSlice() {
    if (!running) return;
    radioBank.currentTime = Math.random() * (radioBank.duration - 2);
    radioBank.play();
    radioTimerId = setTimeout(playRandomRadioSlice, 2000 + Math.random() * 3000);
}

function triggerParanormalEvent() {
    if (!running || isSpeaking) return;
    
    isSpeaking = true;
    msgEl.classList.add('evp-active');
    
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    const utter = new SpeechSynthesisUtterance(randomPhrase);
    
    // Avisar al visualizador
    if (visualWindow && !visualWindow.closed) {
        visualWindow.postMessage({ type: 'AUDIO_UPDATE', volume: 80, isSpeaking: true }, '*');
    }

    utter.onstart = () => { msgEl.textContent = randomPhrase; };
    utter.onend = () => {
        isSpeaking = false;
        msgEl.classList.remove('evp-active');
        if (visualWindow && !visualWindow.closed) {
            visualWindow.postMessage({ type: 'AUDIO_UPDATE', volume: 20, isSpeaking: false }, '*');
        }
    };
    
    window.speechSynthesis.speak(utter);
}

// Función recursiva para el intervalo aleatorio (15s a 30s)
function scheduleNextParanormalEvent() {
    if (!running) return;
    
    const randomDelay = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000;
    
    paranormalTimerId = setTimeout(() => {
        if (running) {
            triggerParanormalEvent();
            scheduleNextParanormalEvent(); // Programa la siguiente ejecución
        }
    }, randomDelay);
}

function sendDataToVisualizer() {
    if (visualWindow && !visualWindow.closed && analyser) {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        visualWindow.postMessage({ type: 'AUDIO_UPDATE', volume: avg, isSpeaking: isSpeaking }, '*');
    }
}

function startRadio() {
    initAudioAnalysis();
    running = true;
    btnToggle.textContent = "Detener";
    dialEl.classList.remove('paused-anim');
    staticNoise.play();
    
    displayUpdateId = setInterval(() => {
        const dialRect = dialEl.getBoundingClientRect();
        const wrapperRect = dialWrapper.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (dialRect.left - wrapperRect.left) / (wrapperRect.width - dialRect.width)));
        msgEl.textContent = `${(153.000 + (percent * 128.000)).toFixed(3)} kHz`;
        sendDataToVisualizer();
    }, 50);
    
    playRandomRadioSlice();
    scheduleNextParanormalEvent(); // Iniciamos el ciclo aleatorio
}

function stopRadio() {
    running = false;
    isSpeaking = false;
    btnToggle.textContent = "Iniciar";
    dialEl.classList.add('paused-anim');
    
    clearInterval(displayUpdateId);
    clearTimeout(paranormalTimerId); // Limpiamos el timeout aleatorio
    clearTimeout(radioTimerId);
    
    staticNoise.pause();
    radioBank.pause();
    
    if (visualWindow && !visualWindow.closed) {
        visualWindow.postMessage({ type: 'STOP_ALL' }, '*');
    }
    
    window.speechSynthesis.cancel();
    msgEl.textContent = "OFFLINE";
    msgEl.classList.remove('evp-active');
}

btnToggle.onclick = () => { if (running) stopRadio(); else startRadio(); };

btnVisualizer.onclick = () => {
    visualWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=500,height=600');
};

loadPhrases();
