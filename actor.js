"use strict";
class Actor {
    constructor(name, target, abilities, stats, auras, procs) {
        this.stats = stats
        this.name = name
        this.target = target
        this.abilities = abilities
        this.threatMod = stats.threatMod
        this.damageMod = stats.damageMod
        this.additivePhysBonus = 0; // Gift of Arthas
        this.hastePerc = stats.hastePerc
        this.arp = stats.arp
        this.armor = stats.baseArmor
        this.defense = stats.defense
        this.GCD = 0
        this.lastWFproc = -1501;
        this.rage = stats.startRage
        this.stance = stats.stance

        this.auras = auras
        this.procs = procs
        
        this.uptimes = {}
        
        this.rageGained = 0 // remove?
        this.rageSpent = 0
        
        this.staminaMultiplier = stats.staminaMultiplier;
        this.strengthMultiplier = stats.strengthMultiplier;
        this.agilityMultiplier = stats.agilityMultiplier;

        // Special stuff
        this.IEA = false
        this.isHeroicStrikeQueued = false
        
    }
    getArmor() {
        this.armor = this.stats.baseArmor
        let percArmorMod = 1;
        this.auras.forEach(aura => {
            if (aura.duration > 0) {
                if (aura.armorMod != 0) {
                    let multiplier = 1;
                    if (aura.scalingStacks) multiplier = aura.stacks;
                    this.armor += aura.armorMod * multiplier;
                }
                if (aura.percArmorMod != 1) percArmorMod *= (1 + aura.percArmorMod/100);
            }
        });
        //if(this.name == "Boss") console.log(this.armor)
        return Math.max(0, this.armor * percArmorMod);
    }

    getArp() {
        let arp = this.stats.arp;
        this.auras.forEach(aura => {
            if (aura.duration > 0) {
                if (aura.arp > 0) {
                    if (aura.stacks > 0) arp += aura.arp * aura.stacks;
                    else arp += aura.arp;
                }
            }
        });
        return arp;
    }

    getAP() {
        let AP = this.stats.AP;
        this.auras.forEach(aura => {
            if (aura.duration > 0) {
                if (aura.strMod > 0) {
                    AP += aura.strMod * 2 * this.strengthMultiplier;
                }
                if (aura.APMod > 0) {
                    if(!aura.scalingStacks) AP += aura.APMod;
                    else AP += aura.APMod * aura.stacks;
                }
            }
        });
        return AP;
    }

    getHaste() {
        let haste = this.stats.hastePerc;
        this.auras.forEach(aura => {
            if (aura.duration > 0) {
                if (aura.hastePerc > 0) {
                    haste *= aura.hastePerc
                }
            }
        })
        return haste
    }

    getCrit() {
        let crit = this.stats.crit;
        this.auras.forEach(aura => {
            if (aura.duration > 0) {
                if (aura.critMod > 0) {
                    crit += aura.critMod
                }
            }
        })
        return crit;
    }

    getDodge() {
        let dodge = this.stats.dodge;
        this.auras.forEach(aura => {
            if (aura.duration > 0) {
                if (aura.dodge > 0) {
                    dodge += aura.dodge
                }
            }
        })
        return dodge
    }

    getBlockValue() {
        let blockValue = this.stats.blockValue;
        this.auras.forEach(aura => {
            if(aura.duration > 0) {
                if(aura.blockValue > 0) {
                    blockValue += aura.blockValue;
                }
                if(aura.strMod > 0) {
                    blockValue += aura.strMod/20;
                }
            }
        })
        return blockValue;
    }

    getBlock() {
        let block = this.stats.block;
        this.auras.forEach(aura => {
            if(aura.duration > 0) {
                if(aura.block > 0) {
                    block += aura.block;
                }
            }
        })

        return block;
    }

    // Physical dmg mod
    getDamageMod() {
        let damageMod = this.damageMod
        this.auras.forEach(aura => {
            if (aura.duration > 0) {
                if (aura.damageMod != 1) {
                    let multiplier = 1;
                    if (aura.scalingStacks) multiplier = aura.stacks;
                    damageMod *= aura.damageMod * multiplier;
                }
            }
        });
        damageMod *= this.stats.physDmgMod;
        return damageMod;
    }

    addRage(rage, add=false) {
        this.rage = Math.max(0, Math.min(100, this.rage + rage))

        if (this.name == "Tank" && add) {
            if (rage > 0) this.rageGained += rage;
            else this.rageSpent -= rage;
        }
    }

    addParryHaste() {
        this.abilities.forEach(ability => {
            if (["MH Swing", "Auto Attack"].includes(ability.name))
                ability.currentCooldown = getParryHastedSwing(ability.currentCooldown, ability.baseCooldown);
        });
    }

    reset() {
        this.abilities.forEach(ability => { ability.currentCooldown = 0; ability.used = false; ability.secondsPassed = 0; });
        this.auras.forEach(aura => {
            aura.stacks = 0;
            aura.duration = 0;
        })
        this.GCD = 0
        this.lastWFproc = -1501;
        this.rage = this.stats.startRage
        this.isHeroicStrikeQueued = false
        this.IEA = false
        this.damageMod = this.stats.damageMod
        this.hastePerc = this.stats.hastePerc
        this.defense = this.stats.defense
        this.additivePhysBonus = 0
        this.rageGained = 0
        this.rageSpent = 0
        this.uptimes = {}
    }

}