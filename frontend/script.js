let cart = [];

function addToCart(item) {
    cart.push(item);

    let cartList = document.getElementById("cart");
    let li = document.createElement("li");
    li.textContent = item;

    cartList.appendChild(li);
}