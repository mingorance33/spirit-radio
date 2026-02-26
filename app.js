/**
 * @file app.js
 * @description Versión Blindada: Filtro de audio con recuperación automática
 * para evitar ruidos fijos y bloqueos.
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
let phrases = ["ESTOY AQUÍ", "TE ESCUCHO", "CORRE", "AYUDA", "NO TE VAYAS", "LUZ", "FRÍO", "DÉJAME", "SÍGUEME"];
let isSpeaking = false; 

// --- MOTOR DE AUDIO Y FILTROS ---
let audioCtx, analyser, dataArray, biquadFilter;
let visualWindow = null;

function initAudioAnalysis() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        
        biquadFilter = audioCtx.createBiquadFilter();
        biquadFilter.type = "lowpass";
        // Iniciamos en 20kHz (abierto total)
        biquadFilter.frequency.setValueAtTime(20000, audioCtx.currentTime); 

        const sourceStatic = audioCtx.createMediaElementSource(staticNoise);
        const sourceRadio = audioCtx.createMediaElementSource(radioBank);
        
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

// --- LÓGICA DE EVENTOS PARANORMALES ---

function triggerParanormalEvent() {
    // Aumentamos probabilidad para pruebas: 0.5
    if (!running || isSpeaking || Math.random() > 0.5) return;

    isSpeaking = true;
    msgEl.classList.add('evp-active');
    
    // Suavizamos la caída del filtro para evitar el "pop" o ruido extraño
    if(biquadFilter) {
        biquadFilter.frequency.setTargetAtTime(500, audioCtx.currentTime, 0.1);
    }

    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    msgEl.textContent = phrase;

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = 'es-ES';
    utterance.rate = 0.7; // Un poco más rápido para evitar bloqueos
    utterance.pitch = 0.1;

    // SEGURO DE VIDA: Si a los 5 segundos no ha terminado la voz, reseteamos manual
    const safetyReset = setTimeout(() => {
        if (isSpeaking) resetNormalAudio();
    }, 5000);

    function resetNormalAudio() {
        isSpeaking = false;
        msgEl.classList.remove('evp-active');
        clearTimeout(safetyReset);
        if(biquadFilter) {
            biquadFilter.frequency.setTargetAtTime(20000, audioCtx.currentTime, 0.2);
        }
    }

    utterance.onend = resetNormalAudio;
    utterance.onerror = resetNormalAudio;

    window.speechSynthesis.speak(utterance);
}

// --- CONTROL DE LA RADIO ---

function playRandomRadioSlice() {
    if (!running) return;
    const duration = radioBank.duration;
    if (duration) {
        radioBank.currentTime = Math.random() * duration;
        radioBank.play().catch(e => console.log("Audio play blocked"));
        const nextSlice = 1500 + Math.random() * 3000;
        radioTimerId = setTimeout(playRandomRadioSlice, nextSlice);
    }
}

function startRadio() {
    running = true;
    btnToggle.textContent = "Detener";
    dialEl.classList.remove('paused-anim');
    
    initAudioAnalysis();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    staticNoise.play().catch(e => console.log("Static blocked"));
    
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
    paranormalTimerId = setInterval(triggerParanormalEvent, 8000); // Intento cada 8s
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
    
    // Resetear filtro al apagar para evitar que se quede sordo al reiniciar
    if(biquadFilter) biquadFilter.frequency.setValueAtTime(20000, audioCtx.currentTime);

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

if(btnInfo) btnInfo.onclick = () => modal.style.display = "block";
if(spanClose) spanClose.onclick = () => modal.style.display = "none";
window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
};
