// Main JavaScript for Urban Threads

// Shopping Cart Management
function getCurrentUserEmail() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) return '';

    return (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();
}

function getCurrentAuthToken() {
    return localStorage.getItem('authToken') || '';
}

function isSessionLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

function isAuthenticatedSession() {
    return isSessionLoggedIn() && Boolean(getCurrentAuthToken());
}

function getCartStorageKey() {
    const email = getCurrentUserEmail();
    return email ? `cart_${email}` : 'cart_guest';
}

function migrateLegacyCartStorage() {
    const legacyCart = localStorage.getItem('cart');
    if (!legacyCart) return;

    const userEmail = getCurrentUserEmail();
    if (userEmail) {
        const userCartKey = `cart_${userEmail}`;
        if (!localStorage.getItem(userCartKey)) {
            localStorage.setItem(userCartKey, legacyCart);
        }
    }

    localStorage.removeItem('cart');
}

function loadCartFromActiveSession() {
    try {
        const parsed = JSON.parse(localStorage.getItem(getCartStorageKey()) || '[]');
        return normalizeCartItems(parsed);
    } catch (error) {
        return [];
    }
}

function toCartLineKey(item) {
    return `${Number(item.id)}::${String(item.size || 'M').trim() || 'M'}::${String(item.color || 'Black').trim() || 'Black'}`;
}

function normalizeCartItems(items) {
    if (!Array.isArray(items)) return [];

    const merged = new Map();

    items.forEach((rawItem) => {
        if (!rawItem || typeof rawItem !== 'object') return;

        const id = Number(rawItem.id);
        if (!Number.isFinite(id) || id <= 0) return;

        const normalizedItem = {
            id,
            name: String(rawItem.name || '').trim(),
            price: Number.isFinite(Number(rawItem.price)) ? Number(rawItem.price) : 0,
            image: String(rawItem.image || '').trim(),
            size: String(rawItem.size || 'M').trim() || 'M',
            color: String(rawItem.color || 'Black').trim() || 'Black',
            quantity: Math.max(1, Math.round(Number(rawItem.quantity || 1)))
        };

        const key = toCartLineKey(normalizedItem);
        if (!merged.has(key)) {
            merged.set(key, normalizedItem);
            return;
        }

        const existing = merged.get(key);
        merged.set(key, {
            ...existing,
            ...normalizedItem,
            quantity: Math.max(1, Math.round(Number(existing.quantity || 1)))
        });
    });

    return Array.from(merged.values()).sort((a, b) => {
        if (a.id !== b.id) return a.id - b.id;
        const sizeCompare = a.size.localeCompare(b.size);
        if (sizeCompare !== 0) return sizeCompare;
        return a.color.localeCompare(b.color);
    });
}

function mergeServerAndLocalCart(serverItems, localItems) {
    const normalizedServer = normalizeCartItems(serverItems);
    const normalizedLocal = normalizeCartItems(localItems);
    const byKey = new Map();

    normalizedServer.forEach((item) => {
        byKey.set(toCartLineKey(item), item);
    });

    // Local snapshot wins for matching keys to avoid losing just-added items.
    normalizedLocal.forEach((item) => {
        byKey.set(toCartLineKey(item), item);
    });

    return normalizeCartItems(Array.from(byKey.values()));
}

function areCartSnapshotsEqual(left, right) {
    return JSON.stringify(normalizeCartItems(left)) === JSON.stringify(normalizeCartItems(right));
}

function saveCartToActiveSession() {
    localStorage.setItem(getCartStorageKey(), JSON.stringify(cart));

    if (isAuthenticatedSession()) {
        persistCartToServer().catch(() => {
            // keep local cache when network persistence fails temporarily
        });
    }
}

function syncCartFromStorage() {
    cart = loadCartFromActiveSession();
    return cart;
}

