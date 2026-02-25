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

// --- MOTOR DE AUDIO Y ANALIZADOR ---
let visualWindow = null;
let audioCtx, analyser, dataArray;

function initAudioAnalysis() {
    // Solo inicializamos si no existe, para evitar duplicados en móviles
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            
            // Conectar archivos de audio al analizador
            const sourceStatic = audioCtx.createMediaElementSource(staticNoise);
            const sourceRadio = audioCtx.createMediaElementSource(radioBank);
            
            sourceStatic.connect(analyser);
            sourceRadio.connect(analyser);
            analyser.connect(audioCtx.destination);
            
            analyser.fftSize = 256; 
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        } catch (e) {
            console.error("El navegador no soporta Web Audio API", e);
        }
    }
}

function sendDataToVisualizer() {
    if (visualWindow && !visualWindow.closed && running) {
        analyser.getByteFrequencyData(dataArray);
        
        let total = 0;
        for(let i = 0; i < dataArray.length; i++) total += dataArray[i];
        let audioVolume = (total / dataArray.length) * 2;
        
        // Enviamos el volumen y el estado de la voz (TTS)
        visualWindow.postMessage({ 
            type: 'AUDIO_UPDATE', 
            volume: audioVolume,
            isSpeaking: isSpeaking 
        }, '*');
    }
}

// --- LÓGICA DE VOZ PARANORMAL ---
fetch('phrases.json')
    .then(res => res.json())
    .then(data => phrases = data.phrases);

function speakTetric(text) {
    if (!running) return;
    
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.pitch = 0.1;
    utter.rate = 0.6;

    utter.onstart = () => { 
        isSpeaking = true; 
        msgEl.classList.add('evp-active'); 
        msgEl.textContent = text.toUpperCase(); 
    };
    
    utter.onend = () => { 
        isSpeaking = false; 
        msgEl.classList.remove('evp-active'); 
    };

    window.speechSynthesis.speak(utter);
}

// --- ACTUALIZACIÓN DE INTERFAZ ---
function updateFrequencyDisplay() {
    // Si está hablando (EVP activo), no movemos los números de frecuencia
    if (!dialEl || !dialWrapper || !running || msgEl.classList.contains('evp-active')) {
        if(running) sendDataToVisualizer();
        return;
    }

    const dialRect = dialEl.getBoundingClientRect();
    const wrapperRect = dialWrapper.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (dialRect.left - wrapperRect.left) / (wrapperRect.width - dialRect.width)));
    
    msgEl.textContent = `${(153.000 + (percent * 128.000)).toFixed(3)} kHz`;
    sendDataToVisualizer();
}

function playRandomRadioSlice() {
    if (!running) return;
    // Forzamos recarga sutil para evitar bloqueos de buffer en móvil
    radioBank.currentTime = Math.random() * (radioBank.duration || 10);
    radioBank.volume = 0.8;
    radioBank.play().catch(() => {});
    
    setTimeout(() => { 
        if (running) radioBank.pause(); 
    }, 600 + Math.random() * 1000);
}

// --- CONTROLES PRINCIPALES ---
function startRadio() {
    initAudioAnalysis();
    
    // Despertar el audio (Crucial para móviles)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    running = true;
    btnToggle.textContent = "Detener";
    dialEl.classList.remove('paused-anim');
    
    // Carga previa para móviles
    staticNoise.load();
    staticNoise.volume = 0.2;
    staticNoise.play().catch(e => console.log("Error play:", e));
    
    displayUpdateId = setInterval(updateFrequencyDisplay, 50);
    radioTimerId = setInterval(playRandomRadioSlice, 12000);
    
    paranormalTimerId = setInterval(() => {
        if (running && phrases.length > 0 && !isSpeaking) {
            speakTetric(phrases[Math.floor(Math.random() * phrases.length)]);
        }
    }, 20000);
}

function stopRadio() {
    running = false;
    isSpeaking = false;
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

// --- EVENTOS DE USUARIO ---
btnToggle.onclick = () => {
    // Truco: Al tocar el botón, desbloqueamos la voz y el audio a la vez
    const unlockVoice = new SpeechSynthesisUtterance("");
    window.speechSynthesis.speak(unlockVoice);

    if (running) stopRadio(); else startRadio();
};

btnVisualizer.onclick = () => {
    // Nota: En móvil, asegúrate de permitir ventanas emergentes
    visualWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=500,height=600');
};

// Modal de información
const modal = document.getElementById("infoModal");
document.getElementById("btnInfo").onclick = () => modal.style.display = "block";
document.querySelector(".close").onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };
