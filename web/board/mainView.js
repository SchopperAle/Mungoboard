// Load Tasks
$.ajax({url: "/aufgaben?board="+document.body.getAttribute("data-id")})
.done((data)=>{
    console.log(data);
    data.forEach((val) => {
        $("#"+val.status).html($("#"+val.status).html()+
            "<div class=\"task\" id=\""+val.id+"\" draggable=\"true\" ondragstart=\"drag(event)\" ondblclick=\"dblClicked(event)\">"+val.name+"</div>"
        );
    });
});

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drop(ev) {
    ev.preventDefault();
    let data = ev.dataTransfer.getData("text");
    let status = ev.target.classList[0] == "task"?ev.target.parentNode.getAttribute("id"):ev.target.getAttribute("id");
    document.getElementById(status).appendChild(document.getElementById(data));

    $.ajax({url: "/setStatus", type:"POST", data:{aufgabe:data, status:status}})
}

function dblClicked(ev) {
    ev.preventDefault();
    showTask(ev.target);
}

function showTask(taskOBJ){
    $.ajax({url:"/aufgabe?aufgabe="+taskOBJ.id})
    .done((data) => {
        console.log(data);
        $("#aName").html(data.name);
        $("#aName").attr("data-id", data.id);
        $("#aBeschreibung").html(data.beschreibung);
        $("#aMitarbeiter").html("Mitarbeiter: WIP-"+data.mitarbeiter);
        $("#aStatus").html("Status: "+data.status);
        $("#aStatus").attr("data-status",data.status);
        $("#blankScreen").show();
        $("#viewAufgabe").show(200);
    });
}

// Die Aufgaben-View unsichbar machen
function hideViewAufgabe(){
    $("#blankScreen").hide();
    $("#viewAufgabe").hide(200);
}

// Das Save-Feld fürs Bearbeiten unsichbar machen
$("#aSave").hide();

// Bearbeiten ermöglichen
function enableEdit(){
    $("#aName").attr("contenteditable", "true");
    $("#aBeschreibung").attr("contenteditable", "true");
    $("#aSave").show();
    $("#aEdit").hide();
}

// Zum speichern der Änderungen
function saveChanges(){
    $.ajax({url:"/updateAufgabe", type:"POST", data:{
        id: $("#aName").attr("data-id"),
        name: $("#aName").html(),
        beschreibung: $("#aBeschreibung").html().replaceAll("\n", "<br>"),
        mitarbeiter: 1, // Platzhalter
        status: $("#aStatus").attr("data-status")
    }}).done((data) => {
        if(data == "Aufgabe Bearbeitet."){
            $("#aSave").hide();
            $("#aEdit").show();
            $("#aName").attr("contenteditable", "false");
            $("#aBeschreibung").attr("contenteditable", "false");
        }
        alert(data);
    });
}