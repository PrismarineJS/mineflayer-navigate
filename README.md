# mineflayer-navigate

A library to help your mineflayer bot navigate around the 3D world using
the A* algorithm.

See [https://github.com/superjoe30/mineflayer/](https://github.com/superjoe30/mineflayer/)

[YouTube Demo](http://www.youtube.com/watch?v=O6lQdmRz8eE)

## Usage

```js
var mineflayer = require('mineflayer');
var navigatePlugin = require('mineflayer-navigate')(mineflayer);
var bot = mineflayer.createBot({ username: 'Player' });
// install the plugin
navigatePlugin(bot);
// optional configuration
bot.navigate.blocksToAvoid[132] = true; // avoid tripwire
bot.navigate.blocksToAvoid[59] = false; // ok to trample crops
bot.navigate.on('pathFound', function (path) {
  bot.chat("found path. I can get there in " + path.length + " moves.");
});
bot.navigate.on('cannotFind', function (closestPoint) {
  bot.chat("unable to find path. getting as close as possible");
  bot.navigate.to(closestPoint);
});
bot.navigate.on('arrived', function () {
  bot.chat("I have arrived");
});
bot.navigate.on('stop', function() {
  bot.chat("stopping");
});
bot.on('chat', function(username, message) {
  // navigate to whoever talks
  if (username === bot.username) return;
  var target = bot.players[username].entity;
  if (message === 'come') {
    bot.navigate.to(target.position);
  } else if (message === 'stop') {
    bot.navigate.stop();
  }
});
```

## Documentation

### bot.navigate.to(point, options)

Finds a path to the specified location and goes there.

 * `point` - the block you want your feet to be standing on
 * `options` - optional parameters which come with sensible defaults
   - `isEnd` - function(node) - passed on to the A* library. `node.point` is
     a vec3 instance.
   - `endRadius` - used for default `isEnd`. Effectively defaults to 0.
   - `timeout` - passed on to the A* library. Default 10 seconds.

### bot.navigate.stop()

Aborts an in progress navigation job.

### event "pathPartFound" (path)

Emitted from `bot.navigate` when a partial path is found. `path` is an array
of nodes.

### event "pathFound" (path)

Emitted from `bot.navigate` when a complete path is found. `path` is an array
of nodes.

### event "cannotFind"

Emitted when a path cannot be found.

### event "arrived"

Emitted when the destination is reached.

### event "stop"

Emitted when navigation has been aborted.

## History

### 0.0.3

 * fix bot looking at its feet while walking
 * possible speed improvement by using native array methods
 * `cannotFind` event now has `closestPoint` parameter, the closest point it
   *could* get to
 * `bot.navigate.blocksToAvoid` is a map of block id to boolean value which
   tells whether to avoid the block. comes with sensible defaults like
   avoiding fire and crops.

### 0.0.2

 * fix pathfinding very far away
