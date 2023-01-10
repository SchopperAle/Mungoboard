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
        create TABLE Mitarbeiter (
            id int primary key AUTOINCREMENT,
            name varchar(255)
        );

        create TABLE Board (
            id int primary key AUTOINCREMENT,
            name varchar(32),
            beschreibung text
        );

        create TABLE Aufgabe (
            id int primary key AUTOINCREMENT,
            name varchar(255),
            beschreibung text,
            mitarbeiter int,
            foreign key (mitarbeiter) references Mitarbeiter(id)
        );

        create TABLE Board_Mitarbeiter (
            board int not null,
            mitarbeiter int not null,
            foreign key (board) references Board(id),
            foreign key (mitarbeiter) references Mitarbeiter(id),
            constraint pkey PRIMARY KEY (board, mitarbeiter)
        );

        create TABLE Aufgabe_Board (
            aufgabe int not null,
            board int not null,
            foreign key (aufgabe) references Aufgabe(id),
            foreign key (board) references Board(id),
            constraint pkey PRIMARY KEY (aufgabe, board)
        );
    `);
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