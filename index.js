// "Imports"
let sqlite = require("sqlite3");            //Datenbank
let express = require("express");           //Webserver
let fs = require("fs");                     //File-System
let bodyParser = require('body-parser');    //Post-verschlüsselung
const muna = require("./backend/munadb");   //Datenbank mit extra Funktionen
const crypto = require("crypto");           //Hash-Operationen
const session = require("express-session");

// Einstellungen von Datei laden
let settings = JSON.parse(fs.readFileSync("./settings.json").toString("utf-8"));

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
            name varchar(255),
            passwort varchar(255)
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

// Session erlauben
app.use(session({
    secret: crypto.randomBytes(128).toString("hex"),
    resave: true,
    saveUninitialized: false
}));

// Das "/web"-Verzeichnis für web-zugriff freigeben
app.use("/web", express.static("web"));

// HTML-Dateien pre-loaden -> Schnellere Antwortzeiten
let boardMainView = fs.readFileSync("./web/board/mainView.html").toString("utf-8");
let createTask = fs.readFileSync("./web/board/createTask.html").toString("utf-8");
let boardSettings = fs.readFileSync("./web/board/boardSettings.html").toString("utf-8");

/**
 * Überprüft die Session
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 * @returns {boolean} Ist Eingeloggt
 */
const checkSession = (req, res) => {
    if((req.session.loggedIn ?? false) == false){
        res.redirect("/page/login");
        return false;
    }
    return true;
} 

// Default Route
app.get("/", (req, res) => {
    if(!checkSession(req, res)) return;
    res.sendFile(__dirname+"/web/board/createBoard.html");
});

// Profile Route
app.get("/page/profile", (req, res) => {
    if(!checkSession(req, res)) return;
    res.sendFile(__dirname+"/web/index.html");
})

// Create Mitarbeiter Route
app.get("/page/createMitarbeiter", (req, res) => {
    if(!checkSession(req, res)) return;
    res.sendFile(__dirname+"/web/dev/createMitarbeiter.html");
});

// Create Board Route
app.get("/page/createBoard", (req, res) => {
    if(!checkSession(req, res)) return;
    res.sendFile(__dirname+"/web/board/createBoard.html");
});

// User Login Route
app.get("/page/login", (req, res) => {
    res.sendFile(__dirname+"/web/user/login.html");
});

// User Register Route
app.get("/page/register", (req, res) => {
    res.sendFile(__dirname+"/web/user/registration.html");
});

// Create Task Route
app.get("/page/board/:board/createTask", (req, res) => {
    if(!checkSession(req, res)) return;
    let board = req.params.board;
    res.send(createTask.replaceAll("TOBESPECIFIEDID", board));
});

// Board Route
app.get("/page/board/:board", async (req, res) => {
    if(!checkSession(req, res)) return;
    let board = req.params.board;
    // User im Board?
    let row = await muna.get("select mitarbeiter from Board_Mitarbeiter WHERE mitarbeiter = ? AND board = ?", [req.session.login.id, board]);
    if (muna.checkError(row, res, "Board oder Mitarbeiter wurde nicht gefunden", 404)) return;
    if (row?.mitarbeiter == undefined) return res.status(500).send("<h1>😮 du hast keinen Zugriff auf dieses Board</h1>");

    // Board auswählen
    row = await muna.get("select * from Board WHERE id=?", board);

    if (muna.checkError(row, res, "Board wurde nicht gefunden", 404)) return;

    // Pre-geloadetes Template verändern und senden
    res.send(
        boardMainView.replaceAll("TOBESPECIFIEDID", board)      // Board-ID
        .replaceAll("TOBESPECIFIEDNAME", row.name)          // Board-Name
        .replaceAll("TOBESPECIFIEDDESC", row.beschreibung)  // Board-Beschreibung
    );
});

