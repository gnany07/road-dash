/**
 * ROAD DASH: OVERDRIVE - User Interface & HUD Engine
 * Manages menus, HUD instrumentation, modal screens, garage UI, and touch controls.
 */

class UIManager {
    constructor() {
        // Cached HUD elements
        this.hudSpeedValue = document.getElementById('hud-speed-value');
        this.hudSpeedNeedle = document.getElementById('hud-speed-needle');
        this.hudNitroBar = document.getElementById('hud-nitro-bar');
        this.hudOverdriveBar = document.getElementById('hud-overdrive-bar');
        this.hudHealthBar = document.getElementById('hud-health-bar');
        this.hudScore = document.getElementById('hud-score');
        this.hudCoins = document.getElementById('hud-coins');
        this.hudTimer = document.getElementById('hud-timer');
        this.hudProgressBar = document.getElementById('hud-progress-marker');
        this.hudComboBadge = document.getElementById('hud-combo-badge');
        this.hudComboValue = document.getElementById('hud-combo-value');

        // Modal screens
        this.screenMainMenu = document.getElementById('screen-main-menu');
        this.screenLevelSelect = document.getElementById('screen-level-select');
        this.screenGarage = document.getElementById('screen-garage');
        this.screenPause = document.getElementById('screen-pause');
        this.screenGameOver = document.getElementById('screen-game-over');
        this.screenVictory = document.getElementById('screen-victory');
        this.screenSettings = document.getElementById('screen-settings');
        this.hudContainer = document.getElementById('game-hud');

        // Audio controls
        this.musicToggle = document.getElementById('music-toggle');
        this.sfxSlider = document.getElementById('sfx-slider');
        this.musicSlider = document.getElementById('music-slider');

        // Garage 3D preview canvas & showroom states
        this.garageCanvas = document.getElementById('garage-preview-canvas');
        this.garageCtx = this.garageCanvas ? this.garageCanvas.getContext('2d') : null;
        this.garageRotAngle = 0.55;
        this.garageRotVel = 0.008;
        this.garageCamMode = 'showcase'; // 'showcase', 'rear', 'front'
        this.isDraggingTurntable = false;
        this.dragStartX = 0;
        this.previewCarId = 'skyline';
        this.revAnimationTimer = 0;
        this.exhaustParticles = [];
        this.garageLastTimestamp = performance.now();

        this.initEventListeners();
    }

    initEventListeners() {
        // Sound toggles
        if (this.musicToggle) {
            this.musicToggle.addEventListener('click', () => {
                const isMuted = !window.soundEngine.muted;
                window.soundEngine.setMuted(isMuted);
                this.updateAudioIcons();
            });
        }

        if (this.sfxSlider) {
            this.sfxSlider.addEventListener('input', (e) => {
                window.soundEngine.setSfxVolume(parseFloat(e.target.value));
            });
        }

        if (this.musicSlider) {
            this.musicSlider.addEventListener('input', (e) => {
                window.soundEngine.setMusicVolume(parseFloat(e.target.value));
            });
        }

        // Turntable Canvas Drag to Rotate (Mouse & Touch)
        if (this.garageCanvas) {
            const onDragStart = (clientX) => {
                this.isDraggingTurntable = true;
                this.dragStartX = clientX;
                this.garageRotVel = 0;
                const hint = document.querySelector('.garage-drag-hint');
                if (hint) hint.style.opacity = '0';
            };

            const onDragMove = (clientX) => {
                if (!this.isDraggingTurntable) return;
                const dx = clientX - this.dragStartX;
                this.dragStartX = clientX;
                this.garageRotAngle += dx * 0.016;
                this.garageRotVel = dx * 0.0025;
                if (this.garageCamMode !== 'showcase') {
                    this.setGarageCamMode('showcase');
                }
            };

            const onDragEnd = () => {
                this.isDraggingTurntable = false;
            };

            this.garageCanvas.addEventListener('mousedown', (e) => onDragStart(e.clientX));
            window.addEventListener('mousemove', (e) => onDragMove(e.clientX));
            window.addEventListener('mouseup', onDragEnd);

            this.garageCanvas.addEventListener('touchstart', (e) => {
                if (e.touches.length > 0) {
                    onDragStart(e.touches[0].clientX);
                }
            }, { passive: true });

            window.addEventListener('touchmove', (e) => {
                if (e.touches.length > 0 && this.isDraggingTurntable) {
                    onDragMove(e.touches[0].clientX);
                }
            }, { passive: true });

            window.addEventListener('touchend', onDragEnd);
        }

        // Camera View Mode Buttons
        const btnShowcase = document.getElementById('btn-cam-showcase');
        const btnRear = document.getElementById('btn-cam-rear');
        const btnFront = document.getElementById('btn-cam-front');

        if (btnShowcase) {
            btnShowcase.addEventListener('click', () => {
                window.soundEngine.playUiClick();
                this.setGarageCamMode('showcase');
            });
        }
        if (btnRear) {
            btnRear.addEventListener('click', () => {
                window.soundEngine.playUiClick();
                this.setGarageCamMode('rear');
            });
        }
        if (btnFront) {
            btnFront.addEventListener('click', () => {
                window.soundEngine.playUiClick();
                this.setGarageCamMode('front');
            });
        }

        // Rev Engine Sound & Visualizer Button
        const btnRev = document.getElementById('btn-garage-rev');
        if (btnRev) {
            btnRev.addEventListener('click', () => {
                window.soundEngine.playCarRev(this.previewCarId);
                this.triggerRevEffect();
            });
        }
    }

