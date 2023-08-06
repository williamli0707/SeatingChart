//Options:
/*
BGBG
front half, back half
specific student next to each other
*/



function addSeat(r, c) {

}

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


// let grid = [];
// let students = {};
// let rows = 10, cols = 6;
//
// let { Student, Seat, Iteration } = require("./classes.js");
//
// for(let i = 0;i < rows;i++) {
//     grid[i] = [];
//     for(let j = 0;j < cols;j++) {
//         let id = Date.now();
//         while(students[id.toString()]) id++;
//         students[id.toString()] = new Student(i, j, "Student " + i + " " + j, (i + j) % 2 === 0 ? "M" : "F", id);
//         grid[i][j] = new Seat(false, id.toString());
//     }
// }
//
// Object.values(students).map((type) => {
//     console.log(type);
// })
//
// let iter = new Iteration(60, rows, cols);
// iter.seats = grid;
// // ipcRenderer.invoke("settings.set", "classes.Test_class_of_2036",
// //     {
// //         rows: rows,
// //         columns: cols,
// //         iterations: [iter],
// //         students: students
// //     }).then(r =>console.log(ipcRenderer.invoke("settings.get", "classes")["Test class of 2036"]));
//
//
// // grid[9][5]
// console.log(grid);
// generate(grid, {
//     shuffleFrontAndBackHalf: true,
//     regen: false
// })