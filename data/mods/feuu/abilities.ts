export const Abilities: {[k: string]: ModdedAbilityData} = {
	//Set 1
	porous: {//Feel like this might be wrong
		id: "porous",
		name: "Porous",
		shortDesc: "Absorbs self-KO moves and Water-type moves, and restores 1/4 max HP.",
		onTryHit(target, source, move) {
			if (target !== source && (move.type === 'Water' || ['explosion', 'mindblown', 'mistyexplosion', 'selfdestruct'].includes(move.id))) {
				if (!this.heal(target.baseMaxhp / 4)) {
					this.add('-immune', target, '[from] ability: Porous');
				}
				return null;
			}
			
		},
		onAnyDamage(damage, target, source, effect) {
			if (effect && (effect.id === 'aftermath')) {
				this.heal(this.effectData.target.baseMaxhp / 4)
				this.add('-immune', this.effectData.target, '[from] ability: Porous');
			}
		},
	},
	despicable: {
		id: "despicable",
		name: "Despicable",
		shortDesc: "This Pokemon's attacks are critical hits if the target is burned or poisoned.",
		onModifyCritRatio(critRatio, source, target) {
			if (target && ['psn', 'tox', 'brn'].includes(target.status)) return 5;
		},
	},
	kingsguard: {
		id: "kingsguard",
		name: "King's Guard",
		shortDesc: "Protected from enemy priority moves and Attack reduction.",
		onBoost(boost, target, source, effect) {
			if (source && target === source) return;
			if (boost.atk && boost.atk < 0) {
				delete boost.atk;
				if (!(effect as ActiveMove).secondaries) {
					this.add("-fail", target, "unboost", "Attack", "[from] ability: King's Guard", "[of] " + target);
				}
			}
		},
		onFoeTryMove(target, source, move) {
			const targetAllExceptions = ['perishsong', 'flowershield', 'rototiller'];
			if (move.target === 'foeSide' || (move.target === 'all' && !targetAllExceptions.includes(move.id))) {
				return;
			}

			const dazzlingHolder = this.effectData.target;
			if ((source.side === dazzlingHolder.side || move.target === 'all') && move.priority > 0.1) {
				this.attrLastMove('[still]');
				this.add('cant', dazzlingHolder, "ability: King's Guard", move, '[of] ' + target);
				return false;
			}
		},
	},
	growthveil: { //Too long
		id: "growthveil",
		name: "Growth Veil",
		shortDesc: "Restores 1/3 max HP on switch-out; ally Grass-types safe from enemy stat drops & status.",
		desc: "Restores 1/3 max HP on switch-out; ally Grass-types can't have stats lowered or status inflicted.",
		onSwitchOut(pokemon) {
			pokemon.heal(pokemon.baseMaxhp / 3);
		},
		onAllyBoost(boost, target, source, effect) {
			if ((source && target === source) || !target.hasType('Grass')) return;
			let showMsg = false;
			let i: BoostName;
			for (i in boost) {
				if (boost[i]! < 0) {
					delete boost[i];
					showMsg = true;
				}
			}
			if (showMsg && !(effect as ActiveMove).secondaries) {
				const effectHolder = this.effectData.target;
				this.add('-block', target, 'ability: Growth Veil', '[of] ' + effectHolder);
			}
		},
		onAllySetStatus(status, target, source, effect) {
			if (target.hasType('Grass') && source && target !== source && effect && effect.id !== 'yawn') {
				this.debug('interrupting setStatus with Growth Veil');
				if (effect.id === 'synchronize' || (effect.effectType === 'Move' && !effect.secondaries)) {
					const effectHolder = this.effectData.target;
					this.add('-block', target, 'ability: Growth Veil', '[of] ' + effectHolder);
				}
				return null;
			}
		},
		onAllyTryAddVolatile(status, target) {
			if (target.hasType('Grass') && status.id === 'yawn') {
				this.debug('Growth Veil blocking yawn');
				const effectHolder = this.effectData.target;
				this.add('-block', target, 'ability: Growth Veil', '[of] ' + effectHolder);
				return null;
			}
		},
	},
	surgeoneye: {
		id: "surgeoneye",
		name: "Surgeon Eye",
		shortDesc: "Restores 1/3 max HP on switch-out. Attack power 1.3x if it moves last in a turn.",
		onSwitchOut(pokemon) {
			pokemon.heal(pokemon.baseMaxhp / 3);
		},
		onBasePowerPriority: 21,
		onBasePower(basePower, pokemon) {
			let boosted = true;
			for (const target of this.getAllActive()) {
				if (target === pokemon) continue;
				if (this.queue.willMove(target)) {
					boosted = false;
					break;
				}
			}
			if (boosted) {
				this.debug('Surgeon Eye boost');
				return this.chainModify([0x14CD, 0x1000]);
			}
		},
	},
	//Set 2
	roughresult: { //Too long
		id: "roughresult",
		name: "Rough Result",
		shortDesc: "Foes making contact lose 1/8 max HP; if KOed by contact, attacker loses 1/4 max HP.",
		dsc: "Pokemon making contact lose 1/8 max HP; if KOed by a contact move, attacker loses 1/4 max HP.",
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (move.flags['contact']) {
				this.damage(source.baseMaxhp / 8, source, target);
			}
			if (move.flags['contact'] && !target.hp) {
				//I dunno how to make Porous differentiate between the two kinds of damage this ability can deal,
				//So I'm just gonna CHEAT because i am a HACK and a fraud. 
				if (source.hasAbility('Porous')) {
					this.add('-ability', source, 'Porous');
					this.heal(source.baseMaxhp / 4, source, target, move);
				}
				else this.damage(source.baseMaxhp / 4, source, target);
			}
		},
	},
	eyeforaneye: {
		id: "eyeforaneye",
		name: "Eye for an Eye",
		shortDesc: "This Pokemon blocks Dark-type moves and bounces them back to the user.",
		onTryHitPriority: 1,
		onTryHit(target, source, move) {
			if (target === source || move.hasBounced || move.type !== 'Dark') {
				return;
			}
			const newMove = this.dex.getActiveMove(move.id);
			newMove.hasBounced = true;
			newMove.pranksterBoosted = false;
			this.useMove(newMove, target, source);
			return null;
		},
		onAllyTryHitSide(target, source, move) {
			if (target.side === source.side || move.hasBounced || move.type !== 'Dark') {
				return;
			}
			const newMove = this.dex.getActiveMove(move.id);
			newMove.hasBounced = true;
			newMove.pranksterBoosted = false;
			this.useMove(newMove, this.effectData.target, source);
			return null;
		},
		condition: {
			duration: 1,
		},
	},
	naturalheal: {
		id: "naturalheal",
		name: "Natural Heal",
		shortDesc: "Restores 1/3 max HP and cures non-volatile status on switch-out.",
		onCheckShow(pokemon) {
			// This is complicated
			// For the most part, in-game, it's obvious whether or not Natural Cure activated,
			// since you can see how many of your opponent's pokemon are statused.
			// The only ambiguous situation happens in Doubles/Triples, where multiple pokemon
			// that could have Natural Cure switch out, but only some of them get cured.
			if (pokemon.side.active.length === 1) return;
			if (pokemon.showCure === true || pokemon.showCure === false) return;

			const cureList = [];
			let noCureCount = 0;
			for (const curPoke of pokemon.side.active) {
				// pokemon not statused
				if (!curPoke || !curPoke.status) {
					// this.add('-message', "" + curPoke + " skipped: not statused or doesn't exist");
					continue;
				}
				if (curPoke.showCure) {
					// this.add('-message', "" + curPoke + " skipped: Natural Cure already known");
					continue;
				}
				const species = curPoke.species;
				// pokemon can't get Natural Cure
				if (!Object.values(species.abilities).includes('Natural Cure') && !Object.values(species.abilities).includes('Natural Heal')) {
					// this.add('-message', "" + curPoke + " skipped: no Natural Cure");
					continue;
				}
				// pokemon's ability is known to be Natural Cure
				if (!species.abilities['1'] && !species.abilities['H']) {
					// this.add('-message', "" + curPoke + " skipped: only one ability");
					continue;
				}
				// pokemon isn't switching this turn
				if (curPoke !== pokemon && !this.queue.willSwitch(curPoke)) {
					// this.add('-message', "" + curPoke + " skipped: not switching");
					continue;
				}

				if (curPoke.hasAbility('naturalcure') || curPoke.hasAbility('naturalheal')) {
					// this.add('-message', "" + curPoke + " confirmed: could be Natural Cure (and is)");
					cureList.push(curPoke);
				} else {
					// this.add('-message', "" + curPoke + " confirmed: could be Natural Cure (but isn't)");
					noCureCount++;
				}
			}

			if (!cureList.length || !noCureCount) {
				// It's possible to know what pokemon were cured
				for (const pkmn of cureList) {
					pkmn.showCure = true;
				}
			} else {
				// It's not possible to know what pokemon were cured

				// Unlike a -hint, this is real information that battlers need, so we use a -message
				this.add('-message', "(" + cureList.length + " of " + pokemon.side.name + "'s pokemon " + (cureList.length === 1 ? "was" : "were") + " cured by Natural Heal.)");

				for (const pkmn of cureList) {
					pkmn.showCure = false;
				}
			}
		},
		onSwitchOut(pokemon) {
			pokemon.heal(pokemon.baseMaxhp / 3);
			if (!pokemon.status) return;

			// if pokemon.showCure is undefined, it was skipped because its ability
			// is known
			if (pokemon.showCure === undefined) pokemon.showCure = true;

			if (pokemon.showCure) this.add('-curestatus', pokemon, pokemon.status, '[from] ability: Natural Heal');
			pokemon.setStatus('');

			// only reset .showCure if it's false
			// (once you know a Pokemon has Natural Cure, its cures are always known)
			if (!pokemon.showCure) pokemon.showCure = undefined;
		},
	},
	kingofpowerpoints: {//Too long
		id: "kingofpowerpoints",
		name: "King of Power Points",
		shortDesc: "Moves targeting it: -1 extra PP. Restores 1/3 max PP of its moves on switch-out.",
		desc: "Moves targeting this Pokemon lose 1 additional PP. Restores 1/3 max PP of its moves on switch-out, rounded down.",
		onStart(pokemon) {
			this.add('-ability', pokemon, 'King of Power Points');
		},
		onDeductPP(target, source) {
			if (target.side === source.side) return;
			return 1;
		},
		onSwitchOut(pokemon) {
			for (const moveSlot of pokemon.moveSlots) {
				moveSlot.pp += Math.floor(moveSlot.maxpp / 3); 
				if (moveSlot.pp > moveSlot.maxpp) moveSlot.pp = moveSlot.maxpp;
			}
		},
	},
	porousfat: {
		id: "porousfat",
		name: "Porous Fat",
		shortDesc: "Fire/Ice/Water moves against this Pokemon deal damage with a halved attacking stat.",
		onSourceModifyAtkPriority: 6,
		onSourceModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Ice' || move.type === 'Fire' || move.type === 'Water') {
				this.debug('Porous Fat weaken');
				return this.chainModify(0.5);
			}
		},
		onSourceModifySpAPriority: 5,
		onSourceModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Ice' || move.type === 'Fire' || move.type === 'Water') {
				this.debug('Porous Fat weaken');
				return this.chainModify(0.5);
			}
		},
	},
	
	//set 3
	nullsystem: {
		id: "nullsystem",
		name: "Null System",
		shortDesc: "This Pokemon can be any type (selected in teambuilder)."
	},
	inthicktrator: {
		id: "inthicktrator",
		name: "Inthicktrator",
		shortDesc: "Ignores Screens/Substitutes. Fire/Ice moves: 1/2 power against this Pokemon.",
		onSourceModifyAtkPriority: 6,
		onSourceModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Ice' || move.type === 'Fire') {
				this.debug('Inthicktrator weaken');
				return this.chainModify(0.5);
			}
		},
		onSourceModifySpAPriority: 5,
		onSourceModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Ice' || move.type === 'Fire') {
				this.debug('Inthicktrator weaken');
				return this.chainModify(0.5);
			}
		},
		onModifyMove(move) {
			move.infiltrates = true;
		},
	},
	magicsurge: {
		id: "magicsurge",
		name: "Magic Surge",
		shortDesc: "Summons Magic Room for 5 turns when switching in.",
		onStart(source) {
			this.add('-activate', source, 'ability: Magic Surge');
			this.field.addPseudoWeather('magicroom');
		},
	},
	multiantlers: {
		id: "multiantlers",
		name: "Multi Antlers",
		shortDesc: "User takes half damage when switching in.",
		onSourceModifyDamage(damage, source, target, move) {
			if (!target.activeTurns) {
				this.debug('Multi Antlers weaken');
				return this.chainModify(0.5);
			}
		},
	},
	concussion: {
		id: "concussion",
		name: "Concussion",
		shortDesc: "Halves the effect of the foe's item. (Not coded)",
		//g-luke, i dont know what dark god told you this ability was a good idea
		//but someday karma will catch up to you and god wont be as merciful as i am
		/*
		onFoeTryHeal(damage, target, source, effect) {
			if (!effect) return;
			if (effect.id === 'berryjuice' || effect.id === 'leftovers') {
				this.add('-activate', target, 'ability: Concussion');
			}
			if (effect.effectType === 'Item') return this.chainModify(0.5);
		},
		onFoeBoost(boost, target, source, effect) {
			if (effect && (effect.effectType === 'Item')) {
				let b: BoostName;
				for (b in boost) {
					//this will break i can feel it in my bones
					boost[b] = math.ceil(boost[b] * 0.5);
				}
			}
		},
		//this part DEFINITELY isnt right UGH
		onModifyDamagePriority: -1,
		onModifyDamage(damage, source, target, move) {
			if (target.abilityData.berryWeaken) {
				return this.chainModify(0.75);
			}
			
		},
		onFoeTryEatItemPriority: -1,
		onFoeTryEatItem(item, pokemon) {
			this.add('-activate', pokemon, 'ability: Concussion');
		},
		onFoeEatItem(item, pokemon) {
			const weakenBerries = [
				'Babiri Berry', 'Charti Berry', 'Chilan Berry', 'Chople Berry', 'Coba Berry', 'Colbur Berry', 'Haban Berry', 'Kasib Berry', 'Kebia Berry', 'Occa Berry', 'Passho Berry', 'Payapa Berry', 'Rindo Berry', 'Roseli Berry', 'Shuca Berry', 'Tanga Berry', 'Wacan Berry', 'Yache Berry',
			];
			// Record if the pokemon ate a berry to resist the attack
			pokemon.abilityData.berryWeaken = weakenBerries.includes(item.name);
		},
		*/
	},
	notfunny: {
		id: "notfunny",
		name: "Not Funny",
		shortDesc: "If user has no item, user's moves have +1 priority.",
		onModifyPriority(priority, pokemon, target, move) {
			if (move?.category === 'Status') {
				move.pranksterBoosted = true;
				return priority + 1;
			}
		},
		onAnyInvulnerabilityPriority: 1,
		onAnyInvulnerability(target, source, move) {
			if (move && (source === this.effectData.target || target === this.effectData.target)) return 0;
		},
		onAnyAccuracy(accuracy, target, source, move) {
			if (move && (source === this.effectData.target || target === this.effectData.target)) {
				return true;
			}
			return accuracy;
		},
	},
	fowlbehavior: {
		id: "fowlbehavior",
		name: "Fowl Behavior",
		shortDesc: "This Pokemon's Sp. Atk is 1.5x, but it can only select the first move it executes.",
		onStart(pokemon) {
			pokemon.abilityData.choiceLock = "";
		},
		onBeforeMove(pokemon, target, move) {
			if (move.isZOrMaxPowered || move.id === 'struggle') return;
			if (pokemon.abilityData.choiceLock && pokemon.abilityData.choiceLock !== move.id) {
				// Fails unless ability is being ignored (these events will not run), no PP lost.
				this.addMove('move', pokemon, move.name);
				this.attrLastMove('[still]');
				this.debug("Disabled by Fowl Behavior");
				this.add('-fail', pokemon);
				return false;
			}
		},
		onModifyMove(move, pokemon) {
			if (pokemon.abilityData.choiceLock || move.isZOrMaxPowered || move.id === 'struggle') return;
			pokemon.abilityData.choiceLock = move.id;
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, pokemon) {
			if (pokemon.volatiles['dynamax']) return;
			// PLACEHOLDER
			this.debug('Fowl Behavior Sp. Atk Boost');
			return this.chainModify(1.5);
		},
		onDisableMove(pokemon) {
			if (!pokemon.abilityData.choiceLock) return;
			if (pokemon.volatiles['dynamax']) return;
			for (const moveSlot of pokemon.moveSlots) {
				if (moveSlot.id !== pokemon.abilityData.choiceLock) {
					pokemon.disableMove(moveSlot.id, false, this.effectData.sourceEffect);
				}
			}
		},
		onEnd(pokemon) {
			pokemon.abilityData.choiceLock = "";
		},
	},
	pillage: {
		id: "pillage",
		name: "Pillage",
		shortDesc: "On switch-in, swaps ability with the opponent.",
		onStart(pokemon) {
			if ((pokemon.side.foe.active.some(
				foeActive => foeActive && this.isAdjacent(pokemon, foeActive) && foeActive.ability === 'noability'
			))
			|| pokemon.species.id !== 'yaciancrowned') {
				this.effectData.gaveUp = true;
			}
		},
		onUpdate(pokemon) {
			if (!pokemon.isStarted || this.effectData.gaveUp) return;
			const possibleTargets = pokemon.side.foe.active.filter(foeActive => foeActive && this.isAdjacent(pokemon, foeActive));
			while (possibleTargets.length) {
				let rand = 0;
				if (possibleTargets.length > 1) rand = this.random(possibleTargets.length);
				const target = possibleTargets[rand];
				const ability = target.getAbility();
				const additionalBannedAbilities = [
					// Zen Mode included here for compatability with Gen 5-6
					'noability', 'flowergift', 'forecast', 'hungerswitch', 'illusion', 'pillage',
					'imposter', 'neutralizinggas', 'powerofalchemy', 'receiver', 'trace', 'zenmode',
				];
				if (target.getAbility().isPermanent || additionalBannedAbilities.includes(target.ability)) {
					possibleTargets.splice(rand, 1);
					continue;
				}
				target.setAbility('pillage', pokemon);
				pokemon.setAbility(ability);
				
				this.add('-activate', pokemon, 'ability: Pillage');
				this.add('-activate', pokemon, 'Skill Swap', '', '', '[of] ' + target);
				this.add('-activate', pokemon, 'ability: ' + ability.name);
				this.add('-activate', target, 'ability: Pillage');
				return;
			}
		},
	},
	magneticwaves: {
		id: "magneticwaves",
		name: "Magnetic Waves",
		shortDesc: "Normal moves: Electric type, 1.2x power. Immune to Ground moves.",
		// airborneness implemented in sim/pokemon.js:Pokemon#isGrounded (via scripts.ts in this case)
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && !noModifyType.includes(move.id) && !(move.isZ && move.category !== 'Status')) {
				move.type = 'Electric';
				move.galvanizeBoosted = true;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.galvanizeBoosted) return this.chainModify([0x1333, 0x1000]);
		},
	},
	doggysmaw: {
		id: "doggysmaw",
		name: "Doggy's Maw",
		shortDesc: "This Pokemon's Normal, Fighting and Dragon moves ignore type-based immunities.",
		onModifyMovePriority: -5,
		onModifyMove(move) {
			if (!move.ignoreImmunity) move.ignoreImmunity = {};
			if (move.ignoreImmunity !== true) {
				move.ignoreImmunity['Fighting'] = true;
				move.ignoreImmunity['Normal'] = true;
				move.ignoreImmunity['Dragon'] = true;
			}
		},
	},
	
};