// Product details page functionality

let currentProduct = null;
let selectedSize = '';
let selectedColor = '';
let quantity = 1;
let currentImageIndex = 0;
let currentProductMedia = [];

function escapeForOptionOnclick(value) {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ');
}

function formatProductCategoryLabel(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return 'General';
    if (normalized === 'tshirts') return 'T-Shirts';

    return normalized
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function extractYoutubeVideoId(url) {
    const input = String(url || '').trim();
    if (!input) return '';

    const standard = input.match(/[?&]v=([^&#]+)/i);
    if (standard && standard[1]) return standard[1];

    const short = input.match(/youtu\.be\/([^?&#/]+)/i);
    if (short && short[1]) return short[1];

    const embed = input.match(/youtube\.com\/embed\/([^?&#/]+)/i);
    if (embed && embed[1]) return embed[1];

    return '';
}

// Initialize product details page
function bootstrapProductDetails(productId) {
    currentProduct = getProductById(productId);

    if (!currentProduct) {
        return false;
    }

    loadProductDetails();
    loadRelatedProducts();
    initProductOptions();
    updateWishlistDetailsButton();
    return true;
}

async function initProductDetails() {
    const productId = getUrlParameter('id');
    if (!productId) {
        window.location.href = 'shop.html';
        return;
    }

    if (typeof window.refreshProductsFromServer === 'function') {
        try {
            await window.refreshProductsFromServer();
        } catch (error) {
            // fallback data is already available if network request fails
        }
    }

    if (bootstrapProductDetails(productId)) {
        return;
    }

    document.addEventListener('productsUpdated', function handleProductUpdate() {
        if (!bootstrapProductDetails(productId)) {
            window.location.href = 'shop.html';
        }
    }, { once: true });

    setTimeout(() => {
        if (!currentProduct) {
            window.location.href = 'shop.html';
        }
    }, 1500);
}

// Load product details
function loadProductDetails() {
    const container = document.getElementById('product-content');
    const breadcrumb = document.getElementById('product-breadcrumb');
    const defaultImage = window.DEFAULT_PRODUCT_IMAGE || 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80';

    const productImages = (Array.isArray(currentProduct.images) ? currentProduct.images : [])
        .filter(Boolean);

    if (!productImages.length) {
        productImages.push(currentProduct.image || defaultImage);
    }

    const productVideos = Array.isArray(currentProduct.videos) && currentProduct.videos.length
        ? currentProduct.videos.filter(Boolean)
        : (currentProduct.video ? [currentProduct.video] : []);

    currentProduct.images = productImages;
    currentProduct.videos = productVideos;
    const availableSizes = Array.isArray(currentProduct.sizes) && currentProduct.sizes.length ? currentProduct.sizes : ['M'];
    const availableColors = Array.isArray(currentProduct.colors) && currentProduct.colors.length ? currentProduct.colors : ['Black'];
    const rating = Number.isFinite(Number(currentProduct.rating)) ? Number(currentProduct.rating) : 0;
    const reviews = Number.isFinite(Number(currentProduct.reviews)) ? Number(currentProduct.reviews) : 0;
    currentProductMedia = [];
    productImages.forEach(img => currentProductMedia.push({ type: 'image', url: img }));
    productVideos.forEach((vid, i) => {
        const youtubeId = extractYoutubeVideoId(vid);
        if (youtubeId) {
            currentProductMedia.push({ type: 'youtube', id: youtubeId, url: vid });
        } else {
            currentProductMedia.push({ type: 'video', url: vid });
        }
    });

    const categoryLabel = formatProductCategoryLabel(currentProduct.category);
    const isInStock = currentProduct.inStock !== false;
    
    if (breadcrumb) {
        breadcrumb.textContent = currentProduct.name;
    }
    
    if (!container) return;
    
    // Set default selections
    selectedSize = availableSizes[0];
    selectedColor = availableColors[0];
    
    // Helper to render thumbnails
    function renderThumbnail(media, index) {
        if (media.type === 'youtube') {
            return `
                <div class="thumbnail ${index === 0 ? 'active' : ''} media-video-thumb" onclick="changeMainImage(${index})">
                    <img src="https://img.youtube.com/vi/${media.id}/mqdefault.jpg" alt="Video ${index}">
                    <div class="play-overlay"><i class="fas fa-play"></i></div>
                </div>
            `;
        } else if (media.type === 'video') {
            return `
                <div class="thumbnail ${index === 0 ? 'active' : ''} media-video-thumb" onclick="changeMainImage(${index})">
                    <video src="${media.url}#t=0.5" preload="metadata" muted playsinline></video>
                    <div class="play-overlay"><i class="fas fa-play"></i></div>
                </div>
            `;
        }
        return `
            <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage(${index})">
                <img src="${media.url}" alt="${currentProduct.name}" onerror="this.onerror=null;this.src='${defaultImage}'">
            </div>
        `;
    }

    container.innerHTML = `
        <div class="product-gallery">
            <div class="main-image" id="main-media-container">
                <img src="${productImages[0]}" alt="${currentProduct.name}" id="main-product-image" class="main-media-image" onclick="openImageModal(0)" onerror="this.onerror=null;this.src='${defaultImage}'">
            </div>
            <div class="thumbnail-images" id="thumbnail-images-container">
                ${currentProductMedia.map((m, i) => renderThumbnail(m, i)).join('')}
            </div>
        </div>
        
        <div class="product-details-info">
            <h1>${currentProduct.name}</h1>
            
            <div class="product-rating">
                <div class="stars">${generateStars(rating)}</div>
                <span class="rating-text">(${reviews} reviews)</span>
            </div>
            
            <div class="product-price">
                ${currentProduct.originalPrice ? `<span class="original-price">${formatPrice(currentProduct.originalPrice)}</span>` : ''}
                ${formatPrice(currentProduct.price)}
            </div>
            
            <div class="product-description">
                <p>${currentProduct.description}</p>
            </div>
            
            <div class="product-options">
                <div class="option-group">
                    <label>Size:</label>
                    <div class="size-options">
                        ${availableSizes.map(size => `
                            <div class="size-option ${size === selectedSize ? 'active' : ''}" 
                                 onclick='selectSize("${escapeForOptionOnclick(size)}")'>${size}</div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="option-group">
                    <label>Color:</label>
                    <div class="color-options">
                        ${availableColors.map(color => `
                            <div class="color-option ${color === selectedColor ? 'active' : ''}" 
                                 onclick='selectColor("${escapeForOptionOnclick(color)}")'>${color}</div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="quantity-selector ${!isInStock ? 'quantity-selector--disabled' : ''}">
                <label>Quantity:</label>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="changeQuantity(-1)" ${!isInStock ? 'disabled aria-disabled="true"' : ''}>-</button>
                    <input type="number" class="quantity-input" value="1" min="1" max="10" 
                           onchange="setQuantity(this.value)" id="quantity-input" ${!isInStock ? 'disabled aria-disabled="true"' : ''}>
                    <button class="quantity-btn" onclick="changeQuantity(1)" ${!isInStock ? 'disabled aria-disabled="true"' : ''}>+</button>
                </div>
            </div>

            <div class="selection-summary" id="selection-summary"></div>
            ${!isInStock ? '<p class="product-restock-note product-restock-note--details">✨ Sold out right now — please wait, we\'ll restock this heat soon.</p>' : ''}
            
            <div class="product-actions">
                ${isInStock
                    ? `<button class="btn btn-primary" onclick="addToCartFromDetails()">
                        <i class="fas fa-shopping-cart"></i> Add to Cart - ${formatPrice(currentProduct.price)}
                    </button>`
                    : `<button class="btn btn-primary btn-unavailable" type="button" disabled aria-disabled="true" title="Out of stock">
                        <i class="fas fa-hourglass-half"></i> Product Unavailable
                    </button>`}
                <button class="btn btn-secondary" id="product-wishlist-btn" onclick="toggleWishlistFromDetails()">
                    <i class="far fa-heart"></i> Add to Wishlist
                </button>
            </div>
            
            <div class="product-meta">
                <div class="meta-item">
                    <span>SKU:</span>
                    <strong>UT-${currentProduct.id.toString().padStart(4, '0')}</strong>
                </div>
                <div class="meta-item">
                    <span>Category:</span>
                    <strong>${categoryLabel}</strong>
                </div>
                <div class="meta-item">
                    <span>Availability:</span>
                    <strong class="${isInStock ? 'in-stock' : 'out-of-stock'}">${isInStock ? 'In Stock' : 'Out of Stock'}</strong>
                </div>
                <div class="meta-item">
                    <span>Shipping:</span>
                    <strong>Free shipping across India on orders above ₹2,999</strong>
                </div>
            </div>
        </div>
    `;
    
    // Update page title
    document.title = `${currentProduct.name} - URBAN THREADS`;
    updateSelectionSummary();
}

// Change main image
function changeMainImage(index) {
    currentImageIndex = index;
    const mediaContainer = document.getElementById('main-media-container');
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    if (mediaContainer && currentProductMedia.length) {
        const media = currentProductMedia[index];
        if (media.type === 'image') {
            mediaContainer.innerHTML = `<img src="${media.url}" alt="Product Image" id="main-product-image" class="main-media-image" onclick="openImageModal(${index})" onerror="this.onerror=null;this.src=''>`;
        } else if (media.type === 'youtube') {
            mediaContainer.innerHTML = `
                <button class="media-expand-btn" type="button" aria-label="Expand video" onclick="openImageModal(${index})"><i class="fas fa-expand"></i></button>
                <iframe src="https://www.youtube.com/embed/${media.id}?autoplay=0" class="main-media-iframe" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else if (media.type === 'video') {
            mediaContainer.innerHTML = `
                <button class="media-expand-btn" type="button" aria-label="Expand video" onclick="openImageModal(${index})"><i class="fas fa-expand"></i></button>
                <video controls playsinline autoplay class="main-media-video"><source src="${media.url}">Your browser does not support embedded video playback.</video>`;
        }
    }
    
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

// Open image modal
function openImageModal(index) {
    currentImageIndex = index;
    const modal = document.getElementById('image-modal');
    const modalMediaWrapper = document.getElementById('modal-media-wrapper');

    if (modal && modalMediaWrapper && currentProductMedia.length) {
        const media = currentProductMedia[index];
            if (media.type === 'image') {
                modalMediaWrapper.innerHTML = `<img id="modal-image" src="${media.url}" alt="" loading="lazy" class="modal-media-image">`;
            } else if (media.type === 'youtube') {
                modalMediaWrapper.innerHTML = `<iframe src="https://www.youtube.com/embed/${media.id}?autoplay=1" class="modal-media-iframe" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
            } else if (media.type === 'video') {
                modalMediaWrapper.innerHTML = `<video controls playsinline autoplay class="modal-media-video"><source src="${media.url}#t=0.1"></video>`;
            }
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Close image modal
function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Stop videos playing in modal
        const modalMediaWrapper = document.getElementById('modal-media-wrapper');
        if (modalMediaWrapper) {
            modalMediaWrapper.innerHTML = '<img id="modal-image" src="" alt="" loading="lazy" class="modal-media-image">';
        }
    }
}

// Navigate modal images
function navigateModalImage(direction) {
    if (!currentProductMedia.length) return;
    const newIndex = currentImageIndex + direction;
    if (newIndex >= 0 && newIndex < currentProductMedia.length) {
        openImageModal(newIndex);
    }
}

// Initialize product options
function initProductOptions() {
    // Modal close functionality
    const modal = document.getElementById('image-modal');
    const closeBtn = document.querySelector('.modal-close');
    const prevBtn = document.querySelector('.modal-prev');
    const nextBtn = document.querySelector('.modal-next');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeImageModal);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => navigateModalImage(-1));
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => navigateModalImage(1));
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeImageModal();
            }
        });
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (modal && modal.classList.contains('active')) {
            switch(e.key) {
                case 'Escape':
                    closeImageModal();
                    break;
                case 'ArrowLeft':
                    navigateModalImage(-1);
                    break;
                case 'ArrowRight':
                    navigateModalImage(1);
                    break;
            }
        }
    });
}

// Select size
function selectSize(size) {
    selectedSize = size;
    
    const sizeOptions = document.querySelectorAll('.size-option');
    sizeOptions.forEach(option => {
        option.classList.toggle('active', option.textContent === size);
    });
    
    updateAddToCartButton();
}

// Select color
function selectColor(color) {
    selectedColor = color;
    
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.classList.toggle('active', option.textContent === color);
    });
    
    updateAddToCartButton();
}

// Change quantity
function changeQuantity(delta) {
    if (currentProduct && currentProduct.inStock === false) {
        return;
    }

    const input = document.getElementById('quantity-input');
    if (input) {
        const newQuantity = Math.max(1, Math.min(10, quantity + delta));
        quantity = newQuantity;
        input.value = newQuantity;
        updateAddToCartButton();
    }
}

// Set quantity directly
function setQuantity(value) {
    if (currentProduct && currentProduct.inStock === false) {
        return;
    }

    const newQuantity = Math.max(1, Math.min(10, parseInt(value) || 1));
    quantity = newQuantity;
    
    const input = document.getElementById('quantity-input');
    if (input) {
        input.value = newQuantity;
    }
    
    updateAddToCartButton();
}

// Update add to cart button
function updateAddToCartButton() {
    const button = document.querySelector('.product-actions .btn-primary');
    const isInStock = currentProduct?.inStock !== false;

    if (button) {
        if (!isInStock) {
            button.innerHTML = '<i class="fas fa-hourglass-half"></i> Product Unavailable';
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
            updateSelectionSummary();
            return;
        }

        button.disabled = false;
        button.removeAttribute('aria-disabled');
        const totalPrice = currentProduct.price * quantity;
        button.innerHTML = `
            <i class="fas fa-shopping-cart"></i> 
            Add ${quantity > 1 ? quantity + ' ' : ''}to Cart - ${formatPrice(totalPrice)}
        `;
    }

    updateSelectionSummary();
}

function updateSelectionSummary() {
    const summary = document.getElementById('selection-summary');
    if (!summary || !selectedSize || !selectedColor) return;

    summary.textContent = `Selected: Size ${selectedSize}, Color ${selectedColor}, Qty ${quantity}`;
}

function updateWishlistDetailsButton() {
    const button = document.getElementById('product-wishlist-btn');
    if (!button || !currentProduct) return;

    const wishlist = typeof window.loadWishlist === 'function' ? window.loadWishlist() : [];
    const inWishlist = wishlist.includes(Number(currentProduct.id));

    button.innerHTML = inWishlist
        ? '<i class="fas fa-heart"></i> Added to Wishlist'
        : '<i class="far fa-heart"></i> Add to Wishlist';
}

function toggleWishlistFromDetails() {
    if (!currentProduct) return;
    toggleWishlist(currentProduct.id);
    updateWishlistDetailsButton();
}

// Add to cart from product details
function addToCartFromDetails() {
    if (currentProduct && currentProduct.inStock === false) {
        showMessage('This product is unavailable right now. Please wait — we\'ll restock soon 💫', 'info');
        return;
    }

    if (!selectedSize || !selectedColor) {
        showMessage('Please select size and color', 'error');
        return;
    }

    const imageForCart = currentProduct.image || currentProduct.images?.[0] || window.DEFAULT_PRODUCT_IMAGE || 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80';
    
    addToCart(
        currentProduct.id,
        currentProduct.name,
        currentProduct.price,
        imageForCart,
        selectedSize,
        selectedColor,
        quantity,
        currentProduct.inStock
    );
}

// Load related products
function loadRelatedProducts() {
    const container = document.getElementById('related-products');
    if (!container) return;
    
    const relatedProducts = getRelatedProducts(currentProduct.id, 4);
    
    if (relatedProducts.length === 0) {
        document.querySelector('.related-products').style.display = 'none';
        return;
    }
    
    container.innerHTML = relatedProducts.map(createProductCard).join('');
    
    // Update wishlist UI for related products
    setTimeout(updateWishlistUI, 100);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('product.html')) {
        initProductDetails();
    }
});

document.addEventListener('wishlistUpdated', function() {
    if (window.location.pathname.includes('product.html')) {
        updateWishlistDetailsButton();
    }
});