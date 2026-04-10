// Dedicated admin panel logic

let adminProducts = [];
let adminEditingProduct = null;
let adminCatalogSettings = null;
let adminRealtimeIntervalId = null;

const ADMIN_MAX_IMAGES = 8;
const ADMIN_MAX_VIDEOS = 3;

const ADMIN_DEFAULT_SETTINGS = {
    categories: ['hoodies', 'tshirts', 'sneakers', 'jackets'],
    sizes: {
        apparel: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        footwear: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12']
    },
    colors: ['Black', 'White', 'Grey', 'Navy', 'Olive', 'Khaki', 'Burgundy', 'Red', 'Blue']
};

function adminIsLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

function adminRole() {
    return (localStorage.getItem('userRole') || '').toLowerCase();
}

function adminToken() {
    return localStorage.getItem('authToken') || '';
}

function adminFormatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(Number(amount || 0));
}

function adminDeepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function adminUnique(values, normalizer) {
    const seen = new Set();
    const result = [];

    values.forEach((item) => {
        const raw = String(item || '').trim();
        if (!raw) return;

        const key = normalizer(raw);
        if (!key || seen.has(key)) return;

        seen.add(key);
        result.push(raw);
    });

    return result;
}

function adminNormalizeCategoryValue(value) {
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

function adminCategoryLabel(value) {
    const normalized = adminNormalizeCategoryValue(value);
    if (!normalized) return '—';
    if (normalized === 'tshirts') return 'T-Shirts';

    return normalized
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function adminNormalizeSizeValue(value) {
    return String(value || '').trim().toUpperCase();
}

function adminIsFootwearSizeToken(value) {
    return /^\d+(\.\d+)?$/.test(String(value || '').trim());
}

function adminResolveSingleSizeGroup(values = [], preferredGroup = '') {
    const normalizedValues = adminUnique(Array.isArray(values) ? values : [], adminNormalizeSizeValue)
        .map(adminNormalizeSizeValue)
        .filter(Boolean);

    const apparel = normalizedValues.filter((size) => !adminIsFootwearSizeToken(size));
    const footwear = normalizedValues.filter((size) => adminIsFootwearSizeToken(size));

    if (!apparel.length || !footwear.length) {
        return normalizedValues;
    }

    const keepGroup = preferredGroup === 'footwear' || preferredGroup === 'apparel'
        ? preferredGroup
        : (apparel.length >= footwear.length ? 'apparel' : 'footwear');

    return keepGroup === 'footwear' ? footwear : apparel;
}

function adminNormalizeColorValue(value) {
    const lowered = String(value || '').trim().toLowerCase();
    if (!lowered) return '';

    return lowered
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function adminExtractUnsplashPhotoId(inputUrl) {
    try {
        const parsed = new URL(String(inputUrl || '').trim());
        if (!/(^|\.)unsplash\.com$/i.test(parsed.hostname)) return '';
        if (!parsed.pathname.startsWith('/photos/')) return '';

        const segments = parsed.pathname.split('/').filter(Boolean);
        const slug = segments[1] || '';
        if (!slug) return '';

        const candidate = slug.split('-').pop() || '';
        return /^[A-Za-z0-9_-]{6,}$/.test(candidate) ? candidate : '';
    } catch (error) {
        return '';
    }
}

function adminNormalizeImageUrl(url) {
    const input = String(url || '').trim();
    if (!input) return '';

    if (input.startsWith('//')) {
        return `https:${input}`;
    }

    const unsplashPhotoId = adminExtractUnsplashPhotoId(input);
    if (unsplashPhotoId) {
        return `https://source.unsplash.com/${unsplashPhotoId}/1200x1600`;
    }

    return input;
}

function adminNormalizeVideoUrl(url) {
    const input = String(url || '').trim();
    if (!input) return '';

    if (input.startsWith('//')) {
        return `https:${input}`;
    }

    return input;
}

function adminSanitizeCatalogSettings(input) {
    const source = input && typeof input === 'object' ? input : {};

    const categories = adminUnique(
        [
            ...ADMIN_DEFAULT_SETTINGS.categories,
            ...(Array.isArray(source.categories) ? source.categories : [])
        ],
        adminNormalizeCategoryValue
    ).map(adminNormalizeCategoryValue).filter(Boolean);

    const apparelSizes = adminUnique(
        [
            ...ADMIN_DEFAULT_SETTINGS.sizes.apparel,
            ...(Array.isArray(source?.sizes?.apparel) ? source.sizes.apparel : [])
        ],
        adminNormalizeSizeValue
    ).map(adminNormalizeSizeValue).filter(Boolean);

    const footwearSizes = adminUnique(
        [
            ...ADMIN_DEFAULT_SETTINGS.sizes.footwear,
            ...(Array.isArray(source?.sizes?.footwear) ? source.sizes.footwear : [])
        ],
        adminNormalizeSizeValue
    ).map(adminNormalizeSizeValue).filter(Boolean);

    const colors = adminUnique(
        [
            ...ADMIN_DEFAULT_SETTINGS.colors,
            ...(Array.isArray(source.colors) ? source.colors : [])
        ],
        adminNormalizeColorValue
    ).map(adminNormalizeColorValue).filter(Boolean);

    return {
        categories,
        sizes: {
            apparel: apparelSizes,
            footwear: footwearSizes
        },
        colors,
        updatedAt: String(source.updatedAt || '')
    };
}

function adminGetCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
        .map((input) => String(input.value || '').trim())
        .filter(Boolean);
}

function adminReadCurrentFormSelections() {
    const categorySelect = document.getElementById('admin-category');

    return {
        selectedCategory: String(categorySelect?.value || '').trim(),
        selectedSizes: adminGetCheckedValues('admin-sizes').map(adminNormalizeSizeValue),
        selectedColors: adminGetCheckedValues('admin-colors').map(adminNormalizeColorValue)
    };
}

function adminShowMessage(message, type = 'info') {
    const messageEl = document.getElementById('admin-message');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.className = `admin-message admin-message--${type}`;
}

function adminShowSettingsMessage(message, type = 'info') {
    const messageEl = document.getElementById('admin-settings-message');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.className = `admin-message admin-message--${type}`;
}

function adminClearMessages() {
    const messageEl = document.getElementById('admin-message');
    const settingsMessageEl = document.getElementById('admin-settings-message');

    if (messageEl) {
        messageEl.textContent = '';
        messageEl.className = 'admin-message';
    }

    if (settingsMessageEl) {
        settingsMessageEl.textContent = '';
        settingsMessageEl.className = 'admin-message';
    }
}

async function adminRequest(endpoint, options = {}) {
    const token = adminToken();
    const headers = {
        ...(options.headers || {})
    };

    const hasBody = Object.prototype.hasOwnProperty.call(options, 'body');
    const hasContentType = Object.keys(headers).some((key) => key.toLowerCase() === 'content-type');

    if (hasBody && !hasContentType) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return window.apiRequest(endpoint, {
        ...options,
        headers
    });
}

function adminSetActiveTab(tabName) {
    const productPanel = document.getElementById('admin-products-panel');
    const settingsPanel = document.getElementById('admin-settings-panel');
    const productBtn = document.getElementById('admin-tab-products');
    const settingsBtn = document.getElementById('admin-tab-settings');

    if (!productPanel || !settingsPanel || !productBtn || !settingsBtn) return;

    const isProducts = tabName === 'products';

    productPanel.hidden = !isProducts;
    settingsPanel.hidden = isProducts;

    productBtn.classList.toggle('active', isProducts);
    settingsBtn.classList.toggle('active', !isProducts);

    productBtn.setAttribute('aria-selected', isProducts ? 'true' : 'false');
    settingsBtn.setAttribute('aria-selected', isProducts ? 'false' : 'true');
}

function initAdminTabs() {
    const productBtn = document.getElementById('admin-tab-products');
    const settingsBtn = document.getElementById('admin-tab-settings');

    productBtn?.addEventListener('click', () => adminSetActiveTab('products'));
    settingsBtn?.addEventListener('click', () => adminSetActiveTab('settings'));
}

function adminRenderCategorySelect(selectedCategory = '') {
    const select = document.getElementById('admin-category');
    if (!select) return;

    const selected = adminNormalizeCategoryValue(selectedCategory);
    const categories = Array.isArray(adminCatalogSettings?.categories)
        ? adminCatalogSettings.categories
        : ADMIN_DEFAULT_SETTINGS.categories;

    const options = categories.map((category) => {
        const value = adminNormalizeCategoryValue(category);
        return `<option value="${value}">${adminCategoryLabel(value)}</option>`;
    });

    select.innerHTML = [
        '<option value="">Select category</option>',
        ...options
    ].join('');

    if (selected && categories.map(adminNormalizeCategoryValue).includes(selected)) {
        select.value = selected;
    }
}

function adminRenderChoiceGrid({ containerId, inputName, values, selectedValues = [], normalizer = (value) => value }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const normalizedSelected = new Set(selectedValues.map((value) => normalizer(value)));

    container.innerHTML = values.map((value) => {
        const token = String(value || '').trim();
        const checked = normalizedSelected.has(normalizer(token)) ? 'checked' : '';

        return `
            <label class="admin-choice-pill">
                <input type="checkbox" name="${inputName}" value="${token}" ${checked}>
                <span>${token}</span>
            </label>
        `;
    }).join('');
}

function adminGetDefaultSizes() {
    const apparel = Array.isArray(adminCatalogSettings?.sizes?.apparel)
        ? adminCatalogSettings.sizes.apparel
        : ADMIN_DEFAULT_SETTINGS.sizes.apparel;

    const preferred = ['M', 'L', 'XL'];
    const preferredSet = new Set(apparel.map(adminNormalizeSizeValue));
    const defaults = preferred.filter((size) => preferredSet.has(size));

    if (defaults.length) return defaults;
    return apparel.slice(0, Math.min(3, apparel.length));
}

function adminGetDefaultColors() {
    const colors = Array.isArray(adminCatalogSettings?.colors)
        ? adminCatalogSettings.colors
        : ADMIN_DEFAULT_SETTINGS.colors;

    const black = colors.find((color) => adminNormalizeColorValue(color) === 'Black');
    return black ? [black] : (colors.length ? [colors[0]] : []);
}

function adminRenderProductOptionInputs({ selectedSizes = [], selectedColors = [] } = {}) {
    const safeSelectedSizes = adminResolveSingleSizeGroup(selectedSizes);

    const apparelSizes = Array.isArray(adminCatalogSettings?.sizes?.apparel)
        ? adminCatalogSettings.sizes.apparel
        : ADMIN_DEFAULT_SETTINGS.sizes.apparel;

    const footwearSizes = Array.isArray(adminCatalogSettings?.sizes?.footwear)
        ? adminCatalogSettings.sizes.footwear
        : ADMIN_DEFAULT_SETTINGS.sizes.footwear;

    const colors = Array.isArray(adminCatalogSettings?.colors)
        ? adminCatalogSettings.colors
        : ADMIN_DEFAULT_SETTINGS.colors;

    adminRenderChoiceGrid({
        containerId: 'admin-apparel-sizes-grid',
        inputName: 'admin-sizes',
        values: apparelSizes,
        selectedValues: safeSelectedSizes,
        normalizer: adminNormalizeSizeValue
    });

    adminRenderChoiceGrid({
        containerId: 'admin-footwear-sizes-grid',
        inputName: 'admin-sizes',
        values: footwearSizes,
        selectedValues: safeSelectedSizes,
        normalizer: adminNormalizeSizeValue
    });

    adminRenderChoiceGrid({
        containerId: 'admin-colors-grid',
        inputName: 'admin-colors',
        values: colors,
        selectedValues: selectedColors,
        normalizer: adminNormalizeColorValue
    });

    adminApplySizeGroupLocks();
}

function adminSetSizeGroupBlockedState(groupId, blocked) {
    const group = document.getElementById(groupId);
    if (!group) return;

    group.classList.toggle('admin-size-group--blocked', blocked);
    group.setAttribute('aria-disabled', blocked ? 'true' : 'false');
}

function adminApplySizeGroupLocks(preferredGroup = '') {
    const apparelGrid = document.getElementById('admin-apparel-sizes-grid');
    const footwearGrid = document.getElementById('admin-footwear-sizes-grid');

    if (!apparelGrid || !footwearGrid) return;

    const apparelInputs = Array.from(apparelGrid.querySelectorAll('input[name="admin-sizes"]'));
    const footwearInputs = Array.from(footwearGrid.querySelectorAll('input[name="admin-sizes"]'));

    let apparelChecked = apparelInputs.filter((input) => input.checked);
    let footwearChecked = footwearInputs.filter((input) => input.checked);

    if (apparelChecked.length && footwearChecked.length) {
        const keepGroup = preferredGroup === 'footwear' || preferredGroup === 'apparel'
            ? preferredGroup
            : (apparelChecked.length >= footwearChecked.length ? 'apparel' : 'footwear');

        const clearInputs = keepGroup === 'footwear' ? apparelChecked : footwearChecked;
        clearInputs.forEach((input) => {
            input.checked = false;
        });

        if (keepGroup === 'footwear') {
            apparelChecked = [];
        } else {
            footwearChecked = [];
        }
    }

    const lockApparel = footwearChecked.length > 0;
    const lockFootwear = apparelChecked.length > 0;

    apparelInputs.forEach((input) => {
        input.disabled = lockApparel;
    });

    footwearInputs.forEach((input) => {
        input.disabled = lockFootwear;
    });

    adminSetSizeGroupBlockedState('admin-apparel-size-group', lockApparel);
    adminSetSizeGroupBlockedState('admin-footwear-size-group', lockFootwear);
}

function adminBindSizeExclusivity() {
    const apparelGrid = document.getElementById('admin-apparel-sizes-grid');
    const footwearGrid = document.getElementById('admin-footwear-sizes-grid');

    if (!apparelGrid || !footwearGrid) return;

    const onSizeChange = (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.name !== 'admin-sizes') return;

        const preferredGroup = target.closest('#admin-footwear-sizes-grid') ? 'footwear' : 'apparel';
        adminApplySizeGroupLocks(preferredGroup);
    };

    apparelGrid.addEventListener('change', onSizeChange);
    footwearGrid.addEventListener('change', onSizeChange);
}

function adminGetUrlListConfig(type) {
    return type === 'video'
        ? {
            listId: 'admin-video-urls-list',
            maxItems: ADMIN_MAX_VIDEOS,
            placeholder: 'https://example.com/video.mp4 or YouTube link'
        }
        : {
            listId: 'admin-image-urls-list',
            maxItems: ADMIN_MAX_IMAGES - 1,
            placeholder: 'https://example.com/image.jpg'
        };
}

function adminCollectUrlRows(type) {
    const config = adminGetUrlListConfig(type);
    const list = document.getElementById(config.listId);
    if (!list) return [];

    return Array.from(list.querySelectorAll('.admin-url-row input[type="text"]'))
        .map((input) => String(input.value || '').trim())
        .filter(Boolean);
}

function adminRenderUrlRows(type, values = []) {
    const config = adminGetUrlListConfig(type);
    const list = document.getElementById(config.listId);
    if (!list) return;

    list.innerHTML = '';

    values.slice(0, config.maxItems).forEach((value) => {
        adminAddUrlRow(type, value, true);
    });
}

function adminAddUrlRow(type, value = '', isSilent = false) {
    const config = adminGetUrlListConfig(type);
    const list = document.getElementById(config.listId);
    if (!list) return;

    const existingRows = list.querySelectorAll('.admin-url-row').length;
    if (existingRows >= config.maxItems) {
        if (!isSilent) {
            adminShowMessage(`Maximum ${type === 'video' ? ADMIN_MAX_VIDEOS : (ADMIN_MAX_IMAGES - 1)} ${type} URLs allowed.`, 'error');
        }
        return;
    }

    const row = document.createElement('div');
    row.className = 'admin-url-row';
    row.innerHTML = `
        <input type="text" value="${value}" placeholder="${config.placeholder}">
        <button type="button" class="admin-url-remove" aria-label="Remove ${type} URL"><i class="fas fa-times"></i></button>
    `;

    const removeBtn = row.querySelector('.admin-url-remove');
    removeBtn?.addEventListener('click', () => {
        row.remove();
    });

    list.appendChild(row);
}

function adminGetCurrentImageCount() {
    const primaryImage = String(document.getElementById('admin-image')?.value || '').trim();
    const additionalImages = adminCollectUrlRows('image').length;
    return (primaryImage ? 1 : 0) + additionalImages;
}

function adminGetCurrentVideoCount() {
    return adminCollectUrlRows('video').length;
}

function adminGetRemainingUploadSlots(type) {
    if (type === 'video') {
        return Math.max(0, ADMIN_MAX_VIDEOS - adminGetCurrentVideoCount());
    }

    return Math.max(0, ADMIN_MAX_IMAGES - adminGetCurrentImageCount());
}

function adminAppendUploadedImageUrls(uploadedUrls = []) {
    const primaryInput = document.getElementById('admin-image');
    if (!primaryInput) return;

    const existing = new Set(
        [
            String(primaryInput.value || '').trim(),
            ...adminCollectUrlRows('image')
        ]
            .map((value) => String(value || '').trim().toLowerCase())
            .filter(Boolean)
    );

    let queue = uploadedUrls
        .map(adminNormalizeImageUrl)
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .filter((value) => !existing.has(value.toLowerCase()));

    if (!String(primaryInput.value || '').trim() && queue.length) {
        const first = queue.shift();
        primaryInput.value = first;
        existing.add(first.toLowerCase());
    }

    queue.forEach((url) => {
        if (existing.has(url.toLowerCase())) return;
        adminAddUrlRow('image', url, true);
        existing.add(url.toLowerCase());
    });
}

function adminAppendUploadedVideoUrls(uploadedUrls = []) {
    const existing = new Set(
        adminCollectUrlRows('video')
            .map((value) => String(value || '').trim().toLowerCase())
            .filter(Boolean)
    );

    uploadedUrls
        .map(adminNormalizeVideoUrl)
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .forEach((url) => {
            if (existing.has(url.toLowerCase())) return;
            adminAddUrlRow('video', url, true);
            existing.add(url.toLowerCase());
        });
}

async function adminUploadSelectedMedia(type) {
    const input = document.getElementById(type === 'video' ? 'admin-video-files' : 'admin-image-files');
    const uploadBtn = document.getElementById(type === 'video' ? 'admin-upload-video-files' : 'admin-upload-image-files');

    if (!(input instanceof HTMLInputElement)) return;

    const selectedFiles = Array.from(input.files || []);
    if (!selectedFiles.length) {
        adminShowMessage(`Please choose ${type} file(s) first.`, 'error');
        return;
    }

    const remainingSlots = adminGetRemainingUploadSlots(type);
    if (remainingSlots <= 0) {
        const max = type === 'video' ? ADMIN_MAX_VIDEOS : ADMIN_MAX_IMAGES;
        adminShowMessage(`You already reached the max ${type} limit (${max}).`, 'error');
        return;
    }

    const filesToUpload = selectedFiles.slice(0, remainingSlots);

    const formData = new FormData();
    formData.append('mediaType', type);
    filesToUpload.forEach((file) => {
        formData.append('files', file);
    });

    const token = adminToken();
    const headers = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const originalButtonText = uploadBtn?.innerHTML || '';

    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    }

    try {
        const response = await fetch(`${window.getApiBaseUrl()}/uploads`, {
            method: 'POST',
            headers,
            body: formData
        });

        let responseBody = null;
        try {
            responseBody = await response.json();
        } catch (error) {
            responseBody = null;
        }

        if (!response.ok) {
            throw new Error(responseBody?.message || 'Upload failed.');
        }

        const uploadedUrls = (Array.isArray(responseBody?.files) ? responseBody.files : [])
            .map((item) => String(item?.url || '').trim())
            .filter(Boolean);

        if (type === 'video') {
            adminAppendUploadedVideoUrls(uploadedUrls);
        } else {
            adminAppendUploadedImageUrls(uploadedUrls);
        }

        const uploadedCount = uploadedUrls.length;
        const storageLabel = responseBody?.storage === 'supabase' ? 'Supabase' : 'local server';
        const truncatedCount = selectedFiles.length - filesToUpload.length;
        const truncatedMessage = truncatedCount > 0
            ? ` ${truncatedCount} file(s) were skipped due to media limits.`
            : '';

        adminShowMessage(`Uploaded ${uploadedCount} ${type} file(s) to ${storageLabel}.${truncatedMessage}`, 'success');
    } catch (error) {
        adminShowMessage(error.message || 'Upload failed.', 'error');
    } finally {
        input.value = '';

        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = originalButtonText;
        }
    }
}

