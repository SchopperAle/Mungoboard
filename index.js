// "Imports"
let sqlite = require("sqlite3");
let express = require("express");
let fs = require("fs");
let bodyParser = require('body-parser');

// Einstellungen
let settings = JSON.parse(fs.readFileSync("./settings.json")+"");

// SQL-Teil
let dbname = settings.databaseName;
let db = new sqlite.Database("./backend/"+dbname, (err)=> {
    
    if(err){
        console.log(err);
        process.exit(1);
    }

    createDB();
});

function createDB(){
    db.exec(`
        create TABLE IF NOT EXISTS Mitarbeiter(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name varchar(255)
        );

        create TABLE IF NOT EXISTS Board(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name varchar(32),
            beschreibung text
        );

        create TABLE IF NOT EXISTS Aufgabe(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name varchar(255),
            beschreibung text,
            mitarbeiter int,
            foreign key (mitarbeiter) references Mitarbeiter(id)
        );

        create TABLE IF NOT EXISTS Board_Mitarbeiter(
            board INTEGER not null,
            mitarbeiter INTEGER not null,
            foreign key (board) references Board(id),
            foreign key (mitarbeiter) references Mitarbeiter(id),
            constraint pkey PRIMARY KEY (board, mitarbeiter)
        );

        create TABLE IF NOT EXISTS Aufgabe_Board(
            aufgabe INTEGER not null,
            board INTEGER not null,
            foreign key (aufgabe) references Aufgabe(id),
            foreign key (board) references Board(id),
            constraint pkey PRIMARY KEY (aufgabe, board)
        );
    `);
}

// Web-Teil
let port = settings.port;
let app = express();

app.use(bodyParser.urlencoded({extended: true}));

app.use("/web", express.static("web"));

app.get("/", (req, res) => {
    res.sendFile(__dirname+"/web/index.html");
});

app.post("/createMitarbeiter", (req, res) => {
    db.exec(`
        insert into Mitarbeiter (name) values (`+ req.body.name +`);
    `);

    db.all("select * from Mitarbeiter;", (err, rows) => {
        if(err){
            console.log(err);
        }
        rows.forEach((row) => {
            console.log(row);
        });
    });

    res.send("Created "+req.body.name);
})

app.listen(port, () => {
    console.log("Started.", "Listening to port "+port);
})