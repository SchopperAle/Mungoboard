function createBoard(){
    if(localStorage.getItem("id") == undefined){
        alert("Du bist nicht eingeloggt!");
        window.location.href="/web/user/login.html";
        return;
    }

    let name = $("#BoardName").val();
    if(name == undefined || name == ""){
        alert("Name ist leer!");
        return;
    }
    let beschreibung = $("#BoardBeschreibung").val();

    $.ajax({url:"/createBoard", type:"POST", data:{name, beschreibung}})
        .done((data) => {
            if(data.id == undefined){
                alert(data);
                return;
            }
            $.ajax({url: "/addMitarbeiterToBoard", type:"POST", data:{board: data.id, mitarbeiter: parseInt(localStorage.getItem("id"))}})
                .done((nData) => {
                    alert(nData);
                    window.location.href="/";
                })
        });
}