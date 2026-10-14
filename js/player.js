/**
 * ROAD DASH: OVERDRIVE - Player Vehicle Engine
 * Handles physics, input, nitro boost, drafting, near-miss combos, and rendering.
 */

class Player {
    constructor() {
        this.reset();
        this.carId = 'striker';
        this.carColor = '#ff2a5f';
        this.underglowColor = '#ff007f';
        this.animationFrame = 0;
    }

    reset() {
        this.position = 0;
        this.x = 0;
        this.vx = 0; // smoothed lateral velocity
        this.y = 0;
        this.speed = 0;
        this.steerAngle = 0; // -1 to 1 for visual tilt
        this.bounce = 0;

        // Base physics attributes (modified by car upgrades)
        this.maxSpeed = 12000;
        this.accel = 4800;
        this.braking = -9000;
        this.decel = -2400;
        this.offRoadDecel = -6000;
        this.offRoadLimit = 0.95;
        this.handling = 3.6;

        // Nitro & Overdrive
        this.nitro = 100; // start with full nitro!
        this.maxNitro = 100;
        this.isBoosting = false;
        this.isBraking = false;
        this.overdriveMeter = 0;
        this.overdriveActive = false;
        this.overdriveTimer = 0;

        // Health & Shield
        this.health = 100;
        this.maxHealth = 100;
        this.shieldActive = false;
        this.invulnerableTimer = 0;

        // Drafting (Slipstream)
        this.isDrafting = false;
        this.draftTimer = 0;
        this.totalDraftTime = 0;

        // Combos & Scoring
        this.nearMissCombo = 0;
        this.comboTimer = 0;
        this.totalNearMisses = 0;
        this.coins = 0;
        this.score = 0;
        this.topSpeedReached = 0;
        this.collisions = 0;
    }

    applyCarStats(carStats) {
        if (!carStats) return;
        this.carId = carStats.id || 'striker';
        this.carColor = carStats.color || '#ff2a5f';
        this.underglowColor = carStats.underglow || '#ff007f';

        this.maxSpeed = carStats.maxSpeed || 12000;
        this.accel = carStats.accel || 4800;
        this.handling = carStats.handling || 3.6;
        this.maxHealth = carStats.health || 100;
        this.health = this.maxHealth;
        this.nitroDrainRate = carStats.nitroDrain || 28;
    }

