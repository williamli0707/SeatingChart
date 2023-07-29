const { ipcRenderer } = require('electron');

let newClassModal = new bootstrap.Modal(document.getElementById('prompt-new-class'), {});

let settings;
ipcRenderer.invoke("settings.get", "classes").then((res) => {settings = res;});

document.getElementById("test-button").addEventListener("click", () => {
    loadIteration("Test_class_of_2036", 0);
});

document.getElementById("confirm-create-class").addEventListener("click", () => {
    //TODO check for conditions like empty, invalid, duplicate name, etc
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
    ipcRenderer.invoke("add-class", [className, r, c]);
});

document.getElementById("prompt-new-class").addEventListener("hidden.bs.modal", () => {
    document.getElementById("class-name").value = "";
    document.getElementById("class-size-r").value = "";
    document.getElementById("class-size-c").value = "";
    document.getElementById("prompt-new-class-error").innerText = "";
});

//TODO close sidebar when background-lock is clicked

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

}

async function loadIteration(className, iterNum) {
    let res = (await ipcRenderer.invoke("settings.get", "classes"))[className];
    console.log(res);
    console.log("___")
    // console.log(res.iterations[0])
    let r = res.rows, c = res.columns;
    let content = document.getElementById("iteration-content");
    while(content.children.length) content.children[0].remove();
    for(let i = 0;i < r;i++) {
        let row = document.createElement("div");
        row.classList.add("row");
        for(let j = 0;j < c;j++) {
            let col = document.createElement("div");
            col.classList.add("col");
            let cell = document.createElement("div");
            cell.classList.add("cell");
            let a = document.createElement("a");
            a.textContent = res.iterations[iterNum].seats[i][j].name;
            a.draggable = true;
            cell.appendChild(a);
            col.appendChild(cell);
            row.appendChild(col);
        }
        content.appendChild(row);
    }
}


/*
TODO:
- copy layout
- clear students
- draggable swap
- expand and contract
 */