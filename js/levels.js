/**
 * ROAD DASH: OVERDRIVE - Level Design & Campaign System
 * Handcrafted stages with distinct biomes, 3-star objectives, road geometry, and progression.
 */

const LEVELS_CONFIG = [
    {
        id: 1,
        name: "Stage 1: Pacific Coast Highway",
        subtitle: "Sunny Dunes & Coastal Ocean Breeze",
        theme: "coastal",
        weather: "clear",
        timeLimit: 65,
        trafficDensity: 18,
        hasHazards: false,
        cashReward: 250,
        description: "Get a feel for the wheel on the sun-drenched California coastal highway. Weave through leisure traffic and grab as much cash as you can!",
        objectives: [
            { id: "finish", text: "Reach the coastal finish line", check: (p, g) => g.finished },
            { id: "near_miss", text: "Score at least 6 Near Misses", check: (p, g) => p.totalNearMisses >= 6 },
            { id: "coins", text: "Collect 35 Gold Coins", check: (p, g) => p.coins >= 35 }
        ],
        sections: [
            { length: 40, curve: 0, hill: 0 },
            { length: 60, curve: 2, hill: 15 },
            { length: 50, curve: -2, hill: 0 },
            { length: 70, curve: 3, hill: -15 },
            { length: 60, curve: 0, hill: 25 },
            { length: 60, curve: -3, hill: 0 },
            { length: 50, curve: 0, hill: 0 }
        ]
    },
    {
        id: 2,
        name: "Stage 2: Neon Metropolis",
        subtitle: "Midnight Tokyo Cyber Expressway",
        theme: "neon",
        weather: "clear",
        timeLimit: 75,
        trafficDensity: 26,
        hasHazards: true,
        cashReward: 500,
        description: "Blaze through towering neon skyscrapers at midnight. Traffic is denser and cars change lanes fast. Watch out for oil slicks!",
        objectives: [
            { id: "finish", text: "Survive the Tokyo expressway", check: (p, g) => g.finished },
            { id: "speed", text: "Hit top speed of 220+ km/h", check: (p, g) => p.topSpeedReached >= 220 },
            { id: "combo", text: "Chain a 4x Near-Miss Combo", check: (p, g) => g.highestCombo >= 4 }
        ],
        sections: [
            { length: 50, curve: 0, hill: 0 },
            { length: 60, curve: 4, hill: 0 },
            { length: 60, curve: -4, hill: 0 },
            { length: 80, curve: 0, hill: 30 },
            { length: 70, curve: 3, hill: -20 },
            { length: 70, curve: -3, hill: 10 },
            { length: 60, curve: 0, hill: 0 }
        ]
    },
    {
        id: 3,
        name: "Stage 3: Canyon Outlaw Pass",
        subtitle: "Red Rock Ravines & Hairpin Corners",
        theme: "canyon",
        weather: "dust",
        timeLimit: 85,
        trafficDensity: 24,
        hasHazards: true,
        cashReward: 750,
        description: "Wind through narrow desert cliffs and rocky elevations. Falling boulders and heavy freight trucks make every bend a test of skill.",
        objectives: [
            { id: "finish", text: "Conquer the canyon pass", check: (p, g) => g.finished },
            { id: "health", text: "Finish with over 60% Health", check: (p, g) => p.health >= 60 },
            { id: "near_miss", text: "Perform 10 Near Misses", check: (p, g) => p.totalNearMisses >= 10 }
        ],
        sections: [
            { length: 45, curve: 0, hill: 0 },
            { length: 70, curve: 5, hill: 35 },
            { length: 65, curve: -5, hill: -35 },
            { length: 80, curve: 4, hill: 20 },
            { length: 70, curve: -4, hill: -20 },
            { length: 75, curve: 6, hill: 15 },
            { length: 55, curve: 0, hill: 0 }
        ]
    },
    {
        id: 4,
        name: "Stage 4: Thunder Mountain Summit",
        subtitle: "Torrential Alpine Storm & Ice Slicks",
        theme: "storm",
        weather: "rain",
        timeLimit: 95,
        trafficDensity: 28,
        hasHazards: true,
        cashReward: 1000,
        description: "Lightning illuminates the dark alpine heights as torrential rain slicks the road. Dodge ice patches and slipstream behind traffic to survive.",
        objectives: [
            { id: "finish", text: "Cross the stormy summit", check: (p, g) => g.finished },
            { id: "draft", text: "Slipstream draft for 6+ seconds", check: (p, g) => p.totalDraftTime >= 6.0 },
            { id: "coins", text: "Collect 50 Gold Coins", check: (p, g) => p.coins >= 50 }
        ],
        sections: [
            { length: 50, curve: 0, hill: 0 },
            { length: 80, curve: 3, hill: 40 },
            { length: 70, curve: -3, hill: 30 },
            { length: 80, curve: 5, hill: -45 },
            { length: 90, curve: -5, hill: 20 },
            { length: 70, curve: 4, hill: -25 },
            { length: 60, curve: 0, hill: 0 }
        ]
    },
    {
        id: 5,
        name: "Stage 5: Police Pursuit Grand Escape",
        subtitle: "The Heist Getaway - Code Red Pursuit",
        theme: "chase",
        weather: "clear",
        timeLimit: 110,
        trafficDensity: 32,
        hasHazards: true,
        cashReward: 2000,
        description: "The city has called in highway police interceptors to bring you down. Use Nitro and Overdrive to bash through pursuit cruisers and make the border!",
        objectives: [
            { id: "finish", text: "Escape the city lockdown safehouse", check: (p, g) => g.finished },
            { id: "speed", text: "Maintain top speed above 240 km/h", check: (p, g) => p.topSpeedReached >= 240 },
            { id: "collisions", text: "Finish with 3 or fewer collisions", check: (p, g) => p.collisions <= 3 }
        ],
        sections: [
            { length: 60, curve: 0, hill: 0 },
            { length: 80, curve: 4, hill: 20 },
            { length: 80, curve: -4, hill: -20 },
            { length: 100, curve: 3, hill: 30 },
            { length: 90, curve: -3, hill: -30 },
            { length: 90, curve: 5, hill: 15 },
            { length: 80, curve: -5, hill: -15 },
            { length: 60, curve: 0, hill: 0 }
        ]
    }
];

