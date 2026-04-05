const http = require('http');

const foodData = [
    {
        restaurant: "Domino's",
        items: [
            { 
                name: "Pizza", 
                price: 200, 
                image: "https://images.unsplash.com/photo-1594007654729-407eedc4be65?q=80&w=800&auto=format&fit=crop" 
            },
            { 
                name: "Garlic Bread", 
                price: 120, 
                image: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec" 
            }
        ]
    },
    {
        restaurant: "McDonald's",
        items: [
            { 
                name: "Burger", 
                price: 100, 
                image: "https://images.unsplash.com/photo-1550547660-d9450f859349" 
            },
            { 
                name: "Fries", 
                price: 80, 
                image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5" 
            }
        ]
    }
];

const server = http.createServer((req, res) => {

    res.setHeader("Access-Control-Allow-Origin", "*");

    if (req.url === "/menu") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(foodData));
    } else {
        res.write("Server running");
        res.end();
    }

});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});