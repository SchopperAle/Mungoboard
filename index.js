// "Imports"
let sqlite = require("sqlite3");            //Datenbank
let express = require("express");           //Webserver
let fs = require("fs");                     //File-System
let bodyParser = require('body-parser');    //Post-verschlüsselung

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
app.get("/page/board/:board", (req, res) => {
    let board = req.params.board;
    // Board auswählen
    db.all("select * from Board WHERE id="+board+";", (err, rows) => {

        if(err){ // Fehler
            console.log(err);
            res.status(500).send(err);
            return;
        }else {
            if(rows[0] == undefined){   // Kein Board mit der ID gefunden
                console.log("Warning: Board "+board+" existiert nicht.");
                res.status(451).sendFile(__dirname+"/web/images/gefährlich.png");
                return;
            }

            // Pre-geloadetes Template verändern und senden
            res.send(
                boardMainView.replaceAll("TOBESPECIFIEDID", board)      // Board-ID
                .replaceAll("TOBESPECIFIEDNAME", rows[0].name)          // Board-Name
                .replaceAll("TOBESPECIFIEDDESC", rows[0].beschreibung)  // Board-Beschreibung
            );
        }
    })
});

// Create Mitarbeiter - WIP
app.post("/createMitarbeiter", (req, res) => {
    // Mitarbeiter anlegen
    db.exec("insert into Mitarbeiter (name) values ('"+ req.body.name +"');", (err) => {
        
        if(err){    // FEHLER!
            console.log(err);
            res.status(500).send("Error: Could not create "+req.body.name);
            return;
        }else {
            
            // Statusmeldung senden
            res.send("Created "+req.body.name);
        }
    });
});

// Create Board
app.post("/createBoard", (req, res) => {

    // Funktion zum senden der BoardID, bei Erstellung -> Für addMitarbeiterToBoard
    function sendId(){
        db.all("select id from Board WHERE name LIKE '"+req.body.name+"' ORDER BY id DESC;", (err, rows) => {
            if(err){
                console.log(err);
                res.send("Error: "+err);
                return;
            }

            res.send(rows[0]);
        })
    }

    // Leere Beschreibung
    if(req.body.beschreibung == undefined || req.body.beschreibung == ""){
        // Board erstellen ohne Beschreibung
        db.exec("insert into Board (name) values ('"+req.body.name+"');", (err) => {
            if(err){    // FEHLER
                console.log(err);
                res.status(500).send("Error: Could not create "+req.body.name);
                return;
            }
            sendId();   //Id senden
        });
    }
    // Keine leere Beschreibung
    else {
        // Board erstellen mit Beschreibung
        db.exec("insert into Board (name, beschreibung) values ('"+req.body.name+"','"+req.body.beschreibung+"');", (err) => {
            if(err){    //FEHLER
                console.log(err);
                res.status(500).send("Error: Could not create "+req.body.name);
                return;
            }
            sendId();   //Id senden
        });
    }
});

//Get boards
app.get("/boards", (req, res) => {
    // Boards von der Datenbank holen
    db.all("select * from Mitarbeiter m INNER JOIN Board_Mitarbeiter bm ON bm.mitarbeiter = m.id INNER JOIN Board b ON b.id = bm.board WHERE m.id = '"+req.query.mitarbeiter+"' ORDER BY b.id DESC;", (err, rows) => {
        if(err){    //FEHLER
            console.log(err);
            res.status(500).send("Error loading Boards");
            return;
        }

        // Boards senden
        res.send({data: rows});
    });
});

//Add Mitarbeiter to Board
app.post("/addMitarbeiterToBoard", (req, res) => {
    let id, boardId;
    let name, boardName;
    
    // Mitarbeiter-Daten holen.
    db.all("select * from Mitarbeiter m WHERE m.id = '"+req.body.mitarbeiter+"';", (err, rows) => {
        if(err){    //FEHLER
            console.log(err);
            res.status(500).send("Error");
            return;
        }

        // Mitarbeiter-Daten temporär speichern
        rows.forEach((row) => {
            id = row.id;
            name = row.name;
        })

        // Board-Daten holen
        db.all("select * from Board b WHERE b.id = '"+req.body.board+"';", (err, rows) => {
            if(err){    //FEHLER
                console.log(err);
                res.status(500).send("ERROR");
                return;
            }
    
            // Board-Daten temporär speichern
            rows.forEach((row) => {
                boardId = row.id;
                boardName = row.name;
            });

            // Board-Mitarbeiter-Link erstellen
            db.exec("insert into Board_Mitarbeiter (board, mitarbeiter) values ("+boardId+", "+id+")", (err) => {
                if(err){ // FEHLER
                    console.log(err);
                    res.status(500).send(err);
                    return;
                }else {
                    // Schöne Bestätigungsnachricht schicken 
                    res.send("Added "+name+" to "+boardName);
                }
            });
        });
    });
});

