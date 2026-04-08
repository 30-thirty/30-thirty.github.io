# TankSim & Pull Variance Analysis

A Turtle WoW tank damage/threat simulator for analyzing tank performance and threat optimization.

## What It Does

- Simulates tank combat mechanics including abilities, procs, and weapon swings
- Calculates threat per second (TPS) for various tank specs (Furyprot, Deftac)
- Analyzes pull variance and threat thresholds
- Supports buffs, gear sets, talents

## Running Locally

### Option 1: Simple HTTP Server
```bash
# Python 3
python -m http.server 8000

# Or Node.js
npx serve
```

Then open `http://localhost:8000` in your browser.

### Option 2: Open Directly
Simply open `index.html` in a web browser. Note that some browsers may block loading local JavaScript files due to CORS restrictions.

## Adding Projects

To add new gear, abilities, or other items:

1. **Gear/Weapons**: Edit `config.js` - contains weapon stats, armor, rings, trinkets, etc.
2. **Talents**: Edit `index.html` in the talents section - add new talent inputs and wire them up in the relevant JS files
3. **Abilities**: Edit `abilities.js` - add new tank abilities and their threat values
4. **Buffs**: Modify the buff sections in `index.html` and corresponding logic in `auras.js`

---

*Version 1.18.1 - twow*