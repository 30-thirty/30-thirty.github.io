"use strict";

function updateRage(attacker, hit, rageCost) {
    if (attacker.stats.bonuses.fivePieceWrath && Math.random() < 0.25) rageCost = Math.max(rageCost - 5, 0) // 0.25 instead of 0.2 to account for parry/dodge streaks not consuming the buff
    if (["dodge", "parry", "miss"].includes(hit)) attacker.addRage(-0.2*rageCost, true); // Default ability refund 80%
    else attacker.addRage(-rageCost, true);
}

class Ability {
    constructor(name, baseCooldown, rageCost, onGCD, staticThreat = 0, threatScaling = 1) {
        this.name = name
        this.baseCooldown = baseCooldown
        this.rageCost = rageCost
        this.onGCD = onGCD
        this.staticThreat = staticThreat
        this.threatScaling = threatScaling
        // TODO: spellCrit
        this.currentCooldown = 0
    }

    //if the ability or swing hits, returns threat.
    //if no connection, returns 0
    threatCalculator(dmg_event, attacker) {
        if (
            dmg_event.hit != "parry" && 
            dmg_event.hit != "dodge" && 
            dmg_event.hit != "miss" ) {
            return ((dmg_event.damage * this.threatScaling) +  this.staticThreat) * attacker.stats.threatMod;
        }
        else return 0;
    }
    weaponSwingRoll(attacker) {
        return (
            Math.random()*(attacker.stats.MHMax - attacker.stats.MHMin) +
            attacker.stats.MHMin + attacker.getAP()*attacker.stats.MHSwing/
            (14*1000));
    }

    // This function needs to be implemented in the sub classes!
    use(attacker, defender) {
        console.log(`Internal Error: Use function not implemented for ability ${this.name}!`);
    }

    isUsable(attacker, defender) {
        return this.currentCooldown <= 0 && (attacker.GCD <= 0 || this.onGCD == false) && attacker.rage >= this.rageCost;
    }
}

class MHSwing extends Ability {
    use(attacker, defender) {
        let damageEvent = {};
        // Heroic Strike
        if (attacker.isHeroicStrikeQueued && attacker.rage > (15 - attacker.stats.talents.impHS - (attacker.stats.bonuses.threePieceBrotherhood ? 5 : 0))) {
            let damage = this.weaponSwingRoll(attacker) + 157 + defender.additivePhysBonus;
            damage *= (1 - armorReduction(attacker.stats.level, defender.getArmor() - attacker.arp)) * attacker.getDamageMod();
            damageEvent = rollAttack(attacker, defender, damage, true);
            this.staticThreat = 175;
            damageEvent.threat = this.threatCalculator(damageEvent, attacker);
            this.staticThreat = 0;
            damageEvent.ability = "Heroic Strike";
            // Remove rage
            updateRage(attacker, damageEvent.hit, (15 - attacker.stats.talents.impHS - (attacker.stats.bonuses.threePieceBrotherhood ? 5 : 0)));
        }
        // White Swing
        else {
            let damage = this.weaponSwingRoll(attacker) + defender.additivePhysBonus;
            damage *= (1 - armorReduction(attacker.stats.level, defender.getArmor() - attacker.arp)) * attacker.getDamageMod();
            damageEvent = rollAttack(attacker, defender, damage, false, attacker.stats.dualWield);
            
            damageEvent.threat = 0;
            damageEvent.threat = this.threatCalculator(damageEvent, attacker);
            damageEvent.ability = "MH Swing";
            
            // Add rage
            if (damageEvent.hit == "miss") return damageEvent;
            else if (["dodge", "parry"].includes(damageEvent.hit)) attacker.addRage(0.75*damage*7.5/230.6, true); // 'refund' 75% of the rage gain
            else {
                if (damageEvent.type == "crit") {
                    attacker.addRage((damageEvent.damage * 7.5 / 230.6) / 1.075 + ((attacker.stats.MHSwing/1000 * 3.5) / 2.25), true);
                    defender.addRage(damageEvent.damage*2.5/230.6, true);
                } else {
                    attacker.addRage((damageEvent.damage * 7.5 / 230.6) / 1.075 + ((attacker.stats.MHSwing/1000 * 7.5) / 2.25), true);
                    defender.addRage(damageEvent.damage*2.5/230.6, true);
                }
            }
        }
        
        attacker.isHeroicStrikeQueued = false;
        return damageEvent;
    }
}

