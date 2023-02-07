// Login - WIP
function login(){
    let name = $("#name").val();
    $.ajax({url:"/login", type:"POST", data:{name:name}})
        .done((data) => {
            if(data.id == undefined){
                alert(data);
            }else {
                localStorage.setItem("id", data.id+"");
                localStorage.setItem("name", data.name+"");
                window.location.href = "/page/profile";
            }
        })
}

// Event-Listener -> Führt bei Enter-Klick zum Login
addEventListener("keypress", (ev) => {
    if(ev.key == "Enter"){
        $("#loginButton").trigger("click");
    }
})