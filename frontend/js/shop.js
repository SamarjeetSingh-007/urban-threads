// Shop page functionality

let currentProducts = [...products];
let currentPage = 1;
const productsPerPage = 9;

function normalizeShopCategory(value) {
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

function formatShopCategoryLabel(value) {
    const category = normalizeShopCategory(value);
    if (!category) return '—';
    if (category === 'tshirts') return 'T-Shirts';

    return category
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getAvailableShopCategories() {
    const settingsCategories = Array.isArray(window.getCatalogSettings?.().categories)
        ? window.getCatalogSettings().categories.map((category) => normalizeShopCategory(category)).filter(Boolean)
        : [];

    return Array.from(
        new Set(
            [
                ...settingsCategories,
                ...(Array.isArray(products) ? products : [])
                .map((product) => normalizeShopCategory(product.category))
                .filter(Boolean)
            ]
        )
    ).sort((a, b) => formatShopCategoryLabel(a).localeCompare(formatShopCategoryLabel(b), 'en-IN'));
}

function getAvailableShopSizes() {
    const preferredOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
    const preferredMap = new Map(preferredOrder.map((size, index) => [size, index]));
    const settings = window.getCatalogSettings?.() || {};
    const configuredSizes = [
        ...(Array.isArray(settings?.sizes?.apparel) ? settings.sizes.apparel : []),
        ...(Array.isArray(settings?.sizes?.footwear) ? settings.sizes.footwear : [])
    ];

    return Array.from(
        new Set(
            [
                ...configuredSizes,
                ...(Array.isArray(products) ? products : [])
                .flatMap((product) => (Array.isArray(product.sizes) ? product.sizes : []))
                .map((size) => String(size || '').trim())
                .filter(Boolean)
            ]
        )
    ).sort((a, b) => {
        const upperA = a.toUpperCase();
        const upperB = b.toUpperCase();
        const hasPrefA = preferredMap.has(upperA);
        const hasPrefB = preferredMap.has(upperB);

        if (hasPrefA && hasPrefB) return preferredMap.get(upperA) - preferredMap.get(upperB);
        if (hasPrefA) return -1;
        if (hasPrefB) return 1;

        const numA = Number(a);
        const numB = Number(b);
        const isNumA = Number.isFinite(numA);
        const isNumB = Number.isFinite(numB);

        if (isNumA && isNumB) return numA - numB;
        if (isNumA) return 1;
        if (isNumB) return -1;

        return a.localeCompare(b, 'en-IN');
    });
}

function renderDynamicCategoryFilters(preferredCategory = '') {
    const container = document.getElementById('shop-category-filters');
    if (!container) return;

    const selectedCategory = normalizeShopCategory(preferredCategory)
        || normalizeShopCategory(document.querySelector('input[name="category"]:checked')?.value)
        || 'all';

    const categories = getAvailableShopCategories();
    const options = ['all', ...Array.from(new Set([
        ...categories,
        ...(selectedCategory && selectedCategory !== 'all' ? [selectedCategory] : [])
    ]))];

    container.innerHTML = options.map((category) => {
        const value = category;
        const label = category === 'all' ? 'All Products' : formatShopCategoryLabel(category);
        const checked = value === selectedCategory ? 'checked' : '';

        return `
            <label>
                <input type="radio" name="category" value="${value}" ${checked}>
                <span>${label}</span>
            </label>
        `;
    }).join('');

    const hasSelection = Array.from(container.querySelectorAll('input[name="category"]')).some((input) => input.checked);
    if (!hasSelection) {
        const allOption = container.querySelector('input[name="category"][value="all"]');
        if (allOption) allOption.checked = true;
    }
}

function renderDynamicSizeFilters(preferredSizes = []) {
    const container = document.getElementById('shop-size-filters');
    if (!container) return;

    const selectedSizes = new Set(
        (Array.isArray(preferredSizes) ? preferredSizes : [])
            .map((size) => String(size || '').trim())
            .filter(Boolean)
    );

    const sizes = getAvailableShopSizes();

    container.innerHTML = sizes.map((size) => {
        const checked = selectedSizes.has(size) ? 'checked' : '';
        return `
            <label>
                <input type="checkbox" value="${size}" ${checked}>
                <span>${size}</span>
            </label>
        `;
    }).join('');
}

function getActiveShopFilters() {
    const activeCategory = document.querySelector('input[name="category"]:checked')?.value || 'all';
    const activePrice = document.querySelector('input[name="price"]:checked')?.value || 'all';
    const selectedSizes = Array.from(document.querySelectorAll('#shop-size-filters input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    const searchQuery = (document.getElementById('product-search')?.value || '').trim();
    const sortValue = document.getElementById('sort-select')?.value || 'default';

    return {
        activeCategory,
        activePrice,
        selectedSizes,
        searchQuery,
        sortValue
    };
}

// Initialize shop page
function initShop() {
    const categoryParam = normalizeShopCategory(getUrlParameter('category'));
    renderDynamicCategoryFilters(categoryParam);
    renderDynamicSizeFilters();

    initFilters();
    initSearch();
    initSort();

    applyAllFilters();
}

// Load and display products
function loadProducts(productsToShow = currentProducts) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const paginatedProducts = productsToShow.slice(startIndex, endIndex);
    
    if (paginatedProducts.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
                <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search terms.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = paginatedProducts.map(createProductCard).join('');
    
    // Update pagination
    updatePagination(productsToShow.length);
    
    // Update wishlist UI
    updateWishlistUI();
    
    // Animate products
    const productCards = container.querySelectorAll('.product-card');
    productCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Initialize filters
function initFilters() {
    const shopContent = document.querySelector('.shop-content');
    if (!shopContent) return;

    shopContent.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        if (target.name === 'category' || target.name === 'price' || target.type === 'checkbox') {
            currentPage = 1;
            applyAllFilters();
        }
    });
}

// Filter by category
function filterByCategory(category) {
    currentPage = 1;
    applyAllFilters();
}

// Filter by price
function filterByPrice(priceRange) {
    currentPage = 1;
    applyAllFilters();
}

// Filter by size
function filterBySize() {
    currentPage = 1;
    applyAllFilters();
}

// Apply all active filters
function applyAllFilters() {
    const {
        activeCategory,
        activePrice,
        selectedSizes,
        searchQuery,
        sortValue
    } = getActiveShopFilters();

    let filtered = [...products];

    if (activeCategory !== 'all') {
        const normalizedActiveCategory = normalizeShopCategory(activeCategory);
        filtered = filtered.filter((product) => normalizeShopCategory(product.category) === normalizedActiveCategory);
    }

    if (activePrice !== 'all') {
        const byPrice = getProductsByPriceRange(activePrice);
        filtered = filtered.filter(product => byPrice.includes(product));
    }

    if (selectedSizes.length > 0) {
        filtered = filtered.filter(product =>
            Array.isArray(product.sizes) && product.sizes.some(size => selectedSizes.includes(size))
        );
    }

    if (searchQuery) {
        const bySearch = searchProducts(searchQuery);
        filtered = filtered.filter(product => bySearch.includes(product));
    }

    filtered = sortProducts(filtered, sortValue);
    currentProducts = filtered;

    loadProducts(filtered);
}

// Initialize search
function initSearch() {
    const searchInput = document.getElementById('product-search');
    if (!searchInput) return;
    
    const debouncedSearch = debounce(() => {
        currentPage = 1;
        applyAllFilters();
    }, 300);
    
    searchInput.addEventListener('input', debouncedSearch);
}

// Perform search
function performSearch(query) {
    currentPage = 1;
    applyAllFilters();
}

// Initialize sort
function initSort() {
    const sortSelect = document.getElementById('sort-select');
    if (!sortSelect) return;
    
    sortSelect.addEventListener('change', (e) => {
        applyAllFilters();
    });
}

// Update pagination
function updatePagination(totalProducts) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(totalProducts / productsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Previous
        </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHTML += `<button onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span>...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="goToPage(${i})" ${i === currentPage ? 'class="active"' : ''}>
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span>...</span>`;
        }
        paginationHTML += `<button onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    paginationHTML += `
        <button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

// Go to specific page
function goToPage(page) {
    if (page < 1) return;
    
    currentPage = page;
    applyAllFilters();
    
    // Scroll to top of products
    const productsArea = document.querySelector('.products-area');
    if (productsArea) {
        productsArea.scrollIntoView({ behavior: 'smooth' });
    }
}

document.addEventListener('productsUpdated', function() {
    if (!window.location.pathname.includes('shop.html')) return;

    const selectedCategory = document.querySelector('input[name="category"]:checked')?.value || 'all';
    const selectedSizes = Array.from(document.querySelectorAll('#shop-size-filters input[type="checkbox"]:checked'))
        .map((input) => input.value);
    renderDynamicCategoryFilters(selectedCategory);
    renderDynamicSizeFilters(selectedSizes);
    currentProducts = [...products];
    currentPage = 1;
    applyAllFilters();
});

document.addEventListener('catalogSettingsUpdated', function() {
    if (!window.location.pathname.includes('shop.html')) return;

    const selectedCategory = document.querySelector('input[name="category"]:checked')?.value || 'all';
    const selectedSizes = Array.from(document.querySelectorAll('#shop-size-filters input[type="checkbox"]:checked'))
        .map((input) => input.value);

    renderDynamicCategoryFilters(selectedCategory);
    renderDynamicSizeFilters(selectedSizes);
    applyAllFilters();
});

// Initialize shop when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('shop.html')) {
        initShop();
    }
});