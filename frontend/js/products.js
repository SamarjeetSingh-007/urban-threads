// Product Data
const fallbackProducts = [
    {
        id: 1,
        name: 'Urban Explorer Hoodie',
        category: 'hoodies',
        price: 3499,
        originalPrice: 4499,
        image: 'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwzfHxob29kaWV8ZW58MHx8fHwxNzU2MTE1NDY2fDA&ixlib=rb-4.1.0&q=85',
        images: [
            'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwzfHxob29kaWV8ZW58MHx8fHwxNzU2MTE1NDY2fDA&ixlib=rb-4.1.0&q=85',
            'https://images.unsplash.com/photo-1556821840-3a63f95609a7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHw0fHxob29kaWV8ZW58MHx8fHwxNzU2MTE1NDY2fDA&ixlib=rb-4.1.0&q=85',
            'https://images.unsplash.com/photo-1542406775-ade58c52d2e4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwyfHxob29kaWV8ZW58MHx8fHwxNzU2MTE1NDY2fDA&ixlib=rb-4.1.0&q=85'
        ],
        description: 'Premium heavyweight cotton hoodie with embroidered logo. Perfect for street culture enthusiasts who demand both comfort and style.',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Black', 'White', 'Grey', 'Navy'],
        rating: 4.8,
        reviews: 127,
        badge: 'Best Seller',
        inStock: true
    },
    {
        id: 2,
        name: 'Street Flames Graphic Tee',
        category: 'tshirts',
        price: 1699,
        originalPrice: 2199,
        image: 'https://images.unsplash.com/photo-1538329972958-465d6d2144ed?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHxzdHJlZXR3ZWFyJTIwZmFzaGlvbnxlbnwwfHx8fDE3NTYxMTU0NjF8MA&ixlib=rb-4.1.0&q=85',
        images: [
            'https://images.unsplash.com/photo-1538329972958-465d6d2144ed?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHxzdHJlZXR3ZWFyJTIwZmFzaGlvbnxlbnwwfHx8fDE3NTYxMTU0NjF8MA&ixlib=rb-4.1.0&q=85',
            'https://images.unsplash.com/photo-1588117260148-b47818741c74?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwzfHxzdHJlZXR3ZWFyJTIwZmFzaGlvbnxlbnwwfHx8fDE3NTYxMTU0NjF8MA&ixlib=rb-4.1.0&q=85'
        ],
        description: '100% premium cotton tee with bold graphic design. Soft, comfortable, and built to last through countless street adventures.',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Black', 'White', 'Burgundy', 'Olive'],
        rating: 4.6,
        reviews: 89,
        badge: 'New',
        inStock: true
    },
    {
        id: 3,
        name: 'Air Force Classic Sneakers',
        category: 'sneakers',
        price: 6299,
        originalPrice: 7499,
        image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxzbmVha2Vyc3xlbnwwfHx8fDE3NTYwNTcyNTl8MA&ixlib=rb-4.1.0&q=85',
        images: [
            'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxzbmVha2Vyc3xlbnwwfHx8fDE3NTYwNTcyNTl8MA&ixlib=rb-4.1.0&q=85',
            'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwyfHxzbmVha2Vyc3xlbnwwfHx8fDE3NTYwNTcyNTl8MA&ixlib=rb-4.1.0&q=85',
            'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHw0fHxzbmVha2Vyc3xlbnwwfHx8fDE3NTYwNTcyNTl8MA&ixlib=rb-4.1.0&q=85'
        ],
        description: 'Iconic low-top sneakers with premium leather construction. The ultimate streetwear essential for any urban wardrobe.',
        sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'],
        colors: ['White', 'Black', 'Red', 'Blue'],
        rating: 4.9,
        reviews: 203,
        badge: 'Popular',
        inStock: true
    },
    {
        id: 4,
        name: 'Urban Legend Jacket',
        category: 'jackets',
        price: 7999,
        originalPrice: 9999,
        image: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxzdHJlZXR3ZWFyJTIwZmFzaGlvbnxlbnwwfHx8fDE3NTYxMTU0NjF8MA&ixlib=rb-4.1.0&q=85',
        images: [
            'https://images.unsplash.com/photo-1523398002811-999ca8dec234?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxzdHJlZXR3ZWFyJTIwZmFzaGlvbnxlbnwwfHx8fDE3NTYxMTU0NjF8MA&ixlib=rb-4.1.0&q=85',
            'https://images.unsplash.com/photo-1517942420142-6a296f9ee4b1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwxfHxob29kaWV8ZW58MHx8fHwxNzU2MTE1NDY2fDA&ixlib=rb-4.1.0&q=85'
        ],
        description: 'Premium bomber jacket with street-inspired design details. Water-resistant fabric with multiple pockets for urban functionality.',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Black', 'Khaki', 'Navy', 'Burgundy'],
        rating: 4.7,
        reviews: 156,
        badge: 'Limited',
        inStock: true
    },
    {
        id: 5,
        name: 'Core Essentials Hoodie',
        category: 'hoodies',
        price: 2799,
        originalPrice: 3399,
        image: 'https://images.unsplash.com/photo-1542406775-ade58c52d2e4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwyfHxob29kaWV8ZW58MHx8fHwxNzU2MTE1NDY2fDA&ixlib=rb-4.1.0&q=85',
        images: [
            'https://images.unsplash.com/photo-1542406775-ade58c52d2e4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwyfHxob29kaWV8ZW58MHx8fHwxNzU2MTE1NDY2fDA&ixlib=rb-4.1.0&q=85',
            'https://images.unsplash.com/photo-1556821840-3a63f95609a7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHw0fHxob29kaWV8ZW58MHx8fHwxNTY2MTE1NDY2fDA&ixlib=rb-4.1.0&q=85'
        ],
        description: 'Essential pullover hoodie in premium cotton blend. Clean design with subtle branding for everyday street style.',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Grey', 'Black', 'White', 'Navy'],
        rating: 4.5,
        reviews: 92,
        badge: null,
        inStock: true
    },
    {
        id: 6,
        name: 'High-Top Court Sneakers',
        category: 'sneakers',
        price: 5499,
        originalPrice: 6499,
        image: 'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwyfHxzbmVha2Vyc3xlbnwwfHx8fDE3NTYwNTcyNTl8MA&ixlib=rb-4.1.0&q=85',
        images: [
            'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwyfHxzbmVha2Vyc3xlbnwwfHx8fDE3NTYwNTcyNTl8MA&ixlib=rb-4.1.0&q=85',
            'https://images.unsplash.com/photo-1465453869711-7e174808ace9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwzfHxzbmVha2Vyc3xlbnwwfHx8fDE3NTYwNTcyNTl8MA&ixlib=rb-4.1.0&q=85'
        ],
        description: 'Classic high-top sneakers with retro vibes and modern comfort. Premium canvas construction with rubber sole.',
        sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'],
        colors: ['White', 'Black', 'Red', 'Navy'],
        rating: 4.4,
        reviews: 78,
        badge: null,
        inStock: true
    },
    {
        id: 7,
        name: 'Minimalist Crew Tee',
        category: 'tshirts',
        price: 1399,
        originalPrice: null,
        image: 'https://images.unsplash.com/photo-1508216310976-c518daae0cdc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHw0fHxzdHJlZXR3ZWFyJTIwZmFzaGlvbnxlbnwwfHx8fDE3NTYxMTU0NjF8MA&ixlib=rb-4.1.0&q=85',
        images: [
            'https://images.unsplash.com/photo-1508216310976-c518daae0cdc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHw0fHxzdHJlZXR3ZWFyJTIwZmFzaGlvbnxlbnwwfHx8fDE3NTYxMTU0NjF8MA&ixlib=rb-4.1.0&q=85'
        ],
        description: 'Clean and minimal crew neck tee in premium organic cotton. Perfect base layer for any streetwear outfit.',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Black', 'White', 'Grey', 'Navy', 'Olive'],
        rating: 4.3,
        reviews: 65,
        badge: null,
        inStock: true
    },
    {
        id: 8,
        name: 'Runner Sport Sneakers',
        category: 'sneakers',
        price: 6999,
        originalPrice: 8299,
        image: 'https://images.unsplash.com/photo-1465453869711-7e174808ace9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwzfHxzbmVha2Vyc3xlbnwwfHx8fDE3NTYwNTcyNTl8MA&ixlib=rb-4.1.0&q=85',
        images: [
            'https://images.unsplash.com/photo-1465453869711-7e174808ace9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwzfHxzbmVha2Vyc3xlbnwwfHx8fDE3NTYwNTcyNTl8MA&ixlib=rb-4.1.0&q=85',
            'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHw0fHxzbmVha2Vyc3xlbnwwfHx8fDE3NTYwNTcyNTl8MA&ixlib=rb-4.1.0&q=85'
        ],
        description: 'Performance running sneakers with street style appeal. Advanced cushioning technology meets urban design.',
        sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'],
        colors: ['Grey', 'Black', 'Blue', 'White'],
        rating: 4.6,
        reviews: 134,
        badge: 'New',
        inStock: true
    }
];

