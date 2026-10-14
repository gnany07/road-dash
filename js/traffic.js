/**
 * ROAD DASH: OVERDRIVE - Traffic AI & Vehicle Simulation
 * Manages multi-lane highway traffic, lane changes, blinkers, police pursuers, and drafting/near-miss mechanics.
 */

class TrafficCar {
    constructor(config) {
        this.z = config.z || 0;
        this.x = config.x || 0;
        this.speed = config.speed || 4000;
        this.type = config.type || 'sedan'; // sedan, semi_truck, sports_car, police, ambulance
        this.color = config.color || '#3b82f6';

        // Lane change AI
        this.targetX = this.x;
        this.laneChangeTimer = Math.random() * 8 + 4;
        this.isBlinking = false;
        this.blinkerSide = null;
        this.blinkerFrame = 0;

        // Scoring / interaction flags
        this.hasPassedPlayer = false;
        this.isWrecked = false;
        this.wreckAngle = 0;
        this.wreckVelocityX = 0;

        // Dimensions
        this.width = (this.type === 'semi_truck') ? 0.38 : 0.28;
        this.length = (this.type === 'semi_truck') ? 700 : 380;
    }

    update(dt, player, roadEngine, trafficManager) {
        this.blinkerFrame++;

        if (this.isWrecked) {
            this.x += this.wreckVelocityX * dt;
            this.wreckAngle += 8 * dt;
            this.z += this.speed * 0.3 * dt;
            return;
        }

        // 1. Move forward along road
        this.z += this.speed * dt;

        // 2. AI Lane Change Logic
        this.laneChangeTimer -= dt;
        if (this.laneChangeTimer <= 0) {
            this.decideLaneChange();
        }

        // Execute lane transition
        if (Math.abs(this.x - this.targetX) > 0.02) {
            const dir = Math.sign(this.targetX - this.x);
            this.x += dir * 0.45 * dt;
            this.isBlinking = true;
            this.blinkerSide = dir > 0 ? 'right' : 'left';
        } else {
            this.x = this.targetX;
            this.isBlinking = false;
            this.blinkerSide = null;
        }

        // 3. Police Pursuit AI (Locks on to player lane)
        if (this.type === 'police' && Math.abs(this.z - player.position) < 4000) {
            if (Math.random() < 0.03) {
                this.targetX = player.x;
            }
        }
    }

    decideLaneChange() {
        this.laneChangeTimer = Math.random() * 6 + 5;
        if (this.type === 'semi_truck') return; // trucks stick to their lane mostly

        const lanes = [-0.6, -0.2, 0.2, 0.6];
        const currentLaneIdx = lanes.reduce((closest, lane, idx) => {
            return Math.abs(lane - this.x) < Math.abs(lanes[closest] - this.x) ? idx : closest;
        }, 0);

        // Shift left or right by 1 lane
        const options = [];
        if (currentLaneIdx > 0) options.push(lanes[currentLaneIdx - 1]);
        if (currentLaneIdx < lanes.length - 1) options.push(lanes[currentLaneIdx + 1]);

        if (options.length > 0 && Math.random() < 0.65) {
            this.targetX = options[Math.floor(Math.random() * options.length)];
        }
    }

    wreck(dir) {
        this.isWrecked = true;
        this.wreckVelocityX = dir * 2.2;
        window.soundEngine.playCrash();
    }

    // -------------------------------------------------------------
    // TRAFFIC CAR RENDERING
    // -------------------------------------------------------------
    render(ctx, width, height, screen) {
        const x = screen.x + (screen.scale * this.x * window.ROAD_CONSTANTS.ROAD_WIDTH * width / 2);
        const y = screen.y;
        const carW = screen.scale * (this.type === 'semi_truck' ? 360 : 280) * width / 2;
        const carH = carW * (this.type === 'semi_truck' ? 0.95 : 0.58);

        if (carW < 3) return;

        ctx.save();
        ctx.translate(x, y);

        if (this.isWrecked) {
            ctx.rotate(this.wreckAngle);
        }

        // 1. Asphalt Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, carW * 0.48, carH * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.type === 'semi_truck') {
            this.renderSemiTruck(ctx, carW, carH);
        } else if (this.type === 'police') {
            this.renderPoliceCar(ctx, carW, carH);
        } else if (this.type === 'ambulance') {
            this.renderAmbulance(ctx, carW, carH);
        } else {
            this.renderSedan(ctx, carW, carH);
        }

