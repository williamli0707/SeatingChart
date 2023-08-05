const { ipcRenderer } = require('electron');

let newClassModal = new bootstrap.Modal(document.getElementById('prompt-new-class'), {});
let toastNewClass = bootstrap.Toast.getOrCreateInstance(document.getElementById('toast-new-class'));

let settings;
ipcRenderer.invoke("settings.get", "classes").then((res) => {settings = res;});

loadClass("Test class of 2036");

document.getElementById("test-button-2").addEventListener("click", async () => {
    // document.getElementById("iteration-separator").classList.remove("d-none");
});

document.getElementById("open-new-class").addEventListener("click", () => {
    loadClass(document.getElementById("open-new-class").getAttribute("class-name"));
});

document.getElementById("confirm-create-class").addEventListener("click", () => {
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

    // LMAO
    className.replaceAll(" ", "⇪");

    toastNewClass.show();
    document.getElementById("open-new-class").setAttribute("class-name", className);

    ipcRenderer.invoke("add-class", [className, r, c]);
    newClassModal.hide();
});

document.getElementById("prompt-new-class").addEventListener("hidden.bs.modal", () => {
    document.getElementById("class-name").value = "";
    document.getElementById("class-size-r").value = "";
    document.getElementById("class-size-c").value = "";
    document.getElementById("prompt-new-class-error").innerText = "";
});

document.getElementById("background-lock").addEventListener("click", () => {
    document.getElementById("back-button").click();
});

document.getElementById("open-sidebar").addEventListener("click", () => {
    document.getElementById("background-lock").style.zIndex = "1";
    document.getElementById("background-lock").style.opacity = "0.5";
    document.getElementById("sidebar").style.zIndex = "2";
});

document.getElementById("back-button").addEventListener("click", () => {
    document.getElementById("background-lock").style.zIndex = "-1";
    document.getElementById("background-lock").style.opacity = "0";
    document.getElementById("sidebar").style.zIndex = "0";
});

