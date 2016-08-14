/* globals module */

/**
 * helper functions
 */

function zero_pad(int, tripple_pad) {
	if (typeof tripple_pad !== "undefined") {
		if (int < 100) {
			int = "0" + int;
		}
	}
	if (int < 10) {
		int = "0" + int;
	}
	return int;
}

function d() {
	var date = new Date();
	return zero_pad(date.getHours()) + ":" + zero_pad(date.getMinutes()) + ":" + zero_pad(date.getSeconds()) + "." + zero_pad(date.getMilliseconds(), true);
}

module.exports = function(msg, obj) {
	if (typeof obj !== "undefined") {
		return console.log(d() + " " + msg, obj);
	}
	if (typeof msg === "undefined") {
		msg = "";
	}
	return console.log(d() + " " + msg);
}
