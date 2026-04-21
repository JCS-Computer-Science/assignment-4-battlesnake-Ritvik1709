export default function move(gameState){
    let moveSafety = {
        up: true,
        down: true,
        left: true,
        right: true
    };

    const myHead = gameState.you.body[0];
    const possibleMoves = {
        up: { x: myHead.x, y: myHead.y + 1 },
        down: { x: myHead.x, y: myHead.y - 1 },
        left: { x: myHead.x - 1, y: myHead.y },
        right: { x: myHead.x + 1, y: myHead.y }
    };
    
    // We've included code to prevent your Battlesnake from moving backwards
    const myNeck = gameState.you.body[1];
    
    if (myNeck) {
        if (myNeck.x < myHead.x) {       
            moveSafety.left = false;
            
        } else if (myNeck.x > myHead.x) { 
            moveSafety.right = false;
            
        } else if (myNeck.y < myHead.y) { 
            moveSafety.down = false;
            
        } else if (myNeck.y > myHead.y) {
            moveSafety.up = false;
        }
    }
    
    // TODO: Step 1 - Prevent your Battlesnake from moving out of bounds
    // gameState.board contains an object representing the game board including its width and height
    // https://docs.battlesnake.com/api/objects/board
    for (const [dir, pos] of Object.entries(possibleMoves)) {
        if (pos.x < 0 || pos.x >= gameState.board.width)  moveSafety[dir] = false;
        if (pos.y < 0 || pos.y >= gameState.board.height) moveSafety[dir] = false;
    }

    // TODO: Step 2 - Prevent your Battlesnake from colliding with itself
    // gameState.you contains an object representing your snake, including its coordinates
    // https://docs.battlesnake.com/api/objects/battlesnake
    const myBody = gameState.you.body;

    // track per-direction whether eating food means the tail stays (grows) or moves away (safe)
    const moveWillGrow = {};
    for (const [dir, pos] of Object.entries(possibleMoves)) {
        moveWillGrow[dir] = gameState.board.food.some(f => f.x === pos.x && f.y === pos.y);
    }

    for (const [dir, pos] of Object.entries(possibleMoves)) {
        // if growing: tail stays put so include it, if not: tail moves away so exclude it
        const bodyToCheck = moveWillGrow[dir] ? myBody.slice(1) : myBody.slice(1, -1);
        for (const part of bodyToCheck) {
            if (part.x === pos.x && part.y === pos.y) moveSafety[dir] = false;
        }
    }

    // TODO: Step 3 - Prevent your Battlesnake from colliding with other Battlesnakes
    // gameState.board.snakes contains an array of enemy snake objects, which includes their coordinates
    // https://docs.battlesnake.com/api/objects/battlesnake
    const blockedSquares = new Set();

    for (const snake of gameState.board.snakes) {
        const enemyWillGrow = gameState.board.food.some(f => f.x === snake.body[0].x && f.y === snake.body[0].y);
        const enemyBody = enemyWillGrow ? snake.body : snake.body.slice(0, -1);

        for (const part of enemyBody) {
            blockedSquares.add(`${part.x},${part.y}`);
            for (const [dir, pos] of Object.entries(possibleMoves)) {
                if (part.x === pos.x && part.y === pos.y) moveSafety[dir] = false;
            }
        }
    }

    // avoid head-to-head with snakes that are the same length or longer (we'd lose)
    for (const snake of gameState.board.snakes) {
        if (snake.id === gameState.you.id) continue;
        const enemyHead = snake.body[0];
        for (const [dir, pos] of Object.entries(possibleMoves)) {
            const dist = Math.abs(pos.x - enemyHead.x) + Math.abs(pos.y - enemyHead.y);
            if (dist === 1 && snake.body.length >= gameState.you.body.length - 1) {
                moveSafety[dir] = false;
            }
        }
    }

    // avoid hazard squares
    for (const [dir, pos] of Object.entries(possibleMoves)) {
        for (const hazard of (gameState.board.hazards || [])) {
            if (hazard.x === pos.x && hazard.y === pos.y) moveSafety[dir] = false;
            blockedSquares.add(`${hazard.x},${hazard.y}`);
        }
    }

    // Are there any safe moves left?
    //Object.keys(moveSafety) returns ["up", "down", "left", "right"]
    //.filter() filters the array based on the function provided as an argument (using arrow function syntax here)
    //In this case we want to filter out any of these directions for which moveSafety[direction] == false
    const safeMoves = Object.keys(moveSafety).filter(dir => moveSafety[dir]);
    if (safeMoves.length === 0) {
        console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
        return { move: "down" };
    }

    let nextMove = null;

    // TODO: Step 4 - Move towards food instead of random, to regain health and survive longer
    // gameState.board.food contains an array of food coordinates https://docs.battlesnake.com/api/objects/board

    // flood fill every safe move and pick the one with the most open space
    let bestSpace = -Infinity;
    let bestMove = null;
    const moveSpaces = {};

    for (const dir of safeMoves) {
        const space = floodFill(possibleMoves[dir], gameState, blockedSquares, moveWillGrow[dir]);
        moveSpaces[dir] = space;
        if (space > bestSpace) {
            bestSpace = space;
            bestMove = dir;
        }
    }

    if (bestMove) nextMove = bestMove;

    // if health is low, head toward the closest food (but don't sacrifice too much space)
    if (gameState.you.health < 40 && gameState.board.food.length > 0) {
        let closestFood = null;
        let closestDist = Infinity;

        for (const food of gameState.board.food) {
            const dist = Math.abs(myHead.x - food.x) + Math.abs(myHead.y - food.y);
            if (dist < closestDist) { closestDist = dist; closestFood = food; }
        }

        let bestFoodMove = null;
        let bestFoodDist = Infinity;

        for (const dir of safeMoves) {
            // only use this direction if it doesn't cost us more than 20% of our best open space
            if (moveSpaces[dir] >= bestSpace * 0.8) {
                const dist = Math.abs(possibleMoves[dir].x - closestFood.x) + Math.abs(possibleMoves[dir].y - closestFood.y);
                if (dist < bestFoodDist) { bestFoodDist = dist; bestFoodMove = dir; }
            }
        }

        if (bestFoodMove) nextMove = bestFoodMove;
    }

    // if an enemy is trapped near a wall, try to close them off (only if it's still a good space move)
    const trapMove = findWallTrapMove(safeMoves, possibleMoves, gameState);
    if (trapMove && moveSpaces[trapMove] >= bestSpace * 0.8) nextMove = trapMove;

    // final fallback just in case
    if (!nextMove) nextMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];

    return { move: nextMove };

    // flood fill - counts how many squares are reachable from a starting position
    function floodFill(start, gameState, blockedSquares, willGrow) {
        const seen = new Set();
        const queue = [start];
        seen.add(`${start.x},${start.y}`);

        while (queue.length > 0) {
            const pos = queue.shift();
            const neighbors = [
                { x: pos.x,     y: pos.y + 1 },
                { x: pos.x,     y: pos.y - 1 },
                { x: pos.x - 1, y: pos.y     },
                { x: pos.x + 1, y: pos.y     }
            ];

            for (const next of neighbors) {
                const key = `${next.x},${next.y}`;
                const inBounds = next.x >= 0 && next.x < gameState.board.width &&
                                 next.y >= 0 && next.y < gameState.board.height;
                if (inBounds && !seen.has(key) && !blockedSquares.has(key)) {
                    seen.add(key);
                    queue.push(next);
                }
            }
        }

        // small bonus when eating since growing means the tail spot frees up later
        return seen.size + (willGrow ? 5 : 0);
    }

    // trap opponents against wall - moves toward enemy if they're stuck near a wall
    function findWallTrapMove(safeMoves, possibleMoves, gameState) {
        for (const snake of gameState.board.snakes) {
            if (snake.id === gameState.you.id) continue;

            const enemyHead = snake.body[0];
            const nearWall = enemyHead.x === 0 || enemyHead.x === gameState.board.width - 1 ||
                             enemyHead.y === 0 || enemyHead.y === gameState.board.height - 1;

            if (!nearWall) continue;

            let bestMove = null;
            let bestDist = Infinity;

            for (const dir of safeMoves) {
                const dist = Math.abs(possibleMoves[dir].x - enemyHead.x) + Math.abs(possibleMoves[dir].y - enemyHead.y);
                if (dist < bestDist) { bestDist = dist; bestMove = dir; }
            }

            return bestMove; // return first good trap opportunity
        }

        return null;
    }
}
