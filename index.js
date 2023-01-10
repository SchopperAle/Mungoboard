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
            position varchar(16),
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
    if(req.body.beschreibung == undefined){
        db.exec("insert into Board (name) values ('"+req.body.name+"');", (err) => {
            if(err){
                console.log(err);
                res.status(404).send("Error: Could not create "+req.body.name);
            }
        });
    }else {
        db.exec("insert into Board (name, beschreibung) values ('"+req.body.name+"','"+req.body.beschreibung+"');", (err) => {
            if(err){
                console.log(err);
                res.status(404).send("Error: Could not create "+req.body.name);
            }
        });
    }

    res.send("Created "+req.body.name);
});

//Get boards
app.get("/boards", (req, res) => {
    db.all("select * from Board_Mitarbeiter", (err, rows) => rows.forEach((row)=>console.log(row)));
    console.log(req.query.name)
    // Geht nu ned gaunz
    /*db.all("select b.name from Mitarbeiter m WHERE m.name LIKE '"+req.query.name+"' INNER JOIN Board_Mitarbeiter bm ON bm.mitarbeiter = m.id INNER JOIN Board b ON b.id = bm.board;", (err, rows) => {
        if(err){
            console.log(err);
            res.status(404).send("Error loading Boards");
            return;
        }
        let data = [];
        rows.forEach((row) => {
            console.log(row);
            data.push(row.name);
        });

        res.send({data: data});
    });*/
});

//Add to Board
app.post("/addToBoard", (req, res) => {
    let id, boardId;
    let name, boardName;
    db.all("select * from Mitarbeiter m WHERE m.name LIKE '"+req.body.mitarbeiter+"';", (err, rows) => {
        if(err){
            console.log(err);
            res.send("Error");
            return;
        }

        rows.forEach((row) => {
            console.log(row);
            id = row.id;
            name = row.name;
        })

        db.all("select * from Board b WHERE b.name LIKE '"+req.body.board+"';", (err, rows) => {
            if(err){
                res.send("ERROR");
                return;
            }
    
            rows.forEach((row) => {
                boardId = row.id;
                boardName = row.name;
            });

            db.exec("insert into Board_Mitarbeiter (board, mitarbeiter) values ("+boardId+", "+id+")");
            res.send("Added "+name+" to "+boardName);
        });
    });
})

app.get("/jquery.js", (req, res) => {
    res.sendFile(__dirname+"/node_modules/jquery/dist/jquery.js");
})

app.listen(port, () => {
    console.log("Started.", "Listening to port "+port);
})