let products = [...fallbackProducts];
const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80';
let hasFetchedProductsFromApi = false;

window.products = products;
window.DEFAULT_PRODUCT_IMAGE = DEFAULT_PRODUCT_IMAGE;
window.hasFetchedProductsFromApi = hasFetchedProductsFromApi;

async function syncProductsFromApi() {
    if (typeof window.apiRequest !== 'function') return;

    try {
        const apiProducts = await window.apiRequest('/products');

        if (Array.isArray(apiProducts)) {
            products = apiProducts;
            window.products = products;
            hasFetchedProductsFromApi = true;
            window.hasFetchedProductsFromApi = true;
            document.dispatchEvent(new CustomEvent('productsUpdated'));
        }
    } catch (error) {
        // Keep fallback products if backend is not running yet.
        console.warn('Using local product fallback:', error.message);
    }
}

async function refreshProductsFromServer() {
    await syncProductsFromApi();
}

window.refreshProductsFromServer = refreshProductsFromServer;
window.loadWishlist = loadWishlist;
window.saveWishlist = saveWishlist;
window.refreshWishlistFromServer = refreshWishlistFromServer;

// Utility Functions
function formatPrice(price) {
    const amount = Number(price || 0);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star"></i>';
    }
    
    return starsHTML;
}

function formatCategoryLabel(category) {
    const normalized = String(category || '').trim().toLowerCase();
    if (!normalized) return 'General';
    if (normalized === 'tshirts') return 'T-Shirts';

    return normalized
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function escapeForOnclick(value) {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ');
}

function getWishlistStorageKey() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const email = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();
    return isLoggedIn && email ? `wishlist_${email}` : 'wishlist_guest';
}

