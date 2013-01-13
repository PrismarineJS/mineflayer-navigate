var mineflayer = require('mineflayer');
var bot = mineflayer.createBot({
  username: "navigator",
});
require('../')(bot);
bot.navigate.on('pathPartFound', function (path) {
  console.log(path);
  bot.chat("found partial path");
});
bot.navigate.on('pathFound', function (path) {
  console.log(path);
  bot.chat("found path");
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
  }
});
