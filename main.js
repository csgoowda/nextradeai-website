document.addEventListener('DOMContentLoaded', () => {
    // Record page view (using relative path to work everywhere)
    fetch(`/api/view`, { method: 'POST' }).catch(e => console.error('View tracking failed', e));

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

function handleFormSubmit(event, type) {
    if (event) event.preventDefault();
    
    const isTrial = type === 'trial';
    const prefix = isTrial ? 'trial' : 'buy';
    
    const name = document.getElementById(`${prefix}Name`).value.trim();
    const email = document.getElementById(`${prefix}Email`).value.trim();
    const country = document.getElementById(`${prefix}Country`).value.trim();
    const phone = document.getElementById(`${prefix}Phone`).value.trim();
    const mt5 = document.getElementById(`${prefix}Mt5`).value.trim();
    
    const errorEl = document.getElementById(`${prefix}Error`);
    const btn = document.getElementById(`${prefix}Btn`);

    if (!name || !email || !country || !phone || !mt5) {
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.textContent = 'Please fill all required fields correctly.';
        }
        return;
    }

    // Strict format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.textContent = 'Please enter a valid email address.';
        }
        return;
    }

    // Accept +, digits, spaces, hyphens; min 7 numeric chars
    const phoneRegex = /^\+?[\d\s\-()]{7,20}$/;
    if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 7) {
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.textContent = 'Please enter a valid phone number.';
        }
        return;
    }

    // MT5 account format usually digits
    if (!/^\d+$/.test(mt5)) {
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.textContent = 'MT5 Account must be numerical.';
        }
        return;
    }

    if (errorEl) errorEl.style.display = 'none';
    
    if (btn) {
        btn.textContent = 'Processing...';
        btn.disabled = true;
    }

    // Use relative path to work on both localhost and Railway
    fetch(`/api/lead`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fullName: name,
            email: email,
            country: country,
            phone: phone,
            mt5Account: mt5,
            source: type
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if (btn) {
                btn.textContent = isTrial ? '✅ Request Sent! Redirecting...' : '✅ Purchase Sent! Redirecting...';
                btn.style.background = 'var(--green)';
                btn.style.color = 'black';
            }
            // Redirect to Telegram
            setTimeout(() => {
                const tgMsg = isTrial ? 'trial' : 'buy';
                window.open(`https://t.me/Chethans18?text=${tgMsg}`, '_blank');
                
                // Reset form optionally
                document.getElementById(`${prefix}Name`).value = '';
                document.getElementById(`${prefix}Email`).value = '';
                document.getElementById(`${prefix}Country`).value = '';
                document.getElementById(`${prefix}Phone`).value = '';
                document.getElementById(`${prefix}Mt5`).value = '';
                
                if (btn) {
                    btn.textContent = isTrial ? 'Start My Free Trial' : 'Buy Now';
                    btn.disabled = false;
                    btn.style.background = ''; // reset to default
                    btn.style.color = '';
                }
            }, 1500);
        } else {
            // Error from server (Validation or Rate Limit)
            if (errorEl) {
                errorEl.style.display = 'block';
                errorEl.textContent = data.error || 'Submission failed. Please try again.';
            }
            if (btn) {
                btn.textContent = isTrial ? 'Start My Free Trial' : 'Buy Now';
                btn.disabled = false;
            }
        }
    })
    .catch(err => {
        console.error('Submit error:', err);
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.textContent = 'Failed to connect to the server.';
        }
        if (btn) {
            btn.textContent = isTrial ? 'Start My Free Trial' : 'Buy Now';
            btn.disabled = false;
        }
    });
}

function submitTrial(e) {
    handleFormSubmit(e, 'trial');
}

function submitBuy(e) {
    handleFormSubmit(e, 'buy');
}