async function loadCartFromServer() {
    if (!isAuthenticatedSession()) {
        cart = loadCartFromActiveSession();
        return cart;
    }

    try {
        const token = getCurrentAuthToken();
        const response = await apiRequest('/me/cart', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const serverItems = normalizeCartItems(Array.isArray(response?.items) ? response.items : []);
        const localItems = loadCartFromActiveSession();
        const mergedItems = mergeServerAndLocalCart(serverItems, localItems);

        cart = mergedItems;
        localStorage.setItem(getCartStorageKey(), JSON.stringify(mergedItems));

        if (!areCartSnapshotsEqual(serverItems, mergedItems)) {
            persistCartToServer().catch(() => {
                // keep local merged snapshot if remote sync fails temporarily
            });
        }

        return cart;
    } catch (error) {
        cart = loadCartFromActiveSession();
        return cart;
    }
}

let cartPersistChain = Promise.resolve();

function persistCartToServer() {
    if (!isAuthenticatedSession()) {
        return Promise.resolve();
    }

    const token = getCurrentAuthToken();
    const snapshot = normalizeCartItems(Array.isArray(cart) ? cart : []);

    cartPersistChain = cartPersistChain
        .then(() => apiRequest('/me/cart', {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ items: snapshot })
        }))
        .catch(() => {
            // keep chain alive for future updates
        });

    return cartPersistChain;
}

migrateLegacyCartStorage();
let cart = loadCartFromActiveSession();
let catalogSettingsCache = null;
let lastSyncState = {
    productsUpdatedAt: '',
    catalogSettingsUpdatedAt: ''
};

// API helpers
function getApiBaseUrl() {
    if (window.location.protocol === 'file:') {
        return 'http://localhost:3000/api';
    }

    return `${window.location.origin}/api`;
}

function getAuthToken() {
    return localStorage.getItem('authToken') || '';
}

async function apiRequest(endpoint, options = {}) {
    const config = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    };

    let response;

    try {
        response = await fetch(`${getApiBaseUrl()}${endpoint}`, config);
    } catch (error) {
        throw new Error('Unable to reach backend. Start the server and open http://localhost:3000 (not file:// pages).');
    }

    let data = null;

    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    if (!response.ok) {
        throw new Error(data?.message || 'Request failed.');
    }

    return data;
}

window.getApiBaseUrl = getApiBaseUrl;
window.getAuthToken = getAuthToken;
window.apiRequest = apiRequest;
window.getCartStorageKey = getCartStorageKey;
window.syncCartFromStorage = syncCartFromStorage;
window.saveCartToActiveSession = saveCartToActiveSession;
window.loadCartFromServer = loadCartFromServer;
window.persistCartToServer = persistCartToServer;
window.isAuthenticatedSession = isAuthenticatedSession;

function normalizeCategorySlug(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';

    const normalized = raw
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    if (['tshirt', 'tshirts', 't-shirt', 't-shirts', 'tee', 'tees'].includes(normalized)) return 'tshirts';
    if (['hoodie', 'hoodies'].includes(normalized)) return 'hoodies';
    if (['sneaker', 'sneakers', 'shoe', 'shoes', 'footwear', 'footwears'].includes(normalized)) return 'sneakers';
    if (['jacket', 'jackets'].includes(normalized)) return 'jackets';

    return normalized;
}

