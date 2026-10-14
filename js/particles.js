/**
 * ROAD DASH: OVERDRIVE - Particle System & Visual Juice
 * Handles speed lines, nitro flames, tire smoke, sparks, rain, weather, and floating combo text.
 */

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
        this.speedLines = [];
        this.maxParticles = 300;

        // Pre-populate speed lines
        for (let i = 0; i < 40; i++) {
            this.speedLines.push({
                x: Math.random(),
                y: Math.random(),
                len: Math.random() * 0.15 + 0.05,
                speed: Math.random() * 1.5 + 1.0,
                alpha: Math.random() * 0.4 + 0.1
            });
        }
    }

    reset() {
        this.particles = [];
        this.floatingTexts = [];
    }

    update(dt) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);
            if (p.sizeGrowth) {
                p.size += p.sizeGrowth * dt;
            }
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.y += t.vy * dt;
            t.life -= dt;
            t.alpha = Math.max(0, t.life / t.maxLife);
            t.scale = 1 + (1 - t.alpha) * 0.4;
            if (t.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    // -------------------------------------------------------------
    // EMITTERS
    // -------------------------------------------------------------
    emitNitroFlames(player) {
        if (this.particles.length > this.maxParticles) return;
        const colors = player.overdriveActive
            ? ['#00f3ff', '#ffffff', '#38bdf8', '#e0f2fe']
            : ['#00f3ff', '#38bdf8', '#f43f5e', '#fbbf24', '#ffffff'];

        const numParticles = player.overdriveActive ? 6 : 4;
        for (let i = 0; i < numParticles; i++) {
            const side = (i % 2 === 0) ? -1 : 1;
            const tiltOffset = (player.steerAngle || 0) * 0.02;
            this.particles.push({
                x: 0.5 + (side * (0.035 + Math.random() * 0.025)) + tiltOffset,
                y: 0.86 + Math.random() * 0.04,
                vx: (Math.random() - 0.5) * 0.12 - ((player.steerAngle || 0) * 0.1),
                vy: Math.random() * 0.45 + 0.55, // fast downward trail
                size: Math.random() * 10 + 6,
                sizeGrowth: 18,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 0.28,
                maxLife: 0.28,
                alpha: 0.95
            });
        }
    }

    emitTireSmoke(player) {
        if (this.particles.length > this.maxParticles) return;
        for (let i = 0; i < 2; i++) {
            const side = (i === 0) ? -0.06 : 0.06;
            this.particles.push({
                x: 0.5 + side,
                y: 0.88,
                vx: (Math.random() - 0.5) * 0.12 - (player.steerAngle * 0.15),
                vy: (Math.random() - 0.5) * 0.05,
                size: Math.random() * 8 + 6,
                sizeGrowth: 28,
                color: 'rgba(220, 225, 235, 0.45)',
                life: 0.35,
                maxLife: 0.35,
                alpha: 0.5
            });
        }
    }

    emitOffroadDust(player) {
        if (this.particles.length > this.maxParticles) return;
        this.particles.push({
            x: 0.5 + (player.x > 0 ? 0.06 : -0.06),
            y: 0.88,
            vx: (Math.random() - 0.5) * 0.2,
            vy: -Math.random() * 0.2,
            size: Math.random() * 10 + 8,
            sizeGrowth: 35,
            color: '#b45309',
            life: 0.4,
            maxLife: 0.4,
            alpha: 0.6
        });
    }

    emitCrashSparks(player) {
        for (let i = 0; i < 24; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.7 + 0.3;
            this.particles.push({
                x: 0.5,
                y: 0.84,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2,
                sizeGrowth: -2,
                color: Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
                life: 0.45,
                maxLife: 0.45,
                alpha: 1.0
            });
        }
    }

    emitCoinSparkles(player) {
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.4 + 0.2;
            this.particles.push({
                x: 0.5,
                y: 0.82,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.15,
                size: Math.random() * 5 + 3,
                sizeGrowth: 0,
                color: '#fbbf24',
                life: 0.5,
                maxLife: 0.5,
                alpha: 1.0
            });
        }
    }

    emitComboStars(player, combo) {
        const textTitles = ['CLOSE CALL!', 'SWEET DRIFT!', 'INSANE DASH!', 'UNSTOPPABLE!'];
        const title = textTitles[Math.min(combo - 1, textTitles.length - 1)];

        this.floatingTexts.push({
            text: `${title} x${combo}`,
            x: 0.5,
            y: 0.72,
            vy: -0.12,
            color: combo > 4 ? '#ff007f' : '#00f3ff',
            life: 1.1,
            maxLife: 1.1,
            alpha: 1.0
        });
    }

    emitSlipstreamTrails(player, car) {
        this.particles.push({
            x: 0.5 + (Math.random() - 0.5) * 0.12,
            y: 0.76,
            vx: (Math.random() - 0.5) * 0.02,
            vy: 0.35,
            size: Math.random() * 3 + 1,
            sizeGrowth: 1,
            color: 'rgba(255, 255, 255, 0.7)',
            life: 0.18,
            maxLife: 0.18,
            alpha: 0.7
        });
    }

    // -------------------------------------------------------------
    // RENDERING
    // -------------------------------------------------------------
    render(ctx, width, height, player, weather) {
        ctx.save();

        // 1. Render Speed Lines when going fast or boosting
        const speedRatio = player.speed / player.maxSpeed;
        if (speedRatio > 0.65 || player.isBoosting || player.overdriveActive) {
            const isNitro = player.isBoosting || player.overdriveActive;
            const intensity = player.overdriveActive ? 1.0 : (player.isBoosting ? 0.95 : (speedRatio - 0.65) * 2.8);
            ctx.strokeStyle = player.overdriveActive
                ? 'rgba(0, 243, 255, 0.85)'
                : (player.isBoosting ? 'rgba(0, 243, 255, 0.7)' : 'rgba(255, 255, 255, 0.35)');
            ctx.lineWidth = isNitro ? 2.4 : 1.2;

            const cx = width / 2;
            const cy = height * 0.48;

            this.speedLines.forEach(line => {
                line.y = (line.y + line.speed * (0.025 + intensity * 0.06)) % 1;
                // Radiate outward from horizon vanishing point
                const angle = line.x * Math.PI * 2;
                const dist1 = 90 + line.y * (width * 0.75);
                const dist2 = dist1 + line.len * (isNitro ? 320 : 220);

                const x1 = cx + Math.cos(angle) * dist1;
                const y1 = cy + Math.sin(angle) * dist1 * 0.6;
                const x2 = cx + Math.cos(angle) * dist2;
                const y2 = cy + Math.sin(angle) * dist2 * 0.6;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            });
        }

        // 2. Weather Effects (Rain in Storm theme)
        if (weather === 'rain') {
            ctx.strokeStyle = 'rgba(180, 225, 255, 0.45)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 40; i++) {
                const rx = Math.random() * width;
                const ry = Math.random() * height;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx - 8, ry + 24);
                ctx.stroke();
            }
        }

        // 3. Render In-Game Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x * width, p.y * height, Math.max(1, p.size), 0, Math.PI * 2);
            ctx.fill();
        });

        // 4. Floating Combo & Score Text
        this.floatingTexts.forEach(t => {
            ctx.save();
            ctx.translate(t.x * width, t.y * height);
            ctx.scale(t.scale, t.scale);
            ctx.globalAlpha = t.alpha;

            ctx.fillStyle = t.color;
            ctx.shadowColor = t.color;
            ctx.shadowBlur = 14;
            ctx.font = '900 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(t.text, 0, 0);

            ctx.restore();
        });

        ctx.restore();
    }
}

window.ParticleSystem = ParticleSystem;
