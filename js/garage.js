/**
 * ROAD DASH: OVERDRIVE - Garage & Vehicle Customization System
 * Manages car unlocks, performance upgrades, paint/underglow styling, and currency.
 */

const GARAGE_CARS = [
    {
        id: 'skyline',
        name: 'Nissan Skyline GT-R R34',
        modelBadge: 'V-Spec II',
        class: 'JDM Legend',
        price: 0,
        unlocked: true,
        specs: {
            engine: '2.6L Twin-Turbo RB26DETT',
            power: '450 HP',
            zeroToSixty: '3.8s',
            topSpeedKmh: '280 km/h',
            drivetrain: 'ATTESA E-TS AWD'
        },
        baseStats: {
            maxSpeed: 12200,
            accel: 5200,
            handling: 3.8,
            health: 110,
            nitroDrain: 26
        },
        defaultColor: '#1d4ed8', // Bayside Blue
        defaultUnderglow: '#00f3ff',
        description: 'The legendary "Godzilla". Famous for its quad round tail lights, all-wheel-drive grip, and bulletproof twin-turbo RB26.'
    },
    {
        id: 'mustang',
        name: 'Ford Mustang Shelby GT500',
        modelBadge: 'Supercharged V8',
        class: 'American Muscle',
        price: 1500,
        unlocked: false,
        specs: {
            engine: '5.2L Supercharged Predator V8',
            power: '760 HP',
            zeroToSixty: '3.3s',
            topSpeedKmh: '290 km/h',
            drivetrain: 'RWD Muscle'
        },
        baseStats: {
            maxSpeed: 12800,
            accel: 5600,
            handling: 3.5,
            health: 135,
            nitroDrain: 28
        },
        defaultColor: '#f8fafc', // Oxford White with racing livery
        defaultUnderglow: '#ef4444',
        description: 'Brutal American supercharged muscle. Supercharged V8 power, menacing vertical tri-bar tail lights, and explosive straight-line speed.'
    },
    {
        id: 'gt3rs',
        name: 'Porsche 911 GT3 RS',
        modelBadge: '992 Track Weapon',
        class: 'German Precision',
        price: 3200,
        unlocked: false,
        specs: {
            engine: '4.0L Naturally Aspirated Flat-6',
            power: '518 HP @ 9000 RPM',
            zeroToSixty: '3.0s',
            topSpeedKmh: '305 km/h',
            drivetrain: 'Rear-Engine RWD'
        },
        baseStats: {
            maxSpeed: 13600,
            accel: 6200,
            handling: 4.6,
            health: 100,
            nitroDrain: 24
        },
        defaultColor: '#ef4444', // Guards Red
        defaultUnderglow: '#00f3ff',
        description: 'The pinnacle of track engineering. Iconic swan-neck carbon wing, full-width red LED laser lightbar, and razor-sharp highway handling.'
    },
    {
        id: 'aventador',
        name: 'Lamborghini Aventador SVJ',
        modelBadge: 'Super Veloce Jota',
        class: 'Italian V12 Hypercar',
        price: 6000,
        unlocked: false,
        specs: {
            engine: '6.5L Naturally Aspirated V12',
            power: '770 HP @ 8500 RPM',
            zeroToSixty: '2.8s',
            topSpeedKmh: '350 km/h',
            drivetrain: 'AWD Hyper'
        },
        baseStats: {
            maxSpeed: 14800,
            accel: 6800,
            handling: 4.8,
            health: 115,
            nitroDrain: 20
        },
        defaultColor: '#84cc16', // Verde Ithaca / Acid Lime
        defaultUnderglow: '#a855f7',
        description: 'Stealth-fighter inspired V12 howling supercar. Aggressive Y-shaped LED tail lamps, active ALA 2.0 aerodynamics, and high-mounted exhaust cannons.'
    },
    {
        id: 'chiron',
        name: 'Bugatti Chiron Super Sport',
        modelBadge: '300+ MPH Edition',
        class: 'Ultimate Hypercar',
        price: 10000,
        unlocked: false,
        specs: {
            engine: '8.0L Quad-Turbo W16',
            power: '1,577 HP',
            zeroToSixty: '2.3s',
            topSpeedKmh: '440 km/h',
            drivetrain: 'Quad-Turbo AWD'
        },
        baseStats: {
            maxSpeed: 16500,
            accel: 7600,
            handling: 5.0,
            health: 140,
            nitroDrain: 16
        },
        defaultColor: '#090d16', // Jet Black & French Racing Blue
        defaultUnderglow: '#00f3ff',
        description: 'The undisputed speed titan. Monolithic 1.6m horizontal rear laser light strip, stacked quad exhausts, and limitless highway overdrive velocity.'
    }
];

const PAINT_PALETTE = [
    { name: 'Bayside Blue', hex: '#1d4ed8' },
    { name: 'Guards Red', hex: '#ef4444' },
    { name: 'Oxford White', hex: '#f8fafc' },
    { name: 'Verde Acid Lime', hex: '#84cc16' },
    { name: 'Jet Onyx Black', hex: '#090d16' },
    { name: 'Giallo Orion Yellow', hex: '#eab308' },
    { name: 'Miami Cyan', hex: '#06b6d4' },
    { name: 'Ultra Violet', hex: '#8b5cf6' }
];

