const { ipcRenderer } = require('electron');

let { Seat, Student, Iteration } = require("./classes.js");

document.vars = {};

document.vars.grid = [];
document.vars.students = {};
document.vars.r = 0;
document.vars.c = 0;

let transferType = "";

let newClassModal = new bootstrap.Modal(document.getElementById('prompt-new-class'), {});
let newStudentsModal = new bootstrap.Modal(document.getElementById('add-students'), {});
let toastNewClass = bootstrap.Toast.getOrCreateInstance(document.getElementById('toast-new-class'));

let currentClass;

let settings, archived;
ipcRenderer.invoke("settings.get", "classes").then((res) => {
    settings = res;
    Object.keys(settings).map(function(key) {
        console.log(key);
        let element = document.createElement("li");
        let a = document.createElement("a");
        a.classList.add("nav-link");
        a.href = "#";
        a.innerText = key.replaceAll("`", ".");
        element.appendChild(a);
        document.getElementById("dropdown-classes").appendChild(element);
    });
});
ipcRenderer.invoke("settings.get", "archived").then((res) => {
    archived = res;
    Object.keys(archived).map(function(key) {
        let element = document.createElement("li");
        let a = document.createElement("a");
        a.classList.add("nav-link");
        a.href = "#";
        a.innerText = key.replaceAll("`", ".");
        element.appendChild(a);
        document.getElementById("dropdown-classes-archived").appendChild(element);
    });
});

loadClass("Test class of 2036");

document.getElementById("open-new-class").addEventListener("click", () => {
    loadClass(document.getElementById("open-new-class").getAttribute("class-name"));
});

document.getElementById("confirm-add-students").addEventListener("click", () => {
    let students = document.getElementById("student-names").value.split(/\r?\n/);
    students.forEach(async (student) => {
        let id = Date.now();
        while(document.vars.students[id.toString()]) id++;
        document.vars.students[id.toString()] = new Student(null, null, student, null, id.toString());

        let element = document.createElement("li");
        element.draggable = true;
        element.classList.add("list-group-item");
        element.classList.add("student");
        element.classList.add("nav-item");
        element.id = "student-" + id;
        element.innerText = student.toString();
        document.getElementById("student-list").children[0].appendChild(element);

        //nav-item student student-used list-group-item

        element.addEventListener("dragstart", (e) => {
            studentDragStart(e, id.toString());
        });

        await ipcRenderer.invoke("settings.set", "classes." + currentClass + ".students." + id.toString(), document.vars.students[id.toString()]);
    });

    newStudentsModal.hide();
});

document.getElementById("confirm-create-class").addEventListener("click", async () => {
    let className = document.getElementById("class-name").value;
    let r = document.getElementById("class-size-r").value;
    let c = document.getElementById("class-size-c").value;

    if(settings[className]) {
        document.getElementById("prompt-new-class-error").innerText = "Class name already exists";
        return;
    }
    if(r <= 0 || c <= 0) {
        document.getElementById("prompt-new-class-error").innerText = "Invalid class size";
        return;
    }
    if(className === "") {
        document.getElementById("prompt-new-class-error").innerText = "Class name cannot be empty";
        return;
    }
    if(className.includes("`")) {
        document.getElementById("prompt-new-class-error").innerText = "The character '`' is not allowed in class names";
        return;
    }

    // LMAO
    className = className.replaceAll(".", "`");

    toastNewClass.show();
    document.getElementById("open-new-class").setAttribute("class-name", className);

    await ipcRenderer.invoke("add-class", [className, r, c]);
    newClassModal.hide();

    await loadClass(className);
});

document.getElementById("prompt-new-class").addEventListener("hidden.bs.modal", () => {
    document.getElementById("class-name").value = "";
    document.getElementById("class-size-r").value = "";
    document.getElementById("class-size-c").value = "";
    document.getElementById("prompt-new-class-error").innerText = "";
});

document.getElementById("add-students").addEventListener("hidden.bs.modal", () => {
    document.getElementById("student-names").value = "";
});

document.getElementById("background-lock").addEventListener("click", () => {
    document.getElementById("back-button").click();
});

document.getElementById("sidebar").addEventListener("shown.bs.collapse", () => {
    document.getElementById("background-lock").style.zIndex = "1";
    document.getElementById("background-lock").style.opacity = "0.5";
    document.getElementById("sidebar").style.zIndex = "2";
});

document.getElementById("sidebar").addEventListener("hidden.bs.collapse", () => {
    document.getElementById("background-lock").style.zIndex = "-1";
    document.getElementById("background-lock").style.opacity = "0";
    document.getElementById("sidebar").style.zIndex = "0";
});

document.getElementById("save-as-new").addEventListener("click", async () => {
    //TODO
});

document.getElementById("save-to-current").addEventListener("click", async () => {

});

async function loadClass(className) {
    let res = (await ipcRenderer.invoke("settings.get", "classes"))[className];
    console.log(ipcRenderer.invoke("settings.get", "classes"))
    document.vars.students = res.students;
    document.vars.grid = [];
    document.getElementById("title-name").innerText = "Seating chart for: " + className.replaceAll("`", ".");
    currentClass = className;

    let studentList = document.getElementById("student-list").children[0];
    while(studentList.children[0]) studentList.children[0].remove();
    Object.values(document.vars.students).map((student) => {
        if (!student.deleted) {
            let element = document.createElement("li");
            element.draggable = true;
            element.classList.add("list-group-item");
            element.classList.add("student");
            element.classList.add("nav-item");
            element.id = "student-" + student.id;
            element.innerText = student.name;
            studentList.appendChild(element);

            document.vars.students[student.id] = student;

            //nav-item student student-used list-group-item

            element.addEventListener("dragstart", (e) => {
                studentDragStart(e, student.id);
            });
        }
    })

    let content = document.getElementById("iteration-content");
    while(content.children.length) content.children[0].remove();

    // console.log(res.iterations[0])
    r = res.rows;
    c = res.columns;
    for(let i = 0;i < r;i++) {
        let row = document.createElement("div");
        row.classList.add("row");
        for(let j = 0;j < c;j++) {
            let col = document.createElement("div");
            col.classList.add("col");
            let cell = document.createElement("div");
            // cell.classList.add("cell");
            cell.draggable = true;
            cell.id = "cell-" + i + "-" + j;
            cell.addEventListener("dragstart", (e) => {
                cellDragStart(e, i, j);
            });
            let a = document.createElement("a");
            let button = document.createElement("a");
            a.style.zIndex = "-1";

            cell.appendChild(a);
            cell.appendChild(button);
            col.appendChild(cell);
            row.appendChild(col);

            cell.addEventListener("dragenter", (e) => {
                cellDragEnter(e);
            });
            cell.addEventListener("dragover", (e) => {
                cellDragOver(e);
            });
            cell.addEventListener("dragleave", (e) => {
                cellDragLeave(e);
            });
            cell.addEventListener("drop", (e) => {
                cellDrop(e);
            });
        }
        content.appendChild(row);
    }
    console.log("done loading rows and cols");

    console.log(res.iterations)

    let iterationList = document.getElementById("iteration-list");
    while(iterationList.children[0]) iterationList.children[0].remove();

    if(res.iterations.length) {
        res.iterations.forEach(i => {
            let element = document.createElement("li");
            let text = document.createElement("a");
            text.classList.add("dropdown-item");
            text.id = "iteration-" + (res.iterations.indexOf(i));
            text.innerText = "Iteration " + (res.iterations.indexOf(i) + 1);
            element.appendChild(text);
            iterationList.appendChild(element);
        })
        // await loadIteration(className, res.iterations.length - 1);
        loadIteration(res, res.iterations.length - 1);
    }
    else {
        let element = document.createElement("li");
        let text = document.createElement("a");
        text.classList.add("dropdown-item");
        text.classList.add("disabled");
        text.innerText = "No iterations yet. ";
        element.appendChild(text);
        iterationList.appendChild(element);
        loadIteration(res, -1);
    }
}

function loadIteration(res, iter) {
    if(iter === -1) {
        let r = res.rows, c = res.columns;
        for(let i = 0;i < r;i++) {
            document.vars.grid[i] = [];
            for(let j = 0;j < c;j++) {
                let cell = document.getElementById("cell-" + i + "-" + j);
                let button = cell.children[1];
                button.href = "#";
                button.classList.add("bi");
                button.classList.add("seat-button")
                button.addEventListener("click", () => {
                    change(i, j);
                });
                cell.classList.add("cell-empty");
                button.classList.add("bi-plus");
                document.vars.grid[i][j] = new Seat(true, null);
                button.setAttribute("x", "false")
                cell.appendChild(button);
            }
        }
        return;
    }

    //update grid stuff
    document.vars.students = res.students;
    console.log("loading iterations")
    document.getElementById("iterations-dropdown-label").innerText = "Iteration " + (iter + 1);
    document.getElementById("iteration-" + iter).classList.add("active");
    let r = res.rows, c = res.columns;
    for(let i = 0;i < r;i++) {
        document.vars.grid[i] = [];
        for(let j = 0;j < c;j++) {
            let cell = document.getElementById("cell-" + i + "-" + j);
            let button = cell.children[1];
            button.className = "";
            button.href = "#";
            button.classList.add("bi");
            button.classList.add("seat-button")
            button.addEventListener("click", () => {
                change(i, j);
            });
            if(res.iterations[iter].seats[i][j].student) {
                cell.children[0].textContent = document.vars.students[res.iterations[iter].seats[i][j].student].name;
                cell.classList.add("cell");
                button.classList.add("bi-x");
                document.vars.grid[i][j] = new Seat(false, res.iterations[iter].seats[i][j].student);
                document.getElementById("student-" + document.vars.grid[i][j].student).classList.add("student-used");
                document.vars.students[document.vars.grid[i][j].student].r = i; document.vars.students[document.vars.grid[i][j].student].c = j;

                button.setAttribute("x", "true")
            }
            else if(!res.iterations[iter].seats[i][j].empty) {
                cell.classList.add("cell-unoccupied");
                button.classList.add("bi-x");
                document.vars.grid[i][j] = new Seat(false, null);

                button.setAttribute("x", "true")
            }
            else {
                cell.classList.add("cell-empty");
                button.classList.add("bi-plus");
                document.vars.grid[i][j] = new Seat(true, null);

                button.setAttribute("x", "false")
            }
            cell.appendChild(button);
        }
    }
}

