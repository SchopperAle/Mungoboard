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
    // Überprüfung: Ist Benutzer eingeloggt
    if(localStorage.getItem("id") == undefined){
        // Benutzer ist nicht eingeloggt
        alert("Du bist nicht eingeloggt!");
        sessionStorage.setItem("bName", $("#BoardName").val());
        sessionStorage.setItem("bDesc", $("#BoardBeschreibung").val());
        window.location.href="/web/user/login.html";
        return;
    }

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
                alert(data);
                return;
            }

            // Ersteller zum Board hinzufügen
            $.ajax({url: "/addMitarbeiterToBoard", type:"POST", data:{board: data.id, mitarbeiter: parseInt(localStorage.getItem("id"))}})
                .done((nData) => {
                    alert(nData);
                    // Zu den Boards springen
                    window.location.href="/page/profile";
                })
        });
}