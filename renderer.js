const { ipcRenderer } = require('electron');
const fs = require("fs");
const { parse } = require("csv");
const { Seat, Student, Iteration } = require("./classes.js");

document.vars = {};

document.vars.grid = [];
document.vars.students = {};
document.vars.r = 0;
document.vars.c = 0;

let transferType = "";

let newClassModal = new bootstrap.Modal(document.getElementById('prompt-new-class'), {});
let copyClassModal = new bootstrap.Modal(document.getElementById('prompt-copy-class'), {});
let newStudentsModal = new bootstrap.Modal(document.getElementById('add-students'), {});
let changeStudentName = new bootstrap.Modal(document.getElementById('student-change-name'), {});
let shuffleModal = new bootstrap.Modal(document.getElementById('shuffle'), {});
let changeSizeModal = new bootstrap.Modal(document.getElementById('change-size'), {});
let toastNewClass = bootstrap.Toast.getOrCreateInstance(document.getElementById('toast-new-class'));
let toastInfo = bootstrap.Toast.getOrCreateInstance(document.getElementById('toast-info'));
let sidebar = new bootstrap.Collapse('#sidebar', {toggle: false});

let testData;

let currentClass, currentIter = -1;

let settings;
ipcRenderer.invoke("settings.get", "classes").then(async (res) => {
    settings = res;
    let defaultClass = await loadClasses(settings);
    console.log(defaultClass)
    if(defaultClass !== "") await loadClass(defaultClass);
});

async function loadClasses(settings) {
    let defaultClass = "";
    let dropdown = document.getElementById("dropdown-classes");
    let dropdownArchived = document.getElementById("dropdown-classes-archived");
    while(dropdown.children.length > 1) dropdown.children[0].remove();
    while(dropdownArchived.children.length > 0) dropdownArchived.children[0].remove();
    Object.keys(settings).map(function(key) {
        console.log(settings[key].archived)
        if(!settings[key].archived) {
            defaultClass = key;
            let element = addClassElement(key);
            dropdown.insertBefore(element, dropdown.firstChild);
        }
        else {
            let element = addClassElement(key);
            dropdownArchived.insertBefore(element, dropdownArchived.firstChild);
        }
    });
    let lastSeen = await ipcRenderer.invoke("settings.get", "lastSeen");
    return lastSeen === "." ? defaultClass : lastSeen;
}

function addClassElement(key) {
    let element = document.createElement("li");
    let a = document.createElement("a");
    let buttonDiv = document.createElement("div");
    let deleteButton = document.createElement("a");
    let archiveButton = document.createElement("a");

    a.classList.add("nav-link");
    a.classList.add("class-text");
    a.href = "#";
    a.innerText = key.replaceAll("`", ".");
    element.appendChild(a);
    element.classList.add("class")

    deleteButton.href = "#";
    deleteButton.classList.add("bi");
    deleteButton.classList.add("bi-trash");
    deleteButton.setAttribute("state", "0");

    deleteButton.addEventListener("click", async () => {
        if(deleteButton.getAttribute("state") === "0") {
            deleteButton.classList.remove("bi-trash");
            deleteButton.classList.add("bi-check");
            deleteButton.setAttribute("state", "1");
        }
        else {
            let settings = await ipcRenderer.invoke("settings.get", "classes");
            delete settings[key];
            await ipcRenderer.invoke("settings.set", "classes", settings);
            let defaultClass = loadClasses(settings);
            if(key === currentClass) loadClass(defaultClass);

            showToastInfo("Deleted class " + key.replaceAll("`", ".") + " successfully!");
        }
    });

    archiveButton.href = "#";
    archiveButton.classList.add("bi");
    archiveButton.classList.add("bi-archive");
    archiveButton.setAttribute("state", "0");

    archiveButton.addEventListener("click", async () => {
        if (archiveButton.getAttribute("state") === "0") {
            archiveButton.classList.remove("bi-archive");
            archiveButton.classList.add("bi-check");
            archiveButton.setAttribute("state", "1");
        }
        else {
            let settings = await ipcRenderer.invoke("settings.get", "classes");
            if(!settings[key].archived) {
                settings[key].archived = true;
                await ipcRenderer.invoke("settings.set", "classes", settings);
                loadClasses(settings);

                showToastInfo("Archived class " + key.replaceAll("`", ".") + " successfully!");
            }
            else {
                settings[key].archived = false;
                await ipcRenderer.invoke("settings.set", "classes", settings);
                loadClasses(settings);

                showToastInfo("Unarchived class " + key.replaceAll("`", ".") + " successfully!");
            }
        }
    });

    buttonDiv.appendChild(archiveButton);
    buttonDiv.appendChild(deleteButton);
    buttonDiv.classList.add("class-buttons");

    element.appendChild(buttonDiv);

    a.addEventListener("click", () => {
        loadClass(key);
        showToastInfo("Loaded class " + key.replaceAll("`", ".") + " successfully!");
        sidebar.hide();
    });

    return element;
}

document.getElementById("revert-changes").addEventListener("click", async () => {
    await loadClass(currentClass);
    await loadIteration(settings.classes[currentClass].iterations[currentIter]);
});

document.getElementById("place-alpha").addEventListener("click", () => {
    generate(document.vars.grid, {
        populate: true,
        sort: true
    });
    loadIteration({
        "rows": document.vars.grid.length,
        "columns": document.vars.grid[0].length,
        "seats": document.vars.grid
    }, currentIter, false);
    shuffleModal.hide();
});

document.getElementById("place-random").addEventListener("click", () => {
    generate(document.vars.grid, {
        populate: true,
        sort: false
    });
    loadIteration({
        "rows": document.vars.grid.length,
        "columns": document.vars.grid[0].length,
        "seats": document.vars.grid
    }, currentIter, false);
    shuffleModal.hide();
});

document.getElementById("shuffle-frontback").addEventListener("click", () => {
    generate(document.vars.grid, {
        shuffleFrontBack: true,
    });
    loadIteration({
        "rows": document.vars.grid.length,
        "columns": document.vars.grid[0].length,
        "seats": document.vars.grid
    }, currentIter, false);
    shuffleModal.hide();
});

document.getElementById("shuffle-frontback-front").addEventListener("click", () => {
    generate(document.vars.grid, {
        shuffleFrontBackPush: true,
    });
    loadIteration({
        "rows": document.vars.grid.length,
        "columns": document.vars.grid[0].length,
        "seats": document.vars.grid
    }, currentIter, false);
    shuffleModal.hide();
});

document.getElementById("shuffle-front").addEventListener("click", () => {
    generate(document.vars.grid, {
        shuffleFront: true
    });
    loadIteration({
        "rows": document.vars.grid.length,
        "columns": document.vars.grid[0].length,
        "seats": document.vars.grid
    }, currentIter, false);
    shuffleModal.hide();
});

document.getElementById("shuffle-front-front").addEventListener("click", () => {
    generate(document.vars.grid, {
        shuffleFrontPush: true
    });
    loadIteration({
        "rows": document.vars.grid.length,
        "columns": document.vars.grid[0].length,
        "seats": document.vars.grid
    }, currentIter, false);
    shuffleModal.hide();
});

document.getElementById("shuffle-back").addEventListener("click", () => {
    generate(document.vars.grid, {
        shuffleBack: true,
    });
    loadIteration({
        "rows": document.vars.grid.length,
        "columns": document.vars.grid[0].length,
        "seats": document.vars.grid
    }, currentIter, false);
    shuffleModal.hide();
});

document.getElementById("shuffle-back-front").addEventListener("click", () => {
    generate(document.vars.grid, {
        shuffleBackPush: true,
    });
    loadIteration({
        "rows": document.vars.grid.length,
        "columns": document.vars.grid[0].length,
        "seats": document.vars.grid
    }, currentIter, false);
    shuffleModal.hide();
});

document.getElementById("open-new-class").addEventListener("click", () => {
    loadClass(document.getElementById("open-new-class").getAttribute("class-name"));
});

document.getElementById("confirm-add-students").addEventListener("click", () => {
    let students = document.getElementById("student-names").value.split(/\r?\n/);
    students.forEach(async (student) => {
        let id = Date.now();
        while(document.vars.students[id.toString()]) id++;
        document.vars.students[id.toString()] = new Student(null, null, student, null, id.toString());

        addStudent(document.vars.students[id.toString()]);

        console.log(await ipcRenderer.invoke("settings.set", "classes." + currentClass + ".students." + id.toString(), document.vars.students[id.toString()]));
    });

    showToastInfo("Imported " + students.length + " students successfully!");
    newStudentsModal.hide();
});

document.getElementById("student-file-import").addEventListener("change", () => {
    let path = document.getElementById("student-file-import").files.item(0).path;
    console.log(path);
    let num = 0;
    fs.createReadStream(path)
        .pipe(parse({ delimiter: ",", from_line: 1 }))
        .on("data", async function (row) {
            console.log(row);
            let id = Date.now();
            while(document.vars.students[id.toString()]) id++;
            document.vars.students[id.toString()] = new Student(null, null, row[0], null, id.toString());
            addStudent(document.vars.students[id.toString()]);
            console.log(await ipcRenderer.invoke("settings.set", "classes." + currentClass + ".students." + id.toString(), document.vars.students[id.toString()]));
            num++;
        })
        .on("end", function () {
            console.log("finished");
            showToastInfo("Imported " + num + " students successfully!");
            newStudentsModal.hide();
        })
        .on("error", function (error) {
            console.log(error.message);
    });
});

document.getElementById("confirm-change-name").addEventListener("click", async () => {
    let name = document.getElementById("new-student-name").value;
    if(name === "") {
        document.getElementById("change-student-name-error").innerText = "Invalid name";
        return;
    }
    let id = document.getElementById("student-change-name").getAttribute("student");
    document.vars.students[id].name = name;
    await ipcRenderer.invoke("settings.set", "classes." + currentClass + ".students." + id + ".name", name);
    document.getElementById("student-" + id).children[0].innerText = name;
    await loadIteration({
        "rows": document.vars.grid.length,
        "columns": document.vars.grid[0].length,
        "seats": document.vars.grid,
    }, currentIter, false);
    changeStudentName.hide();
});

