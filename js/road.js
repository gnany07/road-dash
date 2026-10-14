/**
 * ROAD DASH: OVERDRIVE - 2.5D Pseudo-3D Road Engine
 * Implements high-speed projected road geometry, curves, hills, roadside props, and weather.
 */

const ROAD_CONSTANTS = {
    SEGMENT_LENGTH: 200,
    RUMBLE_LENGTH: 3,
    LANES: 4,
    ROAD_WIDTH: 2200,
    CAMERA_HEIGHT: 1100,
    DRAW_DISTANCE: 260,
    CAMERA_DEPTH: 0.84,
    FIELD_OF_VIEW: 100
};

class RoadEngine {
    constructor() {
        this.segments = [];
        this.trackLength = 0;
        this.theme = 'coastal'; // coastal, neon, canyon, storm, chase
        this.skyOffset = 0;
        this.hillOffset = 0;
        this.treeOffset = 0;
        this.weather = 'clear'; // clear, rain, dust, night
        this.lightningTimer = 0;
        this.isFlashing = false;
    }

    reset() {
        this.segments = [];
        this.trackLength = 0;
    }

    // -------------------------------------------------------------
    // TRACK GENERATION
    // -------------------------------------------------------------
    buildTrack(levelConfig) {
        this.reset();
        this.theme = levelConfig.theme || 'coastal';
        this.weather = levelConfig.weather || 'clear';

        const sections = levelConfig.sections || [
            { length: 50, curve: 0, hill: 0 },
            { length: 80, curve: 2, hill: 20 },
            { length: 60, curve: -3, hill: -20 },
            { length: 90, curve: 0, hill: 40 },
            { length: 70, curve: 4, hill: 0 },
            { length: 50, curve: 0, hill: 0 }
        ];

        let totalSegments = 0;
        sections.forEach(sec => totalSegments += sec.length);

        let currentY = 0;
        sections.forEach((section, sIdx) => {
            const len = section.length;
            const curve = section.curve || 0;
            const targetHill = section.hill || 0;
            const props = section.props || 'standard';

            for (let i = 0; i < len; i++) {
                const percent = i / len;
                // Smooth ease in/out for curves and hills
                const easeCurve = curve * Math.sin(percent * Math.PI);
                const yDelta = targetHill * Math.sin(percent * Math.PI) * 4;
                currentY += yDelta;

                const segIdx = this.segments.length;
                const z = segIdx * ROAD_CONSTANTS.SEGMENT_LENGTH;

                const segment = {
                    index: segIdx,
                    p1: { world: { x: 0, y: currentY - yDelta, z: z }, camera: {}, screen: {} },
                    p2: { world: { x: 0, y: currentY, z: z + ROAD_CONSTANTS.SEGMENT_LENGTH }, camera: {}, screen: {} },
                    curve: easeCurve,
                    color: this.getSegmentColors(segIdx),
                    sprites: [],
                    cars: [],
                    coins: [],
                    nitroPad: null,
                    hazard: null,
                    clip: 0
                };

                // Add roadside scenery
                this.addRoadsideScenery(segment, props, percent, sIdx);

                // Add collectible coins
                if (Math.random() < 0.12 && segIdx > 30 && segIdx < totalSegments - 40) {
                    const laneOffsets = [-0.6, -0.2, 0.2, 0.6];
                    const chosenLane = laneOffsets[Math.floor(Math.random() * laneOffsets.length)];
                    segment.coins.push({
                        offset: chosenLane,
                        collected: false,
                        yOffset: 40
                    });
                }

                // Add Nitro boost pads
                if (Math.random() < 0.035 && segIdx > 40 && segIdx < totalSegments - 30) {
                    const laneOffsets = [-0.5, 0, 0.5];
                    segment.nitroPad = {
                        offset: laneOffsets[Math.floor(Math.random() * laneOffsets.length)],
                        active: true
                    };
                }

                // Add hazards (oil slicks, road barriers, rocks)
                if (levelConfig.hasHazards && Math.random() < 0.04 && segIdx > 50 && segIdx < totalSegments - 30) {
                    segment.hazard = {
                        type: this.theme === 'storm' ? 'ice' : (this.theme === 'canyon' ? 'rock' : 'oil'),
                        offset: (Math.random() * 1.4 - 0.7),
                        width: 0.35,
                        hit: false
                    };
                }

                this.segments.push(segment);
            }
        });

        // Add Finish Line Toll Gate at the end
        if (this.segments.length > 50) {
            const finishSeg = this.segments[this.segments.length - 25];
            finishSeg.sprites.push({
                type: 'finish_arch',
                offset: 0,
                scale: 1.8
            });
        }

        this.trackLength = this.segments.length * ROAD_CONSTANTS.SEGMENT_LENGTH;
    }