    setGarageCamMode(mode) {
        this.garageCamMode = mode;
        const btns = {
            showcase: document.getElementById('btn-cam-showcase'),
            rear: document.getElementById('btn-cam-rear'),
            front: document.getElementById('btn-cam-front')
        };
        Object.entries(btns).forEach(([k, btn]) => {
            if (btn) {
                if (k === mode) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });
    }

    triggerRevEffect() {
        this.revAnimationTimer = 0.85;
        // Burst of sparks & flames from the rear exhausts
        for (let i = 0; i < 28; i++) {
            this.exhaustParticles.push({
                x: (Math.random() - 0.5) * 20,
                y: -10 + (Math.random() - 0.5) * 8,
                z: -96 - Math.random() * 15,
                vx: (Math.random() - 0.5) * 25,
                vy: -8 - Math.random() * 18,
                vz: -55 - Math.random() * 90,
                life: 0.35 + Math.random() * 0.35,
                maxLife: 0.7,
                size: 3 + Math.random() * 6,
                type: Math.random() < 0.4 ? 'flame' : (Math.random() < 0.75 ? 'spark' : 'smoke')
            });
        }
    }

    updateAudioIcons() {
        if (!this.musicToggle) return;
        const isMuted = window.soundEngine.muted;
        this.musicToggle.textContent = isMuted ? '🔇' : '🔊';
        this.musicToggle.title = isMuted ? 'Unmute Audio' : 'Mute Audio';
    }

    showScreen(screenElement) {
        const screens = [
            this.screenMainMenu,
            this.screenLevelSelect,
            this.screenGarage,
            this.screenPause,
            this.screenGameOver,
            this.screenVictory,
            this.screenSettings
        ];

        screens.forEach(s => {
            if (s) s.classList.add('hidden');
        });

        if (screenElement) {
            screenElement.classList.remove('hidden');
        }
    }

    setHudVisible(visible) {
        if (!this.hudContainer) return;
        if (visible) {
            this.hudContainer.classList.remove('hidden');
        } else {
            this.hudContainer.classList.add('hidden');
        }
    }

    // -------------------------------------------------------------
    // REAL-TIME HUD UPDATES
    // -------------------------------------------------------------
    updateHud(player, game) {
        if (!this.hudContainer || this.hudContainer.classList.contains('hidden')) return;

        // Speedometer calculation (0 to 300 km/h)
        const kmh = Math.round((player.speed / 12000) * 260);
        if (this.hudSpeedValue) {
            this.hudSpeedValue.textContent = kmh;
            if (player.isBoosting || player.overdriveActive) {
                this.hudSpeedValue.classList.add('boosting');
            } else {
                this.hudSpeedValue.classList.remove('boosting');
            }
        }

        if (this.hudSpeedNeedle) {
            // -120deg to +120deg
            const angle = -120 + (Math.min(kmh, 340) / 340) * 240;
            this.hudSpeedNeedle.style.transform = `rotate(${angle}deg)`;
        }

        // Nitro Bar
        if (this.hudNitroBar) {
            const nitroPct = (player.nitro / player.maxNitro) * 100;
            this.hudNitroBar.style.width = `${nitroPct}%`;
            if (player.isBoosting) {
                this.hudNitroBar.classList.add('boosting');
            } else {
                this.hudNitroBar.classList.remove('boosting');
            }
        }

        // Overdrive Bar
        if (this.hudOverdriveBar) {
            this.hudOverdriveBar.style.width = `${player.overdriveMeter}%`;
            if (player.overdriveActive) {
                this.hudOverdriveBar.classList.add('active');
            } else {
                this.hudOverdriveBar.classList.remove('active');
            }
        }

        // Health Bar
        if (this.hudHealthBar) {
            const healthPct = (player.health / player.maxHealth) * 100;
            this.hudHealthBar.style.width = `${healthPct}%`;
            if (healthPct < 25) {
                this.hudHealthBar.classList.add('critical');
            } else {
                this.hudHealthBar.classList.remove('critical');
            }
        }

        // Score & Coins
        if (this.hudScore) {
            this.hudScore.textContent = player.score.toLocaleString();
        }
        if (this.hudCoins) {
            this.hudCoins.textContent = player.coins;
        }

        // Timer
        if (this.hudTimer) {
            if (game.mode === 'endless') {
                const mins = Math.floor(game.elapsedTime / 60);
                const secs = Math.floor(game.elapsedTime % 60);
                this.hudTimer.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            } else {
                const remaining = Math.max(0, game.timeRemaining);
                const mins = Math.floor(remaining / 60);
                const secs = Math.floor(remaining % 60);
                this.hudTimer.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                if (remaining <= 10) {
                    this.hudTimer.classList.add('urgent');
                } else {
                    this.hudTimer.classList.remove('urgent');
                }
            }
        }

        // Progress bar along track
        if (this.hudProgressBar && game.roadEngine.trackLength > 0) {
            const prog = Math.min(100, (player.position / game.roadEngine.trackLength) * 100);
            this.hudProgressBar.style.left = `${prog}%`;
        }

        // Near-Miss Combo Badge
        if (this.hudComboBadge) {
            if (player.nearMissCombo > 1) {
                this.hudComboBadge.classList.remove('hidden');
                if (this.hudComboValue) {
                    this.hudComboValue.textContent = `x${player.nearMissCombo}`;
                }
            } else {
                this.hudComboBadge.classList.add('hidden');
            }
        }
    }

    // -------------------------------------------------------------
    // LEVEL SELECT POPULATION
    // -------------------------------------------------------------
    renderLevelSelect(levelManager, onSelectLevel) {
        const container = document.getElementById('level-grid');
        if (!container) return;

        container.innerHTML = '';
        levelManager.levels.forEach(level => {
            const isUnlocked = levelManager.isLevelUnlocked(level.id);
            const stars = levelManager.progress.levelStars[level.id] || 0;
            const highScore = levelManager.progress.highScores[level.id] || 0;

            const card = document.createElement('div');
            card.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'}`;

            let starsHtml = '';
            for (let i = 1; i <= 3; i++) {
                starsHtml += `<span class="star-icon ${i <= stars ? 'active' : ''}">★</span>`;
            }

            card.innerHTML = `
                <div class="level-card-header">
                    <span class="level-badge">${level.name.split(':')[0]}</span>
                    <div class="level-stars">${starsHtml}</div>
                </div>
                <h3 class="level-title">${level.name.split(':')[1] || level.name}</h3>
                <p class="level-subtitle">${level.subtitle}</p>
                <div class="level-meta">
                    <span>⏱ ${level.timeLimit}s</span>
                    <span>💰 +${level.cashReward}</span>
                    <span>🏆 ${highScore > 0 ? highScore.toLocaleString() : '---'}</span>
                </div>
                <div class="level-objectives-preview">
                    ${level.objectives.map(o => `<div>• ${o.text}</div>`).join('')}
                </div>
                <button class="btn btn-primary level-play-btn" ${isUnlocked ? '' : 'disabled'}>
                    ${isUnlocked ? 'RACE NOW' : 'LOCKED'}
                </button>
            `;

            if (isUnlocked) {
                card.querySelector('.level-play-btn').addEventListener('click', () => {
                    window.soundEngine.playUiClick();
                    onSelectLevel(level.id);
                });
            }

            container.appendChild(card);
        });

        // Total stars badge
        const totalStarsEl = document.getElementById('level-select-total-stars');
        if (totalStarsEl) {
            totalStarsEl.textContent = `${levelManager.progress.totalStars} / 15 ★`;
        }
    }

    // -------------------------------------------------------------
    // GARAGE UI POPULATION & 3D ROTATION PREVIEW
    // -------------------------------------------------------------
    renderGarage(garageManager) {
        const carTabsContainer = document.getElementById('garage-car-tabs');
        const garageCashEl = document.getElementById('garage-cash-display');
        if (garageCashEl) {
            garageCashEl.textContent = `$${garageManager.data.cash.toLocaleString()}`;
        }

        if (carTabsContainer) {
            carTabsContainer.innerHTML = '';
            garageManager.cars.forEach(car => {
                const isSelected = (car.id === garageManager.data.selectedCarId);
                const isUnlocked = garageManager.isCarUnlocked(car.id);

                const tab = document.createElement('button');
                tab.className = `garage-tab-btn ${isSelected ? 'active' : ''} ${isUnlocked ? 'owned' : 'locked'}`;
                tab.innerHTML = `
                    <span class="tab-car-name">${car.name}</span>
                    <span class="tab-car-status">${isSelected ? 'EQUIPPED' : (isUnlocked ? 'OWNED' : `$${car.price}`)}</span>
                `;

                tab.addEventListener('click', () => {
                    window.soundEngine.playUiClick();
                    this.previewCarId = car.id;
                    this.updateGarageView(garageManager, car.id);
                });

                carTabsContainer.appendChild(tab);
            });
        }

        this.previewCarId = garageManager.data.selectedCarId;
        this.updateGarageView(garageManager, this.previewCarId);
    }

    updateGarageView(garageManager, carId) {
        const car = garageManager.getCar(carId);
        const stats = garageManager.getComputedStats(carId);
        const isUnlocked = garageManager.isCarUnlocked(carId);
        const isEquipped = (garageManager.data.selectedCarId === carId);
        const upgrades = garageManager.data.upgrades[carId] || { speed: 0, accel: 0, handling: 0, health: 0 };

        // Car Info Titles
        const nameEl = document.getElementById('garage-car-name');
        const classEl = document.getElementById('garage-car-class');
        const descEl = document.getElementById('garage-car-desc');
        if (nameEl) nameEl.textContent = car.name;
        if (classEl) classEl.textContent = car.class;
        if (descEl) descEl.textContent = car.description;

        // Factory Specifications Dossier
        const specEngine = document.getElementById('garage-spec-engine');
        const specHp = document.getElementById('garage-spec-hp');
        const specZeroSixty = document.getElementById('garage-spec-zero-sixty');
        const specTopSpeed = document.getElementById('garage-spec-top-speed');
        const specDrivetrain = document.getElementById('garage-spec-drivetrain');
        const specBadge = document.getElementById('garage-spec-badge');
        const revLabel = document.getElementById('garage-rev-engine-label');

        if (car.specs) {
            if (specEngine) specEngine.textContent = car.specs.engine;
            if (specHp) specHp.textContent = car.specs.power;
            if (specZeroSixty) specZeroSixty.textContent = car.specs.zeroToSixty;
            if (specTopSpeed) specTopSpeed.textContent = car.specs.topSpeedKmh;
            if (specDrivetrain) specDrivetrain.textContent = car.specs.drivetrain;
            if (revLabel) revLabel.textContent = car.specs.engine.toUpperCase();
        }
        if (specBadge) specBadge.textContent = car.modelBadge || 'SUPERCAR';

        // Equip / Buy Button
        const actionBtn = document.getElementById('garage-action-btn');
        if (actionBtn) {
            if (isEquipped) {
                actionBtn.textContent = 'EQUIPPED';
                actionBtn.disabled = true;
                actionBtn.className = 'btn btn-secondary';
            } else if (isUnlocked) {
                actionBtn.textContent = 'SELECT CAR';
                actionBtn.disabled = false;
                actionBtn.className = 'btn btn-primary';
                actionBtn.onclick = () => {
                    window.soundEngine.playUiClick();
                    garageManager.selectCar(carId);
                    this.renderGarage(garageManager);
                };
            } else {
                const canAfford = (garageManager.data.cash >= car.price);
                actionBtn.textContent = `BUY CAR ($${car.price.toLocaleString()})`;
                actionBtn.disabled = !canAfford;
                actionBtn.className = `btn ${canAfford ? 'btn-primary' : 'btn-disabled'}`;
                actionBtn.onclick = () => {
                    if (garageManager.buyCar(carId)) {
                        window.soundEngine.playCoin();
                        this.renderGarage(garageManager);
                    }
                };
            }
        }

        // Upgrade Bars
        const statKeys = ['speed', 'accel', 'handling', 'health'];
        statKeys.forEach(stat => {
            const bar = document.getElementById(`stat-bar-${stat}`);
            const btn = document.getElementById(`btn-upgrade-${stat}`);
            const lvl = upgrades[stat] || 0;

            if (bar) {
                bar.style.width = `${20 + lvl * 16}%`;
            }

            if (btn) {
                if (lvl >= 5) {
                    btn.textContent = 'MAX';
                    btn.disabled = true;
                } else {
                    const cost = garageManager.getUpgradeCost(lvl);
                    btn.textContent = `+$${cost}`;
                    btn.disabled = !isUnlocked || (garageManager.data.cash < cost);
                    btn.onclick = () => {
                        if (garageManager.upgradeStat(carId, stat)) {
                            window.soundEngine.playCoin();
                            this.renderGarage(garageManager);
                        }
                    };
                }
            }
        });

        // Paint Swatches
        const paintContainer = document.getElementById('paint-palette');
        if (paintContainer) {
            paintContainer.innerHTML = '';
            garageManager.paints.forEach(paint => {
                const swatch = document.createElement('button');
                swatch.className = `color-swatch ${stats.color === paint.hex ? 'active' : ''}`;
                swatch.style.backgroundColor = paint.hex;
                swatch.title = paint.name;
                swatch.onclick = () => {
                    garageManager.setCarColor(carId, paint.hex);
                    this.updateGarageView(garageManager, carId);
                };
                paintContainer.appendChild(swatch);
            });
        }

        // Underglow Swatches
        const underglowContainer = document.getElementById('underglow-palette');
        if (underglowContainer) {
            underglowContainer.innerHTML = '';
            garageManager.underglows.forEach(glow => {
                const swatch = document.createElement('button');
                swatch.className = `color-swatch glow-swatch ${stats.underglow === glow.hex ? 'active' : ''}`;
                swatch.style.backgroundColor = glow.hex;
                swatch.title = glow.name;
                swatch.onclick = () => {
                    garageManager.setCarUnderglow(carId, glow.hex);
                    this.updateGarageView(garageManager, carId);
                };
                underglowContainer.appendChild(swatch);
            });
        }
    }

    renderGaragePreview(garageManager) {
        if (!this.garageCtx || !this.garageCanvas) return;
        const ctx = this.garageCtx;
        const w = this.garageCanvas.width;
        const h = this.garageCanvas.height;
        const now = performance.now();
        const dt = Math.min(0.05, (now - (this.garageLastTimestamp || now)) / 1000);
        this.garageLastTimestamp = now;

        // Turntable camera mode handling & smooth interpolation
        if (!this.isDraggingTurntable) {
            if (this.garageCamMode === 'showcase') {
                this.garageRotAngle += this.garageRotVel;
                this.garageRotVel = this.garageRotVel * 0.98 + 0.008 * 0.02;
            } else if (this.garageCamMode === 'rear') {
                let diff = 0 - (this.garageRotAngle % (Math.PI * 2));
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.garageRotAngle += diff * 0.09;
            } else if (this.garageCamMode === 'front') {
                let diff = Math.PI - (this.garageRotAngle % (Math.PI * 2));
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.garageRotAngle += diff * 0.09;
            }
        }

        // Rev Engine animation timer & particle emission
        if (this.revAnimationTimer > 0) {
            this.revAnimationTimer -= dt;
            if (this.revAnimationTimer < 0) this.revAnimationTimer = 0;
            if (Math.random() < 0.7) {
                this.exhaustParticles.push({
                    x: (Math.random() - 0.5) * 16,
                    y: -10 + (Math.random() - 0.5) * 6,
                    z: -96,
                    vx: (Math.random() - 0.5) * 20,
                    vy: -10 - Math.random() * 15,
                    vz: -60 - Math.random() * 70,
                    life: 0.28 + Math.random() * 0.25,
                    maxLife: 0.5,
                    size: 3 + Math.random() * 6,
                    type: Math.random() < 0.45 ? 'flame' : (Math.random() < 0.7 ? 'spark' : 'smoke')
                });
            }
        }

        const carId = this.previewCarId || garageManager.data.selectedCarId || 'skyline';
        const stats = garageManager.getComputedStats(carId);

        // 1. Studio Backdrop & Overhead Spotlights
        ctx.fillStyle = '#080b12';
        ctx.fillRect(0, 0, w, h);

        const spot1 = ctx.createRadialGradient(w * 0.25, 0, 10, w * 0.4, h * 0.6, 260);
        spot1.addColorStop(0, 'rgba(0, 243, 255, 0.08)');
        spot1.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = spot1;
        ctx.fillRect(0, 0, w, h);

        const spot2 = ctx.createRadialGradient(w * 0.75, 0, 10, w * 0.6, h * 0.6, 260);
        spot2.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        spot2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = spot2;
        ctx.fillRect(0, 0, w, h);

        // Turntable center coordinates
        const cx = w / 2;
        const cy = h * 0.65;

        // 2. Turntable Stage (3D Cylinder Platform)
        const rx = 195;
        const ry = 62;
        const stageDepth = 16;

        // Stage cylinder side bevel
        ctx.beginPath();
        ctx.ellipse(cx, cy + stageDepth, rx, ry, 0, 0, Math.PI);
        ctx.lineTo(cx - rx, cy);
        ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
        ctx.closePath();
        const rimGrad = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
        rimGrad.addColorStop(0, '#0f172a');
        rimGrad.addColorStop(0.3, '#1e293b');
        rimGrad.addColorStop(0.5, '#334155');
        rimGrad.addColorStop(0.7, '#1e293b');
        rimGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = rimGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Stage circular surface
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        const stageSurfaceGrad = ctx.createRadialGradient(cx, cy - 8, 20, cx, cy, rx);
        stageSurfaceGrad.addColorStop(0, '#1e293b');
        stageSurfaceGrad.addColorStop(0.75, '#0f172a');
        stageSurfaceGrad.addColorStop(1, '#080d1a');
        ctx.fillStyle = stageSurfaceGrad;
        ctx.fill();
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Rotating perimeter indicators
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.clip();
        const numTicks = 24;
        for (let i = 0; i < numTicks; i++) {
            const tickAngle = this.garageRotAngle + (i / numTicks) * Math.PI * 2;
            const tx = cx + Math.cos(tickAngle) * (rx - 10);
            const ty = cy + Math.sin(tickAngle) * (ry - 4);
            ctx.fillStyle = (i % 4 === 0) ? '#00f3ff' : 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.arc(tx, ty, (i % 4 === 0) ? 2.5 : 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // 3. Neon Underglow on the turntable
        const underglowGrad = ctx.createRadialGradient(cx, cy + 2, 15, cx, cy + 2, 130);
        underglowGrad.addColorStop(0, stats.underglow || '#00f3ff');
        underglowGrad.addColorStop(0.65, `${stats.underglow || '#00f3ff'}55`);
        underglowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = underglowGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, 135, 45, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Soft Contact Shadow beneath chassis
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 2, 105, 32, 0, 0, Math.PI * 2);
        ctx.fill();

        // 5. 3D Isometric Projection
        const rot = this.garageRotAngle;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const pitch = 0.36; // Elevated viewing angle
        const scale = 1.15;

        // Subtle engine rev shudder jitter
        let vibX = 0;
        let vibY = 0;
        if (this.revAnimationTimer > 0) {
            vibX = (Math.random() - 0.5) * 1.6;
            vibY = (Math.random() - 0.5) * 1.2;
        }

        const project = (x, y, z) => {
            const xr = x * cosR - z * sinR;
            const zr = x * sinR + z * cosR;
            return {
                x: cx + (xr + vibX) * scale,
                y: cy + ((y + vibY) * 0.92 - zr * pitch) * scale,
                z: zr
            };
        };

        // Render the Real Car in 3D
        this.renderShowroomCar(ctx, project, carId, stats, rot);

        // 6. Exhaust Backfire Flames & Particles
        this.renderShowroomExhaust(ctx, project, carId, dt);
    }

    drawPoly(ctx, points, fillStyle, strokeStyle = null, lineWidth = 1) {
        if (!points || points.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    drawWheel(ctx, p, isLeft, rot) {
        ctx.save();
        // Tire rubber
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 7, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Rim outer ring
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 5, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // High-performance brake caliper
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(p.x - 2, p.y - 5, 4, 3.5);

        // Silver Rim Spokes
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - 3.5, p.y); ctx.lineTo(p.x + 3.5, p.y);
        ctx.moveTo(p.x, p.y - 6); ctx.lineTo(p.x, p.y + 6);
        ctx.stroke();

        ctx.restore();
    }

    renderShowroomCar(ctx, project, carId, stats, rot) {
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);

        // Dimension parameters per model
        let W = 76;
        let L = 200;
        let H = 32;
        if (carId === 'mustang') { W = 82; H = 34; }
        else if (carId === 'gt3rs') { W = 80; H = 30; }
        else if (carId === 'aventador') { W = 84; H = 26; }
        else if (carId === 'chiron') { W = 86; H = 28; L = 215; }

        const halfW = W * 0.48;
        const halfL = L * 0.48;

        // 4 Wheels with depth sorting
        const wheels = [
            { id: 'rl', x: -halfW - 2, y: -12, z: -halfL * 0.65, isLeft: true },
            { id: 'rr', x: halfW + 2, y: -12, z: -halfL * 0.65, isLeft: false },
            { id: 'fl', x: -halfW - 2, y: -12, z: halfL * 0.65, isLeft: true },
            { id: 'fr', x: halfW + 2, y: -12, z: halfL * 0.65, isLeft: false }
        ];

        wheels.forEach(w => {
            const p = project(w.x, w.y, w.z);
            w.proj = p;
            w.depth = p.z;
        });

        // Far wheels (depth > 0) drawn behind body
        const farWheels = wheels.filter(w => w.depth > 0);
        const nearWheels = wheels.filter(w => w.depth <= 0);

        farWheels.forEach(w => this.drawWheel(ctx, w.proj, w.isLeft, rot));

        // 3D Key Control Vertices
        const bfl = project(-halfW, -6, halfL);
        const bfr = project(halfW, -6, halfL);
        const brl = project(-halfW, -8, -halfL);
        const brr = project(halfW, -8, -halfL);

        const nfl = project(-halfW * 0.95, -16, halfL * 0.95);
        const nfr = project(halfW * 0.95, -16, halfL * 0.95);
        const nc = project(0, -16, halfL);

        const wfl = project(-halfW * 0.9, -20, halfL * 0.35);
        const wfr = project(halfW * 0.9, -20, halfL * 0.35);
        const wfc = project(0, -21, halfL * 0.35);

        const rfl = project(-halfW * 0.72, -H, halfL * 0.15);
        const rfr = project(halfW * 0.72, -H, halfL * 0.15);
        const rfc = project(0, -H - 1, halfL * 0.15);

        const rrl = project(-halfW * 0.72, -H, -halfL * 0.28);
        const rrr = project(halfW * 0.72, -H, -halfL * 0.28);
        const rrc = project(0, -H - 1, -halfL * 0.28);

        const wrl = project(-halfW * 0.9, -21, -halfL * 0.42);
        const wrr = project(halfW * 0.9, -21, -halfL * 0.42);
        const wrc = project(0, -21, -halfL * 0.42);

        const trl = project(-halfW * 0.95, -18, -halfL * 0.95);
        const trr = project(halfW * 0.95, -18, -halfL * 0.95);
        const trc = project(0, -18, -halfL * 0.95);

        const bodyColor = stats.color || '#1d4ed8';

        // Side rocker skirts (Dark Carbon)
        if (sinR > 0) {
            this.drawPoly(ctx, [bfl, brl, wrl, wfl], '#0f172a', '#000000', 1);
        } else {
            this.drawPoly(ctx, [bfr, brr, wrr, wfr], '#0f172a', '#000000', 1);
        }

        // Main painted side panels
        if (sinR > 0) {
            this.drawPoly(ctx, [nfl, trl, wrl, wfl], bodyColor, 'rgba(0,0,0,0.4)', 1);
        } else {
            this.drawPoly(ctx, [nfr, trr, wrr, wfr], bodyColor, 'rgba(0,0,0,0.4)', 1);
        }

        // Hood Top (Reflective Gradient)
        this.drawPoly(ctx, [nfl, nfr, wfr, wfl], bodyColor, 'rgba(255,255,255,0.2)', 1);

        // Windshield (Glossy Sky Reflection)
        const glassGrad = ctx.createLinearGradient(wfc.x, wfc.y, rfc.x, rfc.y);
        glassGrad.addColorStop(0, '#090d16');
        glassGrad.addColorStop(0.5, 'rgba(0, 243, 255, 0.4)');
        glassGrad.addColorStop(1, '#090d16');
        this.drawPoly(ctx, [wfl, wfr, rfr, rfl], glassGrad, 'rgba(255,255,255,0.4)', 1);

        // Cabin Roof
        let roofColor = bodyColor;
        if (carId === 'gt3rs' || carId === 'mustang') roofColor = '#090d16'; // Carbon Roof
        this.drawPoly(ctx, [rfl, rfr, rrr, rrl], roofColor, 'rgba(255,255,255,0.15)', 1);

        // Rear Window (Dark Tint)
        this.drawPoly(ctx, [rrl, rrr, wrr, wrl], '#050811', 'rgba(255,255,255,0.2)', 1);

        // Trunk Decklid
        this.drawPoly(ctx, [wrl, wrr, trr, trl], bodyColor, 'rgba(0,0,0,0.3)', 1);

        // Side Windows
        if (sinR > 0) {
            this.drawPoly(ctx, [wfl, rfl, rrl, wrl], '#050811', 'rgba(255,255,255,0.25)', 1);
        } else {
            this.drawPoly(ctx, [wfr, rfr, rrr, wrr], '#050811', 'rgba(255,255,255,0.25)', 1);
        }

        // Bugatti Iconic C-Line Flank Accent
        if (carId === 'chiron') {
            ctx.save();
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            if (sinR > 0) {
                ctx.moveTo(rfl.x, rfl.y);
                ctx.bezierCurveTo(rrl.x - 10, rrl.y, wrl.x - 10, wrl.y + 15, bfl.x, bfl.y - 4);
            } else {
                ctx.moveTo(rfr.x, rfr.y);
                ctx.bezierCurveTo(rrr.x + 10, rrr.y, wrr.x + 10, wrr.y + 15, bfr.x, bfr.y - 4);
            }
            ctx.stroke();
            ctx.restore();
        }

        // FRONT FASCIA (Visible when facing camera: cosR < 0.2)
        if (cosR < 0.25) {
            // Front bumper
            this.drawPoly(ctx, [bfl, bfr, nfr, nfl], '#0a0f1d', '#000000', 1);

            // Front Headlights & Grille per car
            if (carId === 'skyline') {
                // Dual Xenon Projectors
                const hl1 = project(-halfW * 0.72, -15, halfL * 0.98);
                const hl2 = project(halfW * 0.72, -15, halfL * 0.98);
                ctx.fillStyle = '#00f3ff';
                ctx.shadowColor = '#00f3ff';
                ctx.shadowBlur = 10;
                ctx.fillRect(hl1.x - 6, hl1.y - 3, 12, 6);
                ctx.fillRect(hl2.x - 6, hl2.y - 3, 12, 6);
                ctx.shadowBlur = 0;
            } else if (carId === 'mustang') {
                // Cobra Gaping Grille & Snake Emblem
                const gr = project(0, -12, halfL * 0.99);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(gr.x - 14, gr.y - 5, 28, 10);
                ctx.fillStyle = '#e2e8f0'; // Snake badge
                ctx.fillRect(gr.x - 2, gr.y - 3, 4, 6);
            } else if (carId === 'gt3rs') {
                // 4-point LED Matrix Headlights
                const hl1 = project(-halfW * 0.7, -15, halfL * 0.96);
                const hl2 = project(halfW * 0.7, -15, halfL * 0.96);
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#00f3ff';
                ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(hl1.x, hl1.y, 4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(hl2.x, hl2.y, 4, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            } else if (carId === 'aventador') {
                // Y-pattern LED Daytime Running Lights
                const y1 = project(-halfW * 0.7, -14, halfL * 0.96);
                const y2 = project(halfW * 0.7, -14, halfL * 0.96);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(y1.x - 6, y1.y - 3); ctx.lineTo(y1.x, y1.y); ctx.lineTo(y1.x + 6, y1.y - 3);
                ctx.moveTo(y2.x - 6, y2.y - 3); ctx.lineTo(y2.x, y2.y); ctx.lineTo(y2.x + 6, y2.y - 3);
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else if (carId === 'chiron') {
                // Horseshoe Grille & EB Emblem
                const hg = project(0, -11, halfL * 0.99);
                ctx.fillStyle = '#090d16';
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(hg.x, hg.y, 9, Math.PI, 0, false);
                ctx.lineTo(hg.x + 9, hg.y + 10);
                ctx.lineTo(hg.x - 9, hg.y + 10);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#ef4444'; // Red EB badge
                ctx.beginPath(); ctx.arc(hg.x, hg.y + 2, 3, 0, Math.PI * 2); ctx.fill();
            }
        }

        // REAR FASCIA & SIGNATURE TAILLIGHTS (Visible when facing camera: cosR > -0.25)
        if (cosR > -0.25) {
            // Rear bumper & diffuser
            this.drawPoly(ctx, [brl, brr, trr, trl], '#0a0f1d', '#000000', 1);

            if (carId === 'skyline') {
                // Signature Skyline Quad Circular LED Taillights
                const tOuterL = project(-halfW * 0.7, -14, -halfL * 0.98);
                const tInnerL = project(-halfW * 0.4, -14, -halfL * 0.98);
                const tInnerR = project(halfW * 0.4, -14, -halfL * 0.98);
                const tOuterR = project(halfW * 0.7, -14, -halfL * 0.98);

                ctx.save();
                ctx.shadowColor = '#ff003c';
                ctx.shadowBlur = 12;
                ctx.fillStyle = '#ff003c';

                ctx.beginPath(); ctx.arc(tOuterL.x, tOuterL.y, 4.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(tInnerL.x, tInnerL.y, 3.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(tInnerR.x, tInnerR.y, 3.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(tOuterR.x, tOuterR.y, 4.5, 0, Math.PI * 2); ctx.fill();

                // Inner white halogen centers
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(tOuterL.x, tOuterL.y, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(tInnerL.x, tInnerL.y, 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(tInnerR.x, tInnerR.y, 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(tOuterR.x, tOuterR.y, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.restore();

                // Titanium Cannon Exhaust (Left Rear)
                const exh = project(-halfW * 0.65, -7, -halfL * 0.99);
                ctx.fillStyle = '#6366f1';
                ctx.strokeStyle = '#00f3ff';
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(exh.x, exh.y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            } else if (carId === 'mustang') {
                // Mustang Tri-Bar Sequential LED Taillights
                ctx.save();
                ctx.shadowColor = '#ff003c';
                ctx.shadowBlur = 12;
                ctx.fillStyle = '#ff003c';

                for (let i = 0; i < 3; i++) {
                    const lPos = project(-halfW * 0.78 + i * 5, -14, -halfL * 0.98);
                    const rPos = project(halfW * 0.58 + i * 5, -14, -halfL * 0.98);
                    ctx.fillRect(lPos.x - 1.5, lPos.y - 5, 3, 10);
                    ctx.fillRect(rPos.x - 1.5, rPos.y - 5, 3, 10);
                }
                ctx.restore();

                // Quad Chrome Exhaust Cannons
                const q1 = project(-halfW * 0.75, -7, -halfL * 0.99);
                const q2 = project(-halfW * 0.55, -7, -halfL * 0.99);
                const q3 = project(halfW * 0.55, -7, -halfL * 0.99);
                const q4 = project(halfW * 0.75, -7, -halfL * 0.99);
                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 1.5;
                [q1, q2, q3, q4].forEach(q => {
                    ctx.beginPath(); ctx.arc(q.x, q.y, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                });
            } else if (carId === 'gt3rs') {
                // Full-width continuous glowing red laser light bar
                const barL = project(-halfW * 0.85, -15, -halfL * 0.98);
                const barR = project(halfW * 0.85, -15, -halfL * 0.98);
                ctx.save();
                ctx.strokeStyle = '#ff003c';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#ff003c';
                ctx.shadowBlur = 14;
                ctx.beginPath();
                ctx.moveTo(barL.x, barL.y);
                ctx.lineTo(barR.x, barR.y);
                ctx.stroke();

                // Central dual titanium exhausts
                const cExh1 = project(-4, -7, -halfL * 0.99);
                const cExh2 = project(4, -7, -halfL * 0.99);
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.5;
                [cExh1, cExh2].forEach(ce => {
                    ctx.beginPath(); ctx.arc(ce.x, ce.y, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                });
                ctx.restore();
            } else if (carId === 'aventador') {
                // Lamborghini Y-pattern Taillights
                const yL = project(-halfW * 0.65, -14, -halfL * 0.98);
                const yR = project(halfW * 0.65, -14, -halfL * 0.98);
                ctx.save();
                ctx.strokeStyle = '#ff003c';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#ff003c';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.moveTo(yL.x - 7, yL.y - 3); ctx.lineTo(yL.x, yL.y); ctx.lineTo(yL.x - 7, yL.y + 3);
                ctx.moveTo(yR.x + 7, yR.y - 3); ctx.lineTo(yR.x, yR.y); ctx.lineTo(yR.x + 7, yR.y + 3);
                ctx.stroke();

                // High-mounted center cannon exhausts
                const svj1 = project(-8, -13, -halfL * 0.99);
                const svj2 = project(8, -13, -halfL * 0.99);
                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = '#6366f1';
                ctx.lineWidth = 1.8;
                [svj1, svj2].forEach(ex => {
                    ctx.beginPath(); ctx.arc(ex.x, ex.y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                });
                ctx.restore();
            } else if (carId === 'chiron') {
                // Bugatti 1.6m Unbroken Laser Taillight Blade
                const bL = project(-halfW * 0.92, -14, -halfL * 0.98);
                const bR = project(halfW * 0.92, -14, -halfL * 0.98);
                ctx.save();
                ctx.strokeStyle = '#ff003c';
                ctx.lineWidth = 3.5;
                ctx.shadowColor = '#ff003c';
                ctx.shadowBlur = 16;
                ctx.beginPath();
                ctx.moveTo(bL.x, bL.y); ctx.lineTo(bR.x, bR.y);
                ctx.stroke();

                // Stacked vertical quad titanium exhausts
                const sl1 = project(-halfW * 0.75, -10, -halfL * 0.99);
                const sl2 = project(-halfW * 0.75, -5, -halfL * 0.99);
                const sr1 = project(halfW * 0.75, -10, -halfL * 0.99);
                const sr2 = project(halfW * 0.75, -5, -halfL * 0.99);
                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 1.2;
                [sl1, sl2, sr1, sr2].forEach(p => {
                    ctx.beginPath(); ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                });
                ctx.restore();
            }
        }

        // SPOILERS & WINGS (Rendered with 3D elevation)
        if (carId === 'skyline') {
            // Elevated GT-R Wing with carbon pylons
            const p1 = project(-halfW * 0.65, -18, -halfL * 0.82);
            const p2 = project(-halfW * 0.65, -36, -halfL * 0.82);
            const p3 = project(halfW * 0.65, -18, -halfL * 0.82);
            const p4 = project(halfW * 0.65, -36, -halfL * 0.82);
            const w1 = project(-halfW * 0.9, -36, -halfL * 0.86);
            const w2 = project(halfW * 0.9, -36, -halfL * 0.86);
            const w3 = project(halfW * 0.9, -38, -halfL * 0.78);
            const w4 = project(-halfW * 0.9, -38, -halfL * 0.78);

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
            ctx.stroke();
            this.drawPoly(ctx, [w1, w2, w3, w4], bodyColor, 'rgba(0,0,0,0.4)', 1.5);
        } else if (carId === 'gt3rs') {
            // Towering Swan-Neck DRS Wing (Top-Mount)
            const p1 = project(-halfW * 0.55, -20, -halfL * 0.78);
            const p2 = project(-halfW * 0.55, -44, -halfL * 0.78);
            const p3 = project(halfW * 0.55, -20, -halfL * 0.78);
            const p4 = project(halfW * 0.55, -44, -halfL * 0.78);
            const w1 = project(-halfW * 0.95, -42, -halfL * 0.84);
            const w2 = project(halfW * 0.95, -42, -halfL * 0.84);
            const w3 = project(halfW * 0.95, -45, -halfL * 0.74);
            const w4 = project(-halfW * 0.95, -45, -halfL * 0.74);

            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
            ctx.stroke();
            this.drawPoly(ctx, [w1, w2, w3, w4], '#090d16', '#ff003c', 1.5);
        } else if (carId === 'mustang') {
            // GT4 Carbon Track Pack Wing
            const w1 = project(-halfW * 0.9, -32, -halfL * 0.88);
            const w2 = project(halfW * 0.9, -32, -halfL * 0.88);
            const w3 = project(halfW * 0.9, -34, -halfL * 0.8);
            const w4 = project(-halfW * 0.9, -34, -halfL * 0.8);
            this.drawPoly(ctx, [w1, w2, w3, w4], '#090d16', '#e2e8f0', 1);
        } else if (carId === 'aventador') {
            // SVJ ALA 2.0 Wing with Central Spine
            const cSpine1 = project(0, -20, -halfL * 0.6);
            const cSpine2 = project(0, -36, -halfL * 0.82);
            const w1 = project(-halfW * 0.92, -36, -halfL * 0.86);
            const w2 = project(halfW * 0.92, -36, -halfL * 0.86);
            const w3 = project(halfW * 0.92, -38, -halfL * 0.76);
            const w4 = project(-halfW * 0.92, -38, -halfL * 0.76);

            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(cSpine1.x, cSpine1.y); ctx.lineTo(cSpine2.x, cSpine2.y);
            ctx.stroke();
            this.drawPoly(ctx, [w1, w2, w3, w4], '#090d16', 'rgba(0,0,0,0.5)', 1.5);
        }

        // Near wheels (depth <= 0) drawn in front of body
        nearWheels.forEach(w => this.drawWheel(ctx, w.proj, w.isLeft, rot));
    }

    renderShowroomExhaust(ctx, project, carId, dt) {
        if (!this.exhaustParticles || this.exhaustParticles.length === 0) return;

        for (let i = this.exhaustParticles.length - 1; i >= 0; i--) {
            const p = this.exhaustParticles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.exhaustParticles.splice(i, 1);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;

            const proj = project(p.x, p.y, p.z);
            const alpha = Math.max(0, p.life / p.maxLife);

            ctx.save();
            if (p.type === 'flame') {
                const grad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, p.size);
                grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                grad.addColorStop(0.3, `rgba(0, 243, 255, ${alpha})`);
                grad.addColorStop(0.7, `rgba(255, 120, 0, ${alpha * 0.85})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'spark') {
                ctx.fillStyle = `rgba(255, 240, 120, ${alpha})`;
                ctx.shadowColor = '#ffff00';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, p.size * 0.45, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = `rgba(100, 116, 139, ${alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, p.size * 1.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
}

window.UIManager = UIManager;
