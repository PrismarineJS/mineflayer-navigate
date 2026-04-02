# mineflayer-navigate
[![NPM version](https://img.shields.io/npm/v/mineflayer-navigate.svg)](http://npmjs.com/package/mineflayer-navigate)
[![Build Status](https://github.com/PrismarineJS/mineflayer-navigate/workflows/CI/badge.svg)](https://github.com/PrismarineJS/mineflayer-navigate/actions?query=workflow%3A%22CI%22)

**Deprecated package** : this library is a simple example of pathfinding and works well for the simple cases, you can study its code. However if you need something more robust, we advise to use https://github.com/Karang/mineflayer-pathfinder instead 

A library to help your mineflayer bot navigate around the 3D world using
the A* algorithm.

See [https://github.com/superjoe30/mineflayer/](https://github.com/superjoe30/mineflayer/)

[YouTube Demo](http://www.youtube.com/watch?v=O6lQdmRz8eE)

## Usage

```js
const mineflayer = require('mineflayer');
const navigatePlugin = require('mineflayer-navigate')(mineflayer);
const bot = mineflayer.createBot({ username: 'Player' });
// install the plugin
navigatePlugin(bot);
// optional configuration
bot.navigate.blocksToAvoid[132] = true; // avoid tripwire
bot.navigate.blocksToAvoid[59] = false; // ok to trample crops
bot.navigate.on('pathFound', function (path) {
  bot.chat("found path. I can get there in " + path.length + " moves.");
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
  // navigate to whoever talks
  if (username === bot.username) return;
  const target = bot.players[username].entity;
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
 * `options` - See `bot.navigate.findPathSync`

#### event "pathPartFound" (path)

Emitted from `bot.navigate` when a partial path is found. `path` is an array
of nodes.

#### event "pathFound" (path)

Emitted from `bot.navigate` when a complete path is found. `path` is an array
of nodes.

#### event "cannotFind" (closestPoint)

Emitted when a path cannot be found.

 * `closestPoint` - a `vec3` instance - the closest point that you *could*
   navigate to.

#### event "arrived"

Emitted when the destination is reached.

#### event "stop"

Emitted when navigation has been aborted.


### bot.navigate.stop()

Aborts an in progress navigation job.

### bot.navigate.findPathSync(end, [options])

Finds a path to `end`. Can be used to see if it is possible to navigate to a
particular point.

Returns an object that looks like:

```js
{
  status: 'success', // one of ['success', 'noPath', 'timeout', 'tooFar']
  path: [startPoint, point1, point2, ..., endPoint],
}
```

The value of `status` has several meanings:

 * `success` - `path` is an array of points that can be passed to `walk()`.
 * `noPath` - there is no path to `end`. Try a larger `endRadius`. `path`
   is the path to the closest reachable point to end.
 * `timeout` - no path could be found in the allotted time. Try a larger
   `endRadius` or `timeout`. `path` is the path to the closest reachable
    point to end that could be found in the allotted time.
 * `tooFar` - `end` is too far away, so `path` contains the path to walk 100
   meters in the general direction of `end`.

Parameters:

 * `end` - the block you want your feet to be standing on
 * `options` - optional parameters which come with sensible defaults
   - `isEnd` - function(node) - passed on to the A* library. `node.point` is
     a vec3 instance.
   - `endRadius` - used for default `isEnd`. Effectively defaults to 0.
   - `timeout` - passed on to the A* library. Default 10 seconds.
   - `tooFarThreshold` - if `end` is greater than `tooFarThreshold`, this
     function will search instead for a path to walk 100 meters in the general
     direction of end.

### bot.navigate.walk(path, [callback])

*Note: does not emit events*

Walks the bot along the path and calls the callback function when it has
arrived.

Call `bot.navigate.stop()` to interrupt walking.

 * `path` - array of points to be navigated.
 * `callback(stopReason)` - (optional) - called when the bot has arrived.
   `stopReason` can be: ['obstructed', 'arrived', 'interrupted']

## History

### 0.1.0
* [Add repo commands workflow (#70)](https://github.com/PrismarineJS/mineflayer-navigate/commit/7576d20f372538a30595c3edc97331e0a85dcb8f) (thanks @rom1504)
* [Update CI to Node 24 (#69)](https://github.com/PrismarineJS/mineflayer-navigate/commit/98d6f8fc0a12245b7a760b1a268c5511f4069402) (thanks @rom1504)
* [Fix publish workflow for trusted publishing (#68)](https://github.com/PrismarineJS/mineflayer-navigate/commit/f65cbed2ddf4de89cf7260fb074c35a1246267e0) (thanks @rom1504)
* [Switch to trusted publishing via OIDC (#67)](https://github.com/PrismarineJS/mineflayer-navigate/commit/180a1030f14a5d9678f25bd60accbd4ad4318d93) (thanks @rom1504)
* [node 22 (#66)](https://github.com/PrismarineJS/mineflayer-navigate/commit/9993b0d81e0f013933f6f5e4ad6c1e9ab874bf90) (thanks @rom1504)
* [Update to node 18.0.0 (#65)](https://github.com/PrismarineJS/mineflayer-navigate/commit/f554c0762571a1c4cfc6aa5641fd08d12c9ad1b7) (thanks @rom1504)
* [Bump standard from 16.0.4 to 17.0.0 (#61)](https://github.com/PrismarineJS/mineflayer-navigate/commit/5dcb40593e7aa679a0e217ac4c4a7ce229f0c9d3) (thanks @dependabot[bot])
* [Bump mineflayer from 3.18.0 to 4.0.0 (#60)](https://github.com/PrismarineJS/mineflayer-navigate/commit/8d7f3548627713a94b28a1a883bbd4bc44fed2e1) (thanks @dependabot[bot])
* [Upgrade to GitHub-native Dependabot (#58)](https://github.com/PrismarineJS/mineflayer-navigate/commit/705d7416fb7109ed7f0d527b78881ff290da32e5) (thanks @dependabot-preview[bot])
* [Bump mineflayer from 2.41.0 to 3.0.0 (#56)](https://github.com/PrismarineJS/mineflayer-navigate/commit/7cc83b95c2789343f805162a46924d748b03cd97) (thanks @dependabot-preview[bot])
* [update to standard 16](https://github.com/PrismarineJS/mineflayer-navigate/commit/9ea6b2d86c42bb44d040fdb206e751a0fa5db64a) (thanks @rom1504)
* [add npmrc that disable package-lock.json creation](https://github.com/PrismarineJS/mineflayer-navigate/commit/ad3fa627fa9a982d61b260f7674114628b034100) (thanks @rom1504)
* [update standard to version 15](https://github.com/PrismarineJS/mineflayer-navigate/commit/e2ae221f0330997aef4758bdb2a7cce1e32ec49b) (thanks @rom1504)
* [put deprecated in bold](https://github.com/PrismarineJS/mineflayer-navigate/commit/b2be52b9aad4c12bfe6d345873b14a49b3f94988) (thanks @rom1504)
* [circle ci -> github action](https://github.com/PrismarineJS/mineflayer-navigate/commit/4f59bde4cca9a8c2590eb1c1d2acd265e83b5a77) (thanks @rom1504)
* [Add deprecation notice](https://github.com/PrismarineJS/mineflayer-navigate/commit/c49900fd6ed26c3731be599018f5209251e8a15b) (thanks @rom1504)
* [Merge pull request #50 from PrismarineJS/dependabot/npm_and_yarn/standard-14.3.4](https://github.com/PrismarineJS/mineflayer-navigate/commit/b9339e482f38934994bece9e3227f15e4ec304a4) (thanks @rom1504)
* [standard fix](https://github.com/PrismarineJS/mineflayer-navigate/commit/f21846ac15c805752ff2c6f717f599b34e83f92f) (thanks @rom1504)
* [Bump standard from 11.0.1 to 14.3.4](https://github.com/PrismarineJS/mineflayer-navigate/commit/15b34118ed04a6ef75f9936034117e3edeadf08f) (thanks @dependabot-preview[bot])
* [circleci 2](https://github.com/PrismarineJS/mineflayer-navigate/commit/6f84e292ce18d02b96bdbbb61354372cd3fac8e3) (thanks @rom1504)
* [use standardjs](https://github.com/PrismarineJS/mineflayer-navigate/commit/eccb51ebac67edc943e912954b50c65e348b011d) (thanks @rom1504)

### 0.0.10

 * depends on vec3 directly

### 0.0.9

 * don't emit `arrived` twice. (thanks Benjamin Grosse)

### 0.0.8

 * walk: detect being obstructed and call callback with `'obstructed'`
   `stopReason` when it happens.

### 0.0.7

 * walk: callback is still called if `bot.navigate.stop()` is called
   elsewhere. Also it now has a `stopReason` argument.

### 0.0.6

 * fix default `endRadius` too low (thanks vogonistic)

### 0.0.5

 * recommended API is now callback based (thanks vogonistic)
 * add `bot.navigate.findPathSync(end, [options])`
 * add `bot.navigate.walk(path, [callblack])`

### 0.0.4

 * add 'interrupted' event

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