function adminGetSettingArrayByKey(groupKey) {
    if (!adminCatalogSettings) {
        adminCatalogSettings = adminDeepClone(ADMIN_DEFAULT_SETTINGS);
    }

    switch (groupKey) {
        case 'categories':
            return adminCatalogSettings.categories;
        case 'apparelSizes':
            return adminCatalogSettings.sizes.apparel;
        case 'footwearSizes':
            return adminCatalogSettings.sizes.footwear;
        case 'colors':
            return adminCatalogSettings.colors;
        default:
            return [];
    }
}

function adminSetSettingArrayByKey(groupKey, nextValues) {
    if (!adminCatalogSettings) {
        adminCatalogSettings = adminDeepClone(ADMIN_DEFAULT_SETTINGS);
    }

    switch (groupKey) {
        case 'categories':
            adminCatalogSettings.categories = nextValues;
            break;
        case 'apparelSizes':
            adminCatalogSettings.sizes.apparel = nextValues;
            break;
        case 'footwearSizes':
            adminCatalogSettings.sizes.footwear = nextValues;
            break;
        case 'colors':
            adminCatalogSettings.colors = nextValues;
            break;
        default:
            break;
    }
}

function adminNormalizeSettingValue(groupKey, value) {
    if (groupKey === 'categories') return adminNormalizeCategoryValue(value);
    if (groupKey === 'colors') return adminNormalizeColorValue(value);
    return adminNormalizeSizeValue(value);
}

