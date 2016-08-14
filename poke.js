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
	Redis = require("ioredis"),
	os = require("os"),
	waterfall = require("async-waterfall");
} catch (e) {
	console.log("Could not load all modules. Did you run `npm install`?", e);
	process.exit(1);
}

log("* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *");
log("*                                                                     *");
log("*                        H e l l o   t h e r e                        *");
log("*                                                                     *");
log("* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *");

var login = new pogobuf.PTCLogin(),
	client = new pogobuf.Client(),
	geocoder = nodeGeocoder(),
	lat,
	lng,
	intervalId;

/**
 * Blinkstick
 */
var led = {
	stick: null,
	isConnected: function isConnected() {
		if (!stick) {
			// try finding the blinkstick again if wasn"t connected at first
			led.stick = blinkstick.findFirst();
		}
		return (typeof stick !== "undefined");
	},
	blinker: function(team) {
		if (this.isConnected()) {
			var color = config.team_colors[team];
			log("** BLINKER ** Pulsing to " + color);

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
					stick.setColor(color, done);
				},
			], function(err, result) {
				if (err) {
					return log("** BLINKER ** Encountered error!", err);
				}
				return log("** BLINKER ** Done pulsing!");
			});
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
			out = [];

		out.push("Gym: " + gym.name);
		out.push(
			"Owner: " + 
			pogobuf.Utils.getEnumKeyByValue(POGOProtos.Enums.TeamColor, fortData.owned_by_team) + 
			((fortData.is_in_battle) ? " [IN BATTLE]" : "")
		);

		if (config.watched_gym.verbose) {
			out.push("Points: " + fortData.gym_points);
			if (memberships && memberships.length) {
				var highest = memberships[memberships.length - 1];
				out.push("Highest Pokémon: " + pogobuf.Utils.getEnumKeyByValue(POGOProtos.Enums.PokemonId, highest.pokemon_data.pokemon_id) + ", " + highest.pokemon_data.cp + " CP");
				out.push("Trainer: " + highest.trainer_public_profile.name + ", level " + highest.trainer_public_profile.level);
			}
		}

		log(out.join("\t"));

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
	})
	.catch((err) => {
		console.log("ERROR: ", err.message);
		clearInterval(intervalId);
		doLogin();
	});
};

var doLogin = function() {
	log("Logging in..");
	login.login(config.username, config.password)
		.then(token => {
			// Initialize the client
			log("Setting auth & position..");
			client.setAuthInfo(config.provider, token);
			client.setPosition(config.location.lat, config.location.lng);

			// Perform the initial request
			return client.init();
		})

		.then(() => {

			log("Successfully logged in");
			console.log();
			
			getGymDetails();
			intervalId = setInterval(getGymDetails, config.query_interval);

		})

}

// start up blinkstick so we know when project is deployed to the raspberry pi
if (led.stick) led.stick.morph("green");

// Start up main app logic
doLogin();

/**
 * do graceful shutdown when told to
 */
process.on("SIGINT", function() {
	log("*** Received request to stop poky ***");

	clearInterval(intervalId);

	if (led.stick) {
		led.stick.setColor(0, 0, 0, function(){
			process.exit(0);
		});
	} else {
		process.exit(0);
	}
});