async function loadClass(className) {
    let res = (await ipcRenderer.invoke("settings.get", "classes"))[className];
    console.log(ipcRenderer.invoke("settings.get", "classes"))
    document.vars.students = res.students;
    document.vars.grid = [];

    document.getElementById("title-name").innerText = "Seating chart for: " + className.replaceAll("⇪", " ");

    let studentList = document.getElementById("student-list").children[0];
    while(studentList.children[0]) studentList.children[0].remove();
    Object.values(document.vars.students).map((student) => {
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
            a.style.zIndex = "-1";

            cell.appendChild(a);
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
        update(res, res.iterations.length - 1);
    }
    else {
        let element = document.createElement("li");
        let text = document.createElement("a");
        text.classList.add("dropdown-item");
        text.classList.add("disabled");
        text.innerText = "No iterations yet. ";
        element.appendChild(text);
        iterationList.appendChild(element);
        update(res, -1);
    }
}

//0 for drag, 1 for swap
function studentDragStart(e, studentID) {
    e.dataTransfer.setData("text/plain", "drag" + studentID);
}

function cellDragStart(e, r, c) {
    e.dataTransfer.setData("text/plain", "swap" + r + "-" + c);
}

function cellDragEnter(e) {
    if (!e.target.classList.contains("cell-empty") || e.dataTransfer.getData("text/plain").startsWith("swap")){
        e.preventDefault();
        e.target.classList.add("cell-hover");
    }
}

function cellDragOver(e) {
    if (!e.target.classList.contains("cell-empty") || e.dataTransfer.getData("text/plain").startsWith("swap")){
        e.preventDefault();
    }
}

function cellDragLeave(e) {
    if (!e.target.classList.contains("cell-empty") || e.dataTransfer.getData("text/plain").startsWith("swap")){
        e.target.classList.remove("cell-hover");
    }
}

function cellDrop(e) {
    console.log("drpp " + e.target.id);
    // console.log(e.target.classList);
    // console.log(e.dataTransfer.getData("text/plain"));
    //e.target must have cell-empty, cell-unoccupied, or cell
    if (!e.target.classList.contains("cell-empty") && e.dataTransfer.getData("text/plain").startsWith("drag")) {
        console.log("dragging");
        e.target.classList.remove("cell-hover");
        let newid = e.dataTransfer.getData("text/plain").substring(4);
        console.log("student " + newid + " dropped on cell " + e.target.id);
        let newstudent = document.getElementById("student-" + newid);
        let newseat = newstudent.getAttribute("seat");

        if (newseat) {
            //if student was in another seat before this
            let coords = newseat.split("-");
            let r = parseInt(coords[0]), c = parseInt(coords[1]);
            let cell = document.getElementById("cell-" + r + "-" + c);
            let button = cell.children[1];

            cell.classList.remove("cell");
            cell.classList.add("cell-unoccupied");
            cell.children[0].textContent = "";

            button.classList.remove("bi-x");
            button.classList.add("bi-plus");
            button.setAttribute("x", "false")

            document.vars.grid[r][c] = new Seat(false, null);

            document.getElementById("student-" + newid).removeAttribute("seat");
        }

        let cell = e.target;
        //"cell-10-4"
        let coords = cell.id.substring(5).split("-");
        let r = parseInt(coords[0]), c = parseInt(coords[1]);
        if (cell.classList.contains("cell")) {
            //if student was already in this seat - displaced
            let old = document.getElementById("student-" + e.target.getAttribute("student"));
            old.classList.remove("student-used");
            old.classList.add("student");
            old.removeAttribute("seat");
        }
        cell.classList.remove("cell-unoccupied");
        cell.classList.add("cell");
        cell.setAttribute("student", newid);
        cell.children[0].textContent = document.vars.students[newid].name;
        newstudent.setAttribute("seat", r + "-" + c);
        newstudent.classList.add("student-used");

        document.vars.grid[r][c] = new Seat(false, newid);
    }
    else if (e.dataTransfer.getData("text/plain").startsWith("swap")) {
        console.log("swapping")
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
            ocell.removeAttribute("student");
            ocell.children[0].textContent = "";
            obutton.classList.remove("bi-x");
            obutton.classList.add("bi-plus");
            obutton.setAttribute("x", "false");
            document.getElementById("cell-" + or + "-" + oc).removeAttribute("student");
        }
        else if(!tseat.student) {
            //if target seat is unoccupied, original seat will be unoccupied
            document.vars.grid[or][oc] = new Seat(false, null);
            ocell.classList.remove("cell");
            ocell.classList.remove("cell-empty");
            ocell.classList.add("cell-unoccupied");
            ocell.removeAttribute("student");
            ocell.children[0].textContent = "";
            obutton.classList.remove("bi-plus");
            obutton.classList.add("bi-x");
            obutton.setAttribute("x", "true");
            document.getElementById("cell-" + or + "-" + oc).removeAttribute("student");
        }
        else {
            //if target seat has a student, original seat will now have that student
            document.vars.grid[or][oc] = new Seat(false, tseat.student);
            ocell.classList.remove("cell-unoccupied");
            ocell.classList.remove("cell-empty");
            ocell.classList.add("cell");
            ocell.removeAttribute("student");
            ocell.children[0].textContent = document.vars.students[tseat.student].name;
            obutton.classList.remove("bi-plus");
            obutton.classList.add("bi-x");
            obutton.setAttribute("x", "true");
            document.getElementById("student-" + tseat.student).setAttribute("seat", or + "-" + oc);
            document.getElementById("cell-" + or + "-" + oc).setAttribute("student", tseat.student);
        }


        if(oseat.empty) {
            //if original seat is empty, target seat will become empty
            document.vars.grid[tr][tc] = new Seat(true, null);
            tcell.classList.remove("cell");
            tcell.classList.remove("cell-unoccupied");
            tcell.classList.add("cell-empty");
            tcell.removeAttribute("student");
            tcell.children[0].textContent = "";
            tbutton.classList.remove("bi-x");
            tbutton.classList.add("bi-plus");
            tbutton.setAttribute("x", "false");
            document.getElementById("cell-" + tr + "-" + tc).removeAttribute("student");
        }
        else if(!oseat.student) {
            //if original seat is unoccupied, target seat will be unoccupied
            document.vars.grid[tr][tc] = new Seat(false, null);
            tcell.classList.remove("cell");
            tcell.classList.remove("cell-empty");
            tcell.classList.add("cell-unoccupied");
            tcell.removeAttribute("student");
            tcell.children[0].textContent = "";
            tbutton.classList.remove("bi-plus");
            tbutton.classList.add("bi-x");
            tbutton.setAttribute("x", "true");
            document.getElementById("cell-" + tr + "-" + tc).removeAttribute("student");
        }
        else {
            //if original seat has a student, target seat will now have that student
            document.vars.grid[tr][tc] = new Seat(false, oseat.student);
            tcell.classList.remove("cell-unoccupied");
            tcell.classList.remove("cell-empty");
            tcell.classList.add("cell");
            tcell.removeAttribute("student");
            tcell.children[0].textContent = document.vars.students[oseat.student].name;
            tbutton.classList.remove("bi-plus");
            tbutton.classList.add("bi-x");
            tbutton.setAttribute("x", "true");
            document.getElementById("student-" + oseat.student).setAttribute("seat", tr + "-" + tc);
            document.getElementById("cell-" + tr + "-" + tc).setAttribute("student", tseat.student);
        }
    }
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}


/*
TODO:
- copy layout
- clear students
- draggable swap
- expand and contract
 */