function isWishlistRemoteSession() {
    return localStorage.getItem('isLoggedIn') === 'true' && Boolean(localStorage.getItem('authToken'));
}

let wishlistCache = [];
let wishlistCacheReady = false;
let wishlistSyncWarningShown = false;

function readWishlistFromStorageKey() {
    try {
        const raw = JSON.parse(localStorage.getItem(getWishlistStorageKey()) || '[]');
        if (!Array.isArray(raw)) return [];
        return raw.map((id) => Number(id)).filter(Number.isFinite);
    } catch (error) {
        return [];
    }
}

function normalizeWishlistIds(ids) {
    return Array.isArray(ids)
        ? Array.from(new Set(ids.map((id) => Number(id)).filter(Number.isFinite)))
        : [];
}

async function refreshWishlistFromServer({ silent = true } = {}) {
    if (!isWishlistRemoteSession()) {
        wishlistCache = [];
        wishlistCacheReady = false;
        return loadWishlist();
    }

    try {
        const token = localStorage.getItem('authToken') || '';
        const response = await window.apiRequest('/me/wishlist', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const ids = Array.isArray(response?.ids)
            ? response.ids.map((id) => Number(id)).filter(Number.isFinite)
            : [];

        const localIds = readWishlistFromStorageKey();
        const mergedIds = normalizeWishlistIds([...localIds, ...ids]);

        wishlistCache = mergedIds;
        wishlistCacheReady = true;
        localStorage.setItem(getWishlistStorageKey(), JSON.stringify(mergedIds));

        if (mergedIds.length !== ids.length) {
            const token = localStorage.getItem('authToken') || '';
            window.apiRequest('/me/wishlist/merge', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ids: mergedIds })
            }).catch(() => {
                // keep merged local cache; merge will retry on next authenticated sync
            });
        }

        document.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { ids: mergedIds } }));
        return mergedIds;
    } catch (error) {
        if (!silent) {
            console.warn('Wishlist sync failed:', error.message || error);
        }

        return loadWishlist();
    }
}

