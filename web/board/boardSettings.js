
// Get Mitarbeiters
$.get({url:"/mitarbeiterInBoard", data:{board: document.body.getAttribute("data-id")}}).fail((data) => {
    alert(data); // Fehler
}).done((data) => {
    data?.forEach((val) => {
        let txt = `<div data-id="${val.id}"><span>${val.name}</span><span><img src="/web/images/icon_delete.png" alt="Löschen" onclick="removeMitarbeiter(${val.id});"></span></div>`;
        $("#mitarbeiters").append(txt);
    });
});

// Mitarbeiter hinzufügen
$("#namebutton").on("click", () => {
    // Validierung
    if($("#name").val().length < 1){
        return alert("Name muss vorhanden sein.");
    }
    if($("#name").val().length < 5){
        return alert("Name zu kurz.");
    }
    if($("#name").val().length > 25){
        return alert("Name zu lang.");
    }

    // Request senden
    $.post({url:"/addMitarbeiterToBoardByName", data:{board:document.body.getAttribute("data-id"), mitarbeiter:$("#name").val()}}).done(() => {
        window.location.href = window.location.href;
    }).fail((data) => { // Fehler
        alert(data.responseText);
    });
});

/**
 * Mitarbeiter entfernen
 * @param {number} mitarbeiter Mitarbeiter
 */
function removeMitarbeiter(mitarbeiter){
    $.post({url:"/removeMitarbeiterFormBoard", data:{mitarbeiter:mitarbeiter, board:document.body.getAttribute("data-id")}}).done(() => {
        window.location.href = window.location.href;
    })
}

// Häckchen-Klickbar machen
$("#haekchen img").on("click", () => {
    window.location.href = "/page/board/"+document.body.getAttribute("data-id");
});