function categoryLabel(slug) {
    const normalized = normalizeCategorySlug(slug);
    if (!normalized) return 'General';
    if (normalized === 'tshirts') return 'T-Shirts';

    return normalized
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function buildFallbackCatalogSettingsFromProducts() {
    if (!Array.isArray(window.products)) {
        return {
            categories: ['hoodies', 'tshirts', 'sneakers', 'jackets'],
            sizes: { apparel: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], footwear: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'] },
            colors: ['Black', 'White', 'Grey', 'Navy', 'Olive', 'Khaki', 'Burgundy', 'Red', 'Blue']
        };
    }

    const categories = Array.from(new Set(window.products.map((product) => normalizeCategorySlug(product.category)).filter(Boolean)));

    return {
        categories: categories.length ? categories : ['hoodies', 'tshirts', 'sneakers', 'jackets'],
        sizes: { apparel: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], footwear: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'] },
        colors: ['Black', 'White', 'Grey', 'Navy', 'Olive', 'Khaki', 'Burgundy', 'Red', 'Blue']
    };
}

function sanitizeCatalogSettings(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const fallback = buildFallbackCatalogSettingsFromProducts();

    const categories = Array.from(
        new Set([
            ...(Array.isArray(source.categories) ? source.categories : []),
            ...(Array.isArray(fallback.categories) ? fallback.categories : [])
        ].map(normalizeCategorySlug).filter(Boolean))
    );

    return {
        categories,
        sizes: {
            apparel: Array.isArray(source?.sizes?.apparel) && source.sizes.apparel.length
                ? source.sizes.apparel.map((size) => String(size || '').trim().toUpperCase()).filter(Boolean)
                : fallback.sizes.apparel,
            footwear: Array.isArray(source?.sizes?.footwear) && source.sizes.footwear.length
                ? source.sizes.footwear.map((size) => String(size || '').trim().toUpperCase()).filter(Boolean)
                : fallback.sizes.footwear
        },
        colors: Array.isArray(source.colors) && source.colors.length
            ? source.colors.map((color) => String(color || '').trim()).filter(Boolean)
            : fallback.colors,
        updatedAt: String(source.updatedAt || '')
    };
}

function getCatalogSettings() {
    if (!catalogSettingsCache) {
        catalogSettingsCache = sanitizeCatalogSettings(null);
    }

    return catalogSettingsCache;
}

function renderFooterCollections() {
    const settings = getCatalogSettings();
    const categories = Array.isArray(settings.categories) ? settings.categories : [];

    const sections = document.querySelectorAll('.footer-section');
    sections.forEach((section) => {
        const heading = section.querySelector('h4');
        if (!heading) return;
        if (String(heading.textContent || '').trim().toLowerCase() !== 'collections') return;

        const list = section.querySelector('ul');
        if (!list) return;

        list.innerHTML = categories.map((category) => {
            const slug = normalizeCategorySlug(category);
            return `<li><a href="shop.html?category=${encodeURIComponent(slug)}">${categoryLabel(slug)}</a></li>`;
        }).join('');
    });
}

async function refreshCatalogSettingsFromServer({ silent = false } = {}) {
    try {
        const settings = await apiRequest('/catalog-settings');
        const next = sanitizeCatalogSettings(settings);
        const previous = JSON.stringify(catalogSettingsCache || {});
        const incoming = JSON.stringify(next);

        catalogSettingsCache = next;

        if (previous !== incoming) {
            document.dispatchEvent(new CustomEvent('catalogSettingsUpdated', { detail: next }));
        }

        renderFooterCollections();
    } catch (error) {
        if (!silent) {
            console.warn('Catalog settings sync failed:', error.message);
        }

        catalogSettingsCache = sanitizeCatalogSettings(catalogSettingsCache);
        renderFooterCollections();
    }
}

async function tickGlobalRealtimeSync() {
    if (document.hidden) return;

    try {
        const syncState = await apiRequest('/sync-state');
        const productsChanged = syncState.productsUpdatedAt !== lastSyncState.productsUpdatedAt;
        const settingsChanged = syncState.catalogSettingsUpdatedAt !== lastSyncState.catalogSettingsUpdatedAt;

        lastSyncState = {
            productsUpdatedAt: syncState.productsUpdatedAt,
            catalogSettingsUpdatedAt: syncState.catalogSettingsUpdatedAt
        };

        if (settingsChanged || !catalogSettingsCache) {
            await refreshCatalogSettingsFromServer({ silent: true });
        }

        if (productsChanged && typeof window.refreshProductsFromServer === 'function') {
            await window.refreshProductsFromServer();
        }
    } catch (error) {
        await refreshCatalogSettingsFromServer({ silent: true });

        if (typeof window.refreshProductsFromServer === 'function') {
            await window.refreshProductsFromServer();
        }
    }
}

function initGlobalRealtimeSync() {
    window.addEventListener('storage', (event) => {
        if (event.key === 'productsUpdatedAt' && typeof window.refreshProductsFromServer === 'function') {
            window.refreshProductsFromServer();
        }

        if (event.key === 'catalogSettingsUpdatedAt') {
            refreshCatalogSettingsFromServer({ silent: true });
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;

        tickGlobalRealtimeSync();

        if (isAuthenticatedSession()) {
            loadCartFromServer().then(() => {
                updateCartCount();
            });

            if (typeof window.refreshWishlistFromServer === 'function') {
                window.refreshWishlistFromServer({ silent: true });
            }
        }
    });

    tickGlobalRealtimeSync();
}

window.getCatalogSettings = getCatalogSettings;
window.refreshCatalogSettingsFromServer = refreshCatalogSettingsFromServer;

// Update cart count in navigation
function updateCartCount() {
    syncCartFromStorage();

    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        
        if (totalItems > 0) {
            cartCount.style.display = 'flex';
        } else {
            cartCount.style.display = 'none';
        }
    }
}

function resolveProductForCart(productId) {
    const normalizedId = Number(productId);
    if (!Number.isFinite(normalizedId)) return null;

    if (typeof window.getProductById === 'function') {
        const found = window.getProductById(normalizedId);
        if (found) return found;
    }

    if (Array.isArray(window.products)) {
        const found = window.products.find((product) => Number(product?.id) === normalizedId);
        if (found) return found;
    }

    if (typeof products !== 'undefined' && Array.isArray(products)) {
        return products.find((product) => Number(product?.id) === normalizedId) || null;
    }

    return null;
}

function normalizeStockFlag(value) {
    if (value === true || value === false) return value;

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'y', 'in-stock', 'instock'].includes(normalized)) return true;
        if (['false', '0', 'no', 'n', 'out-of-stock', 'outofstock'].includes(normalized)) return false;
        return null;
    }

    if (typeof value === 'number') {
        if (value === 1) return true;
        if (value === 0) return false;
    }

    return null;
}

