// Set Boardname
$("#projectName").html(document.body.getAttribute("data-name"));

// Load Tasks
// "<div class=\"task\" id=\"${taskName.toLowerCase().split(\" \").join(\"\")}\" draggable=\"true\" ondragstart=\"drag(event)\"><span>${taskName}</span></div>"
$.ajax({url: "/aufgaben?board="+document.body.getAttribute("data-id")})
.done((data)=>{
    console.log(data);
    data.forEach((val) => {
        $("#"+val.status).html($("#"+val.status).html()+
            "<div class=\"task\" id=\""+val.id+"\" draggable=\"true\" ondragstart=\"drag(event)\"><span>"+val.name+"</span></div>"
        );
    });
});

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drop(ev) {
    ev.preventDefault();
    let data = ev.dataTransfer.getData("text");
    ev.target.appendChild(document.getElementById(data));
    let status = ev.target.id==undefined?ev.target.parentNode.getAttribute("id"):ev.target.getAttribute("id");
    $.ajax({url: "/setStatus", type:"POST", data:{aufgabe:data, status:status}})
}