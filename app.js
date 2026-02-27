/**
 * @file app.js
 * @description Lógica optimizada para compatibilidad con iOS y Android.
 */

let running = false;
let isSpeaking = false;
let wakeLock = null;

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
let audioCtx, analyser, dataArray;
let visualWindow = null;

// --- GESTIÓN DE PANTALLA ---
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) { console.warn("Wake Lock error:", err); }
    }
}

// --- INICIALIZACIÓN AUDIO ---
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

// --- LÓGICA RADIO (10-20 SEG) ---
function playRandomRadioSlice() {
    if (!running || isSpeaking) return;
    const duration = radioBank.duration || 10;
    radioBank.currentTime = Math.random() * (duration - 1);
    
    radioBank.play().then(() => {
        const sliceDuration = 400 + Math.random() * 400;
        setTimeout(() => {
            radioBank.pause();
            if (running) {
                const nextInterval = 10000 + Math.random() * 10000;
                radioTimerId = setTimeout(playRandomRadioSlice, nextInterval);
            }
        }, sliceDuration);
    }).catch(e => console.warn("Audio radio bloqueado por iOS:", e));
}

// --- LÓGICA VOZ (10-20 SEG) ---
function triggerParanormalEvent() {
    if (!running || isSpeaking || phrases.length === 0) return;
    isSpeaking = true;
    
    // Feedback táctil para iOS/Android
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    msgEl.classList.add('evp-active');
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    const utter = new SpeechSynthesisUtterance(randomPhrase);
    utter.lang = 'es-ES';
    utter.pitch = 0.5;
    utter.rate = 0.7;

    utter.onstart = () => { msgEl.textContent = randomPhrase; };
    utter.onerror = (e) => { 
        console.error("Speech Error:", e);
        msgEl.textContent = "ERROR VOZ";
    };
    utter.onend = () => {
        isSpeaking = false;
        msgEl.classList.remove('evp-active');
        if (running) {
            const nextDelay = 10000 + Math.random() * 10000;
            paranormalTimerId = setTimeout(triggerParanormalEvent, nextDelay);
        }
    };
    window.speechSynthesis.speak(utter);
}

// --- INICIO ---
async function startRadio() {
    initAudioAnalysis();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    
    // Truco iOS: Forzar evento de habla vacío para desbloquear permisos
    const unlock = new SpeechSynthesisUtterance("");
    window.speechSynthesis.speak(unlock);
    
    await requestWakeLock();

    running = true;
    btnToggle.textContent = "Detener";
    dialEl.classList.remove('paused-anim');
    
    staticNoise.loop = true;
    staticNoise.volume = 0.25; 
    staticNoise.play().catch(e => console.warn("Static bloqueado:", e));
    
    displayUpdateId = setInterval(() => {
        if (!isSpeaking) {
            const dialRect = dialEl.getBoundingClientRect();
            const wrapperRect = dialWrapper.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (dialRect.left - wrapperRect.left) / (wrapperRect.width - dialRect.width)));
            msgEl.textContent = `${(153.000 + (percent * 128.000)).toFixed(3)} kHz`;
        }
        if (visualWindow && !visualWindow.closed && analyser) {
            analyser.getByteFrequencyData(dataArray);
            let avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
            visualWindow.postMessage({ type: 'AUDIO_UPDATE', volume: avg, isSpeaking }, '*');
        }
    }, 50);
    
    playRandomRadioSlice();
    paranormalTimerId = setTimeout(triggerParanormalEvent, 10000 + Math.random() * 10000);
}

function stopRadio() {
    running = false;
    isSpeaking = false;
    btnToggle.textContent = "Iniciar";
    dialEl.classList.add('paused-anim');
    if (wakeLock) wakeLock.release().then(() => wakeLock = null);
    clearInterval(displayUpdateId);
    clearTimeout(paranormalTimerId);
    clearTimeout(radioTimerId);
    staticNoise.pause();
    radioBank.pause();
    window.speechSynthesis.cancel();
    msgEl.textContent = "OFFLINE";
    msgEl.classList.remove('evp-active');
}

btnToggle.onclick = () => { if (running) stopRadio(); else startRadio(); };
btnVisualizer.onclick = () => { visualWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=500,height=600'); };

fetch('phrases.json')
    .then(res => res.json())
    .then(data => phrases = data.phrases || data)
    .catch(() => phrases = ["HOLA", "ESTOY AQUÍ"]);