const UNDERGLOW_PALETTE = [
    { name: 'Electric Cyan', hex: '#00f3ff' },
    { name: 'Neon Pink', hex: '#ff007f' },
    { name: 'Solar Amber', hex: '#f59e0b' },
    { name: 'Acid Green', hex: '#10b981' },
    { name: 'Ultra Purple', hex: '#a855f7' },
    { name: 'Ghost Ice', hex: '#e0f2fe' }
];

class GarageManager {
    constructor() {
        this.cars = GARAGE_CARS;
        this.paints = PAINT_PALETTE;
        this.underglows = UNDERGLOW_PALETTE;
        this.data = this.loadData();
    }

    loadData() {
        try {
            const saved = localStorage.getItem('roaddash_garage');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Migrate legacy fictional car IDs if found
                const idMap = {
                    striker: 'skyline',
                    shinobi: 'mustang',
                    goliath: 'gt3rs',
                    valkyrie: 'aventador',
                    phantom: 'chiron'
                };
                if (idMap[parsed.selectedCarId]) {
                    parsed.selectedCarId = idMap[parsed.selectedCarId];
                }
                if (Array.isArray(parsed.unlockedCars)) {
                    parsed.unlockedCars = parsed.unlockedCars.map(c => idMap[c] || c);
                }
                if (!parsed.unlockedCars.includes('skyline')) {
                    parsed.unlockedCars.push('skyline');
                }
                if (!parsed.carCustomization) parsed.carCustomization = {};
                if (!parsed.upgrades) parsed.upgrades = {};

                GARAGE_CARS.forEach(car => {
                    if (!parsed.carCustomization[car.id]) {
                        parsed.carCustomization[car.id] = { color: car.defaultColor, underglow: car.defaultUnderglow };
                    }
                    if (!parsed.upgrades[car.id]) {
                        parsed.upgrades[car.id] = { speed: 0, accel: 0, handling: 0, health: 0 };
                    }
                });

                return parsed;
            }
        } catch (e) {}

        return {
            cash: 800, // Generous starter bonus cash
            selectedCarId: 'skyline',
            unlockedCars: ['skyline'],
            carCustomization: {
                skyline: { color: '#1d4ed8', underglow: '#00f3ff' },
                mustang: { color: '#f8fafc', underglow: '#ef4444' },
                gt3rs: { color: '#ef4444', underglow: '#00f3ff' },
                aventador: { color: '#84cc16', underglow: '#a855f7' },
                chiron: { color: '#090d16', underglow: '#00f3ff' }
            },
            upgrades: {
                skyline: { speed: 0, accel: 0, handling: 0, health: 0 },
                mustang: { speed: 0, accel: 0, handling: 0, health: 0 },
                gt3rs: { speed: 0, accel: 0, handling: 0, health: 0 },
                aventador: { speed: 0, accel: 0, handling: 0, health: 0 },
                chiron: { speed: 0, accel: 0, handling: 0, health: 0 }
            }
        };
    }

    saveData() {
        try {
            localStorage.setItem('roaddash_garage', JSON.stringify(this.data));
        } catch (e) {}
    }

    getCar(id) {
        return this.cars.find(c => c.id === id) || this.cars[0];
    }

    getSelectedCar() {
        return this.getCar(this.data.selectedCarId);
    }

    isCarUnlocked(id) {
        return this.data.unlockedCars.includes(id);
    }

    buyCar(id) {
        const car = this.getCar(id);
        if (!car || this.isCarUnlocked(id)) return false;
        if (this.data.cash < car.price) return false;

        this.data.cash -= car.price;
        this.data.unlockedCars.push(id);
        this.data.selectedCarId = id;
        this.saveData();
        return true;
    }

    selectCar(id) {
        if (this.isCarUnlocked(id)) {
            this.data.selectedCarId = id;
            this.saveData();
            return true;
        }
        return false;
    }

    getUpgradeCost(level) {
        return (level + 1) * 350;
    }

    upgradeStat(carId, statKey) {
        const currentLvl = this.data.upgrades[carId][statKey] || 0;
        if (currentLvl >= 5) return false; // max level 5

        const cost = this.getUpgradeCost(currentLvl);
        if (this.data.cash < cost) return false;

        this.data.cash -= cost;
        this.data.upgrades[carId][statKey] = currentLvl + 1;
        this.saveData();
        return true;
    }

    setCarColor(carId, hex) {
        if (!this.data.carCustomization[carId]) this.data.carCustomization[carId] = {};
        this.data.carCustomization[carId].color = hex;
        this.saveData();
    }

    setCarUnderglow(carId, hex) {
        if (!this.data.carCustomization[carId]) this.data.carCustomization[carId] = {};
        this.data.carCustomization[carId].underglow = hex;
        this.saveData();
    }

    addCash(amount) {
        this.data.cash += amount;
        this.saveData();
    }

    getComputedStats(carId) {
        const car = this.getCar(carId);
        const up = this.data.upgrades[carId] || { speed: 0, accel: 0, handling: 0, health: 0 };
        const cust = this.data.carCustomization[carId] || {};

        return {
            id: car.id,
            name: car.name,
            color: cust.color || car.defaultColor,
            underglow: cust.underglow || car.defaultUnderglow,
            maxSpeed: car.baseStats.maxSpeed * (1 + up.speed * 0.06),
            accel: car.baseStats.accel * (1 + up.accel * 0.06),
            handling: car.baseStats.handling * (1 + up.handling * 0.06),
            health: car.baseStats.health + (up.health * 15),
            nitroDrain: car.baseStats.nitroDrain
        };
    }
}

window.GarageManager = GarageManager;