function loadWishlist() {
    if (isWishlistRemoteSession() && wishlistCacheReady) {
        return [...wishlistCache];
    }

    try {
        const ids = readWishlistFromStorageKey();

        if (isWishlistRemoteSession()) {
            wishlistCache = ids;
        }

        return ids;
    } catch (error) {
        return [];
    }
}

function saveWishlist(ids) {
    const normalized = normalizeWishlistIds(ids);

    localStorage.setItem(getWishlistStorageKey(), JSON.stringify(normalized));

    if (isWishlistRemoteSession()) {
        wishlistCache = normalized;
        wishlistCacheReady = true;

        const token = localStorage.getItem('authToken') || '';
        window.apiRequest('/me/wishlist', {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ ids: normalized })
        }).then(() => {
            wishlistSyncWarningShown = false;
        }).catch((error) => {
            console.warn('Failed to persist wishlist:', error.message || error);

            if (!wishlistSyncWarningShown) {
                showMessage('Saved for now. Please login again to sync wishlist across devices 💫', 'info');
                wishlistSyncWarningShown = true;
            }
        });
    }

    document.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { ids: normalized } }));
}

function createProductCard(product) {
    const safeName = escapeForOnclick(product.name);
    const firstGalleryImage = Array.isArray(product.images) && product.images.length
        ? product.images.find(Boolean)
        : '';
    const displayImage = product.image || firstGalleryImage || DEFAULT_PRODUCT_IMAGE;
    const safeImage = escapeForOnclick(displayImage);
    const isInStock = product.inStock !== false;
    const addToCartMarkup = isInStock
        ? `<button class="add-to-cart" onclick='event.stopPropagation(); addToCart(${product.id}, "${safeName}", ${product.price}, "${safeImage}", "M", "Black", 1, ${isInStock})'>
                    <i class="fas fa-shopping-cart"></i> Add to Cart
                </button>`
        : `<button class="add-to-cart add-to-cart--disabled" type="button" disabled aria-disabled="true" title="Out of stock">
                    <i class="fas fa-hourglass-half"></i> Product Unavailable
                </button>`;

    return `
        <div class="product-card" data-product-id="${product.id}" onclick='quickView(${product.id})'>
            <div class="product-image">
                <img src="${displayImage}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'">
                ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
                ${!isInStock ? `<div class="product-stock-badge">Out of Stock</div>` : ''}
                <div class="product-card-actions">
                    <button class="action-btn" onclick='event.stopPropagation(); toggleWishlist(${product.id})' title="Add to Wishlist">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="action-btn" onclick='event.stopPropagation(); quickView(${product.id})' title="Quick View">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <div class="product-category">${formatCategoryLabel(product.category)}</div>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">
                    ${product.originalPrice ? `<span class="original-price">${formatPrice(product.originalPrice)}</span>` : ''}
                    ${formatPrice(product.price)}
                </div>
                ${!isInStock ? `<p class="product-restock-note">✨ Sold out for now — please wait, we’ll restock this drop soon.</p>` : ''}
                ${addToCartMarkup}
            </div>
        </div>
    `;
}

