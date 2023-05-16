// "Imports"
let sqlite = require("sqlite3");            //Datenbank
let express = require("express");           //Webserver
let fs = require("fs");                     //File-System
let bodyParser = require('body-parser');    //Post-verschlüsselung
const muna = require("./backend/munadb");   //Datenbank mit extra Funktionen

// Einstellungen von Datei laden
let settings = JSON.parse(fs.readFileSync("./settings.json")+"");

// SQL-Teil
let dbname = settings.databaseName; //Datenbank name von Settings laden
// Datenbank erstellen / öffnen
let db = new sqlite.Database("./backend/"+dbname, (err)=> {
    // Fehler -> Programm beenden
    if(err){
        console.log(err);
        process.exit(1);
    }

    createDB(); // Datenbank erstellen
});

muna.setDB(db);

// Tables der Datenbank erstellen
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
            status varchar(16),
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
let port = settings.port;   // Server-Port
let app = express();        // Server

// Sichere POSTs
app.use(bodyParser.urlencoded({extended: true}));

// Das "/web"-Verzeichnis für web-zugriff freigeben
app.use("/web", express.static("web"));

// HTML-Dateien pre-loaden -> Schnellere Antwortzeiten
let boardMainView = ""+ fs.readFileSync("./web/board/mainView.html");
let createTask = ""+ fs.readFileSync("./web/board/createTask.html");

// Default Route
app.get("/", (req, res) => {
    res.sendFile(__dirname+"/web/board/createBoard.html");
});

// Profile Route
app.get("/page/profile", (req, res) => {
    res.sendFile(__dirname+"/web/index.html");
})

// Create Mitarbeiter Route
app.get("/page/createMitarbeiter", (req, res) => {
    res.sendFile(__dirname+"/web/dev/createMitarbeiter.html");
});

// Create Board Route
app.get("/page/createBoard", (req, res) => {
    res.sendFile(__dirname+"/web/board/createBoard.html");
});

// User Login Route
app.get("/page/login", (req, res) => {
    res.sendFile(__dirname+"/web/user/login.html");
});

// Create Task Route
app.get("/page/board/:board/createTask", (req, res) => {
    let board = req.params.board;
    res.send(createTask.replaceAll("TOBESPECIFIEDID", board));
});

// Board Route
app.get("/page/board/:board", async (req, res) => {
    let board = req.params.board;
    // Board auswählen
    let row = await muna.get("select * from Board WHERE id=?", board);

    if (muna.checkError(row, res, "Board wurde nicht gefunden", 404)) return;

    // Pre-geloadetes Template verändern und senden
    res.send(
        boardMainView.replaceAll("TOBESPECIFIEDID", board)      // Board-ID
        .replaceAll("TOBESPECIFIEDNAME", row.name)          // Board-Name
        .replaceAll("TOBESPECIFIEDDESC", row.beschreibung)  // Board-Beschreibung
    );
});

// Create Mitarbeiter - WIP
app.post("/createMitarbeiter", async(req, res) => {
    // Mitarbeiter anlegen
    let row = await muna.exec("insert into Mitarbeiter (name) values (?)", req.body.name);
    if (muna.checkError(row, res, "Could not create "+req.body.name)) return;
    res.send("Created "+req.body.name);
});

// Create Board
// Prepare Statement
let createBoardStatement = muna.prepare("insert into Board (name, beschreibung) values (?, ?)");
app.post("/createBoard", async (req, res) => {

    // Funktion zum senden der BoardID, bei Erstellung -> Für addMitarbeiterToBoard
    const sendId = async() => {
        let row = await muna.get("select id from Board WHERE name LIKE ? ORDER BY id DESC", req.body.name);
        if (muna.checkError(row, res)) return;

        res.send(row);
    }
    
    // Board erstellen
    createBoardStatement.bind(req.body.name, req.body.beschreibung == ''? undefined : req.body.beschreibung);
    let row = muna.runPrepared(createBoardStatement);
    if (muna.checkError(row, res)) return;

    sendId();   //Id senden
});

//Get boards
app.get("/boards", async (req, res) => {
    // Boards von der Datenbank holen
    let rows = await muna.all("select * from Mitarbeiter m INNER JOIN Board_Mitarbeiter bm ON bm.mitarbeiter = m.id INNER JOIN Board b ON b.id = bm.board WHERE m.id = ? ORDER BY b.id DESC;", req.query.mitarbeiter);
    if (muna.checkError(rows, res, "Error loading Boards")) return;
    // Boards senden
    res.send({data: rows});
});

//Add Mitarbeiter to Board
//Prepared Statement für Link
let linkBoardMitarbeiterStatement = muna.prepare("insert into Board_Mitarbeiter (board, mitarbeiter) values (?, ?)");
app.post("/addMitarbeiterToBoard", async (req, res) => {
    let id, boardId;
    let name, boardName;

    // Mitarbeiterdaten holen
    let row = await muna.get("select * from Mitarbeiter m WHERE m.id = ?", req.body.mitarbeiter);
    if (muna.checkError(row, res)) return;
    id = row.id;
    name = row.name;

    // Boarddaten holen
    row = await muna.get("select * from Board b WHERE b.id = ?", req.body.board);
    if (muna.checkError(row, res)) return;
    boardId = row.id;
    boardName = row.name;

    // Linken
    linkBoardMitarbeiterStatement.bind(boardId, id);
    row = await muna.runPrepared(linkBoardMitarbeiterStatement);
    if (muna.checkError(row, res)) return;

    // Nachricht senden
    res.send("Added "+name+" to "+boardName);
});

