let running = false;
const trackIds = ['eq-rf', 'eq-kin', 'eq-mag', 'eq-ir'];
const numBars = 200; // 200 barras por fila

// 1. Generar barras y aplicar gradación horizontal de opacidad
trackIds.forEach(id => {
    const container = document.getElementById(id);
    for (let i = 0; i < numBars; i++) {
        const bar = document.createElement('div');
        bar.className = 'bar';
        // Gradación de opacidad para que los bordes sean más suaves
        const opacity = i < 40 ? i / 40 : (i > 160 ? (200 - i) / 40 : 1);
        bar.style.opacity = opacity;
        container.appendChild(bar);
    }
});

function animate() {
    if (!running) return;

    trackIds.forEach((id, trackIndex) => {
        const bars = document.querySelectorAll(`#${id} .bar`);
        const time = Date.now() * 0.002;
        
        bars.forEach((bar, i) => {
            // Cada track tiene un multiplicador de velocidad diferente (trackIndex)
            // Esto hace que NO vayan al mismo ritmo.
            const speed = 0.1 + (trackIndex * 0.05);
            const noise = Math.sin(time * speed + i * 0.2) * 20;
            const randomJump = Math.random() * 30;
            
            // Calculamos la altura base + variación
            let h = 30 + noise + randomJump;
            h = Math.max(10, Math.min(100, h));
            
            bar.style.height = h + "%";
        });
    });
    
    requestAnimationFrame(animate);
}

// Controladores de inicio/parada
const btnToggle = document.getElementById("btnToggle");
const dial = document.getElementById("dial");
const msg = document.getElementById("message");

btnToggle.onclick = () => {
    if (!running) {
        running = true;
        btnToggle.textContent = "DETENER";
        dial.classList.remove("paused-anim");
        msg.textContent = "BUSCANDO...";
        animate();
        // Simulación de audio
        document.getElementById("staticNoise").play();
    } else {
        running = false;
        btnToggle.textContent = "INICIAR";
        dial.classList.add("paused-anim");
        msg.textContent = "OFFLINE";
        document.getElementById("staticNoise").pause();
        // Resetear barras
        document.querySelectorAll('.bar').forEach(b => b.style.height = "10%");
    }
};

// Lógica de kHz (Basada en la posición real del dial)
setInterval(() => {
    if (running) {
        const parentWidth = dial.parentElement.offsetWidth;
        const currentLeft = dial.offsetLeft;
        const freq = (153 + (currentLeft / parentWidth) * 128).toFixed(3);
        if (!msg.classList.contains('evp-active')) {
            msg.textContent = freq + " kHz";
        }
    }
}, 50);
