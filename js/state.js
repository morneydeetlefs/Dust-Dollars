// ================= DOM REFERENCES =================
const header  = document.getElementById("header");
const main    = document.getElementById("main");
const map     = document.getElementById("map");
const mapInner= document.getElementById("map-inner");
const modal   = document.getElementById("modal");

// ================= SETTINGS =================
let settings = {
  stabilisationRate: 0.05,
  aiEnabled: true,
  riskAversionFactor: 10,
};

// ================= GAME STATE =================
let game = {
  day: 1,
  maxDays: 365, // Set default max days to 365
  cash: 1000, // Set initial cash to 1000
  location: "Abilene",
  capacity: 100, // Set default carry capacity to 100
  eventsEnabled: true,
  // Initialize starting event chance with a default value of 0.5
  startingEventChance: 0.5,
  eventChances: { danger: 0.25, good: 0.25 },
  inventory: { whiskey: 5 },
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  activityLog: [],
  stats: { tradesMade: 0, totalEarned: 0 },
};

// ================= TRADERS =================
let traders = [
  {
    id: "trader_1",
    name: "Rattlesnake Pete",
    cash: 150,
    startingCash: 150,
    location: "DodgeCity",
    inventory: {},
    state: "idle",
    travelDaysRemaining: 0,
    travelDestination: null,
    personality: {
      preferredGoods: ["whiskey", "rifles"],
      preferredTowns: ["Tombstone", "ElPaso"],
      aggression: 0.8,
      riskTolerance: 0.6,
    },
    stats: { totalEarned: 0, tradesMade: 0, eventsTriggered: 0 },
    purchaseRecords: {},
  },
];

// ================= TURN STATE =================
let turnState = {
  phase: "player",
  roundNumber: 1,
  roundOrder: [],
  playerIndex: 0,
};

// ================= TOWNS =================
let towns = {
  Abilene: {
    x: 100, y: 200,
    goods: {
      whiskey: { base: 10, baseSupply: 60, baseDemand: 40, supply: 60, demand: 40 },
    },
    routes: { DodgeCity: 2, Tombstone: 4 },
  },
  DodgeCity: {
    x: 200, y: 120,
    goods: {
      cattle: { base: 6, baseSupply: 90, baseDemand: 50, supply: 90, demand: 50 },
      grain:  { base: 5, baseSupply: 70, baseDemand: 60, supply: 70, demand: 60 },
    },
    routes: { Abilene: 2, ElPaso: 3 },
  },
  Tombstone: {
    x: 320, y: 260,
    goods: {
      whiskey: { base: 15, baseSupply: 30, baseDemand: 90, supply: 30, demand: 90 },
      rifles:  { base: 40, baseSupply: 20, baseDemand: 80, supply: 20, demand: 80 },
    },
    routes: { Abilene: 4, ElPaso: 2 },
  },
  ElPaso: {
    x: 420, y: 150,
    goods: {
      gold: { base: 100, baseSupply: 10, baseDemand: 90, supply: 10, demand: 90 },
    },
    routes: { DodgeCity: 3, Tombstone: 2 },
  },
};