function adminSettingLabel(groupKey, value) {
    if (groupKey === 'categories') return adminCategoryLabel(value);
    return String(value || '').trim();
}

function adminSettingListId(groupKey) {
    switch (groupKey) {
        case 'categories':
            return 'admin-setting-category-list';
        case 'apparelSizes':
            return 'admin-setting-apparel-size-list';
        case 'footwearSizes':
            return 'admin-setting-footwear-size-list';
        case 'colors':
            return 'admin-setting-color-list';
        default:
            return '';
    }
}

function adminRenderSettingList(groupKey) {
    const listId = adminSettingListId(groupKey);
    const listEl = document.getElementById(listId);
    if (!listEl) return;

    const values = adminGetSettingArrayByKey(groupKey);

    listEl.innerHTML = values.map((value, index) => `
        <li class="admin-settings-item" data-setting-group="${groupKey}" data-setting-index="${index}">
            <span>${adminSettingLabel(groupKey, value)}</span>
            <div class="admin-settings-actions">
                <button type="button" class="admin-settings-action-btn" data-setting-action="edit" aria-label="Edit ${value}"><i class="fas fa-pen"></i></button>
                <button type="button" class="admin-settings-action-btn" data-setting-action="delete" aria-label="Delete ${value}"><i class="fas fa-trash"></i></button>
            </div>
        </li>
    `).join('');
}