function isProductAvailableForCart(productId, stockHint = null) {
    const explicit = normalizeStockFlag(stockHint);
    if (explicit === false) return false;
    if (explicit === true) return true;

    const product = resolveProductForCart(productId);
    if (!product) return true;

    const resolved = normalizeStockFlag(product.inStock);
    return resolved !== false;
}

function notifyUser(message, type = 'info') {
    if (typeof window.showMessage === 'function') {
        window.showMessage(message, type);
        return;
    }

    console.log(message);
}

// Add item to cart
function addToCart(id, name, price, image, size = 'M', color = 'Black', quantity = 1, stockHint = null) {
    if (!isProductAvailableForCart(id, stockHint)) {
        notifyUser('This product is currently unavailable. Please wait, we\'ll restock soon ✨', 'info');
        return;
    }

    syncCartFromStorage();

    const existingItem = cart.find(item => 
        item.id === id && item.size === size && item.color === color
    );
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: id,
            name: name,
            price: price,
            image: image,
            size: size,
            color: color,
            quantity: quantity
        });
    }
    
    saveCartToActiveSession();
    updateCartCount();
    notifyUser(`${name} added to cart!`, 'success');
    
    // Add visual feedback
    const button = typeof event !== 'undefined' ? event.target?.closest('button') : null;
    if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Added!';
        button.style.background = '#28a745';

        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);
    }
}

// Remove item from cart
function removeFromCart(id, size, color) {
    syncCartFromStorage();

    cart = cart.filter(item => !(item.id === id && item.size === size && item.color === color));
    saveCartToActiveSession();
    updateCartCount();
    
    // Reload cart page if we're on it
    if (window.location.pathname.includes('cart.html')) {
        loadCartPage();
    }
}

// Update item quantity in cart
function updateCartItemQuantity(id, size, color, quantity) {
    syncCartFromStorage();

    const item = cart.find(item => 
        item.id === id && item.size === size && item.color === color
    );
    
    if (item) {
        if (quantity <= 0) {
            removeFromCart(id, size, color);
        } else {
            item.quantity = quantity;
            saveCartToActiveSession();
            updateCartCount();
            
            // Update cart page if we're on it
            if (window.location.pathname.includes('cart.html')) {
                loadCartPage();
            }
        }
    }
}

// Navigation functionality
function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navbar = document.querySelector('.navbar');
    
    // Mobile menu toggle
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
        });
    }
    
    // Close mobile menu when clicking on links
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    
    // Navbar scroll effect (throttled with requestAnimationFrame)
    let lastScroll = 0;
    let ticking = false;
    function onScroll() {
        lastScroll = window.pageYOffset;
        requestTick();
    }
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateNavbarScroll);
            ticking = true;
        }
    }
    function updateNavbarScroll() {
        if (lastScroll > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        ticking = false;
    }
    window.addEventListener('scroll', onScroll);
}

// Newsletter subscription
function initNewsletter() {
    const newsletterForm = document.querySelector('.newsletter-form');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = e.target.querySelector('input[type="email"]').value;
            
            // Simulate API call
            showMessage('Thanks for subscribing! Check your email for confirmation.', 'success');
            e.target.reset();
        });
    }
}

// Smooth scroll for anchor links
function initSmoothScroll() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 100; // Account for fixed navbar
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Intersection Observer for animations
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                entry.target.classList.add('animate-in');
                obs.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    // Observe elements with fade-in animation, including section-title
    const animatedElements = document.querySelectorAll('.product-card, .category-card, .value-card, .team-member, .faq-item, .section-title');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

// FAQ functionality
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all FAQ items
            faqItems.forEach(faqItem => {
                faqItem.classList.remove('active');
            });
            
            // Open clicked item if it wasn't already active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// Footer utility functions
