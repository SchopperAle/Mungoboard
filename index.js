let sqlite = require("sqlite3");
let express = require("express");
let fs = require("fs");

let settings = JSON.parse(fs.readFileSync("./settings.json")+"");
let port = settings.port;

let app = express();

app.use("/web", express.static("web"));

app.get("/", (req, res) => {
    res.sendFile(__dirname+"/web/index.html");
});

app.listen(port, () => {
    console.log("Started.", "Listening to port "+port);
})