    getSegmentColors(idx) {
        const isRumble = Math.floor(idx / ROAD_CONSTANTS.RUMBLE_LENGTH) % 2 === 0;

        switch (this.theme) {
            case 'neon':
                return {
                    grass: isRumble ? '#070817' : '#04050d',
                    rumble: isRumble ? '#ff007f' : '#00f3ff',
                    road: isRumble ? '#0f1124' : '#141731',
                    lane: '#00f3ff'
                };
            case 'canyon':
                return {
                    grass: isRumble ? '#7b3017' : '#8d371b',
                    rumble: isRumble ? '#f7d08a' : '#d1491e',
                    road: isRumble ? '#2b221f' : '#221a17',
                    lane: '#e8c582'
                };
            case 'storm':
                return {
                    grass: isRumble ? '#182428' : '#141c20',
                    rumble: isRumble ? '#00e1d9' : '#334850',
                    road: isRumble ? '#11171a' : '#0d1214',
                    lane: '#99ffff'
                };
            case 'chase':
                return {
                    grass: isRumble ? '#171723' : '#12121c',
                    rumble: isRumble ? '#ff2a2a' : '#ffffff',
                    road: isRumble ? '#1f202b' : '#181922',
                    lane: '#ffd000'
                };
            case 'coastal':
            default:
                return {
                    grass: isRumble ? '#157347' : '#10613a',
                    rumble: isRumble ? '#ff3838' : '#ffffff',
                    road: isRumble ? '#3a3f47' : '#33373e',
                    lane: '#f8f9fa'
                };
        }
    }

    addRoadsideScenery(segment, style, percent, sIdx) {
        if (segment.index % 4 !== 0) return;

        const leftSide = -1.6 - Math.random() * 0.9;
        const rightSide = 1.6 + Math.random() * 0.9;

        switch (this.theme) {
            case 'neon':
                if (Math.random() < 0.6) {
                    segment.sprites.push({
                        type: Math.random() < 0.5 ? 'neon_billboard' : 'cyber_lamp',
                        offset: Math.random() < 0.5 ? leftSide : rightSide,
                        scale: 1.2
                    });
                }
                break;
            case 'canyon':
                if (Math.random() < 0.5) {
                    segment.sprites.push({
                        type: Math.random() < 0.4 ? 'canyon_rock' : 'cactus',
                        offset: Math.random() < 0.5 ? leftSide : rightSide,
                        scale: 1.1
                    });
                }
                break;
            case 'storm':
                if (Math.random() < 0.7) {
                    segment.sprites.push({
                        type: Math.random() < 0.3 ? 'storm_sign' : 'guard_lamp',
                        offset: Math.random() < 0.5 ? leftSide : rightSide,
                        scale: 1.0
                    });
                }
                break;
            case 'chase':
                if (Math.random() < 0.6) {
                    segment.sprites.push({
                        type: Math.random() < 0.4 ? 'city_barrier' : 'highway_sign',
                        offset: Math.random() < 0.5 ? leftSide : rightSide,
                        scale: 1.3
                    });
                }
                break;
            case 'coastal':
            default:
                if (Math.random() < 0.65) {
                    segment.sprites.push({
                        type: Math.random() < 0.7 ? 'palm_tree' : 'coastal_billboard',
                        offset: Math.random() < 0.5 ? leftSide : rightSide,
                        scale: 1.3
                    });
                }
                break;
        }
    }

    findSegment(z) {
        if (this.segments.length === 0) return null;
        const idx = Math.floor(z / ROAD_CONSTANTS.SEGMENT_LENGTH) % this.segments.length;
        return this.segments[idx >= 0 ? idx : idx + this.segments.length];
    }

