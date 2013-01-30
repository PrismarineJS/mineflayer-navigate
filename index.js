var aStar = require('a-star')
  , EventEmitter = require('events').EventEmitter

module.exports = init;

// instantiated from init
var vec3;

var MONITOR_INTERVAL = 40;
var WATER_THRESHOLD = 20;
var DEFAULT_TIMEOUT = 10 * 1000; // 10 seconds
var DEFAULT_END_RADIUS = 0.1;

// if the distance is more than this number, navigator will opt to simply
// head in the correct direction and recalculate upon getting closer
var TOO_FAR_THRESHOLD = 150;

function init(mineflayer) {
  vec3 = mineflayer.vec3;
  return inject;
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

  bot.navigate.blocksToAvoid = {
    51: true, // fire
    59: true, // crops
    10: true, // lava
    11: true, // lava
  };

  // publicly exposed
  function navigateTo(end, params) {
    stop();
    end = end.floored();
    params = params || {};
    var timeout = params.timeout == null ? DEFAULT_TIMEOUT : params.timeout;
    var endRadius = params.endRadius == null ? DEFAULT_END_RADIUS : params.endRadius;
    var isEnd = params.isEnd || createIsEndWithRadius(end, endRadius);
    var heuristic = createHeuristicFn(end);

    navigate({
      onArrived: onArrived,
      onPathFound: onPathFound,
      onCannotFind: onCannotFind,
    });

    function onArrived() {
      bot.navigate.emit("arrived");
    }

    function onPathFound(path) {
      bot.navigate.emit("pathFound", path);
    }

    function onCannotFind(closestPoint) {
      bot.navigate.emit("cannotFind", closestPoint);
    }

    function navigate(params) {
      var start = bot.entity.position.floored();
      var onPathFound = params.onPathFound;
      var onArrived = params.onArrived;
      var actualIsEnd = isEnd;
      if (start.distanceTo(end) > TOO_FAR_THRESHOLD) {
        // Too far to calculate reliably. Go in the right general direction for now.
        actualIsEnd = justGoIsEnd;
        onArrived = nextPartOnArrived;
        onPathFound = onPartialPathFound;
      }
      var closestPoint = null;
      var closestPointDistance = null;
      var path = aStar({
        start: new Node(start, 0),
        isEnd: actualIsEnd,
        neighbor: getNeighbors,
        distance: distanceFunc,
        heuristic: heuristic,
        timeout: timeout,
      });
      if (path == null) {
        params.onCannotFind(closestPoint);
        return;
      }
      onPathFound(path);

      // start
      // go to the centers of blocks
      currentCourse = path.map(nodeCenterOffset);
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
            stop(true);
            onArrived();
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
        var lookAtY = currentPosition.y + bot.entity.height;
        var lookAtPoint = vec3(nextPoint.x, lookAtY, nextPoint.z);
        bot.lookAt(lookAtPoint);
        bot.setControlState('forward', true);
      }
      currentCallbackId = setInterval(monitorMovement, MONITOR_INTERVAL);

      function justGoIsEnd(node) {
        // let's just go 100 meters (and not end in water)
        return node.water === 0 && start.distanceTo(node.point) >= 100;
      }

      function nextPartOnArrived() {
        // try to go the next bit
        navigate({
          onArrived: params.onArrived,
          onPathFound: params.onPathFound,
        });
      }

      function onPartialPathFound(path) {
        bot.navigate.emit("pathPartFound", path);
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
        var distance = point.distanceTo(end);
        if (!closestPoint || distance < closestPointDistance) {
          closestPoint = point;
          closestPointDistance = distance;
        }
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
            return block ? {
              safe: isSafe(block),
              physical: block.boundingBox === 'block',
            } : {
              safe: false,
              physical: false,
            };
          }
        });
        return result.map(function(point) {
          var faceBlock = bot.blockAt(point.offset(0, 1, 0));
          var water = 0;
          if (faceBlock.type === 0x08 || faceBlock.type === 0x09) {
            water = node.water + 1;
          }
          return new Node(point, water);
        }).filter(function(node) {
          return node.water <= WATER_THRESHOLD;
        });
      }
    }
  }

  function stop(arrived) {
    if (currentCallbackId === undefined) return;
    clearInterval(currentCallbackId);
    currentCallbackId = undefined;
    bot.clearControlStates();
    bot.navigate.emit("stop");
    if (! arrived) bot.navigate.emit("interrupted");
  }

  function isSafe(block) {
    return block.boundingBox === 'empty' &&
      !bot.navigate.blocksToAvoid[block.type];
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

function nodeCenterOffset(node) {
  return node.point.offset(0.5, 0, 0.5);
}

function Node(point, water) {
  this.point = point;
  this.water = water;
}
Node.prototype.toString = function() {
  // must declare a toString so that A* works.
  return this.point.toString() + ":" + this.water;
};

function createHeuristicFn(end) {
  return function(node) {
    return node.point.distanceTo(end) + 5 * node.water;
  };
}
