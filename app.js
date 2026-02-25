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
    if (analyser) analyser.getByteFrequencyData(dataArray);
    if (visualWindow && !visualWindow.closed && running) {
        let total = 0;
        for(let i = 0; i < dataArray.length; i++) total += dataArray[i];
        let audioVolume = (total / dataArray.length) * 2;
        visualWindow.postMessage({ type: 'AUDIO_UPDATE', volume: audioVolume, isSpeaking: isSpeaking }, '*');
    }
}

// --- LÓGICA DE RADIO (BARRIDO ALEATORIO) ---
function playRandomRadioSlice() {
    if (!running || isSpeaking) return;

    // Limpiar cualquier timer previo para evitar duplicados
    clearTimeout(radioTimerId);

    // Saltar a punto aleatorio
    const duration = radioBank.duration || 10;
    radioBank.currentTime = Math.random() * duration;
    radioBank.volume = Math.random() * 0.4 + 0.2;
    
    radioBank.play().then(() => {
        // Duración del "chispazo" de radio (muy breve)
        const sliceDuration = Math.random() * 400 + 200; 
        
        radioTimerId = setTimeout(() => {
            radioBank.pause();
            // Tiempo hasta el siguiente chispazo
            if (running && !isSpeaking) {
                const nextWait = Math.random() * 1500 + 300;
                radioTimerId = setTimeout(playRandomRadioSlice, nextWait);
            }
        }, sliceDuration);
    }).catch(() => {
        // Si falla el play (ej. interacción), reintentar en 1s
        radioTimerId = setTimeout(playRandomRadioSlice, 1000);
    });
}

// --- LÓGICA DE VOZ ---
fetch('phrases.json').then(res => res.json()).then(data => phrases = data.phrases);

function triggerParanormalEvent() {
    if (!running || phrases.length === 0 || isSpeaking) return;

    isSpeaking = true;
    clearTimeout(radioTimerId); // Detenemos la radio inmediatamente
    radioBank.pause();

    msgEl.classList.add('evp-active');
    msgEl.textContent = "SINTONIZANDO...";

    // 1 segundo de "tensión" antes de la palabra
    setTimeout(() => {
        if (!running) {
            isSpeaking = false;
            return;
        }
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        speakTetric(randomPhrase);
    }, 1000);
}

function speakTetric(text) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.pitch = 0.1;
    utter.rate = 0.6;

    utter.onstart = () => { 
        msgEl.textContent = text.toUpperCase(); 
    };
    
    utter.onend = () => { 
        isSpeaking = false; 
        msgEl.classList.remove('evp-active'); 
        // IMPORTANTE: Al terminar, devolvemos el ciclo a la radio
        if (running) playRandomRadioSlice();
    };

    utter.onerror = () => {
        isSpeaking = false;
        msgEl.classList.remove('evp-active');
        if (running) playRandomRadioSlice();
    };

    window.speechSynthesis.speak(utter);
}

// --- CONTROLES Y BUCLE ---
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
    
    staticNoise.volume = 0.2;
    staticNoise.play();
    
    displayUpdateId = setInterval(updateFrequencyDisplay, 50);
    
    // Lanzar primer ciclo de radio
    playRandomRadioSlice();
    
    // Intervalo de eventos paranormales (cada 15-20 segundos)
    paranormalTimerId = setInterval(triggerParanormalEvent, 18000);
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
    msgEl.textContent = "OFFLINE";
    msgEl.classList.remove('evp-active');
}

btnToggle.onclick = () => {
    if (running) stopRadio(); else startRadio();
};

btnVisualizer.onclick = () => {
    visualWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=500,height=600');
};

// Modal logic (igual que antes)
const modal = document.getElementById("infoModal");
document.getElementById("btnInfo").onclick = () => modal.style.display = "block";
document.querySelector(".close").onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };
