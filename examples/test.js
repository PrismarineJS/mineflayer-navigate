var mineflayer = require('mineflayer');
var vec3 = mineflayer.vec3;
var navigatePlugin = require('../')(mineflayer);
var bot = mineflayer.createBot({
  username: "Player",
});
navigatePlugin(bot);
bot.navigate.on('pathPartFound', function (path) {
  bot.chat("Going " + path.length + " meters in the general direction for now.");
});
bot.navigate.on('pathFound', function (path) {
  bot.chat("I can get there in " + path.length + " moves.");
});
bot.navigate.on('cannotFind', function () {
  bot.chat("unable to find path");
});
bot.navigate.on('arrived', function () {
  bot.chat("I have arrived");
});
bot.navigate.on('stop', function() {
  bot.chat("stopping");
});
bot.on('chat', function(username, message) {
  if (username === bot.username) return;
  var target = bot.players[username].entity;
  if (message === 'come') {
    bot.navigate.to(target.position);
  } else if (message === 'stop') {
    bot.navigate.stop();
  } else {
    var match = message.match(/^goto\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d)+\s*\)$/);
    if (match) {
      var pt = vec3(match[1], match[2], match[3]);
      bot.navigate.to(pt);
    } else {
      console.log("no match");
    }
  }
});