class OHSwing extends Ability {

    use(attacker, defender) {
        let damage = Math.random()*(attacker.stats.OHMax - attacker.stats.OHMin) + attacker.stats.OHMin + attacker.getAP()*attacker.stats.OHSwing/(14*1000); // swing timer is in ms
        damage = damage*(0.5 + 0.025*attacker.stats.talents.dwspec) +  defender.additivePhysBonus;
        damage *=(1 - armorReduction(attacker.stats.level, defender.getArmor() - attacker.arp)) * attacker.getDamageMod();
        let damageEvent = rollAttack(attacker, defender, damage, false, true, true);
        damageEvent.threat = 0;
        damageEvent.threat = this.threatCalculator(damageEvent, attacker);
        damageEvent.ability = this.name;
        // Add rage
        if (damageEvent.hit == "miss") return damageEvent;
        else if (["dodge", "parry"].includes(damageEvent.hit)) attacker.addRage(0.75*damage*7.5/230.6, true); // 'refund' 75% of the rage gain
        else {
            if (damageEvent.type == "crit") {
                attacker.addRage((damageEvent.damage * 7.5 / 230.6) / 1.075 + ((attacker.stats.OHSwing/1000 * 3.5) / 2.25), true);
                defender.addRage(damageEvent.damage*2.5/230.6, true);
            } else {
                attacker.addRage((damageEvent.damage * 7.5 / 230.6) / 1.075 + ((attacker.stats.OHSwing/1000 * 7.5) / 2.25), true);
                defender.addRage(damageEvent.damage*2.5/230.6, true);
            }
        }
        return damageEvent;
    }
}
class Bloodthirst extends Ability {
    use(attacker, defender) {
        let damage = 0.35 *attacker.getAP() + 200  + defender.additivePhysBonus;
        damage *= (1 - armorReduction(attacker.stats.level, defender.getArmor() - attacker.arp)) * attacker.getDamageMod();
        let damageEvent = rollAttack(attacker, defender, damage, true, false, false, true);
        damageEvent.threat = 0;
        damageEvent.threat = this.threatCalculator(damageEvent, attacker);
        damageEvent.ability = this.name;

        // Remove rage
        updateRage(attacker, damageEvent.hit, this.rageCost)
        return damageEvent;
    }
}

class Revenge extends Ability {
    use(attacker, defender) {
        let damage = Math.random()*18 + 81 + defender.additivePhysBonus; // Rank6: 81-99 dmg
        damage += attacker.stats.bonuses.twoPieceDreadnaught ? 75 : 0;
        damage *= attacker.stats.talents.reprisal == 0 ? 1 : 1+attacker.stats.talents.reprisal*0.25;
        damage *= (1 - armorReduction(attacker.stats.level, defender.getArmor() - attacker.arp)) * attacker.getDamageMod();
        let damageEvent = rollAttack(attacker, defender, damage, true, false, false, true);
        damageEvent.threat = 0;
        damageEvent.threat = this.threatCalculator(damageEvent, attacker);
        damageEvent.ability = this.name;
        // Remove rage
        updateRage(attacker, damageEvent.hit, Math.random() < 0.5*attacker.stats.talents.reprisal ? 0 : this.rageCost);
        return damageEvent;
    }

    isUsable(attacker, defender) {
        let offCD = (this.currentCooldown <= 0 && (attacker.GCD <= 0 || this.onGCD == false) && attacker.rage > this.rageCost);
        if (!offCD) return false;
        var defStateActive = false;
        attacker.auras.forEach(aura => {
            if (aura.name == "Defensive State" && aura.duration > 0)
                defStateActive = true; 
        })
        return defStateActive;
    }
}

class Overpower extends Ability {
    use(attacker, defender) {
        let damage = this.weaponSwingRoll(attacker) + 35 + defender.additivePhysBonus;
        damage *= (1 - armorReduction(attacker.stats.level, defender.getArmor() - attacker.arp)) * attacker.getDamageMod();
        let damageEvent = rollAttack(attacker, defender, damage, true, false, false, true);
        damageEvent.threat = 0;
        damageEvent.threat = this.threatCalculator(damageEvent, attacker);
        damageEvent.ability = this.name;
        // Remove rage
        updateRage(attacker, damageEvent.hit, this.rageCost);
        return damageEvent;
    }