    update(dt, input, roadEngine, trafficManager, particleSystem) {
        this.animationFrame++;

        // 1. Acceleration / Braking
        let targetAccel = 0;
        this.isBraking = false;

        const effectiveMaxSpeed = this.overdriveActive
            ? this.maxSpeed * 1.5
            : (this.isBoosting ? this.maxSpeed * 1.35 : this.maxSpeed);

        if (input.up) {
            targetAccel = this.accel;
        } else if (input.down) {
            targetAccel = this.braking;
            this.isBraking = true;
        } else {
            targetAccel = this.decel;
        }

        // Nitro Boost Trigger (SPACE / SHIFT)
        if (input.nitro && this.nitro > 0 && !this.isBraking) {
            if (!this.isBoosting) {
                window.soundEngine.playNitro();
                // Instant launch kick if at low speed
                if (this.speed < 2000) {
                    this.speed = Math.max(this.speed, 2600);
                }
            }
            this.isBoosting = true;
            this.nitro = Math.max(0, this.nitro - (this.nitroDrainRate || 28) * dt);

            // Nitro fire particles
            if (particleSystem) {
                particleSystem.emitNitroFlames(this);
            }
        } else {
            this.isBoosting = false;
            // Passive slow nitro regen when driving fast
            if (this.speed > this.maxSpeed * 0.5) {
                this.nitro = Math.min(this.maxNitro, this.nitro + 7 * dt);
            }
        }

        // Overdrive Activation
        if (this.overdriveMeter >= 100 && !this.overdriveActive) {
            this.overdriveActive = true;
            this.overdriveTimer = 7.0; // 7 seconds of god mode
            window.soundEngine.playNitro();
        }

        if (this.overdriveActive) {
            this.overdriveTimer -= dt;
            this.overdriveMeter = (this.overdriveTimer / 7.0) * 100;
            if (this.overdriveTimer <= 0) {
                this.overdriveActive = false;
                this.overdriveMeter = 0;
            }
        }

        // Off-road penalty (gentle slowdown, easy recovery)
        const isOffroad = Math.abs(this.x) > 1.0;
        if (isOffroad && this.speed > this.maxSpeed * 0.65) {
            targetAccel += this.offRoadDecel * 0.4;
            if (particleSystem && Math.random() < 0.4) {
                particleSystem.emitOffroadDust(this);
            }
        }

        // Speed integration
        this.speed = Math.max(0, Math.min(effectiveMaxSpeed, this.speed + targetAccel * dt));

        // Track max speed record
        const kmh = Math.round((this.speed / 12000) * 260);
        if (kmh > this.topSpeedReached) {
            this.topSpeedReached = kmh;
        }

        // 2. Lateral Steering & Banking (Controlled, smooth, non-twitchy)
        const speedRatio = this.speed / this.maxSpeed;
        const currentSegment = roadEngine.findSegment(this.position);

        let steerIntent = 0;
        if (input.left) steerIntent -= 1;
        if (input.right) steerIntent += 1;

        // Smooth steering angle for 3D chassis tilt
        this.steerAngle += (steerIntent - this.steerAngle) * Math.min(1, dt * 10);

        // Tire screech when turning hard at high speed
        if (Math.abs(steerIntent) > 0.5 && speedRatio > 0.7 && Math.random() < 0.08) {
            window.soundEngine.playTireScreech(0.5);
            if (particleSystem) {
                particleSystem.emitTireSmoke(this);
            }
        }

        // Calibrated arcade lateral speed (~1.1 units/sec max)
        // A gentle tap changes ~0.08 units; holding changes ~0.35 units per 0.3s (one full lane)
        const handlingRatio = (this.handling || 3.6) / 3.6;
        let maxTurnSpeed = handlingRatio * (1.05 + speedRatio * 0.25);

        // Extra assist if steering back from shoulder to center
        if (isOffroad && Math.sign(steerIntent) !== 0 && Math.sign(steerIntent) !== Math.sign(this.x)) {
            maxTurnSpeed *= 1.35;
        }

        // Smooth velocity interpolation avoids twitchiness and sudden jumping
        const targetVx = steerIntent * maxTurnSpeed;
        const steerDamping = (steerIntent !== 0) ? 14 : 18;
        this.vx += (targetVx - this.vx) * Math.min(1, dt * steerDamping);

        // Apply lateral movement
        this.x += this.vx * dt;

        // Subtle realistic centrifugal curve drift (very gentle, easily countered)
        if (currentSegment && speedRatio > 0.15) {
            this.x -= (currentSegment.curve * speedRatio * 0.15 * dt);
        }

        // Bounds clamp (safe shoulder)
        this.x = Math.max(-1.45, Math.min(1.45, this.x));

        // 3. Track Elevation & Forward position integration
        this.position += this.speed * dt;
        if (this.position >= roadEngine.trackLength) {
            // Reached finish or looping
        }

        // Track road elevation so camera stays aligned with hills
        if (currentSegment) {
            const segPercent = (this.position % window.ROAD_CONSTANTS.SEGMENT_LENGTH) / window.ROAD_CONSTANTS.SEGMENT_LENGTH;
            this.y = currentSegment.p1.world.y + (currentSegment.p2.world.y - currentSegment.p1.world.y) * segPercent;
        }

        // Road bump vertical vibration
        this.bounce = (speedRatio > 0.1) ? Math.sin(this.animationFrame * 0.6) * (speedRatio * 2) : 0;

        // Invulnerability timer decay
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
        }

