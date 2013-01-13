var aStar = require('a-star')
  , EventEmitter = require('events').EventEmitter
  , mineflayer = require('mineflayer')
  , vec3 = mineflayer.vec3

module.exports = inject;

function arrayFiltered(array, predicate) {
  var result = [];
  for (var i = 0; i < array.length; i++) {
    var item = array[i];
    if (predicate(item)) result.push(item);
  }
  return result;
}

function arrayMapped(array, transformer) {
  var result = [];
  for (var i = 0; i < this.length; i++) {
    result.push(transformer(array[i]));
  }
  return result;
}

var MONITOR_INTERVAL = 40;
var WATER_THRESHOLD = 20;
var DEFAULT_TIMEOUT = 10 * 1000; // 10 seconds
var DEFAULT_END_RADIUS = 0.1;

// if the distance is more than this number, navigator will opt to simply
// head in the correct direction and recalculate upon getting closer
var TOO_FAR_THRESHOLD = 150;

function createHeuristicFn(end) {
  return function(node) {
    return node.point.distanceTo(end) + 5 * node.water;
  };
}

function inject(bot) {
  var currentCallbackId;
  var currentCourse = [];
  var cardinalDirectionVectors = [
    vec3(-1, 0,  0), // north
    vec3( 1, 0,  0), // south
    vec3( 0, 0, -1), // east
    vec3( 0, 0,  1), // west
  ];

  bot.navigate = new EventEmitter();
  bot.navigate.to = navigateTo;
  bot.navigate.stop = stop;

  function navigateTo(end, params) {
    stop();
    var start = bot.entity.position.floored();
    end = end.floored();
    params = params || {};
    var timeout = params.timeout == null ? DEFAULT_TIMEOUT : params.timeout;
    var endRadius = params.endRadius == null ? DEFAULT_END_RADIUS : params.endRadius;
    var isEnd = params.isEnd || createIsEndWithRadius(end, endRadius);

    if (start.distanceTo(end) > TOO_FAR_THRESHOLD) {
      // Too far to calculate reliably. Go in the right general direction for now.
                assert.ok(false, "haven't fixed this code yet");
                var old_is_end_func = params.isEnd;
                var old_path_found_func = params.pathFound;
                var old_arrived_func = params.arrived;
                params.isEnd = function(node) {
                    // let's just go 100 meters (not end in water)
                    return node.water === 0 && start.distanceTo(node.point) >= 100;
                };
                params.pathFound = params.pathPartFound;
                params.arrived = function() {
                    // try to go the next bit
                    params.isEnd = old_is_end_func;
                    params.pathFound = old_path_found_func;
                    params.arrived = old_arrived_func;
                    navigateTo(end, params);
                };
    }
    var path = aStar({
      start: new Node(start, 0),
      isEnd: isEnd,
      neighbor: getNeighbors,
      distance: distanceFunc,
      heuristic: createHeuristicFn(end),
      timeout: timeout,
    });
    if (path == null) {
      bot.navigate.emit("cannotFind");
      return;
    }
    bot.navigate.emit("pathFound", path);

    // start
    // go to the centers of blocks
    currentCourse = path.mapped(function(node) { return node.point.offset(0.5, 0, 0.5); });
    var lastNodeTime = new Date().getTime();
    function monitorMovement() {
      var nextPoint = currentCourse[0];
      var currentPosition = bot.entity.position;
      if (currentPosition.distanceTo(nextPoint) <= 0.2) {
        // arrived at next point
        lastNodeTime = new Date().getTime();
        currentCourse.shift();
        if (currentCourse.length === 0) {
          // done
          stop();
          bot.navigate.emit("arrived");
          return;
        }
        // not done yet
        nextPoint = currentCourse[0];
      }
      var delta = nextPoint.minus(currentPosition);
      var gottaJump;
      var horizontalDelta = Math.abs(delta.x + delta.z);
      if (delta.y > 0.1) {
        // gotta jump up when we're close enough
        gottaJump = horizontalDelta < 1.75;
      } else if (delta.y > -0.1) {
        // possibly jump over a hole
        gottaJump = 1.5 < horizontalDelta && horizontalDelta < 2.5;
      } else {
        gottaJump = 2.4 < horizontalDelta && horizontalDelta < 2.7;
      }
      bot.setControlState('jump', gottaJump);

      // run toward next point
      var lookAtPoint = vec3(nextPoint.x, currentPosition.y, nextPoint.z);
      bot.lookAt(lookAtPoint);
      bot.setControlState('forward', true);

      // check for futility
      if (new Date().getTime() - lastNodeTime > 1500) {
        // should never take this long to go to the next node
        // reboot the path finding algorithm.
        navigateTo(end, params);
      }
    }
    currentCallbackId = setInterval(monitorMovement, MONITOR_INTERVAL);
  }

  function stop() {
    if (currentCallbackId === undefined) return;
    clearInterval(currentCallbackId);
    currentCallbackId = undefined;
    bot.clearControlStates();
    bot.navigate.emit("stop");
  }

  function getNeighbors(node) {
    // for each cardinal direction:
    // "." is head. "+" is feet and current location.
    // "#" is initial floor which is always solid. "a"-"u" are blocks to check
    //
    //   --0123-- horizontalOffset
    //  |
    // +2  aho
    // +1  .bip
    //  0  +cjq
    // -1  #dkr
    // -2   els
    // -3   fmt
    // -4   gn
    //  |
    //  dz
    //
    var point = node.point;
    var isSafeA = isSafe(bot.blockAt(point.offset(0, 2, 0)));
    var result = [];
    cardinalDirectionVectors.forEach(function(directionVector) {
      var blockH, blockE;
      var pointB = pointAt(1, 1);
      var blockB = properties(pointB);
      if (!blockB.safe) {
        // we can do nothing in this direction
        return;
      }
      var pointC = pointAt(1, 0);
      var blockC = properties(pointC);
      if (!blockC.safe) {
        // can't walk forward
        if (!blockC.physical) {
          // too dangerous
          return;
        }
        if (!isSafeA) {
          // can't jump
          return;
        }
        blockH = properties(pointAt(1, 2));
        if (!blockH.safe) {
          // no head room to stand on c
          return;
        }
        // can jump up onto c
        result.push(pointB);
        return;
      }
      // c is open
      var pointD = pointAt(1, -1);
      var blockD = properties(pointD);
      if (blockD.physical) {
        // can walk onto d. this is the case of flat ground.
        result.push(pointC);
        return;
      }
      if (blockD.safe) {
        // safe to drop through d
        var pointE = pointAt(1, -2);
        blockE = properties(pointE);
        if (blockE.physical) {
          // can drop onto e
          result.push(pointD);
        } else if (blockE.safe) {
          // can drop through e
          var pointF = pointAt(1, -3);
          var blockF = properties(pointF);
          if (blockF.physical) {
            // can drop onto f
            result.push(pointE);
          } else if (blockF.safe) {
            // can drop through f
            var blockG = properties(pointAt(1, -4));
            if (blockG.physical) {
              result.push(pointF);
            }
          }
        }
      }
      // might be able to jump over the d hole.
      blockH = properties(pointAt(1, 2));
      var blockO = properties(pointAt(2, 2));
      var canJumpForward = isSafeA && blockH.safe && blockO.safe;

      var pointI = pointAt(2, 1);
      var blockI = properties(pointI);
      var pointJ = pointAt(2, 0);
      var blockJ = properties(pointJ);
      if (canJumpForward && blockI.safe && blockJ.physical) {
        // can jump over and up onto j
        result.push(pointI);
      }
      var pointK = pointAt(2, -1);
      var blockK = properties(pointK);
      var canJumpPastJ = canJumpForward && blockJ.safe && blockI.safe;
      if (canJumpPastJ && blockK.physical) {
        // can jump over onto k
        result.push(pointJ);
        canJumpPastJ = false;
      }

      // might be able to walk and drop forward
      var pointL = pointAt(2, -2);
      var blockL = properties(pointL);
      var canLandOnL = false;
      if (blockI.safe && blockJ.safe && blockK.safe && blockL.physical) {
        // can walk and drop onto l
        canLandOnL = true;
        result.push(pointK);
      }

      if (blockE === undefined) blockE = properties(pointAt(1, -2));
      var canLandOnM = false;
      if (blockE.safe) {
        // can drop through e
        var pointM = pointAt(2, -3);
        var blockM = properties(pointM);
        if (blockJ.safe && blockK.safe && blockL.safe && blockM.physical) {
          // can walk and drop onto m
          canLandOnM = true;
          result.push(pointL);
        }
        var blockN = properties(pointAt(2, -4));
        if (blockK.safe && blockL.safe && blockM.safe && blockN.physical) {
          // can walk and drop onto n
          result.push(pointM);
        }
      }
      if (!canJumpPastJ) return;
      // 3rd column
      var blockP = properties(pointAt(3, 1));
      var pointQ = pointAt(3, 0);
      var blockQ = properties(pointQ);
      var pointR = pointAt(3, -1);
      var blockR = properties(pointR);
      if (blockP.safe && blockQ.safe && blockR.physical) {
        // can jump way over onto r
        result.push(pointQ);
        return;
      }
      var pointS = pointAt(3, -2);
      var blockS = properties(pointS);
      if (!canLandOnL && blockQ.safe && blockR.safe && blockS.physical) {
        // can jump way over and down onto s
        result.push(pointR);
        return;
      }
      var blockT = properties(pointAt(3, -3));
      if (!canLandOnM && blockR.safe && blockS.safe && blockT.physical) {
        // can jump way over and down onto t
        result.push(pointS);
        return;
      }

      function pointAt(horizontalOffset, dy) {
        return point.offset(directionVector.x * horizontalOffset, dy, directionVector.z * horizontalOffset);
      }
      function properties(point) {
        var block = bot.blockAt(point);
        return {
          safe: isSafe(block),
          physical: block.boundingBox === 'solid',
        };
      }
    });
    var mappedResult = arrayMapped(result, function(point) {
      var faceBlock = bot.blockAt(point.offset(0, 1, 0));
      var water = 0;
      if (faceBlock.type === 0x08 || faceBlock.type === 0x09) {
        water = node.water + 1;
      }
      return new Node(point, water);
    });
    return arrayFiltered(mappedResult, function(node) {
      return node.water <= WATER_THRESHOLD;
    });
  }
}

function createIsEndWithRadius(end, radius) {
  return function(node) {
    return node.point.distanceTo(end) <= radius;
  };
}

function distanceFunc(nodeA, nodeB) {
  return nodeA.point.distanceTo(nodeB.point);
}

function isSafe(block) {
  return block.boundingBox === 'empty';
}

function Node(point, water) {
  this.point = point;
  this.water = water;
}
Node.prototype.toString = function() {
  // must declare a toString so that A* works.
  return this.point.toString() + ":" + this.water;
};
