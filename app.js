/**
 * @file app.js
 * @author José A. Vázquez Mingorance
 * @description Lógica de Spirit Radio LW. 
 * Ajustado: Sonidos de radio (Radio.mp3) cada 15-30 segundos aleatoriamente.
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
let paranormalTimerId = null;
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
        const data = await response.json();
        phrases = data.phrases || data; // Maneja ambos formatos de JSON
    } catch (e) {
        console.error("Error cargando frases:", e);
        phrases = ["HOLA", "ESTOY AQUÍ", "AYUDA", "CORRE"];
    }
}

// --- LÓGICA DE SONIDOS DE RADIO (CADA 15-30 SEG) ---
function playRandomRadioSlice() {
    if (!running || isSpeaking) return;

    // 1. Elegimos un punto aleatorio en el MP3 de radio
    const duration = radioBank.duration || 10;
    radioBank.currentTime = Math.random() * (duration - 1);
    
    // 2. Reproducimos un "trozo" corto de sonido
    radioBank.play().then(() => {
        // El trozo de sonido dura entre 400ms y 800ms
        const sliceDuration = 400 + Math.random() * 400;
        
        setTimeout(() => {
            radioBank.pause();
            
            // 3. Programamos el PRÓXIMO sonido estrictamente entre 15 y 30 segundos
            if (running) {
                const nextInterval = 15000 + Math.random() * 15000;
                radioTimerId = setTimeout(playRandomRadioSlice, nextInterval);
            }
        }, sliceDuration);
    }).catch(e => console.warn("Error audio radio:", e));
}

// --- LÓGICA DE EVENTOS PARANORMALES (VOZ) ---
function triggerParanormalEvent() {
    if (!running || isSpeaking) return;
    
    isSpeaking = true;
    msgEl.classList.add('evp-active');
    
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    const utter = new SpeechSynthesisUtterance(randomPhrase);
    utter.lang = 'es-ES';
    utter.pitch = 0.5;
    utter.rate = 0.8;

    utter.onstart = () => { msgEl.textContent = randomPhrase; };
    utter.onend = () => {
        isSpeaking = false;
        msgEl.classList.remove('evp-active');
    };
    
    window.speechSynthesis.speak(utter);

    // Reprogramar el próximo evento de voz (también aleatorio entre 15-30s)
    const nextEventDelay = 15000 + Math.random() * 15000;
    paranormalTimerId = setTimeout(triggerParanormalEvent, nextEventDelay);
}

function sendDataToVisualizer() {
    if (visualWindow && !visualWindow.closed && analyser) {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        visualWindow.postMessage({ type: 'AUDIO_UPDATE', volume: avg, isSpeaking: isSpeaking }, '*');
    }
}

// --- CONTROLES PRINCIPALES ---
function startRadio() {
    initAudioAnalysis();
    running = true;
    btnToggle.textContent = "Detener";
    dialEl.classList.remove('paused-anim');
    
    staticNoise.volume = 0.3;
    staticNoise.play();
    
    // Actualización de pantalla y visualizador (50ms)
    displayUpdateId = setInterval(() => {
        if (!isSpeaking) {
            const dialRect = dialEl.getBoundingClientRect();
            const wrapperRect = dialWrapper.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (dialRect.left - wrapperRect.left) / (wrapperRect.width - dialRect.width)));
            msgEl.textContent = `${(153.000 + (percent * 128.000)).toFixed(3)} kHz`;
        }
        sendDataToVisualizer();
    }, 50);
    
    // Iniciar el primer sonido de radio después de una espera inicial aleatoria
    const initialDelay = 15000 + Math.random() * 15000;
    radioTimerId = setTimeout(playRandomRadioSlice, initialDelay);

    // Iniciar el ciclo de voces paranormales
    const initialVoiceDelay = 15000 + Math.random() * 15000;
    paranormalTimerId = setTimeout(triggerParanormalEvent, initialVoiceDelay);
}

function stopRadio() {
    running = false;
    isSpeaking = false;
    btnToggle.textContent = "Iniciar";
    dialEl.classList.add('paused-anim');
    
    clearInterval(displayUpdateId);
    clearTimeout(paranormalTimerId);
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

btnToggle.onclick = () => { 
    if (running) stopRadio(); else startRadio(); 
};

btnVisualizer.onclick = () => {
    visualWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=500,height=600');
};

const modal = document.getElementById("infoModal");
document.getElementById("btnInfo").onclick = () => modal.style.display = "block";
document.querySelector(".close").onclick = () => modal.style.display = "none";

loadPhrases();
