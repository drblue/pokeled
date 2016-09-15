"use strict";

try {
	var config = require("./config.json");
} catch (e) {
	console.log("Could not load `config.json`. Did you copy `config.example.json` to `config.json` and replaced the credentials?");
	process.exit(1);
}

try {
	var pogobuf = require("pogobuf"),
	POGOProtos = require("node-pogo-protos"),
	nodeGeocoder = require("node-geocoder"),
	log = require("./log"),
	blinkstick = require("blinkstick"),
	chalk = require('chalk'),
	moment = require('moment'),
	Redis = require("ioredis"),
	os = require("os"),
	waterfall = require("async-waterfall");
} catch (e) {
	console.log("Could not load all modules. Did you run `npm install`?", e);
	process.exit(1);
}

log(chalk.blue("* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *"));
log(chalk.blue("*                                                                     *"));
log(chalk.blue("*                        H e l l o   t h e r e                        *"));
log(chalk.blue("*                                                                     *"));
log(chalk.blue("* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *"));

var login = new pogobuf.PTCLogin(),
	client = new pogobuf.Client(),
	geocoder = nodeGeocoder(),
	lat,
	lng,
	intervalId;

function team_name(team) {
	var name = pogobuf.Utils.getEnumKeyByValue(POGOProtos.Enums.TeamColor, team);
	switch (team) {
		case 0: return chalk.black.bgWhite(name); break;
		case 1: return chalk.bgBlue(name); break;
		case 2: return chalk.bgRed(name); break;
		case 3: return chalk.black.bgYellow(name); break;
		default: return name; break;
	}
}

/**
 * Blinkstick
 */
var led = {
	stick: null,
	isConnected: function isConnected() {
		if (!led.stick) {
			// try finding the blinkstick again if wasn"t connected at first
			led.stick = blinkstick.findFirst();
		}
		return (typeof led.stick !== "undefined");
	},
	blinker: function(team) {
		if (this.isConnected() && !isDaytime()) {
			var color = config.team_colors[team];
			log(chalk.yellow("[led] Pulsing to " + chalk[color](color)));

			waterfall([
				function(done) {
					led.stick.pulse(color, done);
				},
				function(done) {
					led.stick.pulse(color, done);
				},
				function(done) {
					setTimeout(function(){
						done();
					}, 1500);
				},
				function(done) {
					led.stick.setColor(color, done);
				},
			], function(err, result) {
				if (err) {
					return log(chalk.white.bgRed("[led] Encountered error!"), err);
				}
				return log(chalk.yellow("[led] Done pulsing"));
			});
		} else {
			return log(chalk.yellow("[led] No led-strip found"));
		}
	},
	turnOff: function() {
		if (this.isConnected()) {
			log("[led] Turning off");
			led.stick.turnOff();
		}
	}
};


var getGymDetails = function() {

	// batch, plz
	// client.batchStart();
	// client.getGymDetails(config.watched_gym.id, config.watched_gym.latitude, config.watched_gym.longitude);
	// client.batchCall()
	client.getGymDetails(config.watched_gym.id, config.watched_gym.latitude, config.watched_gym.longitude)
	.then(gym => {

		// Display gym information
		var fortData = gym.gym_state.fort_data,
			memberships = gym.gym_state.memberships,
			team_color = team_name(fortData.owned_by_team),
			out = [],
			verbose = [];

		out.push("Gym: " + gym.name);
		out.push(
			"Owner: " + 
			// chalk[team_color.toLowerCase()](team_color) + 
			team_color + 
			" " + ((fortData.is_in_battle) ? chalk.bgRed("[IN BATTLE]") : "\t")
		);
		out.push("Points: " + fortData.gym_points);
		log(out.join("\t"));

		if (config.watched_gym.verbose) {
			if (memberships && memberships.length) {
				var highest = memberships[memberships.length - 1];
				verbose.push("Highest Pokémon: " + pogobuf.Utils.getEnumKeyByValue(POGOProtos.Enums.PokemonId, highest.pokemon_data.pokemon_id) + ", " + highest.pokemon_data.cp + " CP");
				verbose.push("Trainer: " + highest.trainer_public_profile.name + ", level " + highest.trainer_public_profile.level);
				log(verbose.join("\t"));
			}
		}

		if (fortData.owned_by_team !== config.watched_gym.owned_by_team) {
			// victory!
			var previous_owner = pogobuf.Utils.getEnumKeyByValue(POGOProtos.Enums.TeamColor, config.watched_gym.owned_by_team),
				new_owner = pogobuf.Utils.getEnumKeyByValue(POGOProtos.Enums.TeamColor, fortData.owned_by_team);
			if (config.watched_gym.owned_by_team !== 0) {
				log("VICTORY!! " + previous_owner + " lost to " + new_owner + "!!");
			}
			led.blinker(fortData.owned_by_team);
			config.watched_gym.owned_by_team = fortData.owned_by_team;
		}

		var query_interval = getQueryInterval();
		intervalId = setTimeout(getGymDetails, query_interval);

	})
	.catch((err) => {
		log(chalk.white.bgRed("ERROR: ", err.message));
		clearInterval(intervalId);
		doLogin();
	});
};

function getRandomIntInclusive(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomQueryInterval() {
	return getRandomIntInclusive(config.query_interval.min, config.query_interval.max) * 1000;
}

function getDaytimeStartsAt() {
	return moment().set({'hour': 8, 'minute': 0, 'second': 0, 'millisecond': 0});	
}

function getDaytimeEndsAt() {
	return moment().set({'hour': 16, 'minute': 0, 'second': 0, 'millisecond': 0});	
}

function isDaytime() {
	return moment().isBetween(getDaytimeStartsAt(), getDaytimeEndsAt());
}

function getQueryInterval() {
	var daytimeStartsAt = getDaytimeStartsAt(),
		daytimeEndsAt = getDaytimeEndsAt(),
		now = moment(),
		nextQueryIn;

	if (now.isBetween(daytimeStartsAt, daytimeEndsAt)) {
		// postpone query until afternoon
		nextQueryIn = daytimeEndsAt.diff(now);
		// switch off blinkstick
		led.turnOff();

	} else {
		nextQueryIn = getRandomQueryInterval();
	}

	log("Querying in " + nextQueryIn/1000 + " seconds (at " + now.add(nextQueryIn, 'milliseconds').format('HH:mm:ss') + ")");
	return nextQueryIn;
}

var doLogin = function() {
	log(chalk.green("Logging in.."));
	login.login(config.username, config.password)
	.then(token => {
		// Initialize the client
		log(chalk.green("Setting auth & position.."));
		client.setAuthInfo(config.provider, token);
		client.setPosition(config.location.lat, config.location.lng);

		// Perform the initial request
		return client.init();
	})
	.then(() => {

		log(chalk.green("Successfully logged in"));
		console.log();
		
		getGymDetails();

	})
	.catch((err) => {
		log(chalk.white.bgRed("ERROR caught during doLogin(): ", err.message));
		log(err);
		process.exit(1);
	});
}

// start up blinkstick so we know when project is deployed to the raspberry pi
if (led.stick) led.stick.morph("green");

// Start up main app logic
doLogin();

/**
 * do graceful shutdown when told to
 */
process.on("SIGINT", function() {
	log(chalk.red("*** Received request to stop poky ***"));

	clearTimeout(intervalId);

	if (led.stick) {
		led.stick.setColor(0, 0, 0, function(){
			process.exit(0);
		});
	} else {
		process.exit(0);
	}
});
