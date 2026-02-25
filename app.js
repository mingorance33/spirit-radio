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

// --- GESTIÓN DE MOVIMIENTO REAL (SENSORES) ---
let currentYAccel = 0;

function handleMotion(event) {
    if (event.accelerationIncludingGravity) {
        // Capturamos la aceleración en el eje Y (movimiento vertical)
        currentYAccel = event.accelerationIncludingGravity.y;
    }
}

// --- MOTOR DE AUDIO Y COMUNICACIÓN CON VISUALIZADOR ---
let visualWindow = null;
let audioCtx, analyser, dataArray;

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

function sendDataToVisualizer() {
    if (visualWindow && !visualWindow.closed && running) {
        analyser.getByteFrequencyData(dataArray);
        let total = 0;
        for(let i = 0; i < dataArray.length; i++) total += dataArray[i];
        let audioVolume = (total / dataArray.length) * 2;
        
        // Enviamos el estado de voz (isSpeaking), el volumen y el movimiento real (yAccel)
        visualWindow.postMessage({ 
            type: 'AUDIO_UPDATE', 
            volume: audioVolume,
            isSpeaking: isSpeaking,
            yAccel: currentYAccel 
        }, '*');
    }
}

// --- LÓGICA DE FRASES PARANORMALES ---
fetch('phrases.json')
    .then(res => res.json())
    .then(data => phrases = data.phrases)
    .catch(err => console.error("Error cargando frases:", err));

function triggerParanormalEvent() {
    if (!running || phrases.length === 0 || isSpeaking) return;
    
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    isSpeaking = true; 
    msgEl.classList.add('evp-active');
    msgEl.textContent = "SINTONIZANDO...";

    // Pequeño retraso para crear tensión antes de que hable
    setTimeout(() => {
        if (running) {
            speakTetric(randomPhrase);
        } else {
            isSpeaking = false;
            msgEl.classList.remove('evp-active');
        }
    }, 1000); 
}

function speakTetric(text) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.pitch = 0.1; // Voz grave/tétrica
    utter.rate = 0.6;  // Velocidad lenta
    
    utter.onstart = () => { 
        msgEl.textContent = text.toUpperCase(); 
    };
    
    utter.onend = () => { 
        isSpeaking = false; 
        msgEl.classList.remove('evp-active'); 
    };
    
    window.speechSynthesis.speak(utter);
}

// --- CONTROLES DE LA INTERFAZ ---

function updateFrequencyDisplay() {
    if (!running || isSpeaking) {
        if(running) sendDataToVisualizer();
        return;
    }
    const dialRect = dialEl.getBoundingClientRect();
    const wrapperRect = dialWrapper.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (dialRect.left - wrapperRect.left) / (wrapperRect.width - dialRect.width)));
    
    // Simulación de frecuencia kHz
    msgEl.textContent = `${(153.000 + (percent * 128.000)).toFixed(3)} kHz`;
    
    sendDataToVisualizer();
}

function playRandomRadioSlice() {
    if (!running || isSpeaking) return;
    radioBank.currentTime = Math.random() * (radioBank.duration || 10);
    radioBank.volume = 0.8;
    radioBank.play().catch(() => {});
    setTimeout(() => { if (running) radioBank.pause(); }, 800);
}

async function startRadio() {
    // Solicitar permiso para sensores de movimiento (Vital en iOS)
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission === 'granted') {
                window.addEventListener('devicemotion', handleMotion);
            }
        } catch (e) {
            console.error("Error solicitando sensores:", e);
        }
    } else {
        // En Android/Desktop se añade directamente
        window.addEventListener('devicemotion', handleMotion);
    }

    initAudioAnalysis();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    running = true;
    btnToggle.textContent = "Detener";
    dialEl.classList.remove('paused-anim');
    
    displayUpdateId = setInterval(updateFrequencyDisplay, 50);
    staticNoise.volume = 0.2;
    staticNoise.play();
    
    radioTimerId = setInterval(playRandomRadioSlice, 12000);
    paranormalTimerId = setInterval(triggerParanormalEvent, 20000);
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
    
    window.removeEventListener('devicemotion', handleMotion);
}

btnToggle.onclick = () => {
    // "Truco" para desbloquear el audio en navegadores móviles
    const unlockVoice = new SpeechSynthesisUtterance("");
    window.speechSynthesis.speak(unlockVoice);
    
    if (running) stopRadio(); else startRadio();
};

btnVisualizer.onclick = () => {
    // Abrir ventana del osciloscopio
    visualWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=500,height=600');
};

// --- MODAL DE INFORMACIÓN ---
const modal = document.getElementById("infoModal");
const btnInfo = document.getElementById("btnInfo");
const spanClose = document.querySelector(".close");

btnInfo.onclick = () => modal.style.display = "block";
spanClose.onclick = () => modal.style.display = "none";
window.onclick = (e) => { 
    if (e.target == modal) modal.style.display = "none"; 
};
