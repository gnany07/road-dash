/**
 * ROAD DASH: OVERDRIVE - Main Game Controller & Orchestrator
 * High-performance 60+ FPS game loop, input handling, state transitions, and responsive canvas scaling.
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Subsystems
        this.roadEngine = new window.RoadEngine();
        this.player = new window.Player();
        this.trafficManager = new window.TrafficManager();
        this.particleSystem = new window.ParticleSystem();
        this.levelManager = new window.LevelManager();
        this.garageManager = new window.GarageManager();
        this.uiManager = new window.UIManager();

        // Game State
        this.state = 'MENU'; // MENU, LEVEL_SELECT, GARAGE, PLAYING, PAUSED, GAME_OVER, VICTORY
        this.mode = 'campaign'; // campaign, endless
        this.currentLevel = null;
        this.timeRemaining = 60;
        this.elapsedTime = 0;
        this.finished = false;
        this.highestCombo = 0;

        // Input state
        this.input = {
            up: false,
            down: false,
            left: false,
            right: false,
            nitro: false
        };

        // Timing
        this.lastTime = 0;
        this.dpr = window.devicePixelRatio || 1;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initInputListeners();
        this.initMenuButtons();

        // Set initial screen
        this.showMainMenu();

        // Start requestAnimationFrame loop
        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.resetTransform();
        this.ctx.scale(this.dpr, this.dpr);
    }

    initInputListeners() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            window.soundEngine.ensureContext();

            // Prevent spacebar and arrow keys from scrolling the webpage or clicking buttons
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) || e.key === ' ') {
                e.preventDefault();
            }

            // Nitro Boost (SPACEBAR, SHIFT)
            if (e.code === 'Space' || e.key === ' ' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.input.nitro = true;
            }

            // Steering Left (A, Left Arrow)
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.input.left = true;
            }

            // Steering Right (D, Right Arrow)
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.input.right = true;
            }

            // Gas / Accelerate (W, Up Arrow)
            if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                this.input.up = true;
            }

            // Brake / Reverse (S, Down Arrow)
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.input.down = true;
            }

            // Pause / Resume (P, Escape)
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.state === 'PLAYING') {
                    this.pauseGame();
                } else if (this.state === 'PAUSED') {
                    this.resumeGame();
                }
            }

            // Quick Restart (R)
            if (e.code === 'KeyR') {
                if (this.state === 'PLAYING' || this.state === 'GAME_OVER' || this.state === 'VICTORY') {
                    this.restartCurrent();
                }
            }

            // Mute / Unmute Toggle shortcut (M)
            if (e.code === 'KeyM') {
                const isMuted = !window.soundEngine.muted;
                window.soundEngine.setMuted(isMuted);
                this.uiManager.updateAudioIcons();
            }

            // Enter shortcut for menu confirmation / progression
            if (e.code === 'Enter') {
                if (this.state === 'GAME_OVER') {
                    this.restartCurrent();
                } else if (this.state === 'VICTORY') {
                    const nextLvlId = (this.currentLevel ? this.currentLevel.id : 1) + 1;
                    if (nextLvlId <= this.levelManager.levels.length) {
                        this.startLevel(nextLvlId);
                    } else {
                        this.showLevelSelect();
                    }
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.key === ' ' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.input.nitro = false;
            }
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.input.left = false;
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.input.right = false;
            }
            if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                this.input.up = false;
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.input.down = false;
            }
        });

        // Touch buttons for mobile devices
        const touchLeft = document.getElementById('touch-left');
        const touchRight = document.getElementById('touch-right');
        const touchNitro = document.getElementById('touch-nitro');
        const touchBrake = document.getElementById('touch-brake');
        const touchGas = document.getElementById('touch-gas');

        const bindTouch = (el, prop) => {
            if (!el) return;
            const start = (e) => { e.preventDefault(); window.soundEngine.ensureContext(); this.input[prop] = true; };
            const end = (e) => { e.preventDefault(); this.input[prop] = false; };
            el.addEventListener('touchstart', start, { passive: false });
            el.addEventListener('touchend', end, { passive: false });
            el.addEventListener('mousedown', start);
            el.addEventListener('mouseup', end);
        };

        bindTouch(touchLeft, 'left');
        bindTouch(touchRight, 'right');
        bindTouch(touchNitro, 'nitro');
        bindTouch(touchBrake, 'down');
        bindTouch(touchGas, 'up');
    }

    initMenuButtons() {
        // Main Menu
        document.getElementById('btn-play-campaign')?.addEventListener('click', () => {
            window.soundEngine.playUiClick();
            this.showLevelSelect();
        });

        document.getElementById('btn-play-endless')?.addEventListener('click', () => {
            window.soundEngine.playUiClick();
            this.startEndlessMode();
        });

        document.getElementById('btn-open-garage')?.addEventListener('click', () => {
            window.soundEngine.playUiClick();
            this.showGarage();
        });

        document.getElementById('btn-open-settings')?.addEventListener('click', () => {
            window.soundEngine.playUiClick();
            this.showSettings();
        });

        // Navigation back buttons
        document.getElementById('btn-level-back')?.addEventListener('click', () => {
            window.soundEngine.playUiClick();
            this.showMainMenu();
        });

        document.getElementById('btn-garage-back')?.addEventListener('click', () => {
            window.soundEngine.playUiClick();
            this.showMainMenu();
        });

        document.getElementById('btn-settings-back')?.addEventListener('click', () => {
            window.soundEngine.playUiClick();
            this.showMainMenu();
        });

        // In-game Pause menu
        document.getElementById('hud-pause-btn')?.addEventListener('click', () => {
            this.pauseGame();
        });

        document.getElementById('btn-pause-resume')?.addEventListener('click', () => {
            this.resumeGame();
        });

        document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
            this.restartCurrent();
        });

        document.getElementById('btn-pause-quit')?.addEventListener('click', () => {
            this.showMainMenu();
        });

        // Game Over modal buttons
        document.getElementById('btn-gameover-restart')?.addEventListener('click', () => {
            this.restartCurrent();
        });

        document.getElementById('btn-gameover-menu')?.addEventListener('click', () => {
            this.showMainMenu();
        });

        // Victory modal buttons
        document.getElementById('btn-victory-next')?.addEventListener('click', () => {
            const nextLvlId = (this.currentLevel ? this.currentLevel.id : 1) + 1;
            if (nextLvlId <= this.levelManager.levels.length) {
                this.startLevel(nextLvlId);
            } else {
                this.showLevelSelect();
            }
        });

        document.getElementById('btn-victory-menu')?.addEventListener('click', () => {
            this.showMainMenu();
        });
    }

    // -------------------------------------------------------------
    // STATE TRANSITIONS
    // -------------------------------------------------------------
    showMainMenu() {
        this.state = 'MENU';
        window.soundEngine.stopEngine();
        window.soundEngine.stopMusic();
        this.uiManager.setHudVisible(false);
        this.uiManager.showScreen(this.uiManager.screenMainMenu);
    }

    showLevelSelect() {
        this.state = 'LEVEL_SELECT';
        this.uiManager.setHudVisible(false);
        this.uiManager.renderLevelSelect(this.levelManager, (lvlId) => this.startLevel(lvlId));
        this.uiManager.showScreen(this.uiManager.screenLevelSelect);
    }

    showGarage() {
        this.state = 'GARAGE';
        this.uiManager.setHudVisible(false);
        this.uiManager.renderGarage(this.garageManager);
        this.uiManager.showScreen(this.uiManager.screenGarage);
    }

    showSettings() {
        this.state = 'SETTINGS';
        this.uiManager.setHudVisible(false);
        this.uiManager.showScreen(this.uiManager.screenSettings);
    }

    startLevel(levelId) {
        this.mode = 'campaign';
        this.currentLevel = this.levelManager.getLevel(levelId);
        this.timeRemaining = this.currentLevel.timeLimit;
        this.elapsedTime = 0;
        this.finished = false;
        this.highestCombo = 0;

        // Apply selected car stats
        const activeCarStats = this.garageManager.getComputedStats(this.garageManager.data.selectedCarId);
        this.player.reset();
        this.player.applyCarStats(activeCarStats);

        // Build track & populate traffic
        this.roadEngine.buildTrack(this.currentLevel);
        this.trafficManager.populate(this.roadEngine, this.currentLevel);
        this.particleSystem.reset();

        // Start sounds
        window.soundEngine.startMusic();

        this.state = 'PLAYING';
        this.uiManager.setHudVisible(true);
        this.uiManager.showScreen(null); // hide all overlays
    }

    startEndlessMode() {
        this.mode = 'endless';
        this.currentLevel = {
            id: 99,
            name: "Endless Highway Overdrive",
            theme: "neon",
            weather: "clear",
            trafficDensity: 30,
            hasHazards: true
        };
        this.timeRemaining = 999999;
        this.elapsedTime = 0;
        this.finished = false;
        this.highestCombo = 0;

        const activeCarStats = this.garageManager.getComputedStats(this.garageManager.data.selectedCarId);
        this.player.reset();
        this.player.applyCarStats(activeCarStats);

        // Generate dynamic endless loop
        this.roadEngine.buildTrack({
            theme: "neon",
            weather: "clear",
            sections: [
                { length: 80, curve: 0, hill: 0 },
                { length: 100, curve: 3, hill: 30 },
                { length: 90, curve: -3, hill: -25 },
                { length: 110, curve: 4, hill: 20 },
                { length: 90, curve: -4, hill: -20 },
                { length: 80, curve: 0, hill: 0 }
            ],
            hasHazards: true
        });

        this.trafficManager.populate(this.roadEngine, this.currentLevel);
        this.particleSystem.reset();

        window.soundEngine.startMusic();
        this.state = 'PLAYING';
        this.uiManager.setHudVisible(true);
        this.uiManager.showScreen(null);
    }

    pauseGame() {
        this.state = 'PAUSED';
        window.soundEngine.stopEngine();
        this.uiManager.showScreen(this.uiManager.screenPause);
    }

    resumeGame() {
        this.state = 'PLAYING';
        this.uiManager.showScreen(null);
    }

    restartCurrent() {
        if (this.mode === 'endless') {
            this.startEndlessMode();
        } else {
            this.startLevel(this.currentLevel ? this.currentLevel.id : 1);
        }
    }

    gameOver(reason) {
        this.state = 'GAME_OVER';
        window.soundEngine.stopEngine();
        window.soundEngine.stopMusic();

        const reasonEl = document.getElementById('game-over-reason');
        if (reasonEl) {
            reasonEl.textContent = reason === 'health' ? 'VEHICLE DESTROYED!' : 'TIME EXPIRED!';
        }

        const scoreEl = document.getElementById('game-over-score');
        if (scoreEl) {
            scoreEl.textContent = `FINAL SCORE: ${this.player.score.toLocaleString()}`;
        }

        this.uiManager.showScreen(this.uiManager.screenGameOver);
    }

    victory() {
        this.state = 'VICTORY';
        this.finished = true;
        window.soundEngine.stopEngine();
        window.soundEngine.stopMusic();
        window.soundEngine.playLevelVictory();

        const { starsWon, cashAward } = this.levelManager.recordCompletion(
            this.currentLevel.id,
            this.player,
            { finished: true, highestCombo: this.highestCombo }
        );

        this.garageManager.addCash(cashAward);

        // Update Victory Modal
        const starsContainer = document.getElementById('victory-stars-container');
        if (starsContainer) {
            starsContainer.innerHTML = '';
            for (let i = 1; i <= 3; i++) {
                starsContainer.innerHTML += `<span class="victory-star ${i <= starsWon ? 'active' : ''}">★</span>`;
            }
        }

        const cashEl = document.getElementById('victory-cash-reward');
        if (cashEl) {
            cashEl.textContent = `+$${cashAward.toLocaleString()}`;
        }

        const objectivesList = document.getElementById('victory-objectives-list');
        if (objectivesList && this.currentLevel) {
            objectivesList.innerHTML = this.currentLevel.objectives.map(obj => {
                const passed = obj.check(this.player, { finished: true, highestCombo: this.highestCombo });
                return `<div class="objective-item ${passed ? 'passed' : 'failed'}">
                    <span>${passed ? '✓' : '✗'}</span> ${obj.text}
                </div>`;
            }).join('');
        }

        this.uiManager.showScreen(this.uiManager.screenVictory);
    }

    // -------------------------------------------------------------
    // MAIN GAME LOOP
    // -------------------------------------------------------------
    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        if (this.state === 'PLAYING') {
            this.update(dt);
            this.render();
        } else if (this.state === 'GARAGE') {
            this.uiManager.renderGaragePreview(this.garageManager);
        } else if (this.state === 'MENU') {
            // Ambient attract mode background
            this.renderMenuAttractBackground(dt);
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        this.elapsedTime += dt;

        if (this.mode === 'campaign') {
            this.timeRemaining -= dt;
            if (this.timeRemaining <= 0) {
                this.gameOver('time');
                return;
            }
        }

        // Controllable throttle logic:
        // - Holding Up/W/Gas provides full acceleration
        // - Holding Down/S applies strong braking
        // - Releasing all inputs smoothly cruises at ~80 km/h for easy maneuvering
        const effectiveInput = Object.assign({}, this.input);
        if (!effectiveInput.down && !effectiveInput.up && !effectiveInput.nitro) {
            if (this.player.speed < 3600) {
                effectiveInput.up = true;
            }
        }

        // Update player
        this.player.update(dt, effectiveInput, this.roadEngine, this.trafficManager, this.particleSystem);

        // Update traffic
        this.trafficManager.update(dt, this.player, this.roadEngine, this.particleSystem);

        // Update particles
        this.particleSystem.update(dt);

        // Track highest combo
        if (this.player.nearMissCombo > this.highestCombo) {
            this.highestCombo = this.player.nearMissCombo;
        }

        // Check health
        if (this.player.health <= 0) {
            this.gameOver('health');
            return;
        }

        // Check level completion
        if (this.mode === 'campaign') {
            const finishLineZ = this.roadEngine.trackLength - 2000;
            if (this.player.position >= finishLineZ && !this.finished) {
                this.victory();
                return;
            }
        }

        // Dynamic theme shifting in Endless mode
        if (this.mode === 'endless') {
            const themes = ['neon', 'storm', 'canyon', 'chase', 'coastal'];
            const cycleIdx = Math.floor(this.player.position / 12000) % themes.length;
            this.roadEngine.theme = themes[cycleIdx];
            this.roadEngine.weather = (this.roadEngine.theme === 'storm') ? 'rain' : 'clear';
        }

        // Update UI HUD
        this.uiManager.updateHud(this.player, this);
    }

    render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);

        const speedRatio = this.player.speed / this.player.maxSpeed;
        const currentSegment = this.roadEngine.findSegment(this.player.position);
        const curve = currentSegment ? currentSegment.curve : 0;

        // 1. Background sky, sun, and parallax skyline
        this.roadEngine.renderBackground(ctx, w, h, curve, speedRatio);

        // 2. Projected 2.5D road polygons, roadside scenery, coins, traffic
        this.roadEngine.renderRoad(ctx, w, h, this.player, window.ROAD_CONSTANTS.CAMERA_DEPTH);

        // 3. Player Car
        this.player.render(ctx, w, h);

        // 4. Particle juice (nitro flames, speed lines, sparks, weather, combo text)
        this.particleSystem.render(ctx, w, h, this.player, this.roadEngine.weather);
    }

    renderMenuAttractBackground(dt) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        ctx.clearRect(0, 0, w, h);

        // Render ambient glowing synthwave horizon
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#0a0218');
        skyGrad.addColorStop(0.5, '#1e0836');
        skyGrad.addColorStop(1, '#05020c');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Grid lines receding into horizon
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
        ctx.lineWidth = 1;
        const horizonY = h * 0.55;

        for (let y = horizonY; y < h; y += (y - horizonY) * 0.25 + 6) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        for (let x = -w * 0.5; x < w * 1.5; x += 90) {
            ctx.beginPath();
            ctx.moveTo(w / 2, horizonY);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
    }
}

// Boot game when window is ready
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