// Create Aufgabe
// Create Aufgabe Prepared Statement
let createAufgabeStatement = muna.prepare("insert into Aufgabe (name, beschreibung, mitarbeiter, status) values (?, ?, ?, 'todo')");
app.post("/createAufgabe", async (req, res) => {
    // Aufgabe erstellen
    req.body.mitarbeiter = parseInt(req.body.mitarbeiter);
    createAufgabeStatement.bind(req.body.name, req.body.beschreibung, req.body.mitarbeiter);
    let row = await muna.runPrepared(createAufgabeStatement);
    if (muna.checkError(row, res)) return;
    
    // Nachricht bei erfolgreichem Erstellen der Aufgabe (id für Link zum Board)
    row = await muna.get("select id from Aufgabe WHERE name = ? AND mitarbeiter = ? ORDER BY id DESC", [req.body.name, req.body.mitarbeiter]);
    if (muna.checkError(row, res)) return;
    res.send({id:row.id});
});

// Add Aufgabe to Board
// Link Aufgabe Board Statement
let aufgabeBoardStatement = muna.prepare("insert into Aufgabe_Board (aufgabe, board) values (?, ?)");
app.post("/addAufgabeToBoard", async (req, res) => {
    // Aufgabe-Board-Link erstellen
    aufgabeBoardStatement.bind(req.body.aufgabe, req.body.board);
    let row = await muna.runPrepared(aufgabeBoardStatement);
    if (muna.checkError(row, res)) return;
    
    res.send("DONE");
});

// Get Aufgaben (alle eines Boards)
app.get("/aufgaben", async (req,res) => {
    let aufgaben = [];

    // Alle Aufgaben des Boards laden
    let rows = await muna.all("select * from Aufgabe a INNER JOIN Aufgabe_Board ab ON a.id = ab.aufgabe WHERE ab.board = ?", [req.query.board]);
    if (muna.checkError(rows, res, [])) return;

    // Aufgaben verpacken und im array speichern
    rows.forEach((row) => {
        aufgaben.push({id:row.id, name:row.name, mitarbeiter:row.mitarbeiter, status:row.status});
    });

    // Array versenden
    res.send(aufgaben);
});

// Get Aufgabe genau
app.get("/aufgabe", async (req, res) => {
    // Aufgabe laden
    let row = await muna.get("select * from aufgabe WHERE id = ?", req.query.aufgabe);
    if(muna.checkError(row, res)) return;

    // Aufgabe existiert nicht
    if(row == undefined){
        console.log("Warning: Aufgabe "+req.query.aufgabe+" existiert nicht.");
        res.status(451).send("Aufgabe existiert nicht ;(");
    }

    // Aufgabe senden
    res.send({id:row.id, name:row.name, mitarbeiter:row.mitarbeiter, status:row.status, beschreibung:row.beschreibung});
});

// Set Aufgabe Status
// Update Status Statement
let updateStatusStatement = muna.prepare("update Aufgabe SET status = ? WHERE id = ?");
app.post("/setStatus", async (req, res) => {
    // Status der Aufgabe updaten
    updateStatusStatement.bind(req.body.status, req.body.aufgabe);
    let row = await muna.runPrepared(updateStatusStatement);
    if(muna.checkError(row, res)) return;

    // Status senden
    res.send("Set Status to "+req.body.status);
});

// Aufgabe Bearbeiten
// Update Aufgabe Statement
let updateAufgabeStatement = muna.prepare("UPDATE Aufgabe SET name = ?, beschreibung=?, mitarbeiter=?, status=? WHERE id = ?");
app.post("/updateAufgabe", async (req, res) => {
    // Aufgabe Bearbeiten
    updateAufgabeStatement.bind(req.body.name, req.body.beschreibung, req.body.mitarbeiter, req.body.status, req.body.id);
    let row = await muna.runPrepared(updateAufgabeStatement);
    if(muna.checkError(row, res)) return;
    
    // Erfolgsbestätigung senden
    res.send("Aufgabe Bearbeitet.");
});

// Aufgabe löschen
// Delete Link Aufgabe_Board Statement
let deleteLinkAufgabeBoardStatement = muna.prepare("DELETE FROM Aufgabe_Board WHERE aufgabe=?");
// Delete Aufgabee Statement
let deleteAufgabeStatement = muna.prepare("DELETE FROM Aufgabe WHERE id=?");
app.post("/deleteAufgabe", async (req, res) => {
    // Link löschen
    deleteLinkAufgabeBoardStatement.bind(req.body.id);
    let row = await muna.runPrepared(deleteLinkAufgabeBoardStatement);
    if(muna.checkError(row, res)) return;

    // Aufgabe löschen
    deleteAufgabeStatement.bind(req.body.id);
    row = await muna.runPrepared(deleteAufgabeStatement);
    if(muna.checkError(row, res)) return;

    // Erfolgsnachricht senden
    res.send("Deleted.");
});

// Login - WIP
app.post("/login", (req, res) => {
    let name = req.body.name;
    if(name.includes("'")){     // SQL Injection ist nix Gutes.
        res.send("SQL Injection wurde leider deaktiviert ;(");
        return;
    }

    // Einloggen
    db.all("Select * from Mitarbeiter WHERE name like '"+name+"';", (err, rows) => {
        if(err){    // FEHLER
            console.log(err);
            res.status(500).send("Error: "+err);
            return;
        }

        // Loginstatus schicken
        res.send(rows[0] == undefined?"Mitarbeiter wurde nicht gefunden":{id:rows[0].id, name:rows[0].name});
    })
})


// Link zur Jquery-Datei
app.get("/jquery.js", (req, res) => {
    res.sendFile(__dirname+"/node_modules/jquery/dist/jquery.js");
})

// "Start" des Webservers
app.listen(port, () => {
    console.log("Started.", "Listening to port "+port);
});