        // 2. Turn Indicators (Blinkers)
        if (this.isBlinking && Math.floor(this.blinkerFrame / 10) % 2 === 0) {
            ctx.fillStyle = '#f59e0b';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 8;
            if (this.blinkerSide === 'left') {
                ctx.fillRect(-carW * 0.46, -carH * 0.35, carW * 0.1, carH * 0.2);
            } else {
                ctx.fillRect(carW * 0.36, -carH * 0.35, carW * 0.1, carH * 0.2);
            }
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    renderSedan(ctx, w, h) {
        // Rear body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-w * 0.45, -h * 0.75, w * 0.9, h * 0.75, [8, 8, 4, 4]);
        ctx.fill();

        // Roof / Cabin
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-w * 0.32, -h * 1.15, w * 0.64, h * 0.45, [6, 6, 0, 0]);
        ctx.fill();

        // Rear windshield
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-w * 0.28, -h * 1.08, w * 0.56, h * 0.32);

        // Tail lights
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.fillRect(-w * 0.42, -h * 0.6, w * 0.18, h * 0.2);
        ctx.fillRect(w * 0.24, -h * 0.6, w * 0.18, h * 0.2);
        ctx.shadowBlur = 0;

        // License plate
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.14, -h * 0.3, w * 0.28, h * 0.16);
    }

    renderSemiTruck(ctx, w, h) {
        // Massive cargo trailer box
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-w * 0.48, -h * 1.5, w * 0.96, h * 1.5, [4, 4, 0, 0]);
        ctx.fill();

        // Trailer corrugated door lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = Math.max(1, w * 0.02);
        for (let y = -h * 1.4; y < 0; y += h * 0.2) {
            ctx.beginPath();
            ctx.moveTo(-w * 0.45, y);
            ctx.lineTo(w * 0.45, y);
            ctx.stroke();
        }

        // Heavy bumper & Mud flaps
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-w * 0.5, -h * 0.15, w, h * 0.15);

        // Multiple rear marker lights
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 6;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(-w * 0.4 + i * (w * 0.24), -h * 0.18, w * 0.08, h * 0.1);
        }
        ctx.shadowBlur = 0;
    }

    renderPoliceCar(ctx, w, h) {
        this.renderSedan(ctx, w, h);

        // Flashing Lightbar on roof
        const isRed = Math.floor(this.blinkerFrame / 6) % 2 === 0;
        ctx.fillStyle = isRed ? '#ef4444' : '#3b82f6';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 14;
        ctx.fillRect(-w * 0.22, -h * 1.3, w * 0.44, h * 0.18);
        ctx.shadowBlur = 0;
    }

    renderAmbulance(ctx, w, h) {
        // White box body
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(-w * 0.46, -h * 1.3, w * 0.92, h * 1.3, [6, 6, 0, 0]);
        ctx.fill();

        // Red cross
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-w * 0.08, -h * 0.85, w * 0.16, h * 0.35);
        ctx.fillRect(-w * 0.18, -h * 0.75, w * 0.36, h * 0.15);

        // Flashing blue emergency light
        ctx.fillStyle = '#3b82f6';
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 12;
        ctx.fillRect(-w * 0.15, -h * 1.45, w * 0.3, h * 0.16);
        ctx.shadowBlur = 0;
    }
}

class TrafficManager {
    constructor() {
        this.cars = [];
        this.density = 24; // number of active cars on track
        this.trafficColors = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#475569', '#f8fafc'];
    }

    reset() {
        this.cars = [];
    }