document.getElementById("confirm-change-size").addEventListener("click", () => {
    let r = document.getElementById("new-class-size-r").value;
    let c = document.getElementById("new-class-size-c").value;
    if(r <= 0 || c <= 0) {
        document.getElementById("prompt-new-class-error").innerText = "Invalid class size";
        return;
    }

    let newGrid = [];

    for(let i = 0;i < Math.max(document.vars.grid.length, r);i++) {
        if(i < r) newGrid[i] = [];
        for(let j = 0;j < (document.vars.grid[i] ? Math.max(document.vars.grid[i].length, c) : c);j++) {
            if(document.vars.grid[i] && document.vars.grid[i][j]) {
                if (i < r && j < c) newGrid[i].push(document.vars.grid[i][j]);
                else if (document.vars.grid[i][j].student) {
                    let id = document.vars.grid[i][j].student;
                    document.vars.students[id].r = null;
                    document.vars.students[id].c = null;
                    document.getElementById("student-" + id).classList.remove("student-used");
                }
            }
            else if(i < r && j < c) {
                console.log("attempting to set " + i + " " + j)
                newGrid[i][j] = new Seat(true, null);
            }
        }
    }


    document.vars.grid = newGrid;
    console.log(newGrid)
    loadIteration({
        "rows": document.vars.grid.length,
        "columns": document.vars.grid[0].length,
        "seats": document.vars.grid
    }, currentIter, false);

    changeSizeModal.hide();
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

document.getElementById("confirm-copy-class").addEventListener("click", async () => {
    let className = document.getElementById("copy-class-name").value;
    if(settings[className]) {
        document.getElementById("prompt-copy-class-error").innerText = "Class name already exists";
        return;
    }
    if(className === "") {
        document.getElementById("prompt-copy-class-error").innerText = "Class name cannot be empty";
        return;
    }
    if(className.includes("`")) {
        document.getElementById("prompt-copy-class-error").innerText = "The character '`' is not allowed in class names";
        return;
    }

    // LMAO
    className = className.replaceAll(".", "`");

    toastNewClass.show();
    document.getElementById("open-new-class").setAttribute("class-name", className);

    let gridClone = clone(document.vars.grid);

    for(let i = 0;i < gridClone.length;i++) {
        for(let j = 0;j < gridClone[i].length;j++) {
            if(gridClone[i][j].student) {
                gridClone[i][j].student = null;
            }
        }
    }

    await ipcRenderer.invoke("add-class", [className, gridClone.length, gridClone[0].length]);
    await loadClass(className);
    document.getElementById("save-as-new").click();
    await loadClass(className).then(() => console.log("done loading class"));

    testData = gridClone;

    showToastInfo("Loading...");
    setTimeout(async () => {
        await loadIteration({
            "rows": gridClone.length,
            "columns": gridClone[0].length,
            "seats": gridClone
        }, 0, true);
        await document.getElementById("save-to-current").click();
        toastInfo.hide();
    }, 1000);

    copyClassModal.hide();
});


document.getElementById("change-size").addEventListener("shown.bs.modal", () => {
    document.getElementById("size-change-current-size").innerText = document.vars.grid.length + "x" + document.vars.grid[0].length;
});

document.getElementById("change-size").addEventListener("hidden.bs.modal", () => {
    document.getElementById("change-size-error").innerText = "";
    document.getElementById("new-class-size-r").value = "";
    document.getElementById("new-class-size-c").value = "";
});

document.getElementById("shuffle").addEventListener("hidden.bs.modal", () => {

});

document.getElementById("prompt-new-class").addEventListener("hidden.bs.modal", () => {
    document.getElementById("class-name").value = "";
    document.getElementById("class-size-r").value = "";
    document.getElementById("class-size-c").value = "";
    document.getElementById("prompt-new-class-error").innerText = "";
});

document.getElementById("prompt-copy-class").addEventListener("hidden.bs.modal", () => {
    document.getElementById("copy-class-name").value = "";
    document.getElementById("prompt-copy-class-error").innerText = "";
});

document.getElementById("student-change-name").addEventListener("hidden.bs.modal", () => {
    document.getElementById("new-student-name").value = "";
    document.getElementById("change-student-name-error").innerText = "";
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

document.getElementById("classes-dropdown").addEventListener("shown.bs.collapse", (e) => {e.stopPropagation();});
document.getElementById("classes-dropdown").addEventListener("hidden.bs.collapse", (e) => {e.stopPropagation();});
document.getElementById("archived-classes-dropdown").addEventListener("shown.bs.collapse", (e) => {e.stopPropagation();});
document.getElementById("archived-classes-dropdown").addEventListener("hidden.bs.collapse", (e) => {e.stopPropagation();});

document.getElementById("save-as-new").addEventListener("click", async () => {
    //there should be a better way to do this
    let iterations = await ipcRenderer.invoke("settings.get", "classes." + currentClass + ".iterations");
    iterations.push(new Iteration(document.vars.grid.length, document.vars.grid[0].length, document.vars.grid));
    await ipcRenderer.invoke("settings.set", "classes." + currentClass + ".iterations", iterations);
    showToastInfo("Saved to iteration " + iterations.length + "!");
    await loadClass(currentClass);
});

document.getElementById("save-to-current").addEventListener("click", async () => {
    let iterations = await ipcRenderer.invoke("settings.get", "classes." + currentClass + ".iterations");
    iterations[currentIter] = new Iteration(document.vars.grid.length, document.vars.grid[0].length, document.vars.grid);
    await ipcRenderer.invoke("settings.set", "classes." + currentClass + ".iterations", iterations);
    showToastInfo("Saved to iteration " + (currentIter + 1) + "!");
});

async function loadClass(className) {
    document.getElementById("footer").classList.remove("d-none");
    document.getElementById("extras-menu-button").classList.remove("disabled");
    document.getElementById("shuffle-button").classList.remove("disabled");
    document.getElementById("student-sidebar-button").classList.remove("disabled");

    settings = await ipcRenderer.invoke("settings.get", "classes");
    await ipcRenderer.invoke("settings.set", "lastSeen", className);
    let res = settings[className];
    document.vars.students = res.students;

    document.vars.grid = [];
    document.getElementById("title-name").innerText = "Seating chart for: " + className.replaceAll("`", ".");
    currentClass = className;

    let studentList = document.getElementById("student-list").children[0];
    while(studentList.children[0]) studentList.children[0].remove();
    Object.values(document.vars.students).map((student) => {
        student.r = null; student.c = null;
        if (!student.deleted) {
            addStudent(student);
            document.vars.students[student.id] = student;
        }
    })

    console.log(res.iterations)

    let iterationList = document.getElementById("iteration-list");
    while(iterationList.children[0]) iterationList.children[0].remove();

    if(res.iterations.length) {
        res.iterations.forEach(i => {
            let element = document.createElement("li");
            let text = document.createElement("a");
            let ind = res.iterations.indexOf(i);
            let deleteButton = document.createElement("a");

            element.classList.add("iteration-item");
            text.classList.add("iteration-text");
            deleteButton.classList.add("iteration-delete-button");

            text.classList.add("dropdown-item");
            text.id = "iteration-" + ind;
            text.innerText = "Iteration " + (ind + 1);

            deleteButton.href = "#";
            deleteButton.classList.add("bi");
            deleteButton.classList.add("bi-trash");
            deleteButton.classList.add("dropdown-item")
            deleteButton.setAttribute("state", "0");

            deleteButton.addEventListener("click", async (e) => {
                if(deleteButton.getAttribute("state") === "0") {
                    deleteButton.setAttribute("state", "1");
                    deleteButton.classList.remove("bi-trash");
                    deleteButton.classList.add("bi-check");
                    e.stopPropagation();
                }
                else {
                    if(currentIter > ind) currentIter--;
                    settings[currentClass].iterations.splice(ind, 1);
                    await ipcRenderer.invoke("settings.set", "classes." + currentClass + ".iterations", settings[currentClass].iterations);
                    await loadClass(currentClass);
                    if(currentIter !== ind) {
                        loadIteration(settings[currentClass].iterations[currentIter], currentIter, true);
                    }
                }
            });

            element.appendChild(text);
            element.appendChild(deleteButton);
            iterationList.appendChild(element);
            console.log("added " + "iteration-" + ind + " to " + iterationList.id);

            element.addEventListener("click", () => {
                // for(let i = 0;i < iterationList.children.length;i++) {
                //     console.log("removing from " + iterationList.children[i].id)
                //     iterationList.children[i].classList.remove("active");
                // }
                if(currentIter !== -1) {
                    document.getElementById("iteration-" + currentIter).classList.remove("active");
                    document.getElementById("iteration-" + currentIter).parentElement.children[1].classList.remove("active");
                }
                loadIteration(res.iterations[ind], ind, true);
            });
        })
        // await loadIteration(className, res.iterations.length - 1);
        await loadIteration(res.iterations[res.iterations.length - 1], res.iterations.length - 1, true);
    }
    else {
        let element = document.createElement("li");
        let text = document.createElement("a");
        text.classList.add("dropdown-item");
        text.classList.add("disabled");
        text.innerText = "No iterations yet. ";
        element.appendChild(text);
        iterationList.appendChild(element);
        await loadIteration({
            "rows": res.rows,
            "columns": res.columns
        }, -1, true);
    }
}

function loadEmpty(r, c) {
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

    document.getElementById("save-as-new").click();
    currentIter++;
}

function loadIteration(data, iter, reset) {
    let content = document.getElementById("iteration-content");
    while(content.children.length) content.children[0].remove();

    // console.log(res.iterations[0])
    let r = data.rows;
    let c = data.columns;

    if(r % 2 == 0) {
        document.getElementById('shuffle-frontback').classList.remove("disabled");
        document.getElementById('shuffle-frontback').textContent = "Try to fill same seats";
    }
    else {
        document.getElementById('shuffle-frontback').classList.add("disabled");
        document.getElementById('shuffle-frontback').textContent = "Try to fill same seats - disabled for odd # of rows";
    }

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


    if(iter === -1) {
        loadEmpty(r, c);
        return;
    }

    //update grid stuff
    console.log("loading iterations")
    document.getElementById("iterations-dropdown-label").innerText = "Iteration " + (iter + 1);
    console.log("checking " + "iteration-" + iter)
    console.log(document.getElementById("iteration-" + iter).classList)
    document.getElementById("iteration-" + iter).classList.add("active");
    document.getElementById("iteration-" + iter).parentElement.children[1].classList.add("active");
    currentIter = iter;
    for(let i = 0;i < r;i++) {
        if(reset) document.vars.grid[i] = [];
        for(let j = 0;j < c;j++) {
            let cell = document.getElementById("cell-" + i + "-" + j);
            let button = cell.children[1];
            button.href = "#";
            button.classList.add("bi");
            button.classList.add("seat-button");
            button.addEventListener("click", () => {
                change(i, j);
            });
            if(data.seats[i][j].student) {
                cell.children[0].textContent = document.vars.students[data.seats[i][j].student].name;
                cell.classList.add("cell");
                button.classList.add("bi-x");
                if(reset) document.vars.grid[i][j] = new Seat(false, data.seats[i][j].student);
                document.vars.students[document.vars.grid[i][j].student].r = i; document.vars.students[document.vars.grid[i][j].student].c = j;
                if(document.vars.students[data.seats[i][j].student].deleted) cell.children[0].textContent += " (deleted)";
                else document.getElementById("student-" + document.vars.grid[i][j].student).classList.add("student-used");

                button.setAttribute("x", "true")
            }
            else if(!data.seats[i][j].empty) {
                cell.classList.add("cell-unoccupied");
                button.classList.add("bi-x");
                if(reset) document.vars.grid[i][j] = new Seat(false, null);

                button.setAttribute("x", "true")
            }
            else {
                cell.classList.add("cell-empty");
                button.classList.add("bi-plus");
                if(reset) document.vars.grid[i][j] = new Seat(true, null);

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

function addStudent(student) {
    let element = document.createElement("li");
    let buttonDiv = document.createElement("div");
    let deleteButton = document.createElement("a");
    let editButton = document.createElement("a");
    let p = document.createElement("p");
    element.draggable = true;
    element.classList.add("list-group-item");
    element.classList.add("student");
    element.classList.add("nav-item");
    element.id = "student-" + student.id;

    p.innerText = student.name;
    p.classList.add("student-text");

    deleteButton.href = "#";
    deleteButton.classList.add("bi");
    deleteButton.classList.add("bi-trash");
    deleteButton.setAttribute("state", "0");

    deleteButton.addEventListener("click", async () => {
        if(deleteButton.getAttribute("state") === "0") {
            deleteButton.classList.remove("bi-trash");
            deleteButton.classList.add("bi-check");
            deleteButton.setAttribute("state", "1");
        }
        else {
            await ipcRenderer.invoke("settings.set", "classes." + currentClass + ".students." + student.id + ".deleted", true);
            document.vars.students[student.id].deleted = true;
            if(document.vars.students[student.id].r != null) {
                await loadIteration({
                    "rows": document.vars.grid.length,
                    "columns": document.vars.grid[0].length,
                    "seats": document.vars.grid
                }, currentIter, false);
            }
            element.remove();
        }
    });

    editButton.href = "#";
    editButton.classList.add("bi");
    editButton.classList.add("bi-pencil-square");
    editButton.setAttribute("data-bs-toggle", "modal");
    editButton.setAttribute("data-bs-target", "#student-change-name");
    editButton.addEventListener("click", () => {
        document.getElementById("student-change-name-label").innerText = "Change a student's name (" + student.name + ")";
        document.getElementById("student-change-name").setAttribute("student", student.id);
    });


    buttonDiv.appendChild(editButton);
    buttonDiv.appendChild(deleteButton);
    buttonDiv.classList.add("student-buttons");

    element.appendChild(p);
    element.appendChild(buttonDiv);
    document.getElementById("student-list").children[0].appendChild(element);

    //nav-item student student-used list-group-item

    element.addEventListener("click", (e) => {
        if(document.vars.students[student.id].r != null) {
            let cell = document.getElementById("cell-" + document.vars.students[student.id].r + "-" + document.vars.students[student.id].c);
            if(cell.classList.contains("cell-highlight")) return;
            cell.scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
            cell.classList.add("cell-highlight");
            setTimeout(() => {
                cell.classList.remove("cell-highlight");
            }, 1000);
        }
    });

    element.addEventListener("dragstart", (e) => {
        studentDragStart(e, student.id);
    });
}

function showToastInfo(message) {
    console.log(message)
    document.getElementById("toast-info-message").children[0].innerText = message;
    toastInfo.show();
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


function generate(grid, options) {
    let r = grid.length, c = grid[0].length, tot = r * c, totSeats = tot, totStudents = tot;
    for(let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
            if(grid[i][j].empty) totSeats--;
            if(!grid[i][j].student) totStudents--;
        }
    }
    if(options.shuffleFrontBack) {
        console.log("shuffling front and back");
        let front = [], back = [];
        if(r % 2 == 0) {
            for (let i = 0; i < r; i++) {
                for (let j = 0; j < c; j++) {
                    if (!grid[i][j].student) continue;
                    //just in case
                    document.vars.students[grid[i][j].student].r = i;
                    document.vars.students[grid[i][j].student].c = j;
                    if (i < Math.floor(r / 2)) back.push(grid[i][j].student);
                    else front.push(grid[i][j].student);
                    grid[i][j].student = -1;
                }
            }

            shuffle(front);
            shuffle(back);

            //first pass: fill all previously occupied positions
            //backwards so it can fill from front
            for(let i = Math.floor(r / 2) - 1;i >= 0;i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty) continue;
                    if(front.length && grid[i][j].student === -1) grid[i][j].student = front.pop();
                    else grid[i][j].student = null;
                }
            }
            for(let i = r - 1;i >= Math.floor(r / 2);i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty) continue;
                    if(back.length && grid[i][j].student === -1) grid[i][j].student = back.pop();
                    else grid[i][j].student = null;
                }
            }

            //second pass: fill all empty positions
            for(let i = Math.floor(r / 2) - 1;i >= 0;i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty || grid[i][j].student) continue;
                    if(front.length) grid[i][j].student = front.pop();
                }
            }
            for(let i = r - 1;i >= Math.floor(r / 2);i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty || grid[i][j].student) continue;
                    if(back.length) grid[i][j].student = back.pop();
                }
            }

            showDistanceMessage(grid, totStudents - (front.length + back.length));
            if(front.length || back.length) {
                showToastInfo("Wasn't able to fit " + (front.length + back.length) + " students due to not having enough seats. ");
            }
        }
        else {
            //this should not happen
            return;
        }
    }
    else if(options.shuffleFrontBackPush) {
        console.log("shuffleFrontBackPush")
        let front = [], back = [];
        if(r % 2 == 0) {
            for (let i = 0; i < r; i++) {
                for (let j = 0; j < c; j++) {
                    if (!grid[i][j].student) continue;
                    //just in case
                    document.vars.students[grid[i][j].student].r = i;
                    document.vars.students[grid[i][j].student].c = j;
                    if (i < Math.floor(r / 2)) back.push(grid[i][j].student);
                    else front.push(grid[i][j].student);
                    grid[i][j].student = null;
                }
            }

            shuffle(front);
            shuffle(back);

            //backwards so it can fill from front
            for(let i = Math.floor(r / 2) - 1;i >= 0;i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty) continue;
                    if(front.length) grid[i][j].student = front.pop();
                }
            }
            for(let i = r - 1;i >= Math.floor(r / 2);i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty) continue;
                    if(back.length) grid[i][j].student = back.pop();
                }
            }
        }
        else {
            //center student (if c is odd) will be considered to be part of the back and will be added to the front half
            for (let i = 0; i < r; i++) {
                for (let j = 0; j < c; j++) {
                    if (!grid[i][j].student) continue;
                    //just in case
                    document.vars.students[grid[i][j].student].r = i;
                    document.vars.students[grid[i][j].student].c = j;
                    if (i < Math.floor(r / 2)) front.push(grid[i][j].student);
                    else if (i > Math.floor(r / 2)) back.push(grid[i][j].student);
                    else {
                        if(j < Math.floor(c / 2)) back.push(grid[i][j].student)
                        else front.push(grid[i][j].student) // if c is odd then this will push the center student
                    }
                }
            }

            shuffle(front);
            shuffle(back);

            // starting from Math.floor(c / 2) (including middle if c is odd) filling
            for(let j = Math.floor(c / 2);j >= 0;j--) {
                if(grid[Math.floor(r / 2)][j].empty) continue;
                if(front.length) grid[Math.floor(r / 2)][j].student = front.pop();
            }

            //backwards so it can fill from front
            for(let i = Math.floor(r / 2) - 1;i >= 0;i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty) continue;
                    if(front.length) grid[i][j].student = front.pop();
                }
            }
            for(let i = r - 1;i > Math.floor(r / 2);i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty) continue;
                    if(back.length) grid[i][j].student = back.pop();
                }
            }

            for(let j = c;j > Math.floor(c / 2);j--) {
                if(grid[Math.floor(r / 2)][j].empty) continue;
                if(front.length) grid[Math.floor(r / 2)][j].student = back.pop();
            }
        }

        showDistanceMessage(grid, totStudents - (front.length + back.length));
        if(front.length || back.length) {
            showToastInfo("Wasn't able to fit " + (front.length + back.length) + " students due to not having enough seats. ");
        }
    }
    else if(options.shuffleFront){
        let front = [], back = [];
        if(r % 2 === 0) {
            for (let i = Math.floor(r / 2); i < r; i++) {
                for (let j = 0; j < c; j++) {
                    if (!grid[i][j].student) continue;
                    //just in case
                    document.vars.students[grid[i][j].student].r = i;
                    document.vars.students[grid[i][j].student].c = j;
                    front.push(grid[i][j].student);
                    grid[i][j].student = -1;
                }
            }

            shuffle(front);

            //backwards so it can fill from front
            for(let i = r - 1;i >= Math.floor(r / 2);i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty) continue;
                    if(front.length && grid[i][j].student === -1) grid[i][j].student = front.pop();
                }
            }
        }
        else {
            //center student (if c is odd) will be considered to be part of the back and will be added to the front half
            for (let i = 0; i < r; i++) {
                for (let j = 0; j < c; j++) {
                    if (!grid[i][j].student) continue;
                    //just in case
                    document.vars.students[grid[i][j].student].r = i;
                    document.vars.students[grid[i][j].student].c = j;
                    if (i > Math.floor(r / 2)) {
                        front.push(grid[i][j].student);
                        grid[i][j].student = -1;
                    }
                    else if (i == Math.floor(r / 2) && j >= Math.floor(c / 2)) {
                        front.push(grid[i][j].student)
                        grid[i][j].student = -1;
                    }
                }
            }

            shuffle(front);

            for(let j = c - 1;j >= Math.floor(c / 2);j--) {
                if(grid[Math.floor(r / 2)][j].empty) continue;
                if(front.length && grid[Math.floor(r / 2)][j].student === -1) grid[Math.floor(r / 2)][j].student = front.pop();
            }

            //backwards so it can fill from front
            for(let i = r - 1;i >= Math.floor(r / 2);i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty) continue;
                    if(front.length && grid[i][j].student === -1) grid[i][j].student = front.pop();
                }
            }
        }

        showDistanceMessageHalf(grid, totStudents, 0);
    }
    else if(options.shuffleFrontPush){
        let front = [], back = [];
        if(r % 2 === 0) {
            for (let i = Math.floor(r / 2); i < r; i++) {
                for (let j = 0; j < c; j++) {
                    if (!grid[i][j].student) continue;
                    //just in case
                    document.vars.students[grid[i][j].student].r = i;
                    document.vars.students[grid[i][j].student].c = j;
                    front.push(grid[i][j].student);
                    grid[i][j].student = null;
                }
            }

            shuffle(front);

            //backwards so it can fill from front
            for(let i = r - 1;i >= Math.floor(r / 2);i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty) continue;
                    if(front.length) grid[i][j].student = front.pop();
                }
            }
        }
        else {
            //center student (if c is odd) will be considered to be part of the back and will be added to the front half
            for (let i = 0; i < r; i++) {
                for (let j = 0; j < c; j++) {
                    if (!grid[i][j].student) continue;
                    //just in case
                    document.vars.students[grid[i][j].student].r = i;
                    document.vars.students[grid[i][j].student].c = j;
                    if (i > Math.floor(r / 2)) front.push(grid[i][j].student);
                    else if (i == Math.floor(r / 2) && j >= Math.floor(c / 2)) front.push(grid[i][j].student)
                }
            }

            shuffle(front);

            for(let i = r - 1;i > Math.floor(r / 2);i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty) continue;
                    if(front.length) grid[i][j].student = front.pop();
                }
            }

            for(let j = c - 1;j >= Math.floor(c / 2);j--) {
                if(grid[Math.floor(r / 2)][j].empty) continue;
                if(front.length) grid[Math.floor(r / 2)][j].student = front.pop();
            }
        }

        showDistanceMessageHalf(grid, totStudents, 0);
    }
    else if(options.shuffleBack){
        let back = [];
        if(r % 2 === 0) {
            for (let i = 0; i < Math.floor(r / 2); i++) {
                for (let j = 0; j < c; j++) {
                    if (!grid[i][j].student) continue;
                    //just in case
                    document.vars.students[grid[i][j].student].r = i;
                    document.vars.students[grid[i][j].student].c = j;
                    back.push(grid[i][j].student);
                    grid[i][j].student = -1;
                }
            }

            shuffle(back);

            //backwards so it can fill from front
            for(let i = Math.floor(r / 2) - 1;i >= 0;i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty) continue;
                    if(back.length && grid[i][j].student === -1) grid[i][j].student = back.pop();
                }
            }
        }
        else {
            //center student (if c is odd) will be considered to be part of the back and will be added to the front half
            for (let i = 0; i < r; i++) {
                for (let j = 0; j < c; j++) {
                    if (!grid[i][j].student) continue;
                    //just in case
                    document.vars.students[grid[i][j].student].r = i;
                    document.vars.students[grid[i][j].student].c = j;
                    if (i < Math.floor(r / 2)) back.push(grid[i][j].student);
                    else if (i === Math.floor(r / 2) && j < Math.floor(c / 2)) back.push(grid[i][j].student)
                    grid[i][j].student = -1;
                }
            }

            shuffle(back);

            for(let j = 0;j < Math.floor(c / 2);j++) {
                if(grid[Math.floor(r / 2)][j].empty) continue;
                if(back.length && grid[Math.floor(r / 2)][j].student === -1) grid[Math.floor(r / 2)][j].student = back.pop();
            }

            for(let i = Math.floor(r / 2) - 1;i >= 0;i--) {
                for(let j = 0;j < c;j++) {
                    if(grid[i][j].empty) continue;
                    if(back.length && grid[i][j].student === -1) grid[i][j].student = back.pop();
                }
            }
        }

        showDistanceMessageHalf(grid, totStudents, 1);
    }
    else if(options.shuffleBackPush){

    }
    else if(options.populate) {
        let r = grid.length, c = grid[0].length;
        let students = [];
        Object.values(document.vars.students).forEach(student => {
            students.push(student)
            document.getElementById("student-" + student.id).classList.remove("student-used");
        });
        if(options.sort) students.sort((a, b) => b.name.localeCompare(a.name));
        else shuffle(students);
        console.log(students.length)

        for(let i = 0;i < r;i++) {
            for(let j = 0;j < c;j++) {
                if(grid[i][j].student) grid[i][j].student = null;
            }
        }

        for(let j = 0;j < c;j++) {
            for(let i = r - 1;i >= 0;i--) {
                if(!grid[i][j].empty && students.length) {
                    grid[i][j] = new Seat(false, students.pop().id);
                    document.vars.students[grid[i][j].student].r = i;
                    document.vars.students[grid[i][j].student].c = j;
                    // console.log("adding student " + grid[i][j].student + " to " + i + ", " + j);
                    console.log("adding student")
                    document.getElementById("student-" + grid[i][j].student).classList.add("student-used");
                }
            }
        }

        if(students.length) {
            showToastInfo("Wasn't able to fit " + students.length + " students due to not having enough seats. ");
        }
    }
}

