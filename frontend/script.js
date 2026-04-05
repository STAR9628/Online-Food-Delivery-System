let cart = [];
let foodData = [];

// Load restaurants
async function loadRestaurants() {
    const response = await fetch("http://localhost:3000/menu");
    foodData = await response.json();

    const menuDiv = document.getElementById("menu");
    menuDiv.innerHTML = "<h2>Select Restaurant</h2>";

    foodData.forEach((rest, index) => {
        let div = document.createElement("div");
        div.className = "item";

        div.innerHTML = `
            <p><strong>${rest.restaurant}</strong></p>
            <button onclick="showMenu(${index})">View Menu</button>
        `;

        menuDiv.appendChild(div);
    });
}

// Show selected restaurant menu
function showMenu(index) {
    const menuDiv = document.getElementById("menu");
    const restaurant = foodData[index];

    menuDiv.innerHTML = `<h2>${restaurant.restaurant}</h2>`;

    restaurant.items.forEach(item => {
        let div = document.createElement("div");
        div.className = "item";

        div.innerHTML = `
            <img src="${item.image}">
            <p>${item.name} - ₹${item.price}</p>
            <button onclick="addToCart('${item.name}', ${item.price})">Add</button>
        `;

        menuDiv.appendChild(div);
    });

    // Back button
    let backBtn = document.createElement("button");
    backBtn.textContent = "⬅ Back to Restaurants";
    backBtn.onclick = loadRestaurants;
    menuDiv.appendChild(backBtn);
}

// Cart functions
function addToCart(item, price) {
    cart.push({ item, price });
    displayCart();
}

function displayCart() {
    let cartList = document.getElementById("cart");
    cartList.innerHTML = "";

    let total = 0;

    cart.forEach((product, index) => {
        total += product.price;

        let li = document.createElement("li");
        li.textContent = product.item + " - ₹" + product.price;

        let btn = document.createElement("button");
        btn.textContent = " Remove";
        btn.onclick = () => removeItem(index);

        li.appendChild(btn);
        cartList.appendChild(li);
    });

    document.getElementById("total").textContent = "Total: ₹" + total;
}

function removeItem(index) {
    cart.splice(index, 1);
    displayCart();
}

function placeOrder() {
    if (cart.length === 0) {
        document.getElementById("message").textContent = "Cart is empty!";
        return;
    }

    document.getElementById("message").textContent = "✅ Order placed successfully!";
    cart = [];
    displayCart();
}

// Start app
window.onload = loadRestaurants;