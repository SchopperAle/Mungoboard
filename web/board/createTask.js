// Speichert den Task
function saveTask(){
    $.ajax({url: "/createAufgabe", type:"POST", data:{mitarbeiter:1, name:$("#TaskName").val(), beschreibung:$("#TaskBeschreibung").val()}})
    .done((data) => {
        console.log(data);
        $.ajax({url: "/addAufgabeToBoard", type:"POST", data:{
            aufgabe:data.id,
            board:document.body.getAttribute("data-id")
        }}).done((data) => {
            console.log(data);
            window.location.href="/page/board/"+document.body.getAttribute("data-id");
        });
    })
}