class LevelManager {
    constructor() {
        this.levels = LEVELS_CONFIG;
        this.currentLevelIndex = 0;
        this.progress = this.loadProgress();
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('roaddash_levels');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {}

        // Default initial state
        return {
            unlockedLevel: 1,
            levelStars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            highScores: {},
            totalStars: 0
        };
    }

    saveProgress() {
        try {
            let total = 0;
            Object.values(this.progress.levelStars).forEach(s => total += (s || 0));
            this.progress.totalStars = total;
            localStorage.setItem('roaddash_levels', JSON.stringify(this.progress));
        } catch (e) {}
    }

    getLevel(id) {
        return this.levels.find(l => l.id === id) || this.levels[0];
    }

    isLevelUnlocked(id) {
        return id <= this.progress.unlockedLevel;
    }

    recordCompletion(levelId, player, gameResult) {
        const level = this.getLevel(levelId);
        if (!level) return { starsWon: 0, newCash: 0 };

        let starsWon = 0;
        level.objectives.forEach(obj => {
            if (obj.check(player, gameResult)) {
                starsWon++;
            }
        });

        const prevStars = this.progress.levelStars[levelId] || 0;
        if (starsWon > prevStars) {
            this.progress.levelStars[levelId] = starsWon;
        }

        // Unlock next level if finished
        if (gameResult.finished && levelId >= this.progress.unlockedLevel && levelId < this.levels.length) {
            this.progress.unlockedLevel = levelId + 1;
        }

        // Record high score
        const prevScore = this.progress.highScores[levelId] || 0;
        if (player.score > prevScore) {
            this.progress.highScores[levelId] = player.score;
        }

        this.saveProgress();

        const cashAward = level.cashReward + (player.coins * 10) + (starsWon * 100);
        return { starsWon, cashAward };
    }
}

window.LevelManager = LevelManager;
window.LEVELS_CONFIG = LEVELS_CONFIG;
