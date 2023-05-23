// Aufgaben laden
$.ajax({url: "/aufgaben?board="+document.body.getAttribute("data-id")})
.done((data)=>{
    console.log(data);
    data.forEach((val) => {
        $("#"+val.status).html($("#"+val.status).html()+
            "<div class=\"task\" id=\""+val.id+"\" draggable=\"true\" ondragstart=\"drag(event)\" ondblclick=\"dblClicked(event)\">"+val.name+"</div>"
        );
    });
});

// Drag-Eventhandler für die Aufgaben
function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

// Erlaubt Drop über die Kategorien
function allowDrop(ev) {
    ev.preventDefault();
}

// Drop-Eventhandler für den Status der Aufgaben
function drop(ev) {
    ev.preventDefault();
    let data = ev.dataTransfer.getData("text");
    let status = ev.target.classList[0] == "task"?ev.target.parentNode.getAttribute("id"):ev.target.getAttribute("id");
    document.getElementById(status).appendChild(document.getElementById(data));

    $.ajax({url: "/setStatus", type:"POST", data:{aufgabe:data, status:status}})
}

// Double-Click Eventhandler (für Task)
function dblClicked(ev) {
    ev.preventDefault();
    showTask(ev.target);
}

// Task anzeigen
function showTask(taskOBJ){
    $.ajax({url:"/aufgabe?aufgabe="+taskOBJ.id})
    .done((data) => {
        console.log(data);
        $("#aName").html(data.name);
        $("#aName").attr("data-id", data.id);
        $("#aBeschreibung").html(data.beschreibung);
        $("#aMitarbeiter").html("Mitarbeiter: "+data.mitarbeiter);
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
    $("#aSave").hide();
    $("#aEdit").show();
}

// Das Save-Feld fürs Bearbeiten unsichbar machen
$("#aSave").hide();

// Bearbeiten ermöglichen
function enableEdit(){
    $("#aName").attr("contenteditable", "true");
    $("#aBeschreibung").attr("contenteditable", "true");
    $("#aMitarbeiterSel").show();
    $("#aMitarbeiter").hide();
    $.get({url:"/mitarbeiterInBoard", data:{board:$("body").data("id")}}).then((data) => {
        if(typeof(data) == "string"){
            return window.location.href = "/";
        }
        data.forEach((val) => {
            $("#aMitarbeiterSel").append(`<option id="aMitarbeiterSelN${val.id}" value="${val.id}">${val.name}</option>`);
        });
    });
    $("#aSave").show();
    $("#aEdit").hide();
}

// Zum speichern der Änderungen
function saveChanges(){
    $.ajax({url:"/updateAufgabe", type:"POST", data:{
        id: $("#aName").attr("data-id"),
        name: $("#aName").html(),
        beschreibung: $("#aBeschreibung").html().replaceAll("\n", "<br>"),
        mitarbeiter: $("#aMitarbeiterSel").val(),
        status: $("#aStatus").attr("data-status")
    }}).done((data) => {
        if(data == "Aufgabe Bearbeitet."){
            $("#aSave").hide();
            $("#aEdit").show();
            $("#aMitarbeiterSel").hide();
            $("#aMitarbeiter").show();
            $("#aMitarbeiter").text("Mitarbeiter: "+$(`#aMitarbeiterSelN${$("#aMitarbeiterSel").val()}`).text());
            $("#aName").attr("contenteditable", "false");
            $("#aBeschreibung").attr("contenteditable", "false");
            $("#"+$("#aName").attr("data-id")).html($("#aName").html());
        }
        alert(data);
    });
}

// Aufgabe löschen
function deleteTask(){
    $.ajax({url:"/deleteAufgabe", type:"POST", data:{id:$("#aName").attr("data-id")}})
    .done((data) => {
        hideViewAufgabe();
        $("#"+$("#aName").attr("data-id")).hide();
        alert(data);
    })
}