    isUsable(attacker, defender) {
        if (attacker.stance != "Battle Stance") return false;
        let offCD = (this.currentCooldown <= 0 && (attacker.GCD <= 0 || this.onGCD == false) && attacker.rage > this.rageCost);
        if (!offCD) return false;
        var overpowerActive = false;
        attacker.auras.forEach(aura => {
            if (aura.name == "Overpower" && aura.duration > 0)
                overpowerActive = true;
        })
        return overpowerActive;
    }
}

class SunderArmor extends Ability {
    use(attacker, defender) {
        let damage = 0;
        let damageEvent = rollAttack(attacker, defender, damage, true);
        if (damageEvent.hit == "crit") damageEvent.hit = "hit";  // TODO this can't crit...
        damageEvent.threat = 0;
        damageEvent.threat = this.threatCalculator(damageEvent, attacker);
        damageEvent.ability = this.name;
        // Remove rage
        updateRage(attacker, damageEvent.hit, this.rageCost);
        return damageEvent;
    }
    isUsable(attacker, defender) {
        return (this.currentCooldown <= 0 && (attacker.GCD <= 0 || this.onGCD == false) && attacker.rage > this.rageCost + (attacker.stats.dualWield ? 10 : 15));
    }
}

class HeroicStrike extends Ability {
    use(attacker, defender) {
        // Note that just pressing the ability has no rage cost
        attacker.isHeroicStrikeQueued = true;
        return {
                type: "spell cast",
                name: this.name,
        };
    }
    isUsable(attacker, defender) {
        return (attacker.isHeroicStrikeQueued == false && attacker.rage > this.rageCost + (attacker.stats.dualWield ? 0 : 60));
    }
}

class BattleShout extends Ability {
    threatCalculator(damageEvent, attacker) {
        return attacker.stats.bshouttargets * 60 * attacker.stats.threatMod; // Base threat = 60
    }
    
    use(attacker, defender) {
        let spellCastEvent = {
            type: "spell cast",
            name: this.name,
            ability: this.name,
            threat: this.threatCalculator({}, attacker),
        }
        // Remove rage
        updateRage(attacker, "hit", this.rageCost);
        return spellCastEvent;
    }
    isUsable(attacker, defender) {
        return (defender.IEA && (attacker.GCD <= 0 || this.onGCD == false) && attacker.rage > this.rageCost + (attacker.stats.dualWield ? 10 : 15));
    }
}

class ShieldSlam extends Ability {
    use(attacker, defender) {
        let damage = Math.random()*15 + 303 + attacker.getBlockValue() + 0.15 * attacker.getAP();
        damage *= (1 - armorReduction(attacker.stats.level, defender.getArmor() - attacker.arp)) * attacker.getDamageMod();
        let damageEvent = rollAttack(attacker, defender, damage, true, false, false, true);
        damageEvent.threat = 0;
        damageEvent.threat = 1.5 * this.threatCalculator(damageEvent, attacker);
        damageEvent.ability = this.name;

        // Remove rage
        updateRage(attacker, damageEvent.hit, this.rageCost)
        return damageEvent;
    }

}

class ConcussionBlow extends Ability {
    use(attacker, defender) {
        let damage= 235  + 0.15*attacker.getAP();
        damage *= attacker.getDamageMod();
        let damageEvent = rollAttack(attacker, defender, damage, true, false, false, true);
        damageEvent.threat = 0;
        damageEvent.threat = 1.5*this.threatCalculator(damageEvent, attacker);
        damageEvent.ability = this.name;

        // Remove rage
        updateRage(attacker, "hit", this.rageCost)
        return damageEvent;
    }

}

class Whirlwind extends Ability {
    use(attacker, defender) {
        let damage= this.weaponSwingRoll(attacker);
        damage *= attacker.getDamageMod();
        let damageEvent = rollAttack(attacker, defender, damage, true, false, false, true);
        damageEvent.threat = 0;
        damageEvent.threat = this.threatCalculator(damageEvent, attacker);
        damageEvent.ability = this.name;

        // Remove rage
        updateRage(attacker, "hit", this.rageCost)
        return damageEvent;
    }
    isUsable(attacker, defender) {
        if (attacker.stance != "Berserker Stance") return false;
        else return (this.currentCooldown <= 0 && (attacker.GCD <= 0 || this.onGCD == false) && attacker.rage > this.rageCost);
    }
}

