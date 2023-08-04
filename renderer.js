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
            e.dataTransfer.setData("text/plain", student.id);
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
            let a = document.createElement("a");

            // a.draggable = true;
            cell.appendChild(a);
            col.appendChild(cell);
            row.appendChild(col);

            cell.addEventListener("dragenter", (e) => {
                console.log("dragenter " + e.target.id);
                if(e.target.classList.contains("cell") || e.target.classList.contains("cell-unoccupied")) {
                    e.preventDefault();
                    e.target.classList.add("cell-hover");
                }
            });
            cell.addEventListener("dragover", (e) => {
                if(e.target.classList.contains("cell") || e.target.classList.contains("cell-unoccupied")) {
                    e.preventDefault();
                }
            });
            cell.addEventListener("dragleave", (e) => {
                if(e.target.classList.contains("cell") || e.target.classList.contains("cell-unoccupied")) {
                    e.target.classList.remove("cell-hover");
                }
            });
            cell.addEventListener("drop", (e) => {
                console.log("drpp " + e.target.id);
                if (e.target.classList.contains("cell") || e.target.classList.contains("cell-unoccupied")){
                    e.target.classList.remove("cell-hover");
                    let newid = e.dataTransfer.getData("text/plain");
                    console.log("student " + newid + " dropped on cell " + e.target.id);
                    let newstudent = document.getElementById("student-" + newid);
                    let newseat = newstudent.getAttribute("seat");

                    if(newseat) {
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

                    document.vars.grid[r][c] = new Seat(true, newid);
                }
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


/*
TODO:
- copy layout
- clear students
- draggable swap
- expand and contract
 */