    project(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
        p.camera.x = (p.world.x || 0) - cameraX;
        p.camera.y = (p.world.y || 0) - cameraY;
        p.camera.z = (p.world.z || 0) - cameraZ;
        p.screen.scale = cameraDepth / p.camera.z;
        p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
        p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
        p.screen.w = Math.round(p.screen.scale * roadWidth * width / 2);
    }

    // -------------------------------------------------------------
    // RENDER BACKGROUND PARALLAX SKY & HORIZON
    // -------------------------------------------------------------
    renderBackground(ctx, width, height, playerCurve, speedRatio) {
        ctx.save();

        this.skyOffset += playerCurve * speedRatio * 0.0004;
        this.hillOffset += playerCurve * speedRatio * 0.0008;

        // Lightning in storm theme
        if (this.theme === 'storm') {
            this.lightningTimer += Math.random() * 0.05;
            if (Math.random() < 0.006) {
                this.isFlashing = true;
                setTimeout(() => { this.isFlashing = false; }, 80);
            }
        }

        // 1. Sky Gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.55);
        if (this.isFlashing) {
            skyGrad.addColorStop(0, '#e6ffff');
            skyGrad.addColorStop(1, '#a6f0ff');
        } else {
            switch (this.theme) {
                case 'neon':
                    skyGrad.addColorStop(0, '#0a0218');
                    skyGrad.addColorStop(0.6, '#180733');
                    skyGrad.addColorStop(1, '#ff0077');
                    break;
                case 'canyon':
                    skyGrad.addColorStop(0, '#26131f');
                    skyGrad.addColorStop(0.5, '#b84224');
                    skyGrad.addColorStop(1, '#f99f48');
                    break;
                case 'storm':
                    skyGrad.addColorStop(0, '#070a0f');
                    skyGrad.addColorStop(0.7, '#121a24');
                    skyGrad.addColorStop(1, '#1b2a38');
                    break;
                case 'chase':
                    skyGrad.addColorStop(0, '#120f26');
                    skyGrad.addColorStop(0.6, '#371842');
                    skyGrad.addColorStop(1, '#ff3b30');
                    break;
                case 'coastal':
                default:
                    skyGrad.addColorStop(0, '#0d5c9c');
                    skyGrad.addColorStop(0.6, '#38a3d1');
                    skyGrad.addColorStop(1, '#ffe082');
                    break;
            }
        }
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height * 0.55);

        // 2. Distant Sun / Cyber Moon
        if (this.theme === 'coastal') {
            // Golden Sun
            const sunGrad = ctx.createRadialGradient(width * 0.65, height * 0.32, 5, width * 0.65, height * 0.32, 65);
            sunGrad.addColorStop(0, '#ffffff');
            sunGrad.addColorStop(0.3, '#fff4b8');
            sunGrad.addColorStop(1, 'rgba(255, 230, 100, 0)');
            ctx.fillStyle = sunGrad;
            ctx.beginPath();
            ctx.arc(width * 0.65, height * 0.32, 65, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.theme === 'neon') {
            // Giant Neon Wireframe Sun
            const moonGrad = ctx.createRadialGradient(width * 0.5, height * 0.3, 10, width * 0.5, height * 0.3, 75);
            moonGrad.addColorStop(0, '#ff0077');
            moonGrad.addColorStop(0.8, '#7928ca');
            moonGrad.addColorStop(1, 'rgba(121, 40, 202, 0)');
            ctx.fillStyle = moonGrad;
            ctx.beginPath();
            ctx.arc(width * 0.5, height * 0.3, 75, 0, Math.PI * 2);
            ctx.fill();

            // Neon horizontal scan lines over sun
            ctx.fillStyle = '#0a0218';
            for (let y = height * 0.22; y < height * 0.38; y += 7) {
                ctx.fillRect(width * 0.35, y, width * 0.3, 3);
            }
        }

        // 3. Parallax Skyline / Mountains
        this.renderHorizonSilhouette(ctx, width, height);

        ctx.restore();
    }

