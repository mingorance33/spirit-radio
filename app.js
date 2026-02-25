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
    if (visualWindow && !visualWindow.closed && running) {
        analyser.getByteFrequencyData(dataArray);
        let total = 0;
        for(let i = 0; i < dataArray.length; i++) total += dataArray[i];
        let audioVolume = (total / dataArray.length) * 2;
        
        // Enviamos volumen real + estado de voz paranormal
        visualWindow.postMessage({ 
            type: 'AUDIO_UPDATE', 
            volume: audioVolume,
            isSpeaking: isSpeaking 
        }, '*');
    }
}

// --- LÓGICA DE VOZ ---
fetch('phrases.json').then(res => res.json()).then(data => phrases = data.phrases);

function speakTetric(text) {
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

function updateFrequencyDisplay() {
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
    radioBank.currentTime = Math.random() * (radioBank.duration || 10);
    radioBank.volume = 0.8;
    radioBank.play().catch(() => {});
    setTimeout(() => { if (running) radioBank.pause(); }, 800);
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
}

btnToggle.onclick = () => { if (running) stopRadio(); else startRadio(); };
btnVisualizer.onclick = () => { visualWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=500,height=600'); };

const modal = document.getElementById("infoModal");
document.getElementById("btnInfo").onclick = () => modal.style.display = "block";
document.querySelector(".close").onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };
