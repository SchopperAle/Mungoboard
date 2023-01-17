function login(){
    let name = $("#name").val();
    $.ajax({url:"/login", type:"POST", data:{name:name}})
        .done((data) => {
            if(data.id == undefined){
                alert(data);
            }else {
                localStorage.setItem("id", data.id+"");
                localStorage.setItem("name", data.name+"");
                window.location.href = "/";
            }
        })
}