function showDistanceMessage(grid, totStudents) {
    let r = grid.length, c = grid[0].length
    let totDist = 0.00, totMDist = 0.00;
    let minDist = 1e9, minMDist = 1e9;
    let maxDist = 0, maxMDist = 0;
    for(let i = 0;i < r;i++) {
        for(let j = 0;j < c;j++) {
            if(!grid[i][j].student) continue;
            let cDist = dist(i, j, document.vars.students[grid[i][j].student].r, document.vars.students[grid[i][j].student].c);
            let cMDist = Math.abs(i - document.vars.students[grid[i][j].student].r) + Math.abs(j - document.vars.students[grid[i][j].student].c);
            totDist += cDist;
            totMDist += cMDist;
            minDist = Math.min(minDist, cDist);
            minMDist = Math.min(minMDist, cMDist);
            maxDist = Math.max(maxDist, cDist);
            maxMDist = Math.max(maxMDist, cMDist);
            document.vars.students[grid[i][j].student].r = i;
            document.vars.students[grid[i][j].student].c = j;
        }
    }
    let avgDist = totDist / totStudents, avgMDist = totMDist / totStudents;
    showToastInfo("Successfully shuffled: \n " +
        "Average Distance: " + avgDist.toFixed(2) + "\n Average Manhattan Distance: " + avgMDist.toFixed(2) +
        "\n Minimum Distance: " + minDist.toFixed(2) + "\n Minimum Manhattan Distance: " + minMDist.toFixed(2) +
        "\n Maximum Distance: " + maxDist.toFixed(2) + "\n Maximum Manhattan Distance: " + maxMDist.toFixed(2));
}

