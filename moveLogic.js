export default function move(gameState){
    let moveSafety = {
        up: true,
        down: true,
        left: true,
        right: true
    };
    
    // We've included code to prevent your Battlesnake from moving backwards
    const myHead = gameState.you.body[0];
    const myNeck = gameState.you.body[1];
    
    if (myNeck.x < myHead.x) {        // Neck is left of head, don't move left
        moveSafety.left = false;
        
    } else if (myNeck.x > myHead.x) { // Neck is right of head, don't move right
        moveSafety.right = false;
        
    } else if (myNeck.y < myHead.y) { // Neck is below head, don't move down
        moveSafety.down = false;
        
    } else if (myNeck.y > myHead.y) { // Neck is above head, don't move up
        moveSafety.up = false;
    }
    
    // TODO: Step 1 - Prevent your Battlesnake from moving out of bounds
    // gameState.board contains an object representing the game board including its width and height
    // https://docs.battlesnake.com/api/objects/board
    const boardWidth = gameState.board.width;
    const boardHeight = gameState.board.height;

    if (myHead.x === 0)              moveSafety.left = false;
    if (myHead.x === boardWidth - 1)  moveSafety.right = false;
    if (myHead.y === 0)               moveSafety.down = false;
    if (myHead.y === boardHeight - 1) moveSafety.up = false;

    // TODO: Step 2 - Prevent your Battlesnake from colliding with itself
    // gameState.you contains an object representing your snake, including its coordinates
    // https://docs.battlesnake.com/api/objects/battlesnake
    const myBody = gameState.you.body;
 
    for (const segment of myBody) {
        if (segment.x === myHead.x + 1 && segment.y === myHead.y) moveSafety.right = false;
        if (segment.x === myHead.x - 1 && segment.y === myHead.y) moveSafety.left = false;
        if (segment.y === myHead.y + 1 && segment.x === myHead.x) moveSafety.up = false;
        if (segment.y === myHead.y - 1 && segment.x === myHead.x) moveSafety.down = false;
    }

    // TODO: Step 3 - Prevent your Battlesnake from colliding with other Battlesnakes
    // gameState.board.snakes contains an array of enemy snake objects, which includes their coordinates
    // https://docs.battlesnake.com/api/objects/battlesnake
    const opponents = gameState.board.snakes;
 
    for (const snake of opponents) {
        for (const segment of snake.body) {
            if (segment.x === myHead.x + 1 && segment.y === myHead.y) moveSafety.right = false;
            if (segment.x === myHead.x - 1 && segment.y === myHead.y) moveSafety.left = false;
            if (segment.y === myHead.y + 1 && segment.x === myHead.x) moveSafety.up = false;
            if (segment.y === myHead.y - 1 && segment.x === myHead.x) moveSafety.down = false;
        }
    }
    //avoid head to head
    for (const snake of opponents) {
        if (snake.id === gameState.you.id) continue;
        const enemyHead = snake.body[0];
        const enemyLength = snake.body.length;
        const enemyMoves = [
            { x: enemyHead.x + 1, y: enemyHead.y },
            { x: enemyHead.x - 1, y: enemyHead.y },
            { x: enemyHead.x,     y: enemyHead.y + 1 },
            { x: enemyHead.x,     y: enemyHead.y - 1 },
        ];
        for (const cell of enemyMoves) {
            if (enemyLength >= myLength) {
                if (cell.x === myHead.x + 1 && cell.y === myHead.y) moveSafety.right = false;
                if (cell.x === myHead.x - 1 && cell.y === myHead.y) moveSafety.left = false;
                if (cell.y === myHead.y + 1 && cell.x === myHead.x) moveSafety.up = false;
                if (cell.y === myHead.y - 1 && cell.x === myHead.x) moveSafety.down = false;
            }
        }
    }
    
    //flood fill
        function floodFill(startX, startY) {
        const occupied = new Set();
        for (const snake of gameState.board.snakes)
            for (const seg of snake.body)
                occupied.add(${seg.x},${seg.y});

        const visited = new Set();
        const queue = [[startX, startY]];
        visited.add(${startX},${startY});
        let count = 0;

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            count++;
            const neighbors = [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
            for (const [nx, ny] of neighbors) {
                const key = ${nx},${ny};
                if (nx < 0 || ny < 0 || nx >= boardWidth || ny >= boardHeight) continue;
                if (visited.has(key) || occupied.has(key)) continue;
                visited.add(key);
                queue.push([nx, ny]);
            }
        }
        return count;
    }

    // Are there any safe moves left?
    
    //Object.keys(moveSafety) returns ["up", "down", "left", "right"]
    //.filter() filters the array based on the function provided as an argument (using arrow function syntax here)
    //In this case we want to filter out any of these directions for which moveSafety[direction] == false
    const safeMoves = Object.keys(moveSafety).filter(direction => moveSafety[direction]);
    if (safeMoves.length == 0) {
        console.log(MOVE ${gameState.turn}: No safe moves detected! Moving down);
        return { move: "down" };
    }
    
    // Choose a random move from the safe moves
    let nextMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
    
    // TODO: Step 4 - Move towards food instead of random, to regain health and survive longer
    // gameState.board.food contains an array of food coordinates https://docs.battlesnake.com/api/objects/board
    const food = gameState.board.food;

    if (food.length > 0) {
        const closestFood = food.reduce((best, f) => {
            const dist = Math.abs(f.x - myHead.x) + Math.abs(f.y - myHead.y);
            const bestDist = Math.abs(best.x - myHead.x) + Math.abs(best.y - myHead.y);
            return dist < bestDist ? f : best;
        });

        let foodMove = null;
        if (closestFood.x > myHead.x && moveSafety.right)     foodMove = "right";
        else if (closestFood.x < myHead.x && moveSafety.left)  foodMove = "left";
        else if (closestFood.y > myHead.y && moveSafety.up)    foodMove = "up";
        else if (closestFood.y < myHead.y && moveSafety.down)  foodMove = "down";
    }
    console.log(MOVE ${gameState.turn}: ${nextMove})
    return { move: nextMove };
}