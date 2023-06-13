// Login
function login(){
    let name = $("#name").val();
    let passwort = $("#passwort").val();
    $.ajax({url:"/login", type:"POST", data:{name:name, passwort:passwort}})
        .done((data) => {
            if(data?.id == undefined){  // Fehler
                alert(data);
            }else {
                window.location.href = "/page/profile";
            }
        }).fail((data) => { // Fehler
            alert(data.responseText);
        });
}

let savecount = 0;
// Register
function register(){
    savecount++;
    if(savecount <= 1){
        let name = $("#name").val();
        let passwort = $("#passwort").val();
        $.ajax({url:"/createMitarbeiter", type:"POST", data:{name:name, passwort:passwort}})
        .done((data) => {console.log(data);
            if(data?.id == undefined){  // Fehler
                alert(data);
                $("#lgbt").attr("id", "loginButton");
                savecount = 3;
                setTimeout(() => savecount = 0, 1000);
            }else {
                window.location.href = "/page/profile";
            }
        }).fail((data) => { // Fehler
            alert(data.responseText);
            savecount = 3;
            setTimeout(() => savecount = 0, 1000);
        });
    }
}

// Event-Listener -> Führt bei Enter-Klick zum Login
addEventListener("keypress", (ev) => {
    if(ev.key == "Enter"){
        $("#loginButton").trigger("click").attr("id", "lgbt");
    }
})