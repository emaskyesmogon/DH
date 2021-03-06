'use strict';

/**@type {{[k: string]: ModdedFormatsData}} */
let Formats = {
	standard: {
		effectType: 'ValidatorRule',
		name: 'Standard',
		ruleset: ['Obtainable', 'Sleep Clause Mod', 'Freeze Clause Mod', 'Species Clause', 'OHKO Clause', 'Evasion Moves Clause', 'HP Percentage Mod', 'Cancel Mod'],
		banlist: ['Dig', 'Fly'],
	},
};

exports.BattleFormats = BattleFormats;