    renderHorizonSilhouette(ctx, width, height) {
        const horizonY = height * 0.5;
        ctx.save();

        if (this.theme === 'neon' || this.theme === 'chase') {
            // Cyberpunk City Skyline
            ctx.fillStyle = this.theme === 'neon' ? '#0d0722' : '#14121e';
            const numBuildings = 36;
            const bWidth = width / 24;

            for (let i = -2; i < numBuildings + 4; i++) {
                const bHeight = 40 + ((Math.sin(i * 1.7) * 4321) % 80);
                const x = (i * bWidth * 0.7 - (this.hillOffset * 400) % (bWidth * numBuildings));
                ctx.fillRect(x, horizonY - bHeight, bWidth * 0.9, bHeight + 10);

                // Lit windows
                if (i % 2 === 0) {
                    ctx.fillStyle = i % 3 === 0 ? 'rgba(0, 243, 255, 0.6)' : 'rgba(255, 0, 119, 0.6)';
                    for (let w = 0; w < 4; w++) {
                        ctx.fillRect(x + 4 + (w * 5), horizonY - bHeight + 8, 3, 4);
                    }
                    ctx.fillStyle = this.theme === 'neon' ? '#0d0722' : '#14121e';
                }
            }
        } else if (this.theme === 'canyon') {
            // Majestic Canyon Mesas
            ctx.fillStyle = '#541c10';
            ctx.beginPath();
            ctx.moveTo(0, horizonY);
            for (let x = 0; x <= width; x += 40) {
                const mesaY = horizonY - 45 - Math.sin((x * 0.005) + this.hillOffset * 2) * 35;
                ctx.lineTo(x, mesaY);
            }
            ctx.lineTo(width, horizonY);
            ctx.closePath();
            ctx.fill();
        } else {
            // Coastal Hills & Mountain Ridges
            ctx.fillStyle = '#1c4966';
            ctx.beginPath();
            ctx.moveTo(0, horizonY);
            for (let x = 0; x <= width; x += 50) {
                const mountainY = horizonY - 35 - Math.sin((x * 0.004) + this.hillOffset) * 25;
                ctx.lineTo(x, mountainY);
            }
            ctx.lineTo(width, horizonY);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    // -------------------------------------------------------------
    // MAIN ROAD POLYGON RENDERING
    // -------------------------------------------------------------
    renderRoad(ctx, width, height, player, cameraDepth) {
        const startSegment = this.findSegment(player.position);
        if (!startSegment) return;

        const baseSegmentIndex = startSegment.index;
        let maxy = height;
        let dx = -(startSegment.curve * (player.position % ROAD_CONSTANTS.SEGMENT_LENGTH / ROAD_CONSTANTS.SEGMENT_LENGTH));
        let x = 0;

        const cameraX = player.x * ROAD_CONSTANTS.ROAD_WIDTH;
        const cameraY = ROAD_CONSTANTS.CAMERA_HEIGHT + player.y;
        const cameraZ = player.position - (ROAD_CONSTANTS.CAMERA_DEPTH * ROAD_CONSTANTS.SEGMENT_LENGTH);

        // 1. Draw Road Segments (Back to front clipping)
        for (let n = 0; n < ROAD_CONSTANTS.DRAW_DISTANCE; n++) {
            const segment = this.segments[(baseSegmentIndex + n) % this.segments.length];
            const looped = segment.index < baseSegmentIndex;

            this.project(
                segment.p1,
                cameraX - x,
                cameraY,
                cameraZ - (looped ? this.trackLength : 0),
                cameraDepth,
                width,
                height,
                ROAD_CONSTANTS.ROAD_WIDTH
            );

            this.project(
                segment.p2,
                cameraX - x - dx,
                cameraY,
                cameraZ - (looped ? this.trackLength : 0),
                cameraDepth,
                width,
                height,
                ROAD_CONSTANTS.ROAD_WIDTH
            );

            x += dx;
            dx += segment.curve;

            segment.clip = maxy;

            if (segment.p1.camera.z <= cameraDepth || segment.p2.screen.y >= segment.p1.screen.y || segment.p2.screen.y >= maxy) {
                continue;
            }

            // Draw segment polygons
            this.renderSegmentPolygon(ctx, width, segment.p1.screen, segment.p2.screen, segment.color);
            maxy = segment.p1.screen.y;
        }

        // 2. Draw Road Props, Coins, Pads, and Sprites (Front to back rendering)
        for (let n = ROAD_CONSTANTS.DRAW_DISTANCE - 1; n > 0; n--) {
            const segment = this.segments[(baseSegmentIndex + n) % this.segments.length];

            // Render Nitro Pad
            if (segment.nitroPad && segment.nitroPad.active && segment.p1.screen.y < segment.clip) {
                this.renderNitroPad(ctx, width, segment.p1.screen, segment.nitroPad.offset);
            }

            // Render Hazards
            if (segment.hazard && segment.p1.screen.y < segment.clip) {
                this.renderHazard(ctx, width, segment.p1.screen, segment.hazard);
            }

            // Render Coins
            for (let c = 0; c < segment.coins.length; c++) {
                const coin = segment.coins[c];
                if (!coin.collected && segment.p1.screen.y < segment.clip) {
                    this.renderCoin(ctx, width, segment.p1.screen, coin.offset, player.animationFrame || 0);
                }
            }

            // Render Roadside Sprites
            for (let i = 0; i < segment.sprites.length; i++) {
                const sprite = segment.sprites[i];
                if (segment.p1.screen.y < segment.clip) {
                    this.renderSprite(ctx, width, height, segment.p1.screen, sprite);
                }
            }

            // Render Traffic Cars in this segment
            for (let i = 0; i < segment.cars.length; i++) {
                const car = segment.cars[i];
                if (segment.p1.screen.y < segment.clip) {
                    car.render(ctx, width, height, segment.p1.screen);
                }
            }
        }
    }

    renderSegmentPolygon(ctx, width, p1, p2, color) {
        const r1 = p1.w;
        const r2 = p2.w;
        const l1 = p1.w / ROAD_CONSTANTS.LANES;
        const l2 = p2.w / ROAD_CONSTANTS.LANES;

        // 1. Grass / Verge
        ctx.fillStyle = color.grass;
        ctx.fillRect(0, p2.y, width, p1.y - p2.y);

        // 2. Rumble Strips
        ctx.fillStyle = color.rumble;
        this.drawPolygon(ctx,
            p1.x - r1 * 1.08, p1.y,
            p1.x - r1, p1.y,
            p2.x - r2, p2.y,
            p2.x - r2 * 1.08, p2.y
        );
        this.drawPolygon(ctx,
            p1.x + r1, p1.y,
            p1.x + r1 * 1.08, p1.y,
            p2.x + r2 * 1.08, p2.y,
            p2.x + r2, p2.y
        );

        // 3. Road Surface
        ctx.fillStyle = color.road;
        this.drawPolygon(ctx,
            p1.x - r1, p1.y,
            p1.x + r1, p1.y,
            p2.x + r2, p2.y,
            p2.x - r2, p2.y
        );

        // 4. Dashed Lane Markings
        if (color.lane) {
            ctx.fillStyle = color.lane;
            const laneLineWidth1 = Math.max(1, p1.w * 0.014);
            const laneLineWidth2 = Math.max(1, p2.w * 0.014);

            for (let lane = 1; lane < ROAD_CONSTANTS.LANES; lane++) {
                const laneX1 = p1.x - r1 + (l1 * 2 * lane);
                const laneX2 = p2.x - r2 + (l2 * 2 * lane);

                this.drawPolygon(ctx,
                    laneX1 - laneLineWidth1, p1.y,
                    laneX1 + laneLineWidth1, p1.y,
                    laneX2 + laneLineWidth2, p2.y,
                    laneX2 - laneLineWidth2, p2.y
                );
            }
        }
    }

    drawPolygon(ctx, x1, y1, x2, y2, x3, y3, x4, y4) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.fill();
    }

    // -------------------------------------------------------------
    // SPRITE & OBJECT RENDERING
    // -------------------------------------------------------------
    renderSprite(ctx, width, height, screen, sprite) {
        const spriteX = screen.x + (screen.scale * sprite.offset * ROAD_CONSTANTS.ROAD_WIDTH * width / 2);
        const spriteY = screen.y;
        const spriteW = screen.scale * 450 * (sprite.scale || 1) * width / 2;
        const spriteH = spriteW * 1.6;

        if (spriteW < 3) return;

        ctx.save();
        ctx.translate(spriteX, spriteY);

        switch (sprite.type) {
            case 'palm_tree':
                this.drawPalmTree(ctx, spriteW, spriteH);
                break;
            case 'cyber_lamp':
                this.drawCyberLamp(ctx, spriteW, spriteH);
                break;
            case 'neon_billboard':
                this.drawNeonBillboard(ctx, spriteW, spriteH);
                break;
            case 'canyon_rock':
                this.drawCanyonRock(ctx, spriteW, spriteH);
                break;
            case 'cactus':
                this.drawCactus(ctx, spriteW, spriteH);
                break;
            case 'guard_lamp':
                this.drawGuardLamp(ctx, spriteW, spriteH);
                break;
            case 'finish_arch':
                this.drawFinishArch(ctx, spriteW * 2.8, spriteH * 1.2);
                break;
            default:
                this.drawPalmTree(ctx, spriteW, spriteH);
                break;
        }

        ctx.restore();
    }

    drawPalmTree(ctx, w, h) {
        // Curved trunk
        ctx.fillStyle = '#6b4423';
        ctx.beginPath();
        ctx.moveTo(-w * 0.08, 0);
        ctx.quadraticCurveTo(-w * 0.18, -h * 0.5, -w * 0.04, -h * 0.9);
        ctx.lineTo(w * 0.04, -h * 0.9);
        ctx.quadraticCurveTo(-w * 0.08, -h * 0.5, w * 0.08, 0);
        ctx.fill();

        // Lush green fronds
        ctx.fillStyle = '#1b7a38';
        const angles = [-0.9, -0.5, -0.1, 0.3, 0.7, 1.1];
        angles.forEach(ang => {
            ctx.save();
            ctx.translate(0, -h * 0.9);
            ctx.rotate(ang);
            ctx.beginPath();
            ctx.ellipse(w * 0.35, 0, w * 0.38, w * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    drawCyberLamp(ctx, w, h) {
        // Metallic pole
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(-w * 0.04, -h * 0.9, w * 0.08, h * 0.9);

        // Glowing neon head
        ctx.fillStyle = '#ff007f';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 15;
        ctx.fillRect(-w * 0.16, -h * 0.95, w * 0.32, h * 0.06);
        ctx.shadowBlur = 0;
    }

    drawNeonBillboard(ctx, w, h) {
        const boardW = w * 1.4;
        const boardH = h * 0.55;

        // Support pole
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(-w * 0.06, -h * 0.9, w * 0.12, h * 0.9);

        // Billboard frame
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = Math.max(1, w * 0.03);
        ctx.fillRect(-boardW / 2, -h * 0.95, boardW, boardH);
        ctx.strokeRect(-boardW / 2, -h * 0.95, boardW, boardH);

        // Glowing text
        ctx.fillStyle = '#00f3ff';
        ctx.font = `bold ${Math.max(8, boardH * 0.35)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TURBO', 0, -h * 0.95 + boardH * 0.5);
    }

    drawCanyonRock(ctx, w, h) {
        ctx.fillStyle = '#9e4226';
        ctx.beginPath();
        ctx.moveTo(-w * 0.45, 0);
        ctx.lineTo(-w * 0.35, -h * 0.5);
        ctx.lineTo(0, -h * 0.7);
        ctx.lineTo(w * 0.4, -h * 0.4);
        ctx.lineTo(w * 0.5, 0);
        ctx.closePath();
        ctx.fill();
    }

    drawCactus(ctx, w, h) {
        ctx.fillStyle = '#2e7d32';
        // Main trunk
        ctx.fillRect(-w * 0.08, -h * 0.75, w * 0.16, h * 0.75);
        // Left arm
        ctx.fillRect(-w * 0.25, -h * 0.55, w * 0.17, w * 0.1);
        ctx.fillRect(-w * 0.25, -h * 0.7, w * 0.1, h * 0.2);
        // Right arm
        ctx.fillRect(w * 0.08, -h * 0.45, w * 0.18, w * 0.1);
        ctx.fillRect(w * 0.16, -h * 0.65, w * 0.1, h * 0.25);
    }

    drawGuardLamp(ctx, w, h) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(-w * 0.04, -h * 0.85, w * 0.08, h * 0.85);

        // Amber flashing light
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, -h * 0.88, w * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    drawFinishArch(ctx, w, h) {
        // High-tech finish gantry spanning across the road
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.55, -h, w * 0.1, h);
        ctx.fillRect(w * 0.45, -h, w * 0.1, h);
        ctx.fillRect(-w * 0.55, -h, w * 1.1, h * 0.25);

        // Checkered banner
        const blockW = (w * 1.1) / 12;
        const blockH = (h * 0.2) / 2;
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 12; col++) {
                ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#000000';
                ctx.fillRect(-w * 0.55 + col * blockW, -h + h * 0.02 + row * blockH, blockW, blockH);
            }
        }

        // Glowing "FINISH"
        ctx.fillStyle = '#00f3ff';
        ctx.font = `900 ${Math.max(12, h * 0.16)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 12;
        ctx.fillText('CHECKPOINT / FINISH', 0, -h + h * 0.12);
        ctx.shadowBlur = 0;
    }

    renderCoin(ctx, width, screen, offset, animFrame) {
        const x = screen.x + (screen.scale * offset * ROAD_CONSTANTS.ROAD_WIDTH * width / 2);
        const y = screen.y - (screen.scale * 120 * width / 2);
        const r = Math.max(3, screen.scale * 65 * width / 2);

        // 3D rotation animation
        const scaleX = Math.cos(animFrame * 0.08);

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scaleX, 1);

        // Golden rim
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner coin face
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
        ctx.fill();

        // Star or '$' sign
        if (r > 6 && Math.abs(scaleX) > 0.4) {
            ctx.fillStyle = '#92400e';
            ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 1);
        }

        ctx.restore();
    }

    renderNitroPad(ctx, width, screen, offset) {
        const x = screen.x + (screen.scale * offset * ROAD_CONSTANTS.ROAD_WIDTH * width / 2);
        const y = screen.y;
        const padW = screen.scale * 280 * width / 2;
        const padH = padW * 0.7;

        if (padW < 4) return;

        ctx.save();
        ctx.translate(x, y);

        // Glowing cyan/neon chevron boost strip on asphalt
        ctx.fillStyle = 'rgba(0, 243, 255, 0.35)';
        ctx.fillRect(-padW / 2, -padH, padW, padH);

        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10;
        // Draw 3 forward chevrons
        for (let i = 0; i < 3; i++) {
            const cy = -padH * (0.25 + i * 0.3);
            ctx.beginPath();
            ctx.moveTo(-padW * 0.35, cy + padH * 0.15);
            ctx.lineTo(0, cy);
            ctx.lineTo(padW * 0.35, cy + padH * 0.15);
            ctx.lineTo(0, cy - padH * 0.08);
            ctx.closePath();
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    renderHazard(ctx, width, screen, hazard) {
        const x = screen.x + (screen.scale * hazard.offset * ROAD_CONSTANTS.ROAD_WIDTH * width / 2);
        const y = screen.y;
        const w = screen.scale * 300 * width / 2;
        const h = w * 0.45;

        if (w < 4) return;

        ctx.save();
        ctx.translate(x, y);

        if (hazard.type === 'ice') {
            // Slick bluish-white ice patch
            ctx.fillStyle = 'rgba(180, 240, 255, 0.65)';
            ctx.beginPath();
            ctx.ellipse(0, -h * 0.5, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (hazard.type === 'rock') {
            // Fallen jagged boulder
            ctx.fillStyle = '#57534e';
            ctx.beginPath();
            ctx.moveTo(-w * 0.3, 0);
            ctx.lineTo(-w * 0.2, -h * 0.8);
            ctx.lineTo(w * 0.25, -h);
            ctx.lineTo(w * 0.35, 0);
            ctx.closePath();
            ctx.fill();
        } else {
            // Dark glossy oil slick
            ctx.fillStyle = 'rgba(20, 20, 25, 0.85)';
            ctx.beginPath();
            ctx.ellipse(0, -h * 0.5, w * 0.5, h * 0.45, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Iridescent rainbow sheen on oil
            ctx.strokeStyle = 'rgba(255, 0, 200, 0.4)';
            ctx.lineWidth = Math.max(1, w * 0.04);
            ctx.stroke();
        }

        ctx.restore();
    }
}

window.RoadEngine = RoadEngine;
window.ROAD_CONSTANTS = ROAD_CONSTANTS;
