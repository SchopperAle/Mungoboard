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
let port = settings.port;
let app = express();

app.use(bodyParser.urlencoded({extended: true}));

app.use("/web", express.static("web"));

// Default Route
app.get("/", (req, res) => {
    res.sendFile(__dirname+"/web/index.html");
});

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

// To do : -> Board
app.get("/page/board/:board", (req, res) => {
    let board = req.params.board;
    res.send("Board "+board);
    // TO be continued
});

// Create Mitarbeiter
app.post("/createMitarbeiter", (req, res) => {
    db.exec("insert into Mitarbeiter (name) values ('"+ req.body.name +"');", (err) => {
        if(err){
            console.log(err);
            res.status(404).send("Error: Could not create "+req.body.name);
        }
    });

    res.send("Created "+req.body.name);
});

// Create Board
app.post("/createBoard", (req, res) => {

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
    if(req.body.beschreibung == undefined || req.body.beschreibung == ""){
        db.exec("insert into Board (name) values ('"+req.body.name+"');", (err) => {
            if(err){
                console.log(err);
                res.status(404).send("Error: Could not create "+req.body.name);
                return;
            }
            sendId();
        });
    }else {
        db.exec("insert into Board (name, beschreibung) values ('"+req.body.name+"','"+req.body.beschreibung+"');", (err) => {
            if(err){
                console.log(err);
                res.status(404).send("Error: Could not create "+req.body.name);
                return;
            }
            sendId();
        });
    }
});

//Get boards
app.get("/boards", (req, res) => {
    db.all("select * from Mitarbeiter m INNER JOIN Board_Mitarbeiter bm ON bm.mitarbeiter = m.id INNER JOIN Board b ON b.id = bm.board WHERE m.id = '"+req.query.mitarbeiter+"' ORDER BY b.id DESC;", (err, rows) => {
        if(err){
            console.log(err);
            res.status(404).send("Error loading Boards");
            return;
        }
        let data = [];
        rows.forEach((row) => {
            data.push(row);
        });

        res.send({data: data});
    });
});

//Add Mitarbeiter to Board
app.post("/addMitarbeiterToBoard", (req, res) => {
    let id, boardId;
    let name, boardName;
    db.all("select * from Mitarbeiter m WHERE m.id = '"+req.body.mitarbeiter+"';", (err, rows) => {
        if(err){
            console.log(err);
            res.send("Error");
            return;
        }

        rows.forEach((row) => {
            id = row.id;
            name = row.name;
        })

        db.all("select * from Board b WHERE b.id = '"+req.body.board+"';", (err, rows) => {
            if(err){
                res.send("ERROR");
                return;
            }
    
            rows.forEach((row) => {
                boardId = row.id;
                boardName = row.name;
            });

            db.exec("insert into Board_Mitarbeiter (board, mitarbeiter) values ("+boardId+", "+id+")", (err) => {
                if(err){
                    console.log(err);
                    return;
                }
            });
            res.send("Added "+name+" to "+boardName);
        });
    });
});

// Create Aufgabe
app.post("/createAufgabe", (req, res) => {
    db.all("select * from Mitarbeiter where id = '"+req.body.mitarbeiter+"';", (err, rows) => {
        if(err){
            console.log(err);
            res.send("ERROR");
            return;
        }

        let mitarbeiter; 
        rows.forEach((row) => {
            mitarbeiter = row.id;
        });

        function createMsg(){
            res.send("Created "+req.body.name);
        }

        if(req.body.beschreibung == undefined){
            db.exec("insert into Aufgabe (name, mitarbeiter, status) values ('"+req.body.name+"', "+mitarbeiter+", 'To DO');", (err) => {
                if(err){
                    console.log(err);
                    res.send("Error");
                    return;
                }
                createMsg();
            });
        }else{
            db.exec("insert into Aufgabe (name, beschreibung, mitarbeiter, status) values ('"+req.body.name+"', '"+req.body.beschreibung+"', "+mitarbeiter+", 'To DO');", (err)=> {
                if(err){
                    console.log(err);
                    res.send("Error");
                    return;
                }
                createMsg();
            });
        }
    });
});

