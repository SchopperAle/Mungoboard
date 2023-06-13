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

// Register
function register(){
    let name = $("#name").val();
    let passwort = $("#passwort").val();
    $.ajax({url:"/createMitarbeiter", type:"POST", data:{name:name, passwort:passwort}})
    .done((data) => {console.log(data);
        if(data?.id == undefined){  // Fehler
            alert(data);
        }else {
            window.location.href = "/page/profile";
        }
    }).fail((data) => { // Fehler
        alert(data.responseText);
    });
}