function adminRenderAllSettingLists() {
    ['categories', 'apparelSizes', 'footwearSizes', 'colors'].forEach(adminRenderSettingList);
}

function adminRenderCatalogDependentInputs({ selectedCategory = '', selectedSizes = [], selectedColors = [] } = {}) {
    const safeSelectedSizes = adminResolveSingleSizeGroup(selectedSizes);
    adminRenderCategorySelect(selectedCategory);
    adminRenderProductOptionInputs({ selectedSizes: safeSelectedSizes, selectedColors });
}

function adminExtractSettingsPayload() {
    return {
        categories: adminGetSettingArrayByKey('categories'),
        sizes: {
            apparel: adminGetSettingArrayByKey('apparelSizes'),
            footwear: adminGetSettingArrayByKey('footwearSizes')
        },
        colors: adminGetSettingArrayByKey('colors')
    };
}

async function adminPersistSettings({ successMessage = 'Settings updated successfully.' } = {}) {
    const payload = adminExtractSettingsPayload();
    const updated = await adminRequest('/catalog-settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
    });

    adminCatalogSettings = adminSanitizeCatalogSettings(updated);
    adminRenderAllSettingLists();

    const selectedCategory = document.getElementById('admin-category')?.value || '';
    const selectedSizes = adminGetCheckedValues('admin-sizes');
    const selectedColors = adminGetCheckedValues('admin-colors');
    adminRenderCatalogDependentInputs({ selectedCategory, selectedSizes, selectedColors });

    localStorage.setItem('catalogSettingsUpdatedAt', String(Date.now()));

    if (typeof window.refreshCatalogSettingsFromServer === 'function') {
        await window.refreshCatalogSettingsFromServer({ silent: true });
    }

    adminShowSettingsMessage(successMessage, 'success');
}