function showSizeGuide() {
    alert('Size Guide:\n\nClothing Sizes:\nXS: 32-34"\nS: 34-36"\nM: 36-38"\nL: 38-40"\nXL: 40-42"\nXXL: 42-44"\n\nShoe Sizes:\nUS sizes 7-12 available\nFor specific measurements, please contact our support team.');
}

function showShippingInfo() {
    alert('Shipping Information (India):\n\n• Standard Shipping: 3-5 business days (₹149)\n• Express Shipping: 1-2 business days (₹249)\n• Free shipping on orders above ₹2,999\n• Delivery available across India\n• Order by 2 PM IST for same-day processing');
}

function showReturnPolicy() {
    alert('Return Policy:\n\n• 7-day easy return window\n• Items must be unused with tags\n• Free size exchange available\n• Full refund to original payment method\n• Defective items replaced at no charge\n• Contact support to initiate return');
}

function showFAQ() {
    window.location.href = 'contact.html#faq';
}

// Loading state management
function showLoading(element) {
    if (element) {
        element.classList.add('loading');
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        element.appendChild(spinner);
    }
}

function hideLoading(element) {
    if (element) {
        element.classList.remove('loading');
        const spinner = element.querySelector('.spinner');
        if (spinner) {
            spinner.remove();
        }
    }
}

// Image lazy loading
function initLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
}

// Get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initAuth() {
    const loginBtn = document.getElementById("login-btn");
    if (!loginBtn) return;

    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const isAdmin = localStorage.getItem('userRole') === 'admin';
    const navMenu = document.querySelector('.nav-menu');
    const existingAdminLink = document.getElementById('admin-nav-link');
    const existingWishlistLink = document.getElementById('wishlist-nav-link');

    if (navMenu && !existingWishlistLink) {
        const wishlistItem = document.createElement('li');
        const wishlistLink = document.createElement('a');
        wishlistLink.id = 'wishlist-nav-link';
        wishlistLink.href = 'wishlist.html';
        wishlistLink.textContent = 'Wishlist';

        if (window.location.pathname.includes('wishlist.html')) {
            wishlistLink.classList.add('active');
        }

        wishlistItem.appendChild(wishlistLink);

        const cartItem = navMenu.querySelector('.cart-icon')?.closest('li');
        if (cartItem) {
            navMenu.insertBefore(wishlistItem, cartItem);
        } else {
            navMenu.insertBefore(wishlistItem, loginBtn.parentElement);
        }
    } else if (existingWishlistLink) {
        existingWishlistLink.classList.toggle('active', window.location.pathname.includes('wishlist.html'));
    }

    if (navMenu && isLoggedIn && isAdmin && !existingAdminLink) {
        const adminItem = document.createElement('li');
        const adminLink = document.createElement('a');
        adminLink.id = 'admin-nav-link';
        adminLink.href = 'admin.html';
        adminLink.textContent = 'Admin';

        if (window.location.pathname.includes('admin.html')) {
            adminLink.classList.add('active');
        }

        adminItem.appendChild(adminLink);
        navMenu.insertBefore(adminItem, loginBtn.parentElement);
    }

    if ((!isLoggedIn || !isAdmin) && existingAdminLink) {
        existingAdminLink.closest('li')?.remove();
    }

    if (isLoggedIn) {
        loginBtn.textContent = "Logout";
        loginBtn.href = "#";
        loginBtn.onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("authToken");
            localStorage.removeItem("userRole");
            localStorage.removeItem("loggedInUser");
            localStorage.removeItem("userName");
            window.location.reload();
        };
    } else {
        loginBtn.textContent = "Login";
        loginBtn.href = "login.html";
        loginBtn.onclick = null;
    }
}

// Initialize auth UI immediately from local state.
initAuth();

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initNewsletter();
    initSmoothScroll();
    initAnimations();
    initFAQ();
    initLazyLoading();

    // Instantly reflect cached cart state
    cart = loadCartFromActiveSession();
    updateCartCount();

    // Background sync for logged in users
    if (isAuthenticatedSession()) {
        loadCartFromServer().then(() => updateCartCount());
    }
    
    refreshCatalogSettingsFromServer({ silent: true });
    renderFooterCollections();
    initGlobalRealtimeSync();

    if (typeof window.refreshWishlistFromServer === 'function') {
        window.refreshWishlistFromServer({ silent: true }).catch(console.error);
    }
    
    // Add click animation to buttons
    const buttons = document.querySelectorAll('.btn, button');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});

// Add ripple animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);