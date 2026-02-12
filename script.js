// CONFIG: Anniversary Date
const annivDate = new Date(2025, 5, 1); // May 1, 2025 (Months are 0-indexed)

// --- SHARED FUNCTIONS ---

// Cursor Follower
const cursor = document.getElementById('cursor-heart');
document.addEventListener('mousemove', (e) => {
    if(cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }
});

// Floating Hearts Animation
function startHearts() {
    const container = document.body;
    setInterval(() => {
        const h = document.createElement('div');
        h.innerHTML = '❤️';
        Object.assign(h.style, {
            position: 'fixed',
            left: Math.random() * 100 + 'vw',
            top: '105vh',
            fontSize: (Math.random() * 15 + 15) + 'px',
            zIndex: '0',
            pointerEvents: 'none',
            opacity: Math.random() * 0.5 + 0.3,
            filter: `blur(${Math.random() * 2}px)`
        });
        container.appendChild(h);
        
        const duration = Math.random() * 5000 + 6000;
        const anim = h.animate([
            { transform: 'translateY(0) rotate(0deg)', opacity: h.style.opacity },
            { transform: `translateY(-110vh) rotate(${Math.random() * 360}deg)`, opacity: 0 }
        ], { duration: duration, easing: 'linear' });
        
        anim.onfinish = () => h.remove();
    }, 600); // Slightly slower spawn rate for a more gentle effect
}

// --- PROPOSAL PAGE LOGIC ---
const noBtn = document.getElementById('no-btn');
const yesBtn = document.getElementById('yes-btn');
const funny = ["Are you sure?", "Really?", "Think again! 🥺", "Last chance!", "Try again! ❤️", "Don't break my heart!"];
let fIndex = 0;
let noBtnMovedToBody = false;

function moveNo() {
    // Move No button to body on first run so position:fixed is always viewport-relative
    if (!noBtnMovedToBody && noBtn && document.body) {
        document.body.appendChild(noBtn);
        noBtnMovedToBody = true;
    }

    noBtn.innerText = funny[fIndex];
    fIndex = (fIndex + 1) % funny.length;

    // Use visualViewport so we never go off the visible screen (handles mobile chrome, zoom)
    const vp = window.visualViewport;
    const vw = vp ? vp.width : window.innerWidth;
    const vh = vp ? vp.height : window.innerHeight;

    const pad = 20;
    const w = noBtn.offsetWidth;
    const h = noBtn.offsetHeight;

    // Bounce box: valid top-left so the full button stays inside viewport
    const minX = 0;
    const maxX = Math.max(0, vw - w);
    const minY = 0;
    const maxY = Math.max(0, vh - h);
    const rangeX = Math.max(0, maxX - minX - pad * 2);
    const rangeY = Math.max(0, maxY - minY - pad * 2);

    const yRect = yesBtn.getBoundingClientRect();
    let x, y;
    let attempts = 0;
    const safetyCap = 500;

    do {
        x = minX + pad + Math.random() * rangeX;
        y = minY + pad + Math.random() * rangeY;
        const noRight = x + w;
        const noBottom = y + h;
        const overlapsYes =
            x < yRect.right && noRight > yRect.left &&
            y < yRect.bottom && noBottom > yRect.top;
        if (!overlapsYes) break;
        attempts++;
    } while (attempts < safetyCap);

    // Hard clamp so the button never goes off-screen (left, right, top, bottom)
    x = Math.max(0, Math.min(x, vw - w));
    y = Math.max(0, Math.min(y, vh - h));

    noBtn.style.position = 'fixed';
    noBtn.style.left = x + 'px';
    noBtn.style.top = y + 'px';
    noBtn.style.margin = '0';
    noBtn.style.transform = 'none';
    const s = parseFloat(yesBtn.style.transform.replace('scale(', '')) || 1;
    yesBtn.style.transform = `scale(${s + 0.15})`;
    yesBtn.style.boxShadow = `0 0 ${15 + s * 5}px rgba(233, 30, 99, 0.6)`;
}

if(noBtn) {
    noBtn.addEventListener('mouseover', moveNo);
    noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); moveNo(); });
}
if(yesBtn) yesBtn.addEventListener('click', () => window.location.href = 'valentine.html');