// Get product by ID
function getProductById(id) {
    return products.find(product => product.id === parseInt(id));
}

// Filter products by category
function getProductsByCategory(category) {
    if (category === 'all') return products;
    return products.filter(product => product.category === category);
}

// Filter products by price range
function getProductsByPriceRange(range) {
    if (range === 'all') return products;
    
    const [min, max] = range.split('-').map(num => num === '+' ? Infinity : parseInt(num));
    return products.filter(product => {
        if (max === undefined) return product.price >= min;
        return product.price >= min && product.price <= max;
    });
}

// Search products
function searchProducts(query) {
    if (!query) return products;
    
    const searchQuery = query.toLowerCase();
    return products.filter(product => 
        product.name.toLowerCase().includes(searchQuery) ||
        product.description.toLowerCase().includes(searchQuery) ||
        product.category.toLowerCase().includes(searchQuery)
    );
}

// Sort products
function sortProducts(products, sortBy) {
    const sorted = [...products];
    
    switch (sortBy) {
        case 'price-low':
            return sorted.sort((a, b) => a.price - b.price);
        case 'price-high':
            return sorted.sort((a, b) => b.price - a.price);
        case 'name':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'newest':
            return sorted.sort((a, b) => b.id - a.id);
        default:
            return sorted;
    }
}

// Get related products
function getRelatedProducts(productId, limit = 4) {
    const product = getProductById(productId);
    if (!product) return [];
    
    return products
        .filter(p => p.id !== productId && p.category === product.category)
        .slice(0, limit);
}

// Load featured products on homepage
function loadFeaturedProducts() {
    const container = document.getElementById('featured-products');
    if (!container) return;
    
    const featuredProducts = products.slice(0, 6); // Get first 6 products
    container.innerHTML = featuredProducts.map(createProductCard).join('');
    
    // Animate products
    const productCards = container.querySelectorAll('.product-card');
    productCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Wishlist functionality (using localStorage)
function toggleWishlist(productId) {
    const normalizedId = Number(productId);
    if (!Number.isFinite(normalizedId)) return;

    const wishlist = loadWishlist();
    const index = wishlist.indexOf(normalizedId);
    
    if (index > -1) {
        wishlist.splice(index, 1);
        showMessage('Removed from wishlist', 'info');
    } else {
        wishlist.push(normalizedId);
        showMessage('Added to wishlist', 'success');
    }
    
    saveWishlist(wishlist);
    updateWishlistUI();
}

function updateWishlistUI() {
    const wishlist = loadWishlist();
    const wishlistButtons = document.querySelectorAll('.action-btn[onclick*="toggleWishlist"]');
    
    wishlistButtons.forEach(button => {
        const productId = parseInt(button.getAttribute('onclick').match(/\d+/)[0]);
        const icon = button.querySelector('i');
        
        if (wishlist.includes(productId)) {
            icon.className = 'fas fa-heart';
            button.style.background = '#ff6b6b';
            button.style.color = 'white';
        } else {
            icon.className = 'far fa-heart';
            button.style.background = '';
            button.style.color = '';
        }
    });
}

// Quick view functionality
function quickView(productId) {
    const product = getProductById(productId);
    if (!product) return;
    
    // Redirect to product details page
    window.location.href = `product.html?id=${productId}`;
}

// Show message to user
function showMessage(message, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    // Add to page
    document.body.insertBefore(messageEl, document.body.firstChild);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

// Initialize products when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    refreshWishlistFromServer({ silent: true });
    loadFeaturedProducts();
    updateWishlistUI();
    syncProductsFromApi();
});

document.addEventListener('productsUpdated', function() {
    loadFeaturedProducts();
    updateWishlistUI();
});

document.addEventListener('wishlistUpdated', function() {
    updateWishlistUI();
});