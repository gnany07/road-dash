/**
 * ROAD DASH: OVERDRIVE - Garage & Vehicle Customization System
 * Manages car unlocks, performance upgrades, paint/underglow styling, and currency.
 */

const GARAGE_CARS = [
    {
        id: 'striker',
        name: 'Apex Striker',
        class: 'Street Tuner',
        price: 0,
        unlocked: true,
        baseStats: {
            maxSpeed: 12000,
            accel: 4800,
            handling: 3.6,
            health: 100,
            nitroDrain: 28
        },
        defaultColor: '#ef4444',
        defaultUnderglow: '#ff0055',
        description: 'The quintessential street racer. Perfectly balanced handling and acceleration makes it an ideal highway weaver.'
    },
    {
        id: 'shinobi',
        name: 'Shinobi R-Spec',
        class: 'JDM Drift Master',
        price: 1500,
        unlocked: false,
        baseStats: {
            maxSpeed: 13200,
            accel: 5600,
            handling: 4.4,
            health: 90,
            nitroDrain: 25
        },
        defaultColor: '#10b981',
        defaultUnderglow: '#00f3ff',
        description: 'Lightweight Japanese racing chassis with razor-sharp steering and rapid acceleration for near-miss purists.'
    },
    {
        id: 'goliath',
        name: 'Goliath Titan',
        class: 'Armored Enforcer',
        price: 3000,
        unlocked: false,
        baseStats: {
            maxSpeed: 11500,
            accel: 4200,
            handling: 3.2,
            health: 160,
            nitroDrain: 30
        },
        defaultColor: '#334155',
        defaultUnderglow: '#f59e0b',
        description: 'Heavy armored utility machine. Shrugs off collisions with ease and holds its line through any traffic roadblock.'
    },
    {
        id: 'valkyrie',
        name: 'Hyperion Valkyrie',
        class: 'Exotic Hypercar',
        price: 5500,
        unlocked: false,
        baseStats: {
            maxSpeed: 14800,
            accel: 6400,
            handling: 4.8,
            health: 110,
            nitroDrain: 22
        },
        defaultColor: '#06b6d4',
        defaultUnderglow: '#ff007f',
        description: 'Aerodynamic carbon fiber masterpiece designed for sheer speed. Clocks breathtaking speeds with extended nitro duration.'
    },
    {
        id: 'phantom',
        name: 'Cyber Phantom X',
        class: 'Experimental Prototype',
        price: 9000,
        unlocked: false,
        baseStats: {
            maxSpeed: 16200,
            accel: 7200,
            handling: 5.2,
            health: 130,
            nitroDrain: 18
        },
        defaultColor: '#8b5cf6',
        defaultUnderglow: '#00f3ff',
        description: 'Next-gen experimental racer equipped with advanced magnetic stabilization and instantaneous lateral response.'
    }
];

const PAINT_PALETTE = [
    { name: 'Crimson Fury', hex: '#ef4444' },
    { name: 'Cyber Cyan', hex: '#06b6d4' },
    { name: 'Neon Magenta', hex: '#ec4899' },
    { name: 'Acid Lime', hex: '#84cc16' },
    { name: 'Stealth Onyx', hex: '#1e293b' },
    { name: 'Solar Gold', hex: '#f59e0b' },
    { name: 'Royal Violet', hex: '#8b5cf6' },
    { name: 'Blizzard White', hex: '#f8fafc' }
];

const UNDERGLOW_PALETTE = [
    { name: 'Neon Pink', hex: '#ff007f' },
    { name: 'Electric Cyan', hex: '#00f3ff' },
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
                return JSON.parse(saved);
            }
        } catch (e) {}

        return {
            cash: 500, // Starter bonus cash
            selectedCarId: 'striker',
            unlockedCars: ['striker'],
            carCustomization: {
                striker: { color: '#ef4444', underglow: '#ff0055' },
                shinobi: { color: '#10b981', underglow: '#00f3ff' },
                goliath: { color: '#334155', underglow: '#f59e0b' },
                valkyrie: { color: '#06b6d4', underglow: '#ff007f' },
                phantom: { color: '#8b5cf6', underglow: '#00f3ff' }
            },
            upgrades: {
                striker: { speed: 0, accel: 0, handling: 0, health: 0 },
                shinobi: { speed: 0, accel: 0, handling: 0, health: 0 },
                goliath: { speed: 0, accel: 0, handling: 0, health: 0 },
                valkyrie: { speed: 0, accel: 0, handling: 0, health: 0 },
                phantom: { speed: 0, accel: 0, handling: 0, health: 0 }
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