// Board Settings Route
app.get("/page/board/settings/:board", async (req, res) => {
    if(!checkSession(req, res)) return;
    let board = req.params.board;

    if(board == undefined || board == "null" || isNaN(parseInt(board))) return res.redirect("/");

    // User im Board?
    let row = await muna.get("select mitarbeiter from Board_Mitarbeiter WHERE mitarbeiter = ? AND board = ?", [req.session.login.id, board]);
    if (muna.checkError(row, res, "Board oder Mitarbeiter wurde nicht gefunden", 404)) return;
    if (row?.mitarbeiter == undefined) return res.status(500).send("<h1>😮 du hast keinen Zugriff auf dieses Board</h1>");
    
    // Board auswählen
    row = await muna.get("select * from Board WHERE id=?", board);

    if (muna.checkError(row, res, "Board wurde nicht gefunden", 404)) return;

    // Pre-geloadetes Template verändern und senden
    res.send(
        boardSettings.replace("TOBESPECIFIEDID", board).replace("TOBESPECIFIEDID", board)      // Board-ID
        .replace("TOBESPECIFIEDNAME", row.name).replace("TOBESPECIFIEDNAME", row.name)          // Board-Name
        .replace("TOBESPECIFIEDDESC", row.beschreibung)  // Board-Beschreibung
    );
});

// Logout
app.get("/logout", async (req, res) => {
    req.session.destroy((err) => {
        if(err){
            console.log(err);
        }
        return res.redirect("/");
    });
});

// Create Mitarbeiter
// Create Mitarbeiter Statement
let createMitarbeiterStatement = muna.prepare("insert into Mitarbeiter (name, passwort) values (?, ?)");
app.post("/createMitarbeiter", async(req, res) => {
    
    // Eingabe überprüfen
    if((req.body.name?.length ?? 0) < 5){
        return res.status(500).send("Name zu kurz");
    }
    if(req.body.name?.length > 25){
        return res.status(500).send("Name zu lang");
    }
    if((req.body.passwort?.length ?? 0) < 1){
        return res.status(500).send("Passwort fehlt ;(");
    }
    if(req.body.passwort?.length > 30){
        return res.status(500).send("Passwort zu lang");
    }

    // Überprüfen
    let row = await muna.get("SELECT * FROM Mitarbeiter WHERE name LIKE ?", req.body.name);
    if (muna.checkError(row, res)) return;
    if(row?.id != undefined){
        return res.status(500).send("User already exists");
    }
    // Mitarbeiter anlegen
    createMitarbeiterStatement.bind(req.body.name, crypto.createHash("sha512").update(req.body.passwort).digest("hex"));
    row = await muna.runPrepared(createMitarbeiterStatement);
    if (muna.checkError(row, res, "Could not create "+req.body.name)) return;

    // Einloggen
    row = await muna.get("SELECT id FROM Mitarbeiter WHERE name LIKE ?", req.body.name);
    if (muna.checkError(row, res)) return;
    if(row?.id == undefined){
        return res.status(500).send("Error");
    }
    req.session.loggedIn = true;
    req.session.login = {};
    req.session.login.name = req.body.name;
    req.session.login.id = row.id;

    res.send({id:0});
});

// Create Board
// Prepare Statement
let createBoardStatement = muna.prepare("insert into Board (name, beschreibung) values (?, ?)");
app.post("/createBoard", async (req, res) => {
    if(!checkSession(req, res)) return;

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
    let rows = await muna.all("select * from Mitarbeiter m INNER JOIN Board_Mitarbeiter bm ON bm.mitarbeiter = m.id INNER JOIN Board b ON b.id = bm.board WHERE m.id = ? ORDER BY b.id DESC;", req.query.mitarbeiter ?? req.session.login.id);
    if (muna.checkError(rows, res, "Error loading Boards")) return;
    // Boards senden
    res.send({data: rows});
});

//Add Mitarbeiter to Board
//Prepared Statement für Link
let linkBoardMitarbeiterStatement = muna.prepare("insert into Board_Mitarbeiter (board, mitarbeiter) values (?, ?)");
app.post("/addMitarbeiterToBoard", (req, res) => addMitarbeiterToBoard(req, res));
app.post("/addMitarbeiterToBoardByName", (req, res) => addMitarbeiterToBoardByName(req, res))

/**
 * Fügt einen Mitarbeiter mithilfe eines Namens statt id zu einem Board hinzu
 * @param {Express.Request} req 
 * @param {Express.Response} res 
 */