async function adminHandleAddSettingValue(groupKey, rawValue) {
    const normalized = adminNormalizeSettingValue(groupKey, rawValue);
    if (!normalized) {
        adminShowSettingsMessage('Please enter a valid value.', 'error');
        return;
    }

    const current = adminGetSettingArrayByKey(groupKey);
    const exists = current.some((value) => adminNormalizeSettingValue(groupKey, value) === normalized);

    if (exists) {
        adminShowSettingsMessage('This value already exists.', 'error');
        return;
    }

    const next = [...current, normalized];
    adminSetSettingArrayByKey(groupKey, next);

    try {
        await adminPersistSettings({ successMessage: 'Setting added successfully.' });
    } catch (error) {
        adminShowSettingsMessage(error.message || 'Failed to add setting.', 'error');
    }
}

async function adminHandleEditSettingValue(groupKey, index) {
    const current = adminGetSettingArrayByKey(groupKey);
    const existing = current[index];
    if (existing === undefined) return;

    const replacementRaw = window.prompt(`Edit value for ${groupKey}:`, String(existing));
    if (replacementRaw === null) return;

    const normalized = adminNormalizeSettingValue(groupKey, replacementRaw);
    if (!normalized) {
        adminShowSettingsMessage('Please enter a valid value.', 'error');
        return;
    }

    const duplicate = current.some((value, i) => i !== index && adminNormalizeSettingValue(groupKey, value) === normalized);
    if (duplicate) {
        adminShowSettingsMessage('This value already exists.', 'error');
        return;
    }

    const next = [...current];
    next[index] = normalized;
    adminSetSettingArrayByKey(groupKey, next);

    try {
        await adminPersistSettings({ successMessage: 'Setting updated successfully.' });
    } catch (error) {
        adminShowSettingsMessage(error.message || 'Failed to update setting.', 'error');
    }
}

async function adminHandleDeleteSettingValue(groupKey, index) {
    const current = adminGetSettingArrayByKey(groupKey);
    const existing = current[index];
    if (existing === undefined) return;

    const ok = window.confirm(`Remove "${existing}" from ${groupKey}?`);
    if (!ok) return;

    const next = current.filter((_, i) => i !== index);
    adminSetSettingArrayByKey(groupKey, next);

    try {
        await adminPersistSettings({ successMessage: 'Setting removed successfully.' });
    } catch (error) {
        adminShowSettingsMessage(error.message || 'Failed to remove setting.', 'error');
    }
}

function adminBindSettingsControls() {
    const bindings = [
        { buttonId: 'admin-setting-category-add', inputId: 'admin-setting-category-input', groupKey: 'categories' },
        { buttonId: 'admin-setting-apparel-size-add', inputId: 'admin-setting-apparel-size-input', groupKey: 'apparelSizes' },
        { buttonId: 'admin-setting-footwear-size-add', inputId: 'admin-setting-footwear-size-input', groupKey: 'footwearSizes' },
        { buttonId: 'admin-setting-color-add', inputId: 'admin-setting-color-input', groupKey: 'colors' }
    ];

    bindings.forEach(({ buttonId, inputId, groupKey }) => {
        const button = document.getElementById(buttonId);
        const input = document.getElementById(inputId);

        const executeAdd = () => {
            const value = String(input?.value || '').trim();
            adminHandleAddSettingValue(groupKey, value);
            if (input) input.value = '';
        };

        button?.addEventListener('click', executeAdd);
        input?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                executeAdd();
            }
        });
    });

    const settingsPanel = document.getElementById('admin-settings-panel');
    settingsPanel?.addEventListener('click', (event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target) return;

        const actionBtn = target.closest('[data-setting-action]');
        if (!actionBtn) return;

        const item = actionBtn.closest('.admin-settings-item');
        if (!item) return;

        const groupKey = item.getAttribute('data-setting-group') || '';
        const index = Number(item.getAttribute('data-setting-index'));
        const action = actionBtn.getAttribute('data-setting-action');

        if (!groupKey || !Number.isFinite(index)) return;

        if (action === 'edit') {
            adminHandleEditSettingValue(groupKey, index);
        } else if (action === 'delete') {
            adminHandleDeleteSettingValue(groupKey, index);
        }
    });
}

