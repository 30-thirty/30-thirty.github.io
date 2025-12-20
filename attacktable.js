"use strict";
// We don't consider actors other than lvl 60 players and lvl 63 bosses.

// https://github.com/magey/classic-warrior/wiki/Parry-haste
function getParryHastedSwing(current, base) {
    if (current/base > 0.6) return current/1.4;
    else if (current/base > 0.2) return current/(1 + current/base - 0.2);
    else return current;
}
function armorReduction(atkLvl, armor) {
    if (armor <= 0) armor = 0
    return armor/(armor + 400 + (atkLvl*85));
}

// Lvl 60 Player hitting lvl 63 Boss
function getGlanceMod(wepSkill) {
    return Math.min(0.95, 0.65 + (wepSkill-300)*0.02);
}

function getPlayerMissChance(atkSkill, defSkill, hit, dualWield) {
    let baseMissChance = 0;
        baseMissChance = Math.max(0, 5 + (defSkill - atkSkill)*0.1)
        if(dualWield) {
            return Math.max(0, baseMissChance + 19 - hit)
        } else {
            return Math.max(0, baseMissChance - hit)
        }
}

// Tank hitting the boss
function twoRollTankBossTable(attacker, defender, damage, op) {
    let wepSkill = attacker.stats.MHWepSkill;
    let miss = getPlayerMissChance(wepSkill, defender.defense, attacker.stats.hit, false);
    let parry = 14;
    let dodge = defender.stats.dodge - 0.1 * (wepSkill - defender.defense);
    let blockValue = defender.getBlockValue();
    let block = Math.min(5, 5 + (defender.defense - wepSkill) * 0.1);
    let crit = attacker.stats.crit - 0.04 * (wepSkill - 300) - 3;
    if (op) crit += attacker.talents.impop*0.25;
    let rng = 100*Math.random();
    let type = "";
    if (rng < miss) type = 'miss';
    else if (rng < miss + parry) {
        damage = 0;
        type = 'parry';
    }
    else if (rng < miss + parry + dodge) {
        damage = 0;
        type = 'dodge';
    }
    else {
        type = 'hit';
        let crit_roll = 100*Math.random();
        let block_roll = 100*Math.random();
        if (crit_roll < crit && block_roll < block) {
            damage = Math.max(0, damage*attacker.stats.critMod - blockValue); // Impale
            type = 'crit block';
        }
        else if (block_roll < block) {
            damage = Math.max(0, damage - blockValue);
            type = 'block';
        }
        else if (crit_roll < crit) {
            damage = damage*attacker.stats.critMod; // Impale
            type = 'crit';
        }
    }
    return {
        "type": "damage",
        "hit": type,
        "damage": damage,
    };
}

// Tank hitting the boss
function rollTankBossTable(attacker, defender, damage, yellow = false, dualWieldMiss = false, OHSwing = false) {
    let wepSkill = attacker.stats.MHWepSkill;
    if (OHSwing) wepSkill = attacker.stats.OHWepSkill;
    let miss = getPlayerMissChance(wepSkill, defender.defense, attacker.stats.hit, dualWieldMiss);
    if (OHSwing) miss -= attacker.stats.talents.dwspec*2;
    let parry = 14;
    let dodge = defender.stats.dodge - 0.1 * (wepSkill - defender.defense);
    let blockValue = defender.getBlockValue();
    let block = Math.min(5, 5 + (defender.defense - wepSkill) * 0.1);
    let crit = attacker.stats.crit - 0.04 * (wepSkill - 300) - 3;
    let glance = 40;
    let glanceMod = getGlanceMod(wepSkill);

    let rng = 100*Math.random()
    let type = ""
    if (rng < miss) {
        damage = 0
        type = "miss"
    }
    else if (rng < miss + parry) {
        damage = 0;
        type = "parry";
    }
    else if (rng < miss + parry + dodge) {
        damage = 0;
        type = "dodge";
    }
    else if (rng < miss + parry + dodge + block) {
        damage = Math.max(0, damage - blockValue);
        type = "block";
    }
    else if (!yellow && rng < miss + parry + dodge + block + glance) {
        damage = damage * glanceMod;
        type = "glance";
    }
    else if ((!yellow && rng < miss + parry + dodge + block + glance + crit) || (rng < miss + parry + dodge + block + crit)) {
        damage = damage*(yellow ? attacker.stats.critMod : 2); // Impale
        type = "crit";
    }
    else type = "hit";
    return {
        "type": "damage",
        "hit": type,
        "damage": damage,
    };
}

// Boss hitting the tank
function rollBossTankTable(attacker, defender, damage, yellow = false) {
    let wepSkill = attacker.stats.MHWepSkill;
    let miss = Math.max(0, 5 - 0.04 * (wepSkill - defender.defense));
    let parry = defender.stats.parry - 0.04 * (wepSkill - defender.defense);
    let dodge = defender.stats.dodge - 0.04 * (wepSkill - defender.defense);
    let blockValue = defender.getBlockValue();
    let block = Math.max(0, defender.stats.block + (wepSkill - defender.defense) * 0.04);
    let crit  = Math.max(0, attacker.stats.crit + 0.04 * (wepSkill - defender.defense));
    let crush = (wepSkill - Math.min(300, defender.defense)) * 2 - 15;

//    console.log(`miss: ${miss}   parry: ${parry}   dodge: ${dodge}   block: ${block}   crit: ${crit}   crush: ${crush}`)

    let rng = 100*Math.random();
    let type = "";
    if (rng < miss) {
        damage = 0;
        type = "miss";
    }
    else if (rng < miss + parry) {
        damage = 0;
        type = "parry";
    }
    else if (rng < miss + parry + dodge) {
        damage = 0;
        type = "dodge";
    }
    else if (rng < miss + parry + dodge + block) {
        damage = Math.max(0, damage - blockValue);
        type = "block";
    }
    else if (!yellow && rng < miss + parry + dodge + block + crit) {
        damage *= 2;
        type = "crit";
    }
    else if (!yellow && rng < miss + parry + dodge + block + crit + crush) {
        damage *= 1.5;
        type = "crush";
    }
    else type = "hit";
    return {
        "type": "damage",
        "hit": type,
        "damage": damage,
    };
}
// TODO
function rollDpsBossTable(stats, damage, yellow = false) {
    return;
}

function rollAttack(attacker, defender, damage, yellow = false, dualWieldMiss = false, OHSwing = false, meleeSpell = false,op = false) {
    if (meleeSpell == true) return twoRollTankBossTable(attacker, defender, damage, op);
    else if (attacker.stats.type == "tank" && defender.stats.type == "boss") return rollTankBossTable(attacker, defender, damage, yellow, dualWieldMiss, OHSwing);
    else if (attacker.stats.type == "boss" && defender.stats.type == "tank") return rollBossTankTable(attacker, defender, damage, yellow);
}