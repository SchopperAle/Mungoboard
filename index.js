// "Imports"
let sqlite = require("sqlite3");
let express = require("express");
let fs = require("fs");

// Einstellungen
let settings = JSON.parse(fs.readFileSync("./settings.json")+"");

// SQL-Teil
let dblocation = settings.databaseLocation;
let db = new sqlite.Database(dblocation, sqlite.OPEN_READWRITE, (err)=> {
    if(err && err.code == "SQLITE_CANTOPEN"){
        createDB();
        console.log("Datenbank wurde erstellt. Bitte starte den Server erneut.")
        process.exit(0);
    }
    else if(err){
        console.log(err);
        process.exit(1);
    }
});

function createDB(){
    let db = new sqlite.Database(dblocation, (err) => {
        if(err){
            console.log(err);
            process.exit(2);
        }
    });

    db.exec(`
        create TABLE 
    `)
}

// Web-Teil
let port = settings.port;
let app = express();

app.use("/web", express.static("web"));

app.get("/", (req, res) => {
    res.sendFile(__dirname+"/web/index.html");
});

app.listen(port, () => {
    console.log("Started.", "Listening to port "+port);
})