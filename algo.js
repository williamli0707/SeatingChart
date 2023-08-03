//Options:
/*
BGBG
front half, back half
specific student next to each other
*/

let grid = [];
let students = {};
let rows = 10, cols = 6;

let { Student, Seat, Iteration } = require("./classes.js");

for(let i = 0;i < rows;i++) {
    grid[i] = [];
    for(let j = 0;j < cols;j++) {
        let id = Date.now();
        while(students[id.toString()]) id++;
        students[id.toString()] = new Student(i, j, "Student " + i + " " + j, (i + j) % 2 === 0 ? "M" : "F", id);
        grid[i][j] = new Seat(false, id.toString());
    }
}

Object.values(students).map((type) => {
    console.log(type);
})

let iter = new Iteration(60, rows, cols);
iter.seats = grid;
// ipcRenderer.invoke("settings.set", "classes.Test_class_of_2036",
//     {
//         rows: rows,
//         columns: cols,
//         iterations: [iter],
//         students: students
//     }).then(r =>console.log(ipcRenderer.invoke("settings.get", "classes")["Test class of 2036"]));
ipcRenderer.invoke("settings.get", "classes").then((res) => {
    console.log(res["Test_class_of_2036"]);
});


// grid[9][5]
console.log(grid);
generate(grid, {
    shuffleFrontAndBackHalf: true,
    regen: false
})

/**
 * shuffles an array of stuff
 */
function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function generate(grid, options) {
    let r = grid.length, c = grid[0].length, tot = r * c;
    let minDist = 1e9, maxDist = 0, avgDist = 0;
    if(options.shuffleFrontAndBackHalf) {
        //5 rows: 0, 1, 4, 3

        //init front/back
        let front = [], back = []
        if(rows % 2 === 0) {
            for (let i = 0; i < r / 2; i++) for (let j = 0; j < c; j++) back.push(grid[i][j]);
            for (let i = r - 1; i >= r / 2; i--) for (let j = 0; j < c; j++) front.push(grid[i][j]);
        }
        else {
            for (let i = 0; i < r / 2; i++) for (let j = 0; j < c; j++) back.push(grid[i][j]);
            for (let i = r - 1; i > r / 2; i--) for (let j = 0; j < c; j++) front.push(grid[i][j]);
            let mid = [];
            for (let i = 0; i < c;i++) mid.push(grid[r/2][i]);
            mid = shuffle(mid);
            for(let i = 0;i < c;i++) {
                if(i % 2 === 0) front.push(mid[i]);
                else back.push(mid[i]);
            }
        }
        front = shuffle(front);
        back = shuffle(back);

        //do shuffle
        if(rows % 2 === 0) {
            for(let i = 0;i < r/2;i++) for(let j = 0;j < c;j++) grid[i][j] = front.pop();
            for (let i = r - 1; i >= r / 2; i--) for(let j = 0;j < c;j++) grid[i][j] = back.pop();
        }
        else {
            for (let i = 0; i < r / 2; i++) for (let j = 0; j < c; j++) grid[i][j] = front.pop();
            for (let i = r - 1; i > r / 2; i--) for (let j = 0; j < c; j++) grid[i][j] = back.pop();
            for(let i = 0;i < c;i++) {
                if(i % 2 === 0) grid[i][j] = front.pop();
                else grid[i][j] = back.pop();
            }
        }

        //calculate stats
        for(let i = 0;i < r;i++) {
            for(let j = 0;j < c;j++) {
                let dist = Math.abs(i - grid[i][j].student.r) + Math.abs(j - grid[i][j].student.c);
                minDist = Math.min(minDist, dist);
                maxDist = Math.max(maxDist, dist);
                avgDist += dist;
                [grid[i][j].student.r, grid[i][j].student.c] = [i, j];
            }
        }

        avgDist /= tot;
        console.log("Minimum (Manhattan) distance: " + minDist + " Maximum (Manhattan) distance: " + maxDist + " Average Distance: " + avgDist);
        console.log(grid);
    }
    else if(options.alphaFirst) {
        let prev = [];
        for(let i = 0;i < r;i++) {
            for(let j = 0;j < c;j++) {
                prev.push(grid[i][j]);
            }
        }
        prev.sort((a, b) => a.name - b.name);
        for (let i = 0;i < r;i++) {
            for(let j = 0;j < c;j++) {
                grid[i][j] = grid.pop();
            }
        }
    }
    else if(options.random) {
        let prev = [];
        for(let i = 0;i < r;i++) {
            for(let j = 0;j < c;j++) {
                prev.push(grid[i][j]);
            }
        }
        shuffle(prev)
        for (let i = 0;i < r;i++) {
            for(let j = 0;j < c;j++) {
                grid[i][j] = grid.pop();
            }
        }
    }
}