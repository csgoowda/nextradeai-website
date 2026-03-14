document.addEventListener('DOMContentLoaded', () => {
    /* ── Custom Cursor ── */
    const cur = document.getElementById('cursor');
    const ring = document.getElementById('cursor-ring');
    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
        cur.style.left = mx + 'px';
        cur.style.top = my + 'px';
    });

    function animRing() {
        rx += (mx - rx) * 0.12;
        ry += (my - ry) * 0.12;
        ring.style.left = rx + 'px';
        ring.style.top = ry + 'px';
        requestAnimationFrame(animRing);
    }
    animRing();

    const hoverElements = 'a, button, .faq, .feat-card, .s-card, .stat-tile';
    document.querySelectorAll(hoverElements).forEach(el => {
        el.addEventListener('mouseenter', () => {
            cur.style.transform = 'translate(-50%, -50%) scale(2)';
            ring.style.width = '48px';
            ring.style.height = '48px';
            ring.style.borderColor = 'rgba(0, 212, 160, 0.6)';
        });
        el.addEventListener('mouseleave', () => {
            cur.style.transform = 'translate(-50%, -50%) scale(1)';
            ring.style.width = '36px';
            ring.style.height = '36px';
            ring.style.borderColor = 'rgba(0, 212, 160, 0.4)';
        });
    });

    /* ── Canvas Particles ── */
    const canvas = document.getElementById('bg-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let W, H, particles = [];

        function resize() {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        class Particle {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * W;
                this.y = Math.random() * H;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = (Math.random() - 0.5) * 0.3;
                this.r = Math.random() * 1.5 + 0.5;
                this.life = Math.random() * 200 + 100;
                this.age = 0;
                this.color = Math.random() > 0.5 ? [0, 212, 160] : [61, 184, 252];
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.age++;
                if (this.age > this.life || this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
            }
            draw() {
                const a = Math.sin((this.age / this.life) * Math.PI) * 0.5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${a})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < 80; i++) particles.push(new Particle());

        function drawMesh() {
            ctx.clearRect(0, 0, W, H);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(drawMesh);
        }
        drawMesh();
    }

    /* ── Header Scroll ── */
    const hdr = document.getElementById('hdr');
    window.addEventListener('scroll', () => {
        if (hdr) hdr.classList.toggle('solid', window.scrollY > 60);
    });

    /* ── Ticker ── */
    const tickerTrack = document.getElementById('tickerTrack');
    if (tickerTrack) {
        const tData = [
            { n: 'XAUUSD', pct: '+0.52%', up: true },
            { n: 'BTCUSD', pct: '+2.78%', up: true },
            { n: 'EURUSD', pct: '-0.11%', up: false },
            { n: 'GBPUSD', pct: '+0.18%', up: true },
            { n: 'USDJPY', pct: '+0.22%', up: true },
            { n: 'ETHUSD', pct: '-1.34%', up: false },
        ];
        const items = [...tData, ...tData].map(t => `
            <span class="t-item">
                <span class="t-name">${t.n}</span>
                <span class="${t.up ? 't-up' : 't-dn'}">${t.up ? '▲' : '▼'} ${t.pct}</span>
            </span>
        `).join('');
        tickerTrack.innerHTML = items;
    }

    /* ── Reveal on Scroll ── */
    const revObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('in');
                revObs.unobserve(e.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));

    /* ── Counter ── */
    const counterNum = document.getElementById('counterNum');
    if (counterNum) {
        const countObs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    let count = 0;
                    const target = 6504;
                    const step = () => {
                        count += Math.floor(target / 50);
                        if (count < target) {
                            counterNum.textContent = count.toLocaleString();
                            requestAnimationFrame(step);
                        } else {
                            counterNum.textContent = target.toLocaleString();
                        }
                    };
                    step();
                    countObs.unobserve(counterNum);
                }
            });
        });
        countObs.observe(counterNum);
    }

    /* ── Strategy Slideshow ── */
    const slides = document.querySelectorAll('.strategy-slideshow .slide');
    if (slides.length > 0) {
        let currentSlide = 0;
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 4000);
    }
    /* ── Mobile Menu Toggle ── */
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                const isMenu = icon.getAttribute('data-lucide') === 'menu';
                icon.setAttribute('data-lucide', isMenu ? 'x' : 'menu');
                lucide.createIcons();
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.setAttribute('data-lucide', 'menu');
                    lucide.createIcons();
                }
            });
        });
    }
});

function toggleFAQ(el) {
    const wasOpen = el.classList.contains('open');
    document.querySelectorAll('.faq').forEach(f => f.classList.remove('open'));
    if (!wasOpen) el.classList.add('open');
}

function submitTrial() {
    const btn = document.getElementById('trialBtn');
    if (btn) {
        btn.textContent = '✅ Trial Access Granted! Check Email';
        btn.style.background = 'var(--green)';
        btn.disabled = true;
    }
}