function adminBindMediaUrlControls() {
    const addImageBtn = document.getElementById('admin-add-image-url');
    const addVideoBtn = document.getElementById('admin-add-video-url');
    const uploadImageBtn = document.getElementById('admin-upload-image-files');
    const uploadVideoBtn = document.getElementById('admin-upload-video-files');

    addImageBtn?.addEventListener('click', () => {
        adminAddUrlRow('image');
    });

    addVideoBtn?.addEventListener('click', () => {
        adminAddUrlRow('video');
    });

    uploadImageBtn?.addEventListener('click', () => {
        adminUploadSelectedMedia('image');
    });

    uploadVideoBtn?.addEventListener('click', () => {
        adminUploadSelectedMedia('video');
    });
}

async function loadAdminCatalogSettings({ silent = false } = {}) {
    const formSelections = adminReadCurrentFormSelections();

    try {
        const data = await window.apiRequest('/catalog-settings');
        adminCatalogSettings = adminSanitizeCatalogSettings(data);

        adminRenderAllSettingLists();

        if (adminEditingProduct) {
            adminRenderCatalogDependentInputs({
                selectedCategory: adminEditingProduct.category,
                selectedSizes: Array.isArray(adminEditingProduct.sizes) ? adminEditingProduct.sizes : [],
                selectedColors: Array.isArray(adminEditingProduct.colors) ? adminEditingProduct.colors : []
            });
        } else {
            adminRenderCatalogDependentInputs({
                selectedCategory: formSelections.selectedCategory,
                selectedSizes: formSelections.selectedSizes,
                selectedColors: formSelections.selectedColors
            });
        }

        if (!silent) {
            adminShowSettingsMessage('Settings loaded successfully.', 'info');
        }
    } catch (error) {
        if (!adminCatalogSettings) {
            adminCatalogSettings = adminDeepClone(ADMIN_DEFAULT_SETTINGS);
        }

        adminRenderAllSettingLists();
        adminRenderCatalogDependentInputs({
            selectedCategory: formSelections.selectedCategory,
            selectedSizes: formSelections.selectedSizes,
            selectedColors: formSelections.selectedColors
        });

        if (!silent) {
            adminShowSettingsMessage(error.message || 'Failed to load settings.', 'error');
        }
    }
}

