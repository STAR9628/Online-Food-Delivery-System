const http = require('http');

const foodItems = [
    { name: "Pizza", price: 200 },
    { name: "Burger", price: 100 }
];

const server = http.createServer((req, res) => {

    if (req.url === "/menu") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(foodItems));
    } else {
        res.write("Server is running");
        res.end();
    }

});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});