// --- VALENTINE PAGE LOGIC ---

function initValentinePage() {
    setInterval(updateCounter, 1000);
    setupMemory();
    startHearts();
    setupScrollAnimation();
    document.getElementById('bg-music').play().catch(() => console.log("Auto-play blocked"));
}

// Scroll Animation Observer
function setupScrollAnimation() {
    const triggers = document.querySelectorAll('.scroll-trigger');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, { threshold: 0.2 }); // Trigger when 20% of the element is visible

    triggers.forEach(trigger => observer.observe(trigger));
}

// Anniversary Counter
function updateCounter() {
    const now = new Date();
    const diff = now - annivDate;
    
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    
    const t = document.getElementById('timer');
    if(t) {
        // Keep timer on one line (nbsp separators; CSS also enforces nowrap)
        t.innerHTML =
            `<span style="display:inline-block; min-width: 3ch;">${d}</span>d&nbsp;` +
            `<span style="display:inline-block; min-width: 2ch;">${h.toString().padStart(2,'0')}</span>h&nbsp;` +
            `<span style="display:inline-block; min-width: 2ch;">${m.toString().padStart(2,'0')}</span>m&nbsp;` +
            `<span style="display:inline-block; min-width: 2ch;">${s.toString().padStart(2,'0')}</span>s`;
    }
}

// --- MEMORY GAME: shuffle cards, match pairs, reveal secret message ---
const icons = ['❤️', '💖', '✨', '🌹', '💑', '💌', '❤️', '💖', '✨', '🌹', '💑', '💌'];
let flipped = [];
let matches = 0;
let lockBoard = false;

function setupMemory() {
    const board = document.getElementById('memory-game');
    if (!board) return;

    flipped = [];
    matches = 0;
    lockBoard = false;

    // Shuffle icons (Fisher–Yates style via sort)
    const gameIcons = [...icons].sort(() => Math.random() - 0.5);

    board.innerHTML = '';
    gameIcons.forEach(icon => {
        const card = document.createElement('div');
        card.className = 'memory-card glow';
        card.dataset.icon = icon;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', 'Memory card');

        card.onclick = function () {
            if (lockBoard) return;
            if (this.classList.contains('matched')) return;
            if (this.classList.contains('flipped')) return;
            if (flipped.length >= 2) return;

            this.classList.add('flipped');
            this.innerText = this.dataset.icon;
            flipped.push(this);

            if (flipped.length === 2) {
                lockBoard = true;
                setTimeout(checkMatch, 600);
            }
        };
        board.appendChild(card);
    });
}

function checkMatch() {
    const [card1, card2] = flipped;

    if (card1.dataset.icon === card2.dataset.icon) {
        card1.classList.add('matched');
        card2.classList.add('matched');
        card1.style.pointerEvents = 'none';
        card2.style.pointerEvents = 'none';
        matches += 1;

        if (matches === icons.length / 2) {
            setTimeout(unlockSecret, 400);
        }
    } else {
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');
        card1.innerText = '';
        card2.innerText = '';
    }
    flipped = [];
    lockBoard = false;
}

function unlockSecret() {
    const secretMsg = document.getElementById('secret-message');
    if (secretMsg) {
        secretMsg.classList.add('unlocked');
        secretMsg.setAttribute('aria-hidden', 'false');
        secretMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    startHearts();
}

// Ensure the valentine page initialization includes the setup
function initValentinePage() {
    setInterval(updateCounter, 1000);
    setupMemory();
    startHearts();
    setupScrollAnimation();
    
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
        bgMusic.play().catch(() => console.log("Auto-play blocked - waiting for user interaction."));
    }
}

// Music Toggle
const mt = document.getElementById('music-toggle');
if(mt) {
    mt.onclick = () => {
        const m = document.getElementById('bg-music');
        if(m.paused) { 
            m.play(); 
            mt.innerHTML = "⏸️ Pause Song"; 
            mt.style.background = 'var(--soft-pink)';
        } else { 
            m.pause(); 
            mt.innerHTML = "🎵 Play Our Song"; 
            mt.style.background = 'transparent';
        }
    };
}

