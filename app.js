/*eslint-env node*/

var rhyme = require('rhyme');
var r;

// Initialize the rhyme library
rhyme(function (_rhyme) {
	r = _rhyme;
});

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

var bodyParser = require('body-parser');

app.get('/haiku', function (req, res) {
	if (req.query.text) {
		lookForHaiku(res, req.query.text, req.query.name);
	}
	else {
		res.status(400).send('Missing text payload.');
	}
});

app.post('/slack', bodyParser.urlencoded({ extended: false }), function (req, res) {
	if (req.body.text && req.body.user_name !== 'slackbot') {
		lookForHaiku(res, req.body.text, '<@' + req.body.user_name + '>');
	}
	else {
		res.status(400).send('Missing text payload.');
	}
});

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, function() {
	// print a message when the server starts listening
	console.log("server starting on " + appEnv.url);
});

function lookForHaiku(res, text, user) {
	var poem = [{syllables: 5, stanza: ''}, {syllables: 7, stanza: ''}, {syllables: 5, stanza: ''}]
	var line = 0;
	// Replace links with nothing to exclude them from the haiku
	var notHaiku = text.replace(/<[@!][^>]+>/g, '').split(/[^a-z'A-Z]+/).some(function (word, idx, arr) {
		console.log(word);
		if (word === '') {
			return false;
		}

		// The poem would have too many lines
		if (line >= poem.length) {
			return true;
		}
		// Subtract out the syllables and append the word
		poem[line].syllables -= r.syllables(word) || 1;
		poem[line].stanza += word + ' ';

		if (poem[line].syllables === 0) {
			// Finished a line, move on to the next
			poem[line].stanza = poem[line].stanza.trim();
			line++;
		}
		else if (poem[line].syllables < 0) {
			// Number of syllables is over the length for a haiku
			return true;
		}
	});
	if (notHaiku || poem[0].syllables || poem[1].syllables || poem[2].syllables) {
		// There were too many syllables on a line, too many lines, or lines weren't long enough
		console.log(text + '\n> Not a Haiku.\n');
		res.status(200).send({text: ''});
	}
	else {
		console.log(text + '\n> It\'s a Haiku.\n');
		res.status(200).send({text: poem[0].stanza + '\n' + poem[1].stanza + '\n' + poem[2].stanza + (user ? '\n- ' + user : '')});
	}
}
