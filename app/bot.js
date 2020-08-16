// Requiring.
var Discord = require('discord.js');
var auth = require('../config/auth.json');
const Database = require('better-sqlite3');

const bot = new Discord.Client();
const sql = new Database("./data/4cb.db", { verbose: console.log });

bot.on("ready", () => {

  console.log(`Checking status of database file.`);
  // Check if the table "points" exists.
  const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'scores';").get();
  if (!table['count(*)']) {
    console.log(`No database detected!`);
    console.log(`Creating new database file...`);
    // If the table isn't there, create it and setup the database correctly.
    sql.prepare("CREATE TABLE scores (id TEXT PRIMARY KEY, user TEXT, guild TEXT, points INTEGER, level INTEGER);").run();

    // Ensure that the "id" row is always unique and indexed.
    sql.prepare("CREATE UNIQUE INDEX idx_scores_id ON scores (id);").run();
    
    console.log(`Configuring database...`);
    sql.pragma("synchronous = 1");
    sql.pragma("journal_mode = wal");
  }

  console.log(`Preparing Statements...`);
  // And then we have two prepared statements to get and set the score data.
  bot.getScore = sql.prepare("SELECT * FROM scores WHERE user = ?");
  bot.setScore = sql.prepare("INSERT OR REPLACE INTO scores (id, user, points, level) VALUES (@id, @user, @points, @level);");
});

bot.on("message", message => {

  if (message.author.bot) return;
  if (message.channel.type != 'dm') return;
  console.log(`DM received! ${message.guild}`);
  console.log(`${message.author.id}`);
  
  if (message.channel.type == 'dm') {
    let score = bot.getScore.get(message.author.id);
    if (!score) {
      score = { 
        id: `${message.author.id}`
        , user: `${message.author.id}`
        , points: 0
        , level: 1 }
    }
    
    score.points++;
    const curLevel = Math.floor(0.1 * Math.sqrt(score.points));
    if(score.level < curLevel) {
      score.level++;
      message.reply(`You've leveled up to level **${curLevel}**! Ain't that dandy?`);
    }

    bot.setScore.run(score);

    if (message.content.indexOf('!') !== 0) return;

    const args = message.content.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Command-specific code here!
    if(command === "points") {
      return message.reply(`You currently have ${score.points} points and are level ${score.level}!`);
    }
    if(command === "give") {
    
      const user = message.mentions.users.first() || bot.users.get(args[0]);
      if(!user) return message.reply("You must mention someone or give their ID!");
    
      const pointsToAdd = parseInt(args[1], 10);
      if(!pointsToAdd) return message.reply("You didn't tell me how many points to give...")
    
      // Get their current points.
      let userscore = bot.getScore.get(user.id, message.guild.id);
      // It's possible to give points to a user we haven't seen, so we need to initiate defaults here too!
      if (!userscore) {
        userscore = { id: `${user.id}`, user: user.id, points: 0, level: 1 }
      }
      userscore.points += pointsToAdd;
    
      // We also want to update their level (but we won't notify them if it changes)
      let userLevel = Math.floor(0.1 * Math.sqrt(score.points));
      userscore.level = userLevel;
    
      // And we save it!
      bot.setScore.run(userscore);
    
      return message.channel.send(`${user.tag} has received ${pointsToAdd} points and now stands at ${userscore.points} points.`);
    }
    
    if(command === "leaderboard") {
      const top10 = sql.prepare("SELECT * FROM scores WHERE guild = ? ORDER BY points DESC LIMIT 10;").all(message.guild.id);
    
        // Now shake it and show it! (as a nice embed, too!)
      const embed = new Discord.RichEmbed()
        .setTitle("Leaderboard")
        .setAuthor(bot.user.username, bot.user.avatarURL)
        .setDescription("Our top 10 points leaders!")
        .setColor(0x00AE86);
    
      for(const data of top10) {
        embed.addField(bot.users.get(data.user).tag, `${data.points} points (level ${data.level})`);
      }
      return message.channel.send({embed});
    }
    
  }
});

bot.login(auth.token);