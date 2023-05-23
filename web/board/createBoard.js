// Bei Login Zustand wieder herstellen
if(sessionStorage.getItem("bName") != undefined){
    $("#BoardName").val(sessionStorage.getItem("bName"));
    sessionStorage.removeItem("bName");
}
if(sessionStorage.getItem("bDesc") != undefined){
    $("#BoardBeschreibung").val(sessionStorage.getItem("bDesc"));
    sessionStorage.removeItem("bDesc");
}

// Board erstellen
function createBoard(){
    // Überprüfung, ob Board-Name leer ist
    let name = $("#BoardName").val();
    if(name == undefined || name == ""){
        alert("Name ist leer!");
        return;
    }
    let beschreibung = $("#BoardBeschreibung").val();

    // Board erstellen
    $.ajax({url:"/createBoard", type:"POST", data:{name, beschreibung}})
        .done((data) => {
            // Fehler bei der Erstellung
            if(data.id == undefined){
                console.log(typeof(data), data.startsWith("<!"))
                if(data.startsWith("<!")){
                    sessionStorage.setItem("bName", name);
                    sessionStorage.setItem("bDesc", beschreibung);
                    document.write(data);
                    return;
                }
                alert(data);
                return;
            }

            // Ersteller zum Board hinzufügen
            $.ajax({url: "/addMitarbeiterToBoard", type:"POST", data:{board: data.id}})
                .done((nData) => {
                    alert(nData);
                    // Zu den Boards springen
                    window.location.href="/page/profile";
                })
        });
}