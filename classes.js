class Iteration {
    numStudents;
    rows;
    cols;
    grid;
    constructor(n, r, c) {
        this.numStudents = n;
        this.rows = r;
        this.cols = c;
        this.grid = [];
    }
}

class Seat {
    empty;
    student;
    constructor(empty, student) {
        this.empty = !!empty;
        this.student = student;
    }
}

class Student {
    name;
    gender;
    r;
    c;
    deleted;
    id;
    constructor(i, j, name, gender, id) {
        this.r = i;
        this.c = j;
        this.name = name;
        this.gender = gender;
        this.deleted = false;
        this.id = id;
    }
}

module.exports = { Iteration, Seat, Student }