// Get the Boards
$.ajax({url:"/boards"})
.done((data) => {
    let txt = "";

    // Boards anzeigen
    data.data.forEach((val) => {
        txt+="<div id='"+val.board+"' class='board'>"+val.name+"</div>";
    });

    $("#boards").html(txt);

    // Boards klickbar machen
    data.data.forEach((val) => {
        $("#"+val.board).on("click", () => {
            window.location.href = "/page/board/"+val.board;
        });
    });
});

// Logout-Handler
$("#logoutbutton").on("click", ()=>{
    window.location.href="/logout";
});