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
let visualWindow = null;
let audioCtx, analyser, dataArray;

function initAudioAnalysis() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        
        // Conectamos ambos elementos al analizador central
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
    // Obtenemos datos siempre, para que el sistema "sepa" que hay audio
    if (analyser) {
        analyser.getByteFrequencyData(dataArray);
    }

    // Solo enviamos si la ventana está abierta
    if (visualWindow && !visualWindow.closed && running) {
        let total = 0;
        for(let i = 0; i < dataArray.length; i++) total += dataArray[i];
        let audioVolume = (total / dataArray.length) * 2;
        
        visualWindow.postMessage({ 
            type: 'AUDIO_UPDATE', 
            volume: audioVolume,
            isSpeaking: isSpeaking 
        }, '*');
    }
}

// --- LÓGICA DE RADIO (SALTOS ALEATORIOS) ---

function playRandomRadioSlice() {
    if (!running || isSpeaking) return;

    // 1. Elegir un punto aleatorio del archivo radio.mp3
    const duration = radioBank.duration || 60; // fallback si no ha cargado
    radioBank.currentTime = Math.random() * duration;
    
    // 2. Reproducir un trozo corto (300ms a 800ms para sonar errático)
    radioBank.volume = Math.random() * 0.5 + 0.3; // Volumen variable para más realismo
    radioBank.play().catch(e => console.log("Error play:", e));

    const sliceDuration = Math.random() * 500 + 300; 

    setTimeout(() => {
        if (running && !isSpeaking) {
            radioBank.pause();
            // 3. Programar el siguiente salto tras un breve silencio (efecto de búsqueda)
            const pauseDuration = Math.random() * 2000 + 500;
            radioTimerId = setTimeout(playRandomRadioSlice, pauseDuration);
        }
    }, sliceDuration);
}

// --- LÓGICA DE VOZ ---
fetch('phrases.json').then(res => res.json()).then(data => phrases = data.phrases);

function triggerParanormalEvent() {
    if (!running || phrases.length === 0 || isSpeaking) return;

    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    isSpeaking = true; 
    radioBank.pause(); // Pausamos la radio para que se oiga la voz
    msgEl.classList.add('evp-active');
    msgEl.textContent = "SINTONIZANDO...";

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
    utter.pitch = 0.1;
    utter.rate = 0.6;

    utter.onstart = () => { msgEl.textContent = text.toUpperCase(); };
    utter.onend = () => { 
        isSpeaking = false; 
        msgEl.classList.remove('evp-active');
        // Al terminar de hablar, reiniciamos el ciclo de la radio
        playRandomRadioSlice(); 
    };

    window.speechSynthesis.speak(utter);
}

// --- CONTROLES ---
function updateFrequencyDisplay() {
    if (!running) return;
    
    if (!isSpeaking) {
        const dialRect = dialEl.getBoundingClientRect();
        const wrapperRect = dialWrapper.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (dialRect.left - wrapperRect.left) / (wrapperRect.width - dialRect.width)));
        msgEl.textContent = `${(153.000 + (percent * 128.000)).toFixed(3)} kHz`;
    }
    
    sendDataToVisualizer();
}

function startRadio() {
    initAudioAnalysis();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    running = true;
    btnToggle.textContent = "Detener";
    dialEl.classList.remove('paused-anim');
    
    // El ruido blanco (estática) es constante de fondo
    staticNoise.volume = 0.15;
    staticNoise.play();
    
    // Iniciamos bucles
    displayUpdateId = setInterval(updateFrequencyDisplay, 50);
    playRandomRadioSlice(); // Primer salto de radio
    paranormalTimerId = setInterval(triggerParanormalEvent, 15000);
}

function stopRadio() {
    running = false;
    isSpeaking = false;
    btnToggle.textContent = "Iniciar";
    dialEl.classList.add('paused-anim');
    
    clearInterval(displayUpdateId);
    clearTimeout(radioTimerId);
    clearInterval(paranormalTimerId);
    
    staticNoise.pause();
    radioBank.pause();
    window.speechSynthesis.cancel();
    msgEl.textContent = "OFFLINE";
    msgEl.classList.remove('evp-active');
}

btnToggle.onclick = () => {
    // Truco para desbloquear AudioContext en móviles/Chrome
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (running) stopRadio(); else startRadio();
};

btnVisualizer.onclick = () => {
    visualWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=500,height=600');
};

// ... Resto de lógica del modal ...
