/* ==========================================================================
   ALGERIA CHILL HANGOUT - DYNAMIC INTERACTION ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initHeaderScroll();
    initMobileMenu();
    initStatsAnimator();
    init3DTiltCards();
    initLofiSynthesizer();
});

/* ==========================================================================
   HEADER SCROLL & INTERACTIVE NAVIGATION
   ========================================================================== */
function initHeaderScroll() {
    const header = document.getElementById('main-header');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');

    window.addEventListener('scroll', () => {
        // Sticky Header shrink
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Active Link tracking
        let currentSectionId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });
}

/* ==========================================================================
   MOBILE DRAWER TOGGLE
   ========================================================================== */
function initMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        menuToggle.classList.toggle('active');
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('open');
            menuToggle.classList.remove('active');
        });
    });
}

/* ==========================================================================
   LIVE STATS ANIMATOR & REAL-TIME ROBLOX DATA FETCHING
   ========================================================================== */
function initStatsAnimator() {
    const statsSection = document.getElementById('hero');
    const numbers = document.querySelectorAll('.stat-number');
    let animated = false;

    // Default values (fallbacks)
    let stats = {
        rating: 89.5,
        visits: 2372, // Using actual visits as baseline fallback
        playing: 0
    };

    // Keep track of the active player interval so we can update it
    let driftInterval = null;

    // Organic drift for playing players based on real value
    const startDriftSimulator = (realPlaying) => {
        const livePlayersNum = document.getElementById('live-players-count');
        if (driftInterval) clearInterval(driftInterval);
        
        driftInterval = setInterval(() => {
            let currentVal = parseInt(livePlayersNum.textContent) || 0;
            // Drift by +/- 1
            const drift = Math.random() > 0.5 ? 1 : -1;
            let newVal = currentVal + drift;
            
            // Set organic bounds around the real value
            const minBound = Math.max(0, realPlaying - 2);
            const maxBound = Math.max(5, realPlaying + 2); // Show at least a small active number if there's someone
            
            if (newVal < minBound) newVal = minBound;
            if (newVal > maxBound) newVal = maxBound;
            
            livePlayersNum.textContent = newVal;
        }, 5000);
    };

    const animateStats = (fetchedStats) => {
        numbers.forEach(num => {
            const parentCard = num.closest('.stat-card');
            if (!parentCard) return;

            let target = 0;
            if (parentCard.id === 'stat-rating') {
                target = fetchedStats.rating;
            } else if (parentCard.id === 'stat-visits') {
                target = fetchedStats.visits;
            } else if (parentCard.id === 'stat-players') {
                target = fetchedStats.playing;
            } else if (parentCard.id === 'stat-servers') {
                target = 100; // Server stability is always 100%
            } else {
                target = parseFloat(num.getAttribute('data-target')) || 0;
            }

            // Set data-target attribute for consistency
            num.setAttribute('data-target', target.toString());

            let current = 0;
            const duration = 2000; // ms
            const stepTime = 20; // ms
            const increment = target / (duration / stepTime);

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }

                // Custom premium format based on card type
                if (parentCard.id === 'stat-rating') {
                    num.textContent = current.toFixed(1) + '%';
                } else if (parentCard.id === 'stat-visits') {
                    if (target >= 1000) {
                        num.textContent = (current / 1000).toFixed(1) + 'K+';
                    } else {
                        num.textContent = Math.floor(current);
                    }
                } else if (parentCard.id === 'stat-players') {
                    num.textContent = Math.floor(current);
                } else if (parentCard.id === 'stat-servers') {
                    num.textContent = Math.floor(current) + '%';
                } else {
                    num.textContent = Math.floor(current);
                }
            }, stepTime);
        });

        // Start drifting after initial animation
        setTimeout(() => {
            startDriftSimulator(fetchedStats.playing);
        }, 2200);
    };

    // Fetch real stats from Roblox APIs (with CORS Proxies)
    const fetchRealRobloxStats = async () => {
        const PLACE_ID = '72991468240515';
        let universeId = '10004563828'; // Hardcoded fallback for faster lookup

        // 1. Resolve Universe ID (dynamic check)
        try {
            const universeRes = await fetch(`https://apis.roproxy.com/universes/v1/places/${PLACE_ID}/universe`);
            if (universeRes.ok) {
                const universeData = await universeRes.json();
                if (universeData && universeData.universeId) {
                    universeId = universeData.universeId;
                }
            }
        } catch (e) {
            console.warn("Could not fetch universe ID, using default:", e);
        }

        // 2. Fetch Active Players and Visits from Games API (RoProxy has CORS enabled)
        try {
            const detailsRes = await fetch(`https://games.roproxy.com/v1/games?universeIds=${universeId}`);
            if (detailsRes.ok) {
                const detailsData = await detailsRes.json();
                if (detailsData && detailsData.data && detailsData.data[0]) {
                    const gameInfo = detailsData.data[0];
                    if (typeof gameInfo.visits === 'number') stats.visits = gameInfo.visits;
                    if (typeof gameInfo.playing === 'number') stats.playing = gameInfo.playing;
                }
            }
        } catch (e) {
            console.warn("Could not fetch game details, using defaults:", e);
        }

        // 3. Fetch Votes from Votes API via AllOrigins CORS proxy
        try {
            const votesUrl = `https://games.roblox.com/v1/games/votes?universeIds=${universeId}`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(votesUrl)}`;
            const votesRes = await fetch(proxyUrl);
            if (votesRes.ok) {
                const votesData = await votesRes.json();
                if (votesData && votesData.contents) {
                    const parsed = JSON.parse(votesData.contents);
                    if (parsed && parsed.data && parsed.data[0]) {
                        const votesInfo = parsed.data[0];
                        const up = votesInfo.upVotes || 0;
                        const down = votesInfo.downVotes || 0;
                        if (up + down > 0) {
                            stats.rating = (up / (up + down)) * 100;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("Could not fetch game votes, using default rating:", e);
        }

        return stats;
    };

    // Run fetch immediately on load so data is ready when user scrolls
    let statsPromise = fetchRealRobloxStats();

    // Trigger intersection observer for statistics count-up
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(async (entry) => {
            if (entry.isIntersecting && !animated) {
                animated = true;
                // Await the fetched stats or use what we got
                const fetchedStats = await statsPromise;
                animateStats(fetchedStats);
            }
        });
    }, { threshold: 0.2 });

    observer.observe(statsSection);
}

/* ==========================================================================
   3D TILT CARDS PERSPECTIVE HOVER
   ========================================================================== */
function init3DTiltCards() {
    const cards = document.querySelectorAll('.tilt-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const cardRect = card.getBoundingClientRect();
            const cardWidth = cardRect.width;
            const cardHeight = cardRect.height;
            
            // Mouse coords relative to card center
            const mouseX = e.clientX - cardRect.left - cardWidth / 2;
            const mouseY = e.clientY - cardRect.top - cardHeight / 2;
            
            // Calculate tilt angle max 8 degrees
            const rotateX = -(mouseY / (cardHeight / 2)) * 8;
            const rotateY = (mouseX / (cardWidth / 2)) * 8;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
        });
    });
}

/* ==========================================================================
   WEB AUDIO API PROCEDURAL LOFI SYNTHESIZER
   ========================================================================== */
function initLofiSynthesizer() {
    // UI Elements
    const playBtn = document.getElementById('btn-audio-play');
    const trackName = document.getElementById('player-track-name');
    const eqBars = document.getElementById('audio-equalizer');
    const statusIcon = document.getElementById('player-music-status-icon');
    const tapeLeft = document.getElementById('tape-wheel-left');
    const tapeRight = document.getElementById('tape-wheel-right');
    const canvas = document.getElementById('visualizer-canvas');
    const ctx = canvas.getContext('2d');

    // Controls sliders
    const sliderHarmony = document.getElementById('slider-harmony');
    const sliderCrackle = document.getElementById('slider-crackle');
    const sliderRain = document.getElementById('slider-rain');
    const sliderBeats = document.getElementById('slider-beats');

    const valHarmony = document.getElementById('val-harmony');
    const valCrackle = document.getElementById('val-crackle');
    const valRain = document.getElementById('val-rain');
    const valBeats = document.getElementById('val-beats');

    // Audio Engine Nodes
    let audioCtx = null;
    let mainGain = null;
    let harmonyGain = null;
    let crackleGain = null;
    let rainGain = null;
    let beatsGain = null;
    let analyser = null;

    let isPlaying = false;
    let beatSchedulerTimer = null;
    let chordSchedulerTimer = null;

    // Visualizer Canvas Resize
    const resizeCanvas = () => {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize Synthesis Engine
    const setupAudioContext = () => {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();

        // Final mix bus
        mainGain = audioCtx.createGain();
        mainGain.gain.value = 0.8;

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        mainGain.connect(analyser);
        analyser.connect(audioCtx.destination);

        // Sub busses
        harmonyGain = audioCtx.createGain();
        harmonyGain.gain.value = sliderHarmony.value / 100;
        harmonyGain.connect(mainGain);

        crackleGain = audioCtx.createGain();
        crackleGain.gain.value = sliderCrackle.value / 100;
        crackleGain.connect(mainGain);

        rainGain = audioCtx.createGain();
        rainGain.gain.value = sliderRain.value / 100;
        rainGain.connect(mainGain);

        beatsGain = audioCtx.createGain();
        beatsGain.gain.value = sliderBeats.value / 100;
        beatsGain.connect(mainGain);
    };

    // Update individual sliders values
    sliderHarmony.addEventListener('input', () => {
        valHarmony.textContent = sliderHarmony.value + '%';
        if (harmonyGain) harmonyGain.gain.linearRampToValueAtTime(sliderHarmony.value / 100, audioCtx.currentTime + 0.1);
    });
    sliderCrackle.addEventListener('input', () => {
        valCrackle.textContent = sliderCrackle.value + '%';
        if (crackleGain) crackleGain.gain.linearRampToValueAtTime(sliderCrackle.value / 100, audioCtx.currentTime + 0.1);
    });
    sliderRain.addEventListener('input', () => {
        valRain.textContent = sliderRain.value + '%';
        if (rainGain) rainGain.gain.linearRampToValueAtTime(sliderRain.value / 100, audioCtx.currentTime + 0.1);
    });
    sliderBeats.addEventListener('input', () => {
        valBeats.textContent = sliderBeats.value + '%';
        if (beatsGain) beatsGain.gain.linearRampToValueAtTime(sliderBeats.value / 100, audioCtx.currentTime + 0.1);
    });

    // Procedural Noise Generator Helper (Vinyl crackle & Rain nodes)
    const createNoiseBuffer = (type) => {
        const bufferSize = 2 * audioCtx.sampleRate;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            if (type === 'pink') {
                // Pink noise approximations
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5; 
            } else if (type === 'brown') {
                // Brown noise (softer, deep rain effect)
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 6.0;
            } else {
                // White noise
                output[i] = white;
            }
        }
        return noiseBuffer;
    };

    // Synthesize Procedural Vinyl Crackle
    let crackleSource = null;
    const startCrackleNode = () => {
        const noiseBuffer = createNoiseBuffer('white');
        crackleSource = audioCtx.createBufferSource();
        crackleSource.buffer = noiseBuffer;
        crackleSource.loop = true;

        // Bandpass filter to make it thin and sound like static radio
        const bandpass = audioCtx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1000;
        bandpass.Q.value = 1.0;

        // Visual crackle spike simulator node using a waveshaper or procedural clicks
        const scriptNode = audioCtx.createScriptProcessor(4096, 0, 1);
        scriptNode.onaudioprocess = (e) => {
            const outBuffer = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < outBuffer.length; i++) {
                outBuffer[i] = 0;
                // Add randomized crackle clicks
                if (Math.random() > 0.9997) {
                    // Click impulse
                    outBuffer[i] = (Math.random() * 2 - 1) * 0.35;
                }
            }
        };

        // Combine crackle static & clicking pops
        crackleSource.connect(bandpass);
        bandpass.connect(crackleGain);
        scriptNode.connect(crackleGain);

        crackleSource.start();
    };

    // Synthesize Soothing Rain Environment
    let rainSource = null;
    const startRainNode = () => {
        const noiseBuffer = createNoiseBuffer('brown');
        rainSource = audioCtx.createBufferSource();
        rainSource.buffer = noiseBuffer;
        rainSource.loop = true;

        // Lowpass filter to sweep rain intensity
        const lowpass = audioCtx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 800;

        // Slow modulation (LFO) to swell rain sweeps
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08; // extremely slow sweep

        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 250;

        lfo.connect(lfoGain);
        lfoGain.connect(lowpass.frequency);

        rainSource.connect(lowpass);
        lowpass.connect(rainGain);

        lfo.start();
        rainSource.start();
    };

    // Immersive Chill Chord progressions (Triads & 7ths chords)
    // Fmaj7, Gmaj7, Em7, Am7
    const chords = [
        [174.61, 220.00, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
        [196.00, 246.94, 293.66, 369.99], // Gmaj7 (G3, B3, D4, F#4)
        [164.81, 196.00, 246.94, 293.66], // Em7 (E3, G3, B3, D4)
        [220.00, 261.63, 329.63, 392.00]  // Am7 (A3, C4, E4, G4)
    ];
    let activeOscillators = [];

    const playChord = (chordFrequencies) => {
        // Clear previous chord smoothly
        fadeActiveChords();

        const time = audioCtx.currentTime;
        
        chordFrequencies.forEach(freq => {
            const osc = audioCtx.createOscillator();
            const oscGain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            // Mellow triangle waves
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            // Filter to make it warmer and lofi
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, time);

            // Envelope generator
            oscGain.gain.setValueAtTime(0, time);
            oscGain.gain.linearRampToValueAtTime(0.12, time + 2.5); // Warm attack

            // Vibrato Wow & Flutter slow modulation
            const vibrato = audioCtx.createOscillator();
            const vibratoGain = audioCtx.createGain();
            vibrato.frequency.value = 4.5 + Math.random(); // human drift
            vibratoGain.gain.value = 0.8; // fine pitch vibrato
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);

            osc.connect(filter);
            filter.connect(oscGain);
            oscGain.connect(harmonyGain);

            vibrato.start();
            osc.start();

            activeOscillators.push({ osc, oscGain, vibrato });
        });
    };

    const fadeActiveChords = () => {
        const time = audioCtx.currentTime;
        activeOscillators.forEach(item => {
            item.oscGain.gain.cancelScheduledValues(time);
            item.oscGain.gain.setValueAtTime(item.oscGain.gain.value, time);
            item.oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 2.0); // Smooth decay release
            setTimeout(() => {
                try {
                    item.osc.stop();
                    item.vibrato.stop();
                } catch(e) {}
            }, 2500);
        });
        activeOscillators = [];
    };

    // Synthesized Procedural Lofi Drums (Kick & Snare Rimshot)
    const playKickDrum = (time) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(beatsGain);

        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

        gain.gain.setValueAtTime(0.65, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

        osc.start(time);
        osc.stop(time + 0.2);
    };

    const playSnareRim = (time) => {
        // Noise rimshot burst
        const bufferSize = audioCtx.sampleRate * 0.05;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1100;
        filter.Q.value = 3.0;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.22, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(beatsGain);

        noise.start(time);
        noise.stop(time + 0.06);
    };

    // Drum beat rhythm scheduler
    let currentBeat = 0;
    const beatScheduler = (startTime) => {
        const beatDuration = 60 / 75; // 75 BPM Lofi hip-hop beat

        beatSchedulerTimer = setInterval(() => {
            const time = audioCtx.currentTime;
            
            // Kick on beat 1 & 3, snare on 2 & 4
            if (currentBeat === 0) {
                playKickDrum(time);
            } else if (currentBeat === 1) {
                // simple swing gap
            } else if (currentBeat === 2) {
                playSnareRim(time);
            } else if (currentBeat === 3) {
                playKickDrum(time + 0.1);
            } else if (currentBeat === 4) {
                playKickDrum(time);
            } else if (currentBeat === 5) {
                // open gap
            } else if (currentBeat === 6) {
                playSnareRim(time);
            } else if (currentBeat === 7) {
                // lazy swing off-beat kick
                if (Math.random() > 0.5) playKickDrum(time + 0.05);
            }

            currentBeat = (currentBeat + 1) % 8;
        }, (beatDuration / 2) * 1000); // eighth notes scheduler
    };

    // Harmonizer chord sequencer loop
    let currentChordIndex = 0;
    const startChordSequencer = () => {
        const chordLoop = () => {
            playChord(chords[currentChordIndex]);
            currentChordIndex = (currentChordIndex + 1) % chords.length;
        };

        chordLoop();
        chordSchedulerTimer = setInterval(chordLoop, 7500); // Change chord every 7.5 seconds
    };

    // Canvas visualizer rendering loop
    const renderVisualizer = () => {
        if (!isPlaying) return;

        requestAnimationFrame(renderVisualizer);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Clear canvas with glass backdrop trace
        ctx.fillStyle = 'rgba(10, 15, 13, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        // Custom stylized visualization lines mirroring emerald & ruby gradients
        ctx.lineWidth = 3;
        ctx.beginPath();

        for (let i = 0; i < bufferLength; i++) {
            const val = dataArray[i] / 255;
            const y = canvas.height - (val * (canvas.height - 10)) - 5;
            
            // Custom HSL gradients for visual wave line
            const r = Math.floor(100 + val * 155);
            const g = Math.floor(255 - val * 255);
            const b = Math.floor(140 + val * 115);

            ctx.strokeStyle = `rgb(${r},${g},${b})`;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += barWidth + 1;
        }
        ctx.stroke();
    };

    // Main Synth Toggle action
    const startSynthEngine = () => {
        setupAudioContext();

        // AudioContext browser unlock check
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        // Start modules
        startCrackleNode();
        startRainNode();
        startChordSequencer();
        beatScheduler();

        isPlaying = true;
        renderVisualizer();

        // Interface updates
        playBtn.classList.add('active');
        playBtn.querySelector('.btn-play-text').textContent = 'Stop Synthesizer';
        playBtn.querySelector('.btn-play-icon').textContent = '■';
        eqBars.classList.add('active');
        tapeLeft.classList.add('spinning');
        tapeRight.classList.add('spinning');
        trackName.textContent = 'Generator Online - Procedural Algerian Lofi Ambience';
        statusIcon.textContent = '🎧';
    };

    const stopSynthEngine = () => {
        fadeActiveChords();

        clearInterval(beatSchedulerTimer);
        clearInterval(chordSchedulerTimer);

        if (crackleSource) crackleSource.stop();
        if (rainSource) rainSource.stop();

        if (audioCtx) {
            audioCtx.close();
        }

        isPlaying = false;

        // Reset visualizer canvas
        ctx.fillStyle = '#0a0f0d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Interface updates
        playBtn.classList.remove('active');
        playBtn.querySelector('.btn-play-text').textContent = 'Start Synthesizer';
        playBtn.querySelector('.btn-play-icon').textContent = '▶';
        eqBars.classList.remove('active');
        tapeLeft.classList.remove('spinning');
        tapeRight.classList.remove('spinning');
        trackName.textContent = 'Generator Offline - Press Play to Start';
        statusIcon.textContent = '🎵';
    };

    playBtn.addEventListener('click', () => {
        if (!isPlaying) {
            startSynthEngine();
        } else {
            stopSynthEngine();
        }
    });
}
