// Speichert den Task
function saveTask(){
    $.ajax({url: "/createAufgabe", type:"POST", data:{
        mitarbeiter:1, 
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