        // Combo timer decay
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.nearMissCombo = 0;
            }
        }

        // Update continuous engine sound
        window.soundEngine.updateEngine(speedRatio, this.isBoosting || this.overdriveActive, this.isBraking);

        // Check road objects (Coins, Nitro pads, Hazards)
        this.checkRoadInteractions(roadEngine, particleSystem);
    }

    checkRoadInteractions(roadEngine, particleSystem) {
        const seg = roadEngine.findSegment(this.position);
        if (!seg) return;

        // Check Coins
        for (let i = 0; i < seg.coins.length; i++) {
            const coin = seg.coins[i];
            if (!coin.collected && Math.abs(this.x - coin.offset) < 0.32) {
                coin.collected = true;
                this.coins++;
                this.score += 150;
                window.soundEngine.playCoin();
                if (particleSystem) {
                    particleSystem.emitCoinSparkles(this);
                }
            }
        }

        // Check Nitro Pad
        if (seg.nitroPad && seg.nitroPad.active && Math.abs(this.x - seg.nitroPad.offset) < 0.4) {
            seg.nitroPad.active = false;
            this.nitro = Math.min(this.maxNitro, this.nitro + 40);
            this.speed = Math.min(this.maxSpeed * 1.45, this.speed + 2500);
            window.soundEngine.playNitro();
            if (particleSystem) {
                particleSystem.emitNitroFlames(this);
            }
        }

        // Check Hazard
        if (seg.hazard && !seg.hazard.hit && Math.abs(this.x - seg.hazard.offset) < seg.hazard.width) {
            seg.hazard.hit = true;
            if (!this.overdriveActive && this.invulnerableTimer <= 0) {
                if (seg.hazard.type === 'ice') {
                    // Slide spin
                    this.steerAngle = (Math.random() > 0.5 ? 1 : -1) * 1.8;
                    this.speed *= 0.85;
                    window.soundEngine.playTireScreech(1.2);
                } else {
                    // Rock or oil crash
                    this.damage(15, particleSystem);
                    this.speed *= 0.6;
                    window.soundEngine.playCrash();
                }
            }
        }
    }

    triggerNearMiss(particleSystem) {
        this.nearMissCombo++;
        this.totalNearMisses++;
        this.comboTimer = 2.8; // 2.8s window to chain next close call!

        // Overdrive meter charge
        this.overdriveMeter = Math.min(100, this.overdriveMeter + 14);

        // Score based on combo
        const comboPoints = 250 * Math.min(10, this.nearMissCombo);
        this.score += comboPoints;

        // Nitro refill reward
        this.nitro = Math.min(this.maxNitro, this.nitro + 12);

        window.soundEngine.playNearMiss(this.nearMissCombo);

        if (particleSystem) {
            particleSystem.emitComboStars(this, this.nearMissCombo);
        }
    }

    damage(amount, particleSystem) {
        if (this.overdriveActive || this.invulnerableTimer > 0) return;

        this.health = Math.max(0, this.health - amount);
        this.collisions++;
        this.invulnerableTimer = 1.2; // 1.2s flash immunity
        this.nearMissCombo = 0; // reset combo

        if (particleSystem) {
            particleSystem.emitCrashSparks(this);
        }
    }

    // -------------------------------------------------------------
    // PLAYER CAR VECTOR RENDERING
    // -------------------------------------------------------------
    render(ctx, width, height) {
        // Flash if invulnerable
        if (this.invulnerableTimer > 0 && Math.floor(this.animationFrame / 4) % 2 === 0) {
            return;
        }

        const carW = width * 0.18;
        const carH = carW * 0.52;
        const carX = width / 2;
        const carY = height * 0.85 + this.bounce;

        ctx.save();
        ctx.translate(carX, carY);

        // Chassis lateral roll & drift tilt
        const tiltAngle = this.steerAngle * 0.12;
        ctx.rotate(tiltAngle);

        // 1. Neon Underglow
        const glowGrad = ctx.createRadialGradient(0, 0, carW * 0.15, 0, 0, carW * 0.65);
        glowGrad.addColorStop(0, this.overdriveActive ? '#00f3ff' : this.underglowColor);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(0, carH * 0.35, carW * 0.7, carH * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Asphalt Contact Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.ellipse(0, carH * 0.38, carW * 0.48, carH * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Wide Tires
        ctx.fillStyle = '#111827';
        // Left tire
        ctx.fillRect(-carW * 0.48, carH * 0.05, carW * 0.14, carH * 0.38);
        // Right tire
        ctx.fillRect(carW * 0.34, carH * 0.05, carW * 0.14, carH * 0.38);

        // 4. Render Specific Real Supercar Rear Fascia
        const primaryColor = this.overdriveActive ? '#00f3ff' : this.carColor;
        const tailColor = this.isBraking ? '#ff0033' : '#ff1a1a';

        switch (this.carId) {
            case 'mustang':
                this.renderMustangRear(ctx, carW, carH, primaryColor, tailColor);
                break;
            case 'gt3rs':
                this.renderPorscheRear(ctx, carW, carH, primaryColor, tailColor);
                break;
            case 'aventador':
                this.renderAventadorRear(ctx, carW, carH, primaryColor, tailColor);
                break;
            case 'chiron':
                this.renderChironRear(ctx, carW, carH, primaryColor, tailColor);
                break;
            case 'skyline':
            default:
                this.renderSkylineRear(ctx, carW, carH, primaryColor, tailColor);
                break;
        }

        // Overdrive / Boost Aura
        if (this.overdriveActive) {
            ctx.strokeStyle = '#00f3ff';
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 24;
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    // -------------------------------------------------------------
    // REAL SUPERCAR REAR VISUAL IMPLEMENTATIONS
    // -------------------------------------------------------------

    // 1. NISSAN SKYLINE GT-R R34 (Quad Round Tail Lamps, Nismo Wing, Left Exhaust)
    renderSkylineRear(ctx, w, h, bodyColor, tailColor) {
        // Rear Body
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(-w * 0.45, -h * 0.38, w * 0.9, h * 0.72, [8, 8, 4, 4]);
        ctx.fill();

        // Cabin & Rear Windshield
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-w * 0.32, -h * 0.38);
        ctx.lineTo(-w * 0.26, -h * 0.74);
        ctx.lineTo(w * 0.26, -h * 0.74);
        ctx.lineTo(w * 0.32, -h * 0.38);
        ctx.closePath();
        ctx.fill();

        // GT-R Double-Deck Rear Spoiler
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-w * 0.36, -h * 0.65, w * 0.05, h * 0.32);
        ctx.fillRect(w * 0.31, -h * 0.65, w * 0.05, h * 0.32);
        ctx.fillStyle = this.overdriveActive ? '#00f3ff' : '#0f172a';
        ctx.fillRect(-w * 0.46, -h * 0.72, w * 0.92, h * 0.1);

        // Quad Round Tail Lamps (Two glowing red circles on each side)
        ctx.shadowColor = tailColor;
        ctx.shadowBlur = this.isBraking ? 25 : 12;
        const outerR = w * 0.055;
        const innerR = w * 0.045;
        const lampY = -h * 0.12;

        [-1, 1].forEach(side => {
            // Outer lamp
            ctx.fillStyle = tailColor;
            ctx.beginPath();
            ctx.arc(side * w * 0.34, lampY, outerR, 0, Math.PI * 2);
            ctx.fill();
            // Inner lamp
            ctx.beginPath();
            ctx.arc(side * w * 0.22, lampY, innerR, 0, Math.PI * 2);
            ctx.fill();
            // Lamp chrome bezel
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });
        ctx.shadowBlur = 0;

        // Trunk GT-R Emblem
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(w * 0.04)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('GT-R', w * 0.08, -h * 0.1);

        // Left Single Large Titanium Exhaust Cannon
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(-w * 0.34, h * 0.26, w * 0.065, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7'; // titanium heat blue
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // 2. FORD MUSTANG SHELBY GT500 (Vertical Tri-Bar Sequential Lamps, Quad Exhausts, Cobra Badge)
    renderMustangRear(ctx, w, h, bodyColor, tailColor) {
        // Muscular Squared Body
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(-w * 0.46, -h * 0.36, w * 0.92, h * 0.72, [6, 6, 2, 2]);
        ctx.fill();

        // Dual Le Mans Racing Stripes running down center
        ctx.fillStyle = bodyColor === '#f8fafc' ? '#1d4ed8' : '#ffffff';
        ctx.fillRect(-w * 0.08, -h * 0.72, w * 0.06, h * 1.08);
        ctx.fillRect(w * 0.02, -h * 0.72, w * 0.06, h * 1.08);

        // Cabin
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-w * 0.32, -h * 0.36);
        ctx.lineTo(-w * 0.25, -h * 0.72);
        ctx.lineTo(w * 0.25, -h * 0.72);
        ctx.lineTo(w * 0.32, -h * 0.36);
        ctx.closePath();
        ctx.fill();

        // Ducktail Spoiler
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.44, -h * 0.44, w * 0.88, h * 0.1);

        // Signature Tri-Bar Vertical LED Tail Lights (3 on left, 3 on right)
        ctx.fillStyle = tailColor;
        ctx.shadowColor = tailColor;
        ctx.shadowBlur = this.isBraking ? 25 : 12;
        [-1, 1].forEach(side => {
            const baseX = side * w * 0.35;
            for (let i = 0; i < 3; i++) {
                const bx = baseX + (side * (i - 1) * w * 0.045);
                ctx.fillRect(bx - w * 0.015, -h * 0.22, w * 0.03, h * 0.25);
            }
        });
        ctx.shadowBlur = 0;

        // Center Shelby Cobra Medallion
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, -h * 0.1, w * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, -h * 0.1, w * 0.02, 0, Math.PI * 2);
        ctx.fill();

        // Quad Exhaust Tips (2 on left, 2 on right)
        ctx.fillStyle = '#475569';
        [-0.34, -0.25, 0.25, 0.34].forEach(exX => {
            ctx.beginPath();
            ctx.arc(w * exX, h * 0.25, w * 0.04, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // 3. PORSCHE 911 GT3 RS (Continuous Red Laser Lightbar, Swan-Neck Wing, Dual Center Exhaust)
    renderPorscheRear(ctx, w, h, bodyColor, tailColor) {
        // Curving Teardrop Rear Hips
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(-w * 0.45, -h * 0.38, w * 0.9, h * 0.72, [18, 18, 6, 6]);
        ctx.fill();

        // Fastback Sloping Rear Windshield & Louvered Decklid
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, -h * 0.38);
        ctx.lineTo(-w * 0.22, -h * 0.76);
        ctx.lineTo(w * 0.22, -h * 0.76);
        ctx.lineTo(w * 0.3, -h * 0.38);
        ctx.closePath();
        ctx.fill();

        // Swan-Neck Top-Hung Carbon Wing
        ctx.fillStyle = '#1e293b';
        // Gooseneck pylons
        ctx.fillRect(-w * 0.24, -h * 0.72, w * 0.04, h * 0.38);
        ctx.fillRect(w * 0.2, -h * 0.72, w * 0.04, h * 0.38);
        // Massive Aerodynamic Blade
        ctx.fillStyle = this.overdriveActive ? '#00f3ff' : '#090d16';
        ctx.fillRect(-w * 0.48, -h * 0.76, w * 0.96, h * 0.09);
        // Endplates
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-w * 0.48, -h * 0.82, w * 0.04, h * 0.18);
        ctx.fillRect(w * 0.44, -h * 0.82, w * 0.04, h * 0.18);

        // Full-Width Continuous Red LED Laser Lightbar
        ctx.fillStyle = tailColor;
        ctx.shadowColor = tailColor;
        ctx.shadowBlur = this.isBraking ? 25 : 14;
        ctx.fillRect(-w * 0.4, -h * 0.15, w * 0.8, h * 0.05);
        ctx.shadowBlur = 0;

        // "PORSCHE" Lettering under lightbar
        ctx.fillStyle = '#cbd5e1';
        ctx.font = `bold ${Math.round(w * 0.03)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('P O R S C H E', 0, -h * 0.06);

        // Dual Center Titanium Exhausts
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(-w * 0.06, h * 0.25, w * 0.045, 0, Math.PI * 2);
        ctx.arc(w * 0.06, h * 0.25, w * 0.045, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8'; // heat blue
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // 4. LAMBORGHINI AVENTADOR SVJ (Y-Shaped LEDs, High Dual Cannons, Extreme Diffuser)
    renderAventadorRear(ctx, w, h, bodyColor, tailColor) {
        // Ultra-Wide Angular Stealth Fighter Body
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(-w * 0.48, h * 0.22);
        ctx.lineTo(-w * 0.44, -h * 0.32);
        ctx.lineTo(w * 0.44, -h * 0.32);
        ctx.lineTo(w * 0.48, h * 0.22);
        ctx.closePath();
        ctx.fill();

        // Slanted Low-Slung Cabin
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-w * 0.32, -h * 0.32);
        ctx.lineTo(-w * 0.22, -h * 0.65);
        ctx.lineTo(w * 0.22, -h * 0.65);
        ctx.lineTo(w * 0.32, -h * 0.32);
        ctx.closePath();
        ctx.fill();

        // SVJ ALA 2.0 High-Rise Wing with Central Stabilizer Pylon
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.02, -h * 0.65, w * 0.04, h * 0.35); // center pylon
        ctx.fillRect(-w * 0.28, -h * 0.62, w * 0.04, h * 0.32);
        ctx.fillRect(w * 0.24, -h * 0.62, w * 0.04, h * 0.32);
        ctx.fillStyle = this.overdriveActive ? '#00f3ff' : '#000000';
        ctx.fillRect(-w * 0.48, -h * 0.68, w * 0.96, h * 0.08);

        // Iconic Y-Shaped / Chevron LED Tail Lights
        ctx.strokeStyle = tailColor;
        ctx.shadowColor = tailColor;
        ctx.shadowBlur = this.isBraking ? 25 : 12;
        ctx.lineWidth = 3;
        [-1, 1].forEach(side => {
            const bx = side * w * 0.32;
            ctx.beginPath();
            ctx.moveTo(bx + side * w * 0.08, -h * 0.16);
            ctx.lineTo(bx, -h * 0.1);
            ctx.lineTo(bx + side * w * 0.08, -h * 0.04);
            ctx.stroke();
        });
        ctx.shadowBlur = 0;

        // High-Mounted Center Dual Exhaust Cannons
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(-w * 0.08, -h * 0.08, w * 0.045, 0, Math.PI * 2);
        ctx.arc(w * 0.08, -h * 0.08, w * 0.045, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Extreme Multi-Blade Rear Diffuser
        ctx.fillStyle = '#0f172a';
        for (let i = -3; i <= 3; i++) {
            ctx.fillRect(i * w * 0.08 - w * 0.01, h * 0.15, w * 0.02, h * 0.15);
        }
    }

    // 5. BUGATTI CHIRON SUPER SPORT (Monolithic Horizontal Laser Blade, Stacked Quad Exhausts)
    renderChironRear(ctx, w, h, bodyColor, tailColor) {
        // Monolithic Wide Hypercar Rear
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(-w * 0.48, -h * 0.36, w * 0.96, h * 0.72, [14, 14, 4, 4]);
        ctx.fill();

        // Exposed Carbon Fiber Center Accent
        ctx.fillStyle = '#090d16';
        ctx.fillRect(-w * 0.14, -h * 0.72, w * 0.28, h * 1.08);

        // Cabin
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, -h * 0.36);
        ctx.lineTo(-w * 0.22, -h * 0.72);
        ctx.lineTo(w * 0.22, -h * 0.72);
        ctx.lineTo(w * 0.3, -h * 0.36);
        ctx.closePath();
        ctx.fill();

        // Active Longtail Carbon Wing
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.46, -h * 0.48, w * 0.92, h * 0.1);

        // Famous 1.6-Meter Single Continuous Laser Red LED Blade
        ctx.fillStyle = tailColor;
        ctx.shadowColor = tailColor;
        ctx.shadowBlur = this.isBraking ? 28 : 16;
        ctx.fillRect(-w * 0.44, -h * 0.18, w * 0.88, h * 0.04);
        ctx.shadowBlur = 0;

        // Horseshoe Center Arc
        ctx.strokeStyle = '#38bdf8'; // Bugatti Blue
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, h * 0.08, w * 0.1, Math.PI, 0, false);
        ctx.stroke();

        // Vertically Stacked Dual Twin Exhaust Cannons (2 Left, 2 Right)
        ctx.fillStyle = '#475569';
        [-w * 0.35, w * 0.35].forEach(sideX => {
            ctx.beginPath();
            ctx.arc(sideX, h * 0.16, w * 0.035, 0, Math.PI * 2);
            ctx.arc(sideX, h * 0.25, w * 0.035, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

window.Player = Player;