// Add Aufgabe to Board
app.post("/addAufgabeToBoard", (req, res) => {
    let aufgabe, board, aufgabeName, boardName;
    aufgabe = req.body.aufgabe;
    board = req.body.board;

    db.exec("insert into Aufgabe_Board (aufgabe, board) values ("+aufgabe+", "+board+");", (err) => {
        if(err){
            console.log(err);
            res.send("Error: "+err);
            return;
        }
        db.all("select name from aufgabe where id = "+aufgabe, (err, rows) => {
            if(err){
                console.log(err);
                res.send("Error: "+err);
                return;
            }
            
            rows.forEach((row) => {
                aufgabeName = row;
            });

            db.all("select name from board where id = "+board, (err, rows) => {
                if(err){
                    console.log(err);
                    res.send("Error: "+err);
                    return;
                }
                rows.forEach((row) => {
                    boardName = row;
                })
                
                res.send("Added "+aufgabeName+" to "+boardName);
            });
        });
        
    });
});

// Get Aufgaben
app.get("/aufgaben", (req,res) => {
    let board = req.query.board;
    let aufgaben = [];

    db.all("select * from Aufgabe a INNER JOIN Aufgabe_Board ab ON a.id = ab.aufgabe WHERE ab.board = "+board+";", (err, rows) => {
        if(err){
            console.log(err);
            res.send([]);
            return;
        }

        rows.forEach((row) => {
            aufgaben.push({id:row.id, name:row.name, mitarbeiter:row.mitarbeiter, status:row.status});
        });

        res.send(aufgaben);
    });
});

// Get Aufgabe genau
app.get("/aufgabe", (req, res) => {
    let aufgabe = req.query.aufgabe;

    db.all("select * from aufgabe WHERE id = "+aufgabe+";", (err, rows) => {
        if(err){
            console.log(err);
            res.send("Error: "+err);
            return;
        }

        rows.forEach((row )=> {
            res.send({id:row.id, name:row.name, mitarbeiter:row.mitarbeiter, status:row.status, beschreibung:row.beschreibung});
        });
    });
});

// Set Aufgabe Status
app.post("/setStatus", (req, res) => {
    let aufgabe = req.body.aufgabe;
    let status = req.body.status;

    db.exec("update Aufgabe SET status = '"+status+"' WHERE id = "+aufgabe, (err) => {
        if(err){
            console.log(err);
            res.send("ERROR: "+err);
            return;
        }

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

    db.exec("UPDATE Mitarbeiter SET name = '"+name+"', beschreibung='"+beschreibung+"', mitarbeiter="+mitarbeiter+", status='"+status+"' WHERE id = "+id, (err) => {
        if(err){
            console.log(err);
            res.send("ERROR: "+err);
            return;
        }

        res.send("Aufgabe Bearbeitet.");
    });
});

// Login
app.post("/login", (req, res) => {
    let name = req.body.name;
    if(name.includes("'")){
        res.send("SQL Injection wurde leider deaktiviert ;(");
        return;
    }
    db.all("Select * from Mitarbeiter WHERE name like '"+name+"';", (err, rows) => {
        if(err){
            console.log(err);
            res.send("Error: "+err);
            return;
        }

        res.send(rows[0] == undefined?"Mitarbeiter wurde nicht gefunden":{id:rows[0].id, name:rows[0].name});
    })
})

app.get("/jquery.js", (req, res) => {
    res.sendFile(__dirname+"/node_modules/jquery/dist/jquery.js");
})

app.listen(port, () => {
    console.log("Started.", "Listening to port "+port);
})


//DEBUG
db.all("select * from Board;", (err, rows) => {
    rows.forEach((row) => {
        console.log(row);
    })
})
db.all("select * from Board_Mitarbeiter;", (err, rows) => {
    rows.forEach((row) => {
        console.log(row);
    })
})