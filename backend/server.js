const http = require('http');

let foodData = []; // dynamic now

const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // GET menu
    if (req.method === "GET" && req.url === "/menu") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(foodData));
    }

    // ADD restaurant (ADMIN)
    else if (req.method === "POST" && req.url === "/add-restaurant") {
        let body = "";

        req.on("data", chunk => {
            body += chunk.toString();
        });

        req.on("end", () => {
            const newData = JSON.parse(body);
            foodData.push(newData);

            res.end(JSON.stringify({ message: "Added successfully" }));
        });
    }

    else {
        res.end("Server running");
    }
});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});