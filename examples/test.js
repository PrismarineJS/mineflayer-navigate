var mineflayer = require('mineflayer');
var vec3 = mineflayer.vec3;
var navigatePlugin = require('../')(mineflayer);
var bot = mineflayer.createBot({
  username: "Player",
});
navigatePlugin(bot);
bot.navigate.blocksToAvoid[132] = true; // avoid tripwire
bot.navigate.blocksToAvoid[59] = false; // ok to trample crops
bot.navigate.on('pathPartFound', function (path) {
  bot.chat("Going " + path.length + " meters in the general direction for now.");
});
bot.navigate.on('pathFound', function (path) {
  bot.chat("I can get there in " + path.length + " moves.");
});
bot.navigate.on('cannotFind', function (closestPath) {
  bot.chat("unable to find path. getting as close as possible");
  bot.navigate.walk(closestPath);
});
bot.navigate.on('arrived', function () {
  bot.chat("I have arrived");
});
bot.navigate.on('interrupted', function() {
  bot.chat("stopping");
});
bot.on('chat', function(username, message) {
  if (username === bot.username) return;
  var target = bot.players[username].entity;
  if (message === 'come') {
    bot.navigate.to(target.position);
  } else if (message === 'stop') {
    bot.navigate.stop();
  } else if (message === 'testcb') {
    bot.chat("computing path to " + target.position);
    var results = bot.navigate.findPathSync(target.position);
    bot.chat("status: " + results.status);
    bot.navigate.walk(results.path, function(stopReason) {
      bot.chat("done. " + stopReason);
    });
  } else {
    var match = message.match(/^goto\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s*$/);
    if (match) {
      var pt = vec3(
        parseFloat(match[1], 10),
        parseFloat(match[2], 10),
        parseFloat(match[3], 10));
      bot.navigate.to(pt);
    } else {
      console.log("no match");
    }
  }
});
