// Wishlist page functionality

function getWishlistProductIds() {
    if (typeof window.loadWishlist === 'function') {
        return window.loadWishlist();
    }

    return [];
}

function saveWishlistProductIds(ids) {
    if (typeof window.saveWishlist === 'function') {
        window.saveWishlist(ids);
    }
}

function hasConfirmedLiveProducts() {
    return window.hasFetchedProductsFromApi === true;
}

function renderWishlistEmpty(container) {
    container.innerHTML = `
        <div class="wishlist-empty">
            <i class="far fa-heart"></i>
            <h2>Your wishlist is empty</h2>
            <p>Tap the heart icon on any product to save it here for later.</p>
            <a href="shop.html" class="btn btn-primary">Explore Products</a>
        </div>
    `;
}

function renderWishlistPage() {
    const container = document.getElementById('wishlist-products');
    const header = document.getElementById('wishlist-head');
    if (!container || !header) return;

    const ids = getWishlistProductIds();

    if (!ids.length) {
        header.style.display = 'none';
        renderWishlistEmpty(container);
        return;
    }

    const wishlistProducts = ids
        .map((id) => getProductById(id))
        .filter(Boolean);

    if (hasConfirmedLiveProducts()) {
        const resolvedIds = wishlistProducts
            .map((product) => Number(product?.id))
            .filter(Number.isFinite);

        if (resolvedIds.length !== ids.length) {
            saveWishlistProductIds(resolvedIds);
        }
    }

    if (!wishlistProducts.length) {
        header.style.display = 'none';
        renderWishlistEmpty(container);
        return;
    }

    header.style.display = 'flex';
    container.innerHTML = wishlistProducts.map(createProductCard).join('');
    updateWishlistUI();
}

function clearWishlist() {
    const ok = window.confirm('Clear all wishlist items?');
    if (!ok) return;

    saveWishlistProductIds([]);
    renderWishlistPage();
}

async function initWishlistPage() {
    if (!window.location.pathname.includes('wishlist.html')) return;

    document.getElementById('clear-wishlist-btn')?.addEventListener('click', clearWishlist);

    if (typeof window.refreshProductsFromServer === 'function') {
        try {
            await window.refreshProductsFromServer();
        } catch (error) {
            // Keep fallback rendering when backend is temporarily unavailable.
        }
    }

    if (typeof window.refreshWishlistFromServer === 'function') {
        try {
            await window.refreshWishlistFromServer({ silent: true });
        } catch (error) {
            // fallback to local cache
        }
    }

    renderWishlistPage();
}

document.addEventListener('DOMContentLoaded', initWishlistPage);

document.addEventListener('productsUpdated', () => {
    if (window.location.pathname.includes('wishlist.html')) {
        renderWishlistPage();
    }
});

document.addEventListener('wishlistUpdated', () => {
    if (window.location.pathname.includes('wishlist.html')) {
        renderWishlistPage();
    }
});