    populate(roadEngine, levelConfig) {
        this.reset();
        const totalSegments = roadEngine.segments.length;
        if (totalSegments === 0) return;

        const count = levelConfig.trafficDensity || 24;
        const spacing = (roadEngine.trackLength - 2000) / count;

        for (let i = 0; i < count; i++) {
            const z = 2000 + i * spacing + (Math.random() * 400 - 200);
            const lanes = [-0.6, -0.2, 0.2, 0.6];
            const lane = lanes[Math.floor(Math.random() * lanes.length)];

            // Vehicle type selection based on level
            let type = 'sedan';
            const r = Math.random();
            if (levelConfig.theme === 'chase' && r < 0.3) {
                type = 'police';
            } else if (r < 0.22) {
                type = 'semi_truck';
            } else if (r < 0.38) {
                type = 'sports_car';
            } else if (r < 0.44) {
                type = 'ambulance';
            }

            const speed = (type === 'semi_truck')
                ? 3200 + Math.random() * 800
                : (type === 'sports_car' ? 6800 + Math.random() * 1500 : 4500 + Math.random() * 1200);

            const color = (type === 'police') ? '#0f172a' : this.trafficColors[Math.floor(Math.random() * this.trafficColors.length)];

            this.cars.push(new TrafficCar({
                z: z,
                x: lane,
                speed: speed,
                type: type,
                color: color
            }));
        }
    }

    update(dt, player, roadEngine, particleSystem) {
        // Clear all segment car associations
        roadEngine.segments.forEach(seg => seg.cars = []);

        let draftingThisFrame = false;

        for (let i = 0; i < this.cars.length; i++) {
            const car = this.cars[i];
            car.update(dt, player, roadEngine, this);

            // Wrap cars around track
            if (car.z >= roadEngine.trackLength) {
                car.z -= roadEngine.trackLength;
                car.hasPassedPlayer = false;
                car.isWrecked = false;
            } else if (car.z < 0) {
                car.z += roadEngine.trackLength;
            }

            // Assign car to corresponding road segment for correct 3D depth rendering
            const segment = roadEngine.findSegment(car.z);
            if (segment) {
                segment.cars.push(car);
            }

            // -------------------------------------------------------------
            // DRAFTING / SLIPSTREAM MECHANIC
            // -------------------------------------------------------------
            const distZ = car.z - player.position;
            const latDist = Math.abs(player.x - car.x);

            if (!car.isWrecked && distZ > 80 && distZ < 650 && latDist < 0.24 && player.speed > 5000) {
                draftingThisFrame = true;
                player.draftTimer += dt;
                player.totalDraftTime += dt;
                // Slipstream speed boost
                player.speed = Math.min(player.maxSpeed * 1.3, player.speed + 1200 * dt);
                if (particleSystem && Math.random() < 0.3) {
                    particleSystem.emitSlipstreamTrails(player, car);
                }
            }

            // -------------------------------------------------------------
            // NEAR-MISS (CLOSE CALL) DETECTION
            // -------------------------------------------------------------
            if (!car.hasPassedPlayer && !car.isWrecked) {
                // If player is overtaking this car
                if (player.position > car.z && (player.position - car.z) < 350) {
                    car.hasPassedPlayer = true;
                    // If lateral distance was thrillingly close (0.28 to 0.48)
                    if (latDist > 0.28 && latDist < 0.52) {
                        player.triggerNearMiss(particleSystem);
                    }
                }
            }

            // -------------------------------------------------------------
            // COLLISION DETECTION
            // -------------------------------------------------------------
            if (!car.isWrecked && Math.abs(distZ) < (car.length * 0.6)) {
                if (latDist < (car.width + 0.16)) {
                    if (player.overdriveActive) {
                        // SMASH TRAFFIC IN OVERDRIVE!
                        car.wreck(Math.sign(car.x - player.x) || 1);
                        player.score += 1000;
                        if (particleSystem) {
                            particleSystem.emitCrashSparks(player);
                        }
                    } else if (player.invulnerableTimer <= 0) {
                        // Standard collision damage
                        const hitDir = Math.sign(player.x - car.x);
                        player.x += hitDir * 0.2;
                        player.speed *= 0.5;
                        player.damage(25, particleSystem);
                        car.wreck(Math.sign(car.x - player.x) || 1);
                        window.soundEngine.playCrash();
                    }
                }
            }
        }

        player.isDrafting = draftingThisFrame;
    }
}

window.TrafficManager = TrafficManager;