// Create Aufgabe
app.post("/createAufgabe", (req, res) => {
    let mitarbeiter = req.body.mitarbeiter;

    // Nachricht bei erfolgreichem Erstellen der Aufgabe (id für Link zum Board)
    function createMsg(){
        db.all("select id from Aufgabe WHERE name = '"+req.body.name+"' AND mitarbeiter = "+req.body.mitarbeiter+" ORDER BY id DESC LIMIT 1;", (err, rows) => {
            if(err){    // FEHLER
                console.log(err);
                res.status(500).send("Error");
                return;
            }else {
                res.send({id:rows[0].id});
            }
        })
    }

    // Leere Beschreibung
    if(req.body.beschreibung == undefined){
        // Aufgabe erstellen
        db.exec("insert into Aufgabe (name, mitarbeiter, status) values ('"+req.body.name+"', "+mitarbeiter+", 'todo');", (err) => {
            if(err){    //FEHLER
                console.log(err);
                res.status(500).send("Error");
                return;
            }
            // Create-Nachricht senden
            createMsg();
        });
    }
    // Keine leere Beschreibung
    else{
        // Aufgabe erstellen
        db.exec("insert into Aufgabe (name, beschreibung, mitarbeiter, status) values ('"+req.body.name+"', '"+req.body.beschreibung+"', "+mitarbeiter+", 'todo');", (err)=> {
            if(err){    //FEHLER
                console.log(err);
                res.status(500).send("Error");
                return;
            }
            // Create-Nachricht senden
            createMsg();
        });
    }
});

// Add Aufgabe to Board
app.post("/addAufgabeToBoard", (req, res) => {
    let aufgabe, board;
    aufgabe = req.body.aufgabe;
    board = req.body.board;

    // Aufgabe-Board-Link erstellen
    db.exec("insert into Aufgabe_Board (aufgabe, board) values ("+aufgabe+", "+board+");", (err) => {
        if(err){    //FEHLER
            console.log(err);
            res.status(500).send("Error: "+err);
            return;
        }
        // Erfolgsnachricht
        res.send("DONE");
    });
});

// Get Aufgaben (alle eines Boards)
app.get("/aufgaben", (req,res) => {
    let board = req.query.board;
    let aufgaben = [];

    // Alle Aufgaben des Boards laden
    db.all("select * from Aufgabe a INNER JOIN Aufgabe_Board ab ON a.id = ab.aufgabe WHERE ab.board = "+board+";", (err, rows) => {
        if(err){    //FEHLER
            console.log(err);
            res.status(500).send([]);
            return;
        }

        // Aufgaben verpacken und im array speichern
        rows.forEach((row) => {
            aufgaben.push({id:row.id, name:row.name, mitarbeiter:row.mitarbeiter, status:row.status});
        });

        // Array versenden
        res.send(aufgaben);
    });
});

// Get Aufgabe genau
app.get("/aufgabe", (req, res) => {
    let aufgabe = req.query.aufgabe;

    // Aufgabe laden
    db.all("select * from aufgabe WHERE id = "+aufgabe+";", (err, rows) => {
        if(err){    //FEHLER
            console.log(err);
            res.status(500).send("Error: "+err);
            return;
        }

        if(rows[0] == undefined){   //Aufgabe existiert nicht
            console.log("Warning: Aufgabe "+aufgabe+" existiert nicht.");
            res.status(451).send("Aufgabe existiert nicht ;(");
            return;
        }
        // Aufgabe senden
        res.send({id:rows[0].id, name:rows[0].name, mitarbeiter:rows[0].mitarbeiter, status:rows[0].status, beschreibung:rows[0].beschreibung});
        
    });
});

// Set Aufgabe Status
app.post("/setStatus", (req, res) => {
    let aufgabe = req.body.aufgabe;
    let status = req.body.status;

    // Status der Aufgabe updaten
    db.exec("update Aufgabe SET status = '"+status+"' WHERE id = "+aufgabe, (err) => {
        if(err){    // FEHLER
            console.log(err);
            res.status(500).send("ERROR: "+err);
            return;
        }

        // Benachrichtigung senden
        res.send("Set Status to "+status);
    });
});

// Aufgabe Bearbeiten
app.post("/updateAufgabe", (req, res) => {
    let id = req.body.id;
    let name = req.body.name;
    let beschreibung = req.body.beschreibung;
    let mitarbeiter = req.body.mitarbeiter;
    let status = req.body.status;

    // Aufgabe Bearbeiten
    db.exec("UPDATE Aufgabe SET name = '"+name+"', beschreibung='"+beschreibung+"', mitarbeiter="+mitarbeiter+", status='"+status+"' WHERE id = "+id, (err) => {
        if(err){
            console.log(err);
            res.send("ERROR: "+err);
            return;
        }

        // Erfolgsbestätigung senden
        res.send("Aufgabe Bearbeitet.");
    });
});

// Aufgabe löschen
app.post("/deleteAufgabe", (req, res) => {
    let id = req.body.id;

    // Link löschen
    db.exec("DELETE FROM Aufgabe_Board WHERE aufgabe="+id+";", (err) => {
        if(err){    // FEHLER
            console.log(err);
            res.status(500).send("ERROR: "+err);
            return;
        }else {
            // Aufgabe löschen
            db.exec("DELETE FROM Aufgabe WHERE id="+id+";", (err) => {
                if(err){ // FEHLER
                    console.log(err);
                    res.status(500).send("Error: "+err);
                    return;
                }else {
                    // Erfolgsnachricht senden
                    res.send("Deleted.");
                }
            });
        }
    })
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