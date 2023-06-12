
// Get Mitarbeiters
$.get({url:"/mitarbeiterInBoard", data:{board: document.body.getAttribute("data-id")}}).fail((data) => {
    alert(data); // Fehler
}).done((data) => { // Success
    data?.forEach((val) => {
        let txt = `<div data-id="${val.id}"><span>${val.name}</span><span><img src="/web/images/icon_delete.png" onclick="removeMitarbeiter(${val.id});"></span></div>`;
        $("#mitarbeiters").append(txt);
    });
});

// Mitarbeiter hinzufügen
$("#namebutton").on("click", () => {
    if($("#name").val().length < 5){
        return alert("Name zu kurz.");
    }
    $.post({url:"/addMitarbeiterToBoardByName", data:{board:document.body.getAttribute("data-id"), mitarbeiter:$("#name").val()}}).done(() => {
        window.location.href = window.location.href;
    });
});

/**
 * Mitarbeiter entfernen
 * @param {number} mitarbeiter 
 */
function removeMitarbeiter(mitarbeiter){
    $.post({url:"/removeMitarbeiterFormBoard", data:{mitarbeiter:mitarbeiter, board:document.body.getAttribute("data-id")}}).done(() => {
        window.location.href = window.location.href;
    })
}