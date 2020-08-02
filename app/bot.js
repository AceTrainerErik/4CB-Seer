// Requiring.
var Discord = require('discord.js');
var auth = require('../config/auth.json');

const client = new Discord.Client();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', message => {
  console.log(`Channel: ${message.channel.type}`);
  console.log(`Message: ${message.content}`);
	if (message.content === '!ping') {
		message.channel.send('Pong.');
        console.log('Ping received. Pong sent.');
	}
});

client.login(auth.token);