const addMitarbeiterToBoardByName = async (req, res) => {
    if(!checkSession(req, res)) return; // Eingeloggt?

    // Mitarbeiterid von Namen holen
    row = await muna.get("select m.id from Mitarbeiter m WHERE m.name = ?", req.body.mitarbeiter);
    if (muna.checkError(row, res)) return;
    req.body.mitarbeiter = (row?.id) ?? -1;

    // Mitarbeiter hinzufügen
    return await addMitarbeiterToBoard(req, res);
};

/**
 * Fügt einen Mitarbeiter zu einem Board hinzu
 * @param {Express.Request} req 
 * @param {Express.Response} res 
 */
const addMitarbeiterToBoard = async (req, res) => {
    let id, boardId;
    let name, boardName;
    let row;
    
    // Mitarbeiter im Request vorhanden?
    if(req.body.mitarbeiter == undefined){
        id = req.session.login.id;
        name = req.session.login.name;
    }else{
        // Mitarbeiterdaten holen
        row = await muna.get("select * from Mitarbeiter m WHERE m.id = ?", req.body.mitarbeiter);
        if (muna.checkError(row, res)) return;
        if (row == undefined) return res.status(404).send("Not found");
        id = row.id;
        name = row.name;
    }

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
};

// Mitarbeiter von Board entfernen
// Delete Link Board_Mitarbeiter Statement
let deleteLinkBoardMitarbeiterStatement = muna.prepare("DELETE FROM Board_Mitarbeiter WHERE board=? AND mitarbeiter=?");
app.post("/removeMitarbeiterFormBoard", async (req, res) => {
    // Link löschen
    deleteLinkBoardMitarbeiterStatement.bind(req.body.board, req.body.mitarbeiter);
    let row = await muna.runPrepared(deleteLinkBoardMitarbeiterStatement);
    if(muna.checkError(row, res)) return;

    // Erfolgsnachricht senden
    res.send("Deleted.");
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
    let row = await muna.get("select a.id, a.name, m.name as mitarbeiter, a.status, a.beschreibung from aufgabe a INNER JOIN Mitarbeiter m ON m.id = a.mitarbeiter WHERE a.id = ?", req.query.aufgabe);
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

// Mitarbeiter
app.get("/mitarbeiterInBoard", async (req, res) => {
    if(req.query.board == undefined || req.query.board == ""){
        return res.status(500).send("Board doesn't exist.");
    }

    let rows = await muna.all("SELECT m.id, m.name FROM Board_Mitarbeiter bm INNER JOIN Mitarbeiter m ON bm.mitarbeiter = m.id WHERE bm.board = ?", req.query.board);
    if(muna.checkError(rows, res)) return;
    rows == undefined ? res.status(500).send("No Mitarbeiter.") : res.send(rows);
});

// Login
app.post("/login", async (req, res) => {
    // Eingabe überprüfen
    if((req.body.name?.length ?? 0) < 5){
        return res.status(500).send("Name zu kurz");
    }
    if(req.body.name?.length > 25){
        return res.status(500).send("Name zu lang");
    }
    if((req.body.passwort?.length ?? 0) < 1){
        return res.status(500).send("Passwort fehlt ;(");
    }
    if(req.body.passwort?.length > 30){
        return res.status(500).send("Passwort zu lang");
    }

    let name = req.body.name;
    let passwort = crypto.createHash("sha512").update(req.body.passwort).digest("hex");

    let row = await muna.get("SELECT * FROM Mitarbeiter WHERE name like ? AND passwort like ?", [name, passwort]);
    if(muna.checkError(row, res)) return;
    
    // Einloggen
    if(row != undefined){
        req.session.loggedIn = true;
        req.session.login = {};
        req.session.login.name = row.name;
        req.session.login.id = row.id;
    }

    // Bestätigung schicken
    res.send(row == undefined?"Mitarbeiter wurde nicht gefunden":{id:row.id, name:row.name});
})


// Link zur Jquery-Datei
app.get("/jquery.js", (req, res) => {
    res.sendFile(__dirname+"/node_modules/jquery/dist/jquery.js");
})

// "Start" des Webservers
app.listen(port, () => {
    console.log("Started.", "Listening to port "+port);
});

// muna.execS("insert into Mitarbeiter(name, passwort) VALUES ('ramsi', '123')");
muna.allS("select * from Mitarbeiter").then((val) => {
    console.log(val)
});