// Login
function login(){
    let name = $("#name").val();
    let passwort = $("#passwort").val();
    $.ajax({url:"/login", type:"POST", data:{name:name, passwort:passwort}})
        .done((data) => {
            if(data?.id == undefined){
                alert(data);
            }else {
                window.location.href = "/page/profile";
            }
        })
}

// Register
function register(){
    let name = $("#name").val();
    let passwort = $("#passwort").val();
    $.ajax({url:"/createMitarbeiter", type:"POST", data:{name:name, passwort:passwort}})
        .done((data) => {
            if(data?.id == undefined){
                alert(data);
                $("#lgbt").attr("id", "loginButton");
            }else {
                window.location.href = "/page/profile";
            }
        });
}

// Event-Listener -> Führt bei Enter-Klick zum Login
addEventListener("keypress", (ev) => {
    if(ev.key == "Enter"){
        $("#loginButton").trigger("click").attr("id", "lgbt");
    }
})