/**
 * @file app.js
 * @author José A. Vázquez Mingorance
 * @date 26-02-2025
 * @description Lógica principal de la Spirit Radio LW con efectos 
 * de audio paranormal y sincronización con el visualizador.
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
let phrases = ["ESTOY AQUÍ", "TE ESCUCHO", "CORRE", "AYUDA", "NO TE VAYAS", "LUZ", "FRÍO"];
let isSpeaking = false; 

// --- MOTOR DE AUDIO Y FILTROS ---
let audioCtx, analyser, dataArray, biquadFilter;
let visualWindow = null;

function initAudioAnalysis() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        
        // Cambio 1: Filtro de audio para distorsión paranormal
        biquadFilter = audioCtx.createBiquadFilter();
        biquadFilter.type = "lowpass";
        biquadFilter.frequency.setValueAtTime(20000, audioCtx.currentTime); 

        const sourceStatic = audioCtx.createMediaElementSource(staticNoise);
        const sourceRadio = audioCtx.createMediaElementSource(radioBank);
        
        // Conexión en cadena: Fuentes -> Filtro -> Analizador -> Altavoces
        sourceStatic.connect(biquadFilter);
        sourceRadio.connect(biquadFilter);
        biquadFilter.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        analyser.fftSize = 256; 
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
}

function sendDataToVisualizer() {
    if (visualWindow && !visualWindow.closed) {
        analyser.getByteFrequencyData(dataArray);
        const avgVol = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        visualWindow.postMessage({
            type: 'AUDIO_UPDATE',
            volume: avgVol,
            isSpeaking: isSpeaking
        }, '*');
    }
}

// --- LÓGICA DE EVENTOS ---

function playRandomRadioSlice() {
    if (!running) return;
    const duration = radioBank.duration;
    if (duration) {
        radioBank.currentTime = Math.random() * duration;
        radioBank.play();
        const nextSlice = 2000 + Math.random() * 5000;
        radioTimerId = setTimeout(playRandomRadioSlice, nextSlice);
    }
}

function triggerParanormalEvent() {
    if (!running || isSpeaking || Math.random() > 0.4) return;

    isSpeaking = true;
    msgEl.classList.add('evp-active');
    
    // Aplicamos distorsión al audio de fondo (ruido sordo)
    if(biquadFilter) {
        biquadFilter.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.5);
    }

    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    msgEl.textContent = phrase;

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = 'es-ES';
    utterance.rate = 0.6;
    utterance.pitch = 0.1;

    utterance.onend = () => {
        isSpeaking = false;
        msgEl.classList.remove('evp-active');
        // Restauramos el audio normal (agudos)
        if(biquadFilter) {
            biquadFilter.frequency.exponentialRampToValueAtTime(20000, audioCtx.currentTime + 1);
        }
    };

    window.speechSynthesis.speak(utterance);
}

function startRadio() {
    running = true;
    btnToggle.textContent = "Detener";
    dialEl.classList.remove('paused-anim');
    
    initAudioAnalysis();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    staticNoise.play();
    
    displayUpdateId = setInterval(() => {
        if (!isSpeaking && running) {
            const dialRect = dialEl.getBoundingClientRect();
            const wrapperRect = dialWrapper.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (dialRect.left - wrapperRect.left) / (wrapperRect.width - dialRect.width)));
            msgEl.textContent = `${(153.000 + (percent * 128.000)).toFixed(3)} kHz`;
        }
        sendDataToVisualizer();
    }, 50);
    
    playRandomRadioSlice();
    paranormalTimerId = setInterval(triggerParanormalEvent, 10000); 
}

function stopRadio() {
    running = false;
    isSpeaking = false;
    btnToggle.textContent = "Iniciar";
    dialEl.classList.add('paused-anim');
    
    clearInterval(displayUpdateId);
    clearInterval(paranormalTimerId);
    clearTimeout(radioTimerId);
    
    staticNoise.pause();
    radioBank.pause();
    window.speechSynthesis.cancel();
    
    // Notificamos al visualizador que se detenga
    if (visualWindow && !visualWindow.closed) {
        visualWindow.postMessage({ type: 'STOP_ALL' }, '*');
    }

    msgEl.textContent = "OFFLINE";
    msgEl.classList.remove('evp-active');
}

btnToggle.onclick = () => {
    if (running) stopRadio(); else startRadio();
};

btnVisualizer.onclick = () => {
    visualWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=800,height=600');
};

// --- MODAL INFO ---
const modal = document.getElementById("infoModal");
const btnInfo = document.getElementById("btnInfo");
const spanClose = document.getElementsByClassName("close")[0];

btnInfo.onclick = () => modal.style.display = "block";
spanClose.onclick = () => modal.style.display = "none";
window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
};
