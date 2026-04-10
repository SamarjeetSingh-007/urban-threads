// Cart page functionality

function escapeForCartOnclick(value) {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ');
}

// Initialize cart page
async function initCart() {
    if (typeof window.loadCartFromServer === 'function' && typeof window.isAuthenticatedSession === 'function') {
        if (window.isAuthenticatedSession()) {
            try {
                await window.loadCartFromServer();
            } catch (error) {
                // keep local fallback when backend sync fails
            }
        }
    }

    if (typeof window.syncCartFromStorage === 'function') {
        window.syncCartFromStorage();
    }

    loadCartPage();
}

// Load cart page content
function loadCartPage() {
    if (typeof window.syncCartFromStorage === 'function') {
        window.syncCartFromStorage();
    }

    const container = document.getElementById('cart-content');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h2>Your cart is empty</h2>
                <p>Looks like you haven't added anything to your cart yet. Start shopping to fill it up!</p>
                <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
            </div>
        `;
        return;
    }

    const subtotal = calculateSubtotal();
    const shipping = calculateShipping(subtotal);
    const tax = calculateTax(subtotal);
    const total = subtotal + shipping + tax;

    container.innerHTML = `
        <div class="cart-layout">
            <div class="cart-items">
                <h2>Shopping Cart (${cart.reduce((sum, item) => sum + item.quantity, 0)} items)</h2>
                ${cart.map(createCartItemHTML).join('')}
            </div>
            
            <div class="cart-summary">
                <h2>Order Summary</h2>
                
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>${formatPrice(subtotal)}</span>
                </div>
                
                <div class="summary-row">
                    <span>Shipping:</span>
                    <span>${shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
                </div>
                
                <div class="summary-row">
                    <span>Tax:</span>
                    <span>${formatPrice(tax)}</span>
                </div>
                
                <div class="summary-row total">
                    <span>Total:</span>
                    <span>${formatPrice(total)}</span>
                </div>
                
                <button class="btn btn-primary checkout-btn" onclick="proceedToCheckout()">
                    <i class="fas fa-lock"></i>
                    Secure Checkout
                </button>
                
                <div style="text-align: center; margin-top: 1rem;">
                    <a href="shop.html" style="color: #666; text-decoration: none;">
                        <i class="fas fa-arrow-left"></i> Continue Shopping
                    </a>
                </div>
                
                <div class="shipping-info" style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-top: 2rem; font-size: 0.9rem; color: #666;">
                    <p><strong>Free shipping</strong> on orders above ₹2,999</p>
                    <p><i class="fas fa-truck"></i> Standard delivery: 2-5 business days (Pan India)</p>
                    <p><i class="fas fa-map-marker-alt"></i> Dispatch from Mumbai warehouse</p>
                </div>
            </div>
        </div>
    `;
}

// Create cart item HTML
function createCartItemHTML(item) {
    const safeSize = escapeForCartOnclick(item.size);
    const safeColor = escapeForCartOnclick(item.color);
    const fallbackImage = window.DEFAULT_PRODUCT_IMAGE || 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80';

    return `
        <div class="cart-item">
            <div class="cart-item-image">
                <img src="${item.image || fallbackImage}" alt="${item.name}" onerror="this.onerror=null;this.src='${fallbackImage}'">
            </div>
            
            <div class="cart-item-details">
                <h3>${item.name}</h3>
                <div class="cart-item-meta">
                    Size: ${item.size} | Color: ${item.color}
                </div>
                <div class="cart-item-price">
                    ${formatPrice(item.price)} each
                </div>
                
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateCartItemQuantity(${item.id}, '${safeSize}', '${safeColor}', ${item.quantity - 1})">-</button>
                        <input type="number" value="${item.quantity}" min="1" max="10" 
                               onchange="updateCartItemQuantity(${item.id}, '${safeSize}', '${safeColor}', parseInt(this.value))"
                               class="quantity-input">
                        <button class="quantity-btn" onclick="updateCartItemQuantity(${item.id}, '${safeSize}', '${safeColor}', ${item.quantity + 1})">+</button>
                    </div>
                    
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id}, '${safeSize}', '${safeColor}')" title="Remove item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="cart-item-total">
                ${formatPrice(item.price * item.quantity)}
            </div>
        </div>
    `;
}

// Calculate subtotal
function calculateSubtotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Calculate shipping
function calculateShipping(subtotal) {
    if (subtotal >= 2999) return 0;
    return 149;
}

// Calculate tax
function calculateTax(subtotal) {
    return subtotal * 0.18; // GST 18%
}

// Proceed to checkout
function proceedToCheckout() {
    if (cart.length === 0) {
        showMessage('Your cart is empty', 'error');
        return;
    }

    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) {
        // Save current guest cart
        localStorage.setItem("cart_guest", JSON.stringify(cart));
        // Redirect to login
        window.location.href = "login.html?redirect=cart.html";
        return;
    }

    // Continue checkout simulation
    showMessage('Proceeding to checkout...', 'info');

    setTimeout(() => {
        const orderNumber = 'UT-IN-' + Date.now().toString().slice(-6);
        showMessage(`Order ${orderNumber} placed successfully! Thank you for shopping with Urban Threads India.`, 'success');

        // Clear user's cart after order
        cart = [];
        saveCartToStorage();
        updateCartCount();
        loadCartPage();
    }, 1500);
}


// Save for later functionality
function saveForLater(productId, size, color) {
    const item = cart.find(item =>
        item.id === productId && item.size === size && item.color === color
    );

    if (item) {
        let savedItems = JSON.parse(localStorage.getItem('savedItems') || '[]');
        savedItems.push(item);
        localStorage.setItem('savedItems', JSON.stringify(savedItems));

        removeFromCart(productId, size, color);
        showMessage('Item saved for later', 'success');
    }
}

// Move to cart from saved items
function moveToCart(productId, size, color) {
    let savedItems = JSON.parse(localStorage.getItem('savedItems') || '[]');
    const itemIndex = savedItems.findIndex(item =>
        item.id === productId && item.size === size && item.color === color
    );

    if (itemIndex > -1) {
        const item = savedItems[itemIndex];
        savedItems.splice(itemIndex, 1);
        localStorage.setItem('savedItems', JSON.stringify(savedItems));

        addToCart(item.id, item.name, item.price, item.image, item.size, item.color, item.quantity);
        showMessage('Item moved to cart', 'success');
    }
}

// Apply promo code
function applyPromoCode(code) {
    const validCodes = {
        'SAVE10': { discount: 0.1, type: 'percentage' },
        'WELCOME': { discount: 15, type: 'fixed' },
        'FREESHIP': { freeShipping: true }
    };

    const promo = validCodes[code.toUpperCase()];
    if (promo) {
        showMessage('Promo code applied successfully!', 'success');
        // In a real app, you'd store this and recalculate totals
        return true;
    } else {
        showMessage('Invalid promo code', 'error');
        return false;
    }
}

function getCurrentUser() {
    return localStorage.getItem("loggedInUser") || null;
}

function getUserCartKey() {
    const user = getCurrentUser();
    return user ? `cart_${user}` : "cart_guest";
}

// Load cart from storage
function loadCartFromStorage() {
    return JSON.parse(localStorage.getItem(getUserCartKey()) || "[]");
}

// Save cart to storage
function saveCartToStorage() {
    if (typeof window.saveCartToActiveSession === 'function') {
        window.saveCartToActiveSession();
        return;
    }

    localStorage.setItem(getUserCartKey(), JSON.stringify(cart));
}

// Estimate shipping
function estimateShipping(zipCode) {
    // Simulate shipping estimation
    const estimates = [
        { method: 'Standard', days: '3-5', price: 149 },
        { method: 'Express', days: '1-2', price: 249 },
        { method: 'Same Day (Metro)', days: '1', price: 399 }
    ];

    return estimates;
}

// Initialize cart page when DOM loads
document.addEventListener('DOMContentLoaded', function () {
    if (window.location.pathname.includes('cart.html')) {
        initCart();
    }
});