function showDistanceMessageHalf(grid, totStudents, half) {
    let r = grid.length, c = grid[0].length
    let totDist = 0.00, totMDist = 0.00;
    let minDist = 1e9, minMDist = 1e9;
    let maxDist = 0, maxMDist = 0;

    function getDist(i, j) {
        let cDist = dist(i, j, document.vars.students[grid[i][j].student].r, document.vars.students[grid[i][j].student].c);
        let cMDist = Math.abs(i - document.vars.students[grid[i][j].student].r) + Math.abs(j - document.vars.students[grid[i][j].student].c);
        totDist += cDist;
        totMDist += cMDist;
        minDist = Math.min(minDist, cDist);
        minMDist = Math.min(minMDist, cMDist);
        maxDist = Math.max(maxDist, cDist);
        maxMDist = Math.max(maxMDist, cMDist);
        document.vars.students[grid[i][j].student].r = i;
        document.vars.students[grid[i][j].student].c = j;
        console.log("calculating dist for cell " + i + " " + j + " dist: " + minDist)
    }

    if(r % 2 === 0) {
        let istart = -1, iend = -1;
        if(half === 0) {
            istart = Math.floor(r / 2);
            iend = r;
        }
        else {
            istart = 0;
            iend = Math.floor(r / 2);
        }

        for (let i = istart; i < iend; i++) {
            for (let j = 0; j < c; j++) {
                if(!grid[i][j].student) continue;
                getDist(i, j);
            }
        }
    }
    else {
        for (let i = 0; i < r; i++) {
            for (let j = 0; j < c; j++) {
                if (!grid[i][j].student) continue;
                console.log("checking " + i + " " + j + " half: " + half + " r/2 floor: " + Math.floor(r / 2))
                if (i > Math.floor(r / 2)) {
                    if(half === 0) getDist(i, j);
                }
                else if (i < Math.floor(r / 2)) {
                    if (half === 1) getDist(i, j);
                }
                else {
                    if(j < Math.floor(c / 2)) if(half === 1) getDist(i, j);
                    else {if(half === 0) getDist(i, j);}
                }
            }
        }
    }

    let avgDist = totDist / totStudents, avgMDist = totMDist / totStudents;
    showToastInfo("Successfully shuffled: \n " +
        "Average Distance: " + avgDist.toFixed(2) + "\n Average Manhattan Distance: " + avgMDist.toFixed(2) +
        "\n Minimum Distance: " + minDist.toFixed(2) + "\n Minimum Manhattan Distance: " + minMDist.toFixed(2) +
        "\n Maximum Distance: " + maxDist.toFixed(2) + "\n Maximum Manhattan Distance: " + maxMDist.toFixed(2));
}

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function dist(r, c, r1, c1) {
    return Math.sqrt((r - r1) * (r - r1) + (c - c1) * (c - c1));
}