async function loadAdminProducts({ silent = false } = {}) {
    const tbody = document.getElementById('admin-products-body');
    const shouldShowLoading = tbody && !silent && adminProducts.length === 0;
    if (shouldShowLoading) {
        tbody.innerHTML = '<tr><td colspan="6" class="admin-table-empty">Loading products...</td></tr>';
    }

    try {
        adminProducts = await window.apiRequest('/products');
        renderAdminProducts();
        renderAdminStats();
    } catch (error) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="admin-table-empty">${error.message}</td></tr>`;
        }
        adminShowMessage(error.message || 'Failed to load products.', 'error');
    }
}

function renderAdminStats() {
    const totalEl = document.getElementById('admin-total-products');
    const inStockEl = document.getElementById('admin-instock-products');

    const total = adminProducts.length;
    const inStock = adminProducts.filter((product) => product.inStock).length;

    if (totalEl) totalEl.textContent = String(total);
    if (inStockEl) inStockEl.textContent = String(inStock);
}

function renderAdminProducts() {
    const tbody = document.getElementById('admin-products-body');
    if (!tbody) return;

    const defaultImage = window.DEFAULT_PRODUCT_IMAGE || 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80';

    if (!adminProducts.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="admin-table-empty">No products found.</td></tr>';
        return;
    }

    tbody.innerHTML = adminProducts.map((product) => `
        <tr>
            <td>#${product.id}</td>
            <td>
                <div class="admin-product-cell">
                    <img src="${product.image || defaultImage}" alt="${product.name}" onerror="this.onerror=null;this.src='${defaultImage}'">
                    <div>
                        <strong>${product.name}</strong>
                        <small>${product.badge || 'No badge'}</small>
                    </div>
                </div>
            </td>
            <td class="admin-category-cell">${adminCategoryLabel(product.category)}</td>
            <td class="admin-price-cell">
                <span>${adminFormatCurrency(product.price)}</span>
                ${product.originalPrice ? `<small>${adminFormatCurrency(product.originalPrice)}</small>` : ''}
            </td>
            <td>
                <span class="admin-status ${product.inStock ? 'admin-status--ok' : 'admin-status--off'}">
                    ${product.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
            </td>
            <td>
                <div class="admin-row-actions">
                    <button class="btn btn-secondary" type="button" onclick="editProduct(${product.id})">Edit</button>
                    <button class="btn btn-primary" type="button" onclick="deleteProduct(${product.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function fetchLatestProductById(productId) {
    const latestProducts = await window.apiRequest('/products');
    if (!Array.isArray(latestProducts)) return null;
    return latestProducts.find((item) => Number(item.id) === Number(productId)) || null;
}

function adminBuildPayload({ isEdit = false } = {}) {
    const nameInput = document.getElementById('admin-name').value.trim();
    const categoryInput = adminNormalizeCategoryValue(document.getElementById('admin-category').value.trim());
    const priceInput = Number(document.getElementById('admin-price').value);
    const originalPriceRaw = document.getElementById('admin-original-price').value;
    const originalPriceInput = originalPriceRaw === '' ? null : Number(originalPriceRaw);
    const imageInput = adminNormalizeImageUrl(document.getElementById('admin-image').value.trim());
    const descriptionInput = document.getElementById('admin-description').value.trim();
    const ratingRaw = document.getElementById('admin-rating').value;
    const reviewsRaw = document.getElementById('admin-reviews').value;
    const badgeInput = document.getElementById('admin-badge').value.trim();
    const inStock = document.getElementById('admin-in-stock').checked;

    const hasApparelSelected = Boolean(document.querySelector('#admin-apparel-sizes-grid input[name="admin-sizes"]:checked'));
    const hasFootwearSelected = Boolean(document.querySelector('#admin-footwear-sizes-grid input[name="admin-sizes"]:checked'));
    const preferredSizeGroup = hasFootwearSelected && !hasApparelSelected
        ? 'footwear'
        : hasApparelSelected && !hasFootwearSelected
            ? 'apparel'
            : '';

    const selectedSizes = adminResolveSingleSizeGroup(
        adminGetCheckedValues('admin-sizes').map(adminNormalizeSizeValue),
        preferredSizeGroup
    );
    const selectedColors = adminGetCheckedValues('admin-colors').map(adminNormalizeColorValue);

    const additionalImageUrls = adminCollectUrlRows('image').map(adminNormalizeImageUrl).filter(Boolean);
    const videoUrls = adminCollectUrlRows('video').map(adminNormalizeVideoUrl).filter(Boolean);

    const base = isEdit && adminEditingProduct ? adminEditingProduct : {};

    const name = nameInput || String(base.name || '').trim();
    const category = categoryInput || adminNormalizeCategoryValue(base.category || '');
    const price = Number.isFinite(priceInput) ? priceInput : Number(base.price);

    const images = adminUnique(
        [imageInput, ...additionalImageUrls],
        (value) => String(value || '').trim().toLowerCase()
    ).map(adminNormalizeImageUrl).filter(Boolean).slice(0, ADMIN_MAX_IMAGES);

    const image = adminNormalizeImageUrl(images[0] || '');

    const videos = adminUnique(
        videoUrls,
        (value) => String(value || '').trim().toLowerCase()
    ).map(adminNormalizeVideoUrl).filter(Boolean).slice(0, ADMIN_MAX_VIDEOS);

    const originalPrice = originalPriceRaw === ''
        ? (isEdit ? (base.originalPrice ?? null) : null)
        : (Number.isFinite(originalPriceInput) ? originalPriceInput : (isEdit ? (base.originalPrice ?? null) : null));

    const sizes = selectedSizes;
    const colors = selectedColors;

    const parsedRating = ratingRaw === '' ? Number(base.rating ?? 0) : Number(ratingRaw);
    const parsedReviews = reviewsRaw === '' ? Number(base.reviews ?? 0) : Number(reviewsRaw);

    const rating = Number.isFinite(parsedRating) ? Math.round(parsedRating * 10) / 10 : 0;
    const reviews = Number.isFinite(parsedReviews) ? Math.max(0, Math.round(parsedReviews)) : 0;

    const badge = badgeInput === ''
        ? (isEdit ? (base.badge ?? null) : null)
        : badgeInput;

    return {
        name,
        category,
        price,
        originalPrice,
        image,
        images,
        video: videos[0] || '',
        videos,
        description: descriptionInput || String(base.description || '').trim(),
        sizes,
        colors,
        rating,
        reviews,
        badge,
        inStock
    };
}

function adminValidatePayload(payload) {
    if (!payload.name || !payload.category || !payload.image) {
        return 'Please fill product name, category, and primary image URL.';
    }

    if (!Array.isArray(payload.images) || payload.images.length === 0) {
        return 'Please provide at least one image URL.';
    }

    if (payload.images.length > ADMIN_MAX_IMAGES) {
        return `Maximum ${ADMIN_MAX_IMAGES} images are allowed per product.`;
    }

    if (Array.isArray(payload.videos) && payload.videos.length > ADMIN_MAX_VIDEOS) {
        return `Maximum ${ADMIN_MAX_VIDEOS} videos are allowed per product.`;
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
        return 'Please enter a valid non-negative price in INR.';
    }

    if (payload.originalPrice !== null && (!Number.isFinite(payload.originalPrice) || payload.originalPrice < 0)) {
        return 'Please enter a valid original price, or leave it empty.';
    }

    if (!Number.isFinite(payload.rating) || payload.rating < 0 || payload.rating > 5) {
        return 'Rating must be between 0 and 5.';
    }

    if (!Number.isFinite(payload.reviews) || payload.reviews < 0) {
        return 'Reviews count must be a non-negative number.';
    }

    if (!Array.isArray(payload.sizes) || payload.sizes.length === 0) {
        return 'Please select at least one size.';
    }

    const normalizedSizes = payload.sizes.map(adminNormalizeSizeValue).filter(Boolean);
    const hasFootwearSizes = normalizedSizes.some((size) => adminIsFootwearSizeToken(size));
    const hasApparelSizes = normalizedSizes.some((size) => !adminIsFootwearSizeToken(size));

    if (hasFootwearSizes && hasApparelSizes) {
        return 'Please select either apparel sizes or footwear sizes, not both.';
    }

    if (!Array.isArray(payload.colors) || payload.colors.length === 0) {
        return 'Please select at least one color.';
    }

    return null;
}

function resetAdminForm() {
    const form = document.getElementById('admin-product-form');
    const editId = document.getElementById('admin-edit-id');
    const title = document.getElementById('admin-form-title');
    const saveBtn = document.getElementById('admin-save-btn');
    const cancelBtn = document.getElementById('admin-cancel-btn');

    form?.reset();
    if (editId) editId.value = '';

    adminEditingProduct = null;
    const inStockCheckbox = document.getElementById('admin-in-stock');
    if (inStockCheckbox) inStockCheckbox.checked = true;

    adminRenderCatalogDependentInputs({
        selectedSizes: [],
        selectedColors: []
    });

    adminRenderUrlRows('image', []);
    adminRenderUrlRows('video', []);

    if (title) title.textContent = 'Add Product';
    if (saveBtn) saveBtn.textContent = 'Add Product';
    if (cancelBtn) cancelBtn.style.display = 'none';

    adminClearMessages();
}

function fillAdminForm(product) {
    adminEditingProduct = { ...product };

    document.getElementById('admin-edit-id').value = String(product.id);
    document.getElementById('admin-name').value = product.name || '';
    document.getElementById('admin-price').value = Number(product.price || 0);
    document.getElementById('admin-original-price').value = product.originalPrice ?? '';
    document.getElementById('admin-image').value = product.image || '';
    document.getElementById('admin-description').value = product.description || '';

    const ratingValue = Number(product.rating);
    const reviewsValue = Number(product.reviews);
    document.getElementById('admin-rating').value = Number.isFinite(ratingValue) ? ratingValue : '';
    document.getElementById('admin-reviews').value = Number.isFinite(reviewsValue) ? reviewsValue : '';

    document.getElementById('admin-badge').value = product.badge || '';
    document.getElementById('admin-in-stock').checked = Boolean(product.inStock);

    const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    const additionalImages = images.filter((url) => String(url || '').trim() && String(url || '').trim() !== String(product.image || '').trim());
    adminRenderUrlRows('image', additionalImages);

    const videos = Array.isArray(product.videos) && product.videos.length
        ? product.videos.filter(Boolean)
        : (product.video ? [product.video] : []);
    adminRenderUrlRows('video', videos);

    adminRenderCatalogDependentInputs({
        selectedCategory: product.category || '',
        selectedSizes: Array.isArray(product.sizes) ? product.sizes : [],
        selectedColors: Array.isArray(product.colors) ? product.colors : []
    });

    document.getElementById('admin-form-title').textContent = `Edit Product #${product.id}`;
    document.getElementById('admin-save-btn').textContent = 'Update Product';
    document.getElementById('admin-cancel-btn').style.display = 'inline-flex';

    adminShowMessage(`Editing ${product.name}`, 'info');
}

async function handleAdminSubmit(event) {
    event.preventDefault();

    const saveBtn = document.getElementById('admin-save-btn');
    const editId = document.getElementById('admin-edit-id').value;
    const isEdit = Boolean(editId);

    const payload = adminBuildPayload({ isEdit });
    const validationError = adminValidatePayload(payload);

    if (validationError) {
        adminShowMessage(validationError, 'error');
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = isEdit ? 'Updating...' : 'Adding...';
    }

    try {
        if (isEdit) {
            await adminRequest(`/products/${editId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            adminShowMessage('Product updated successfully.', 'success');
        } else {
            await adminRequest('/products', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            adminShowMessage('Product added successfully.', 'success');
        }

        localStorage.setItem('productsUpdatedAt', String(Date.now()));

        if (typeof window.refreshProductsFromServer === 'function') {
            await window.refreshProductsFromServer();
        }

        await loadAdminProducts({ silent: true });
        await loadAdminCatalogSettings({ silent: true });
        resetAdminForm();
    } catch (error) {
        adminShowMessage(error.message || 'Request failed.', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = document.getElementById('admin-edit-id').value ? 'Update Product' : 'Add Product';
        }
    }
}

async function editProduct(productId) {
    let product = adminProducts.find((item) => Number(item.id) === Number(productId));
    if (!product) {
        adminShowMessage('Product not found.', 'error');
        return;
    }

    fillAdminForm(product);
    document.getElementById('admin-name')?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
        const latest = await fetchLatestProductById(productId);
        if (latest && Number(latest.id) === Number(productId)) {
            product = latest;
            fillAdminForm(product);
        }
    } catch (error) {
        // keep cached data as fallback
    }
}

async function deleteProduct(productId) {
    const product = adminProducts.find((item) => Number(item.id) === Number(productId));
    const label = product?.name ? `${product.name} (#${productId})` : `product #${productId}`;

    const ok = window.confirm(`Delete ${label}? This action cannot be undone.`);
    if (!ok) return;

    try {
        await adminRequest(`/products/${productId}`, { method: 'DELETE' });
        adminShowMessage('Product deleted successfully.', 'success');

        localStorage.setItem('productsUpdatedAt', String(Date.now()));

        if (typeof window.refreshProductsFromServer === 'function') {
            await window.refreshProductsFromServer();
        }

        await loadAdminProducts({ silent: true });
    } catch (error) {
        adminShowMessage(error.message || 'Delete failed.', 'error');
    }
}

function startAdminRealtimeSync() {
    window.addEventListener('storage', (event) => {
        if (event.key === 'productsUpdatedAt') {
            loadAdminProducts({ silent: true });
        }

        if (event.key === 'catalogSettingsUpdatedAt') {
            loadAdminCatalogSettings({ silent: true });
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadAdminProducts({ silent: true });
            loadAdminCatalogSettings({ silent: true });
        }
    });
}

function guardAdminPage() {
    if (!adminIsLoggedIn()) {
        window.location.href = 'login.html?redirect=admin.html';
        return false;
    }

    if (adminRole() !== 'admin') {
        alert('Admin access only.');
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

async function initAdminPage() {
    if (!guardAdminPage()) return;

    initAdminTabs();
    adminSetActiveTab('products');

    const form = document.getElementById('admin-product-form');
    const cancelBtn = document.getElementById('admin-cancel-btn');

    form?.addEventListener('submit', handleAdminSubmit);
    cancelBtn?.addEventListener('click', resetAdminForm);

    adminBindSettingsControls();
    adminBindMediaUrlControls();
    adminBindSizeExclusivity();

    await loadAdminCatalogSettings({ silent: true });
    resetAdminForm();
    await loadAdminProducts({ silent: true });

    startAdminRealtimeSync();
}

window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

document.addEventListener('DOMContentLoaded', function () {
    if (window.location.pathname.includes('admin.html')) {
        initAdminPage();
    }
});