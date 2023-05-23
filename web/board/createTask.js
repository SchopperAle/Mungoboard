// Speichert den Task
function saveTask(){
    if($("#TaskName").val()==undefined ||$("#TaskName").val()==""){
        alert("Name fehlt!");
        return;
    }
    $.ajax({url: "/createAufgabe", type:"POST", data:{
        mitarbeiter:$("#mitarbeiter").val(), 
        name:$("#TaskName").val(), 
        beschreibung:$("#TaskBeschreibung").val().replaceAll("\n", "<br>")} // \n werden für HTML zu <br>
    }).done((data) => {

        // Aufgabe zum Board linken
        $.ajax({url: "/addAufgabeToBoard", type:"POST", data:{
            aufgabe:data.id,
            board:document.body.getAttribute("data-id")
        }}).done((data) => {

            // Zurück zum Board gehen
            window.location.href="/page/board/"+document.body.getAttribute("data-id");
        });
    })
}

// Get the Mitarbeiter
$.get({url:"/mitarbeiterInBoard", data:{board: document.body.getAttribute("data-id")}}).done((data) => {
    if(typeof(data) == "string"){
        window.location.href = "/";
        return;
    }

    data.forEach((val) => {
        $("#mitarbeiter").append(`<option value=${val.id}>${val.name}</option>`);
    })
});