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

        // Garage 3D preview canvas
        this.garageCanvas = document.getElementById('garage-preview-canvas');
        this.garageCtx = this.garageCanvas ? this.garageCanvas.getContext('2d') : null;
        this.garageRotAngle = 0;
        this.previewCarId = 'striker';

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
        }

        if (this.hudSpeedNeedle) {
            // -120deg to +120deg
            const angle = -120 + (Math.min(kmh, 320) / 320) * 240;
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

        ctx.clearRect(0, 0, w, h);
        this.garageRotAngle += 0.015; // Smooth slow rotation

        const stats = garageManager.getComputedStats(this.previewCarId);

        ctx.save();
        ctx.translate(w / 2, h * 0.65);

        // Rotating turntable platform
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 45, 140, 45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Neon underglow
        const glowGrad = ctx.createRadialGradient(0, 20, 20, 0, 20, 110);
        glowGrad.addColorStop(0, stats.underglow);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(0, 25, 120, 40, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D Car Perspective Simulation
        const scaleX = Math.cos(this.garageRotAngle);
        const carW = 180;
        const carH = 80;

        ctx.scale(scaleX, 1);

        // Tires
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-carW * 0.42, 10, 28, 30);
        ctx.fillRect(carW * 0.28, 10, 28, 30);

        // Body
        ctx.fillStyle = stats.color;
        ctx.beginPath();
        ctx.roundRect(-carW / 2, -carH * 0.4, carW, carH * 0.8, [16, 16, 6, 6]);
        ctx.fill();

        // Cabin
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.roundRect(-carW * 0.32, -carH * 0.85, carW * 0.64, carH * 0.5, [10, 10, 2, 2]);
        ctx.fill();

        // Spoiler
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-carW * 0.46, -carH * 0.75, carW * 0.92, 10);

        ctx.restore();
    }
}

window.UIManager = UIManager;
