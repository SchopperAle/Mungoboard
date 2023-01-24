
function clickSettings(){

}

function clickUser(){
    if(localStorage.getItem("id") == undefined){
        window.location.href="/page/login";
        return;
    }else{
        window.location.href="/page/profile";
        return;
    }
}