function change(r, c) {
    let cell = document.getElementById("cell-" + r + "-" + c);
    let button = cell.children[1];

    if(button.getAttribute("x") === "true") {
        cell.classList.add("cell-empty");
        button.classList.remove("bi-x");
        button.classList.add("bi-plus");

        if (cell.classList.contains("cell")) {
            cell.classList.remove("cell");

            let old = document.getElementById("student-" + document.vars.grid[r][c].student);
            old.classList.remove("student-used");
            old.classList.add("student");
            document.vars.students[document.vars.grid[r][c].student].r = null; document.vars.students[document.vars.grid[r][c].student].c = null;

            cell.children[0].textContent = "";
            document.vars.grid[r][c].student = null;
        }
        else cell.classList.remove("cell-unoccupied");

        document.vars.grid[r][c] = new Seat(true, null);

        button.setAttribute("x", "false")
    }
    else if(button.getAttribute("x") === "false") {
        cell.classList.add("cell-unoccupied");
        cell.classList.remove("cell-empty");
        button.classList.remove("bi-plus");
        button.classList.add("bi-x");
        document.vars.grid[r][c] = new Seat(false, null);

        button.setAttribute("x", "true")
    }
    else {
        console.log("broken :(");
    }
}


//0 for drag, 1 for swap
function studentDragStart(e, studentID) {
    e.dataTransfer.setData("text/plain", "drag" + studentID);
    transferType = "drag";
}

function cellDragStart(e, r, c) {
    e.dataTransfer.setData("text/plain", "swap" + r + "-" + c);
    transferType = "swap";
}

function cellDragEnter(e) {
    if (!e.target.classList.contains("cell-empty") || transferType === "swap"){
        e.preventDefault();
        e.target.classList.add("cell-hover");
    }
}

function cellDragOver(e) {
    if (!e.target.classList.contains("cell-empty") || transferType === "swap"){
        e.preventDefault();
    }
}

function cellDragLeave(e) {
    if (!e.target.classList.contains("cell-empty") || transferType === "swap"){
        e.target.classList.remove("cell-hover");
    }
}

function cellDrop(e) {
    console.log("drop " + e.target.id)
    //e.target must have cell-empty, cell-unoccupied, or cell
    if (!e.target.classList.contains("cell-empty") && e.dataTransfer.getData("text/plain").startsWith("drag")) {
        e.target.classList.remove("cell-hover");
        let newid = e.dataTransfer.getData("text/plain").substring(4);
        let newstudent = document.getElementById("student-" + newid);

        if (document.vars.students[newid].r != null) {
            //if student was in another seat before this
            // let coords = newseat.split("-");
            // let r = parseInt(coords[0]), c = parseInt(coords[1]);
            let r = document.vars.students[newid].r, c = document.vars.students[newid].c;
            let cell = document.getElementById("cell-" + r + "-" + c);
            let button = cell.children[1];

            cell.classList.remove("cell");
            cell.classList.add("cell-unoccupied");
            cell.children[0].textContent = "";

            button.classList.remove("bi-x");
            button.classList.add("bi-plus");
            button.setAttribute("x", "false")

            document.vars.grid[r][c] = new Seat(false, null);

            document.vars.students[newid].r = null; document.vars.students[newid].c = null;
        }

        let cell = e.target;
        //"cell-10-4"
        let coords = cell.id.substring(5).split("-");
        let r = parseInt(coords[0]), c = parseInt(coords[1]);
        if (cell.classList.contains("cell")) {
            //if student was already in this seat - displaced
            let oldid = document.vars.grid[r][c].student;
            let old = document.getElementById("student-" + oldid);
            old.classList.remove("student-used");
            old.classList.add("student");
            document.vars.students[oldid].r = null; document.vars.students[oldid].c = null;
        }
        cell.classList.remove("cell-unoccupied");
        cell.classList.add("cell");
        document.vars.grid[r][c].student = newid;
        cell.children[0].textContent = document.vars.students[newid].name;
        document.vars.students[newid].r = r; document.vars.students[newid].c = c;
        newstudent.classList.add("student-used");

        document.vars.grid[r][c] = new Seat(false, newid);
    }
    else if (e.dataTransfer.getData("text/plain").startsWith("swap")) {
        let targetCoords = e.target.id.substring(5).split("-");
        let originCoords = e.dataTransfer.getData("text/plain").substring(4).split("-");

        if(targetCoords === originCoords) return;

        let tr = parseInt(targetCoords[0]), tc = parseInt(targetCoords[1]);
        let or = parseInt(originCoords[0]), oc = parseInt(originCoords[1]);
        let tcell = document.getElementById("cell-" + tr + "-" + tc);
        let ocell = document.getElementById("cell-" + or + "-" + oc);
        let tbutton = tcell.children[1], obutton = ocell.children[1];
        let tseat = clone(document.vars.grid[tr][tc]), oseat = clone(document.vars.grid[or][oc]);

        if(tseat.empty) {
            //if target seat is empty, original seat will become empty
            document.vars.grid[or][oc] = new Seat(true, null);
            ocell.classList.remove("cell");
            ocell.classList.remove("cell-unoccupied");
            ocell.classList.add("cell-empty");
            document.vars.grid[or][oc].student = null;
            ocell.children[0].textContent = "";
            obutton.classList.remove("bi-x");
            obutton.classList.add("bi-plus");
            obutton.setAttribute("x", "false");
        }
        else if(!tseat.student) {
            //if target seat is unoccupied, original seat will be unoccupied
            document.vars.grid[or][oc] = new Seat(false, null);
            ocell.classList.remove("cell");
            ocell.classList.remove("cell-empty");
            ocell.classList.add("cell-unoccupied");
            document.vars.grid[or][oc].student = null;
            ocell.children[0].textContent = "";
            obutton.classList.remove("bi-plus");
            obutton.classList.add("bi-x");
            obutton.setAttribute("x", "true");
        }
        else {
            //if target seat has a student, original seat will now have that student
            document.vars.grid[or][oc] = new Seat(false, tseat.student);
            ocell.classList.remove("cell-unoccupied");
            ocell.classList.remove("cell-empty");
            ocell.classList.add("cell");
            ocell.children[0].textContent = document.vars.students[tseat.student].name;
            obutton.classList.remove("bi-plus");
            obutton.classList.add("bi-x");
            obutton.setAttribute("x", "true");
            document.vars.students[tseat.student].r = or; document.vars.students[tseat.student].c = oc;
            document.vars.grid[or][oc].student = tseat.student;
        }


        if(oseat.empty) {
            //if original seat is empty, target seat will become empty
            document.vars.grid[tr][tc] = new Seat(true, null);
            tcell.classList.remove("cell");
            tcell.classList.remove("cell-unoccupied");
            tcell.classList.add("cell-empty");
            document.vars.grid[tr][tc].student = null;
            tcell.children[0].textContent = "";
            tbutton.classList.remove("bi-x");
            tbutton.classList.add("bi-plus");
            tbutton.setAttribute("x", "false");
        }
        else if(!oseat.student) {
            //if original seat is unoccupied, target seat will be unoccupied
            document.vars.grid[tr][tc] = new Seat(false, null);
            tcell.classList.remove("cell");
            tcell.classList.remove("cell-empty");
            tcell.classList.add("cell-unoccupied");
            document.vars.grid[tr][tc].student = null;
            tcell.children[0].textContent = "";
            tbutton.classList.remove("bi-plus");
            tbutton.classList.add("bi-x");
            tbutton.setAttribute("x", "true");
        }
        else {
            //if original seat has a student, target seat will now have that student
            document.vars.grid[tr][tc] = new Seat(false, oseat.student);
            tcell.classList.remove("cell-unoccupied");
            tcell.classList.remove("cell-empty");
            tcell.classList.add("cell");
            tcell.children[0].textContent = document.vars.students[oseat.student].name;
            tbutton.classList.remove("bi-plus");
            tbutton.classList.add("bi-x");
            tbutton.setAttribute("x", "true");
            document.vars.students[oseat.student].r = tr; document.vars.students[oseat.student].c = tc;
            document.vars.grid[tr][tc].student = oseat.student;
        }
    }
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}


/*
- TODO copy layout
- TODO clear worksapce
- TODO expand and contract
- TODO save layout
- TODO delete students
 */