// JS Datei - für alle Routen

// Einstellungen aufrufen
function clickSettings(){

}

// Profil aufrufen
function clickUser(){
    if(localStorage.getItem("id") == undefined){
        window.location.href="/page/login";
        return;
    }else{
        window.location.href="/page/profile";
        return;
    }
}