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
        this.nitro = 50;
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

        // Nitro Boost Trigger
        if (input.nitro && this.nitro > 0 && !this.isBraking && this.speed > 500) {
            if (!this.isBoosting) {
                window.soundEngine.playNitro();
            }
            this.isBoosting = true;
            this.nitro = Math.max(0, this.nitro - (this.nitroDrainRate || 30) * dt);

            // Nitro fire particles
            if (particleSystem) {
                particleSystem.emitNitroFlames(this);
            }
        } else {
            this.isBoosting = false;
            // Passive slow nitro regen when driving fast
            if (this.speed > this.maxSpeed * 0.6) {
                this.nitro = Math.min(this.maxNitro, this.nitro + 6 * dt);
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

        // Off-road penalty
        const isOffroad = Math.abs(this.x) > this.offRoadLimit;
        if (isOffroad && this.speed > this.maxSpeed * 0.3) {
            targetAccel += this.offRoadDecel;
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

        // 2. Lateral Steering & Banking
        const speedRatio = this.speed / this.maxSpeed;
        const currentSegment = roadEngine.findSegment(this.position);
        const curveForce = currentSegment ? currentSegment.curve : 0;

        let steerIntent = 0;
        if (input.left) steerIntent -= 1;
        if (input.right) steerIntent += 1;

        // Smooth steering angle for 3D chassis tilt
        this.steerAngle += (steerIntent - this.steerAngle) * Math.min(1, dt * 10);

        // Tire screech when turning hard at high speed
        if (Math.abs(steerIntent) > 0.5 && speedRatio > 0.7 && Math.random() < 0.12) {
            window.soundEngine.playTireScreech(0.6);
            if (particleSystem) {
                particleSystem.emitTireSmoke(this);
            }
        }

        // Lateral position change
        const turnSpeed = this.handling * (0.4 + speedRatio * 0.6);
        this.x += steerIntent * turnSpeed * dt;

        // Centrifugal curve push
        this.x -= (curveForce * speedRatio * speedRatio * 1.8 * dt);

        // Bounds clamp (can't drive to infinity offroad)
        this.x = Math.max(-1.95, Math.min(1.95, this.x));

        // 3. Forward position integration
        this.position += this.speed * dt;
        if (this.position >= roadEngine.trackLength) {
            // Reached or looped
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

        // 4. Main Rear Body Shell (Aerodynamic sports car tail)
        const primaryColor = this.overdriveActive ? '#00f3ff' : this.carColor;
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.roundRect(-carW * 0.44, -carH * 0.35, carW * 0.88, carH * 0.68, [12, 12, 6, 6]);
        ctx.fill();

        // Gradient highlight on body
        const bodyGrad = ctx.createLinearGradient(0, -carH * 0.35, 0, carH * 0.35);
        bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        bodyGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
        bodyGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // 5. Rear Windshield & Roof Cabin
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-carW * 0.3, -carH * 0.35);
        ctx.lineTo(-carW * 0.24, -carH * 0.72);
        ctx.lineTo(carW * 0.24, -carH * 0.72);
        ctx.lineTo(carW * 0.3, -carH * 0.35);
        ctx.closePath();
        ctx.fill();

        // Windshield glass reflection
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-carW * 0.2, -carH * 0.4);
        ctx.lineTo(-carW * 0.12, -carH * 0.68);
        ctx.stroke();

        // 6. GT Racing Spoiler
        ctx.fillStyle = '#0a0a0f';
        // Struts
        ctx.fillRect(-carW * 0.32, -carH * 0.55, carW * 0.05, carH * 0.28);
        ctx.fillRect(carW * 0.27, -carH * 0.55, carW * 0.05, carH * 0.28);
        // Wing blade
        ctx.fillStyle = this.overdriveActive ? '#ffffff' : '#1f2937';
        ctx.fillRect(-carW * 0.42, -carH * 0.62, carW * 0.84, carH * 0.1);

        // 7. Dynamic LED Tail Lights & Braking Glow
        const tailColor = this.isBraking ? '#ff0033' : '#ff1a1a';
        ctx.fillStyle = tailColor;
        ctx.shadowColor = tailColor;
        ctx.shadowBlur = this.isBraking ? 25 : 12;

        // Dual horizontal cyber tail lamps
        ctx.fillRect(-carW * 0.38, -carH * 0.12, carW * 0.24, carH * 0.12);
        ctx.fillRect(carW * 0.14, -carH * 0.12, carW * 0.24, carH * 0.12);

        // Center third brake light
        if (this.isBraking) {
            ctx.fillRect(-carW * 0.1, -carH * 0.38, carW * 0.2, carH * 0.06);
        }
        ctx.shadowBlur = 0;

        // 8. Dual Chrome Exhaust Pipes
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(-carW * 0.25, carH * 0.25, carW * 0.05, 0, Math.PI * 2);
        ctx.arc(carW * 0.25, carH * 0.25, carW * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Overdrive / Boost Aura
        if (this.overdriveActive) {
            ctx.strokeStyle = '#00f3ff';
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }
}

window.Player = Player;
