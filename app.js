/**
 * @file app.js
 * @description Lógica de Spirit Radio LW optimizada para PWA y Android.
 * - Intervalos aleatorios: 10-20 segundos.
 * - Ruido estático: Permanente.
 * - Funciones nativas: Vibración y Bloqueo de pantalla (WakeLock).
 */

let running = false;
let isSpeaking = false;
let wakeLock = null;

// Elementos del DOM
const msgEl = document.getElementById("message");
const btnToggle = document.getElementById("btnToggle");
const btnVisualizer = document.getElementById("btnVisualizer");
const staticNoise = document.getElementById("staticNoise");
const radioBank = document.getElementById("radioBank");
const dialEl = document.getElementById("dial");
const dialWrapper = document.querySelector(".dial-wrapper");

// Timers
let radioTimerId = null;
let paranormalTimerId = null;
let displayUpdateId = null;

// Datos
let phrases = [];
let audioCtx, analyser, dataArray;
let visualWindow = null;

/**
 * Mantiene la pantalla encendida (Ideal para Android)
 */
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log("Wake Lock activo: La pantalla no se apagará.");
        } catch (err) {
            console.warn("Wake Lock no disponible:", err);
        }
    }
}

/**
 * Inicializa el análisis de audio para el visualizador
 */
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

/**
 * Envía datos de frecuencia al visualizador (ventana externa o iframe)
 */
function sendDataToVisualizer() {
    if (visualWindow && !visualWindow.closed && analyser) {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        visualWindow.postMessage({ 
            type: 'AUDIO_UPDATE', 
            volume: avg, 
            isSpeaking: isSpeaking 
        }, '*');
    }
}

/**
 * Reproduce trozos aleatorios de Radio.mp3 cada 10-20 segundos
 */
function playRandomRadioSlice() {
    if (!running || isSpeaking) return;

    // Buscar punto aleatorio en el archivo de audio
    const duration = radioBank.duration || 10;
    radioBank.currentTime = Math.random() * (duration - 1);
    
    // Reproducir un pulso corto (400ms a 800ms)
    radioBank.play().then(() => {
        const sliceDuration = 400 + Math.random() * 400;
        
        setTimeout(() => {
            radioBank.pause();
            
            // Programar el siguiente sonido entre 10 y 20 segundos después
            if (running) {
                const nextInterval = 10000 + Math.random() * 10000;
                radioTimerId = setTimeout(playRandomRadioSlice, nextInterval);
            }
        }, sliceDuration);
    }).catch(e => console.warn("Error en Radio Audio:", e));
}

/**
 * Genera un evento de voz paranormal (EVP) cada 10-20 segundos
 */
function triggerParanormalEvent() {
    if (!running || isSpeaking || phrases.length === 0) return;
    
    isSpeaking = true;
    
    // Feedback táctil para Android
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    msgEl.classList.add('evp-active');
    
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    const utter = new SpeechSynthesisUtterance(randomPhrase);
    
    utter.lang = 'es-ES';
    utter.pitch = 0.5; // Voz más grave/espectral
    utter.rate = 0.7;

    utter.onstart = () => { msgEl.textContent = randomPhrase; };
    
    utter.onend = () => {
        isSpeaking = false;
        msgEl.classList.remove('evp-active');
        
        // Programar la siguiente voz entre 10 y 20 segundos después
        if (running) {
            const nextVoiceDelay = 10000 + Math.random() * 10000;
            paranormalTimerId = setTimeout(triggerParanormalEvent, nextVoiceDelay);
        }
    };
    
    window.speechSynthesis.speak(utter);
}

/**
 * Inicia la radio y todos los ciclos
 */
async function startRadio() {
    initAudioAnalysis();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    
    await requestWakeLock(); // Android: Pantalla siempre activa

    running = true;
    btnToggle.textContent = "Detener";
    dialEl.classList.remove('paused-anim');
    
    // Ruido estático SIEMPRE activo en bucle
    staticNoise.loop = true;
    staticNoise.volume = 0.25; 
    staticNoise.play();
    
    // Ciclo de actualización de pantalla (Frecuencia kHz)
    displayUpdateId = setInterval(() => {
        if (!isSpeaking) {
            const dialRect = dialEl.getBoundingClientRect();
            const wrapperRect = dialWrapper.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (dialRect.left - wrapperRect.left) / (wrapperRect.width - dialRect.width)));
            msgEl.textContent = `${(153.000 + (percent * 128.000)).toFixed(3)} kHz`;
        }
        sendDataToVisualizer();
    }, 50);
    
    // Primer disparo de eventos tras un retardo aleatorio inicial (10-20s)
    radioTimerId = setTimeout(playRandomRadioSlice, 10000 + Math.random() * 10000);
    paranormalTimerId = setTimeout(triggerParanormalEvent, 10000 + Math.random() * 10000);
}

/**
 * Detiene la radio y limpia los procesos
 */
function stopRadio() {
    running = false;
    isSpeaking = false;
    btnToggle.textContent = "Iniciar";
    dialEl.classList.add('paused-anim');
    
    // Liberar bloqueo de pantalla
    if (wakeLock) {
        wakeLock.release().then(() => wakeLock = null);
    }
    
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

// Eventos de usuario
btnToggle.onclick = () => { 
    if (running) stopRadio(); else startRadio(); 
};

btnVisualizer.onclick = () => {
    visualWindow = window.open('visualizer.html', 'SpiritVisualizer', 'width=500,height=600');
};

// Carga inicial de frases
fetch('phrases.json')
    .then(res => res.json())
    .then(data => {
        phrases = data.phrases || data;
    })
    .catch(e => {
        console.error("Error cargando frases:", e);
        phrases = ["HOLA", "ESTOY AQUÍ", "AYUDA", "ESCUCHA"];
    });

// Cerrar modales si existen
const modal = document.getElementById("infoModal");
const btnInfo = document.getElementById("btnInfo");
const spanClose = document.querySelector(".close");

if(btnInfo) btnInfo.onclick = () => modal.style.display = "block";
if(spanClose) spanClose.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };
