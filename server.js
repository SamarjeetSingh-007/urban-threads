require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-secret';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@urbanthreads.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345';

const SUPABASE_MODE = (process.env.USE_SUPABASE || 'auto').toLowerCase();
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const HAS_SUPABASE_KEYS = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const USE_SUPABASE = SUPABASE_MODE === 'true'
    ? HAS_SUPABASE_KEYS
    : SUPABASE_MODE === 'false'
        ? false
        : HAS_SUPABASE_KEYS;

const supabase = HAS_SUPABASE_KEYS
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

let SUPABASE_PRODUCTS_HAS_VIDEO_COLUMN = true;
let SUPABASE_PRODUCTS_HAS_VIDEOS_COLUMN = true;

const DATA_DIR = path.join(__dirname, 'backend', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const FRONTEND_DIR = path.join(__dirname, 'frontend');
const FRONTEND_PRODUCTS_PATH = path.join(FRONTEND_DIR, 'js', 'products.js');
const UPLOADS_ROOT_DIR = path.join(__dirname, 'uploads', 'products');
const LOCAL_UPLOAD_IMAGE_DIR = path.join(UPLOADS_ROOT_DIR, 'images');
const LOCAL_UPLOAD_VIDEO_DIR = path.join(UPLOADS_ROOT_DIR, 'videos');
const SUPABASE_MEDIA_BUCKET = String(process.env.SUPABASE_MEDIA_BUCKET || 'urban-threads-media').trim() || 'urban-threads-media';
const SUPABASE_STATE_BUCKET = String(process.env.SUPABASE_STATE_BUCKET || 'urban-threads-state').trim() || 'urban-threads-state';
const SUPABASE_CATALOG_SETTINGS_OBJECT = 'settings/catalog-settings.json';

const IMAGE_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;
const VIDEO_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
const MAX_UPLOAD_FILES = 8;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: VIDEO_UPLOAD_MAX_BYTES,
        files: MAX_UPLOAD_FILES
    }
});

const DEFAULT_CATALOG_SETTINGS = {
    categories: ['hoodies', 'tshirts', 'sneakers', 'jackets'],
    sizes: {
        apparel: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        footwear: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12']
    },
    colors: ['Black', 'White', 'Grey', 'Navy', 'Olive', 'Khaki', 'Burgundy', 'Red', 'Blue']
};

app.use(cors());
app.use(express.json());

function isTableMissingError(error) {
    const message = String(error?.message || '').toLowerCase();
    return error?.code === '42P01' || message.includes('relation') && message.includes('does not exist');
}

function wrapSupabaseError(prefix, error) {
    if (isTableMissingError(error)) {
        return new Error(`${prefix} Supabase tables are missing. Run backend/sql/supabase-schema.sql in the Supabase SQL editor.`);
    }

    return new Error(`${prefix} ${error?.message || 'Unknown Supabase error.'}`);
}

function wrapSupabaseStateError(prefix, error) {
    if (isTableMissingError(error)) {
        return new Error(`${prefix} Supabase relational state tables are missing. Run backend/sql/supabase-relational-state.sql in the Supabase SQL editor.`);
    }

    return new Error(`${prefix} ${error?.message || 'Unknown Supabase state error.'}`);
}

function isMissingColumnError(error, columnName) {
    const message = String(error?.message || '').toLowerCase();
    const normalizedColumn = String(columnName || '').toLowerCase();
    const mentionsColumn = message.includes(`'${normalizedColumn}'`)
        || message.includes(`.${normalizedColumn}`)
        || message.includes(` ${normalizedColumn} `)
        || message.endsWith(` ${normalizedColumn}`);

    if (!mentionsColumn) return false;

    return (
        (message.includes('could not find') && message.includes('column'))
        || (message.includes('column') && message.includes('does not exist'))
        || message.includes('undefined column')
    );
}

function normalizeStringArray(value, fallback = []) {
    if (Array.isArray(value)) {
        return value.map(item => String(item));
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map(item => String(item));
            }
        } catch (error) {
            return fallback;
        }
    }

    return fallback;
}

function uniqueBy(values, normalizer) {
    const seen = new Set();
    const result = [];

    values.forEach((item) => {
        const value = String(item || '').trim();
        if (!value) return;

        const key = normalizer(value);
        if (!key || seen.has(key)) return;

        seen.add(key);
        result.push(value);
    });

    return result;
}

function normalizeCategoryValue(value) {
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

function normalizeSizeValue(value) {
    return String(value || '').trim().toUpperCase();
}

function normalizeColorValue(value) {
    const lowered = String(value || '').trim().toLowerCase();
    if (!lowered) return '';

    return lowered
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function isFootwearSizeToken(value) {
    const token = String(value || '').trim();
    return /^\d+(\.\d+)?$/.test(token);
}

function sanitizeSizeSelection(values = [], fallback = ['M', 'L', 'XL']) {
    const normalized = uniqueBy(
        normalizeStringArray(values, fallback),
        normalizeSizeValue
    ).map(normalizeSizeValue).filter(Boolean);

    const hasFootwear = normalized.some((size) => isFootwearSizeToken(size));
    const hasApparel = normalized.some((size) => !isFootwearSizeToken(size));

    return {
        values: normalized,
        hasFootwear,
        hasApparel,
        hasMixed: hasFootwear && hasApparel
    };
}

function extractUnsplashPhotoId(inputUrl) {
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

function normalizeImageUrl(value) {
    const input = String(value || '').trim();
    if (!input) return '';

    if (input.startsWith('//')) {
        return `https:${input}`;
    }

    const unsplashPhotoId = extractUnsplashPhotoId(input);
    if (unsplashPhotoId) {
        return `https://source.unsplash.com/${unsplashPhotoId}/1200x1600`;
    }

    return input;
}

function normalizeVideoUrl(value) {
    const input = String(value || '').trim();
    if (!input) return '';

    if (input.startsWith('//')) {
        return `https:${input}`;
    }

    return input;
}

function normalizeProductMedia(input = {}) {
    const source = input && typeof input === 'object' ? input : {};

    const normalizedImages = uniqueBy(
        normalizeStringArray(source.images, [String(source.image || '').trim()])
            .map((value) => normalizeImageUrl(value))
            .filter(Boolean),
        (value) => String(value || '').trim().toLowerCase()
    );

    const primaryImage = normalizeImageUrl(source.image || normalizedImages[0] || '');
    if (primaryImage && !normalizedImages.length) {
        normalizedImages.push(primaryImage);
    }

    const normalizedVideos = uniqueBy(
        normalizeStringArray(source.videos, String(source.video || '').trim() ? [String(source.video || '').trim()] : [])
            .map((value) => normalizeVideoUrl(value))
            .filter(Boolean),
        (value) => String(value || '').trim().toLowerCase()
    ).slice(0, 3);

    return {
        ...source,
        image: primaryImage,
        images: normalizedImages,
        video: normalizedVideos[0] || '',
        videos: normalizedVideos
    };
}

function ensureLocalUploadDirs() {
    fs.mkdirSync(LOCAL_UPLOAD_IMAGE_DIR, { recursive: true });
    fs.mkdirSync(LOCAL_UPLOAD_VIDEO_DIR, { recursive: true });
}

function getSafeUploadExtension(file, mediaType) {
    const fromName = String(path.extname(file?.originalname || '') || '').toLowerCase();
    if (/^\.[a-z0-9]{1,8}$/.test(fromName)) {
        return fromName;
    }

    const mime = String(file?.mimetype || '').toLowerCase();

    if (mediaType === 'image') {
        if (mime.includes('png')) return '.png';
        if (mime.includes('webp')) return '.webp';
        if (mime.includes('gif')) return '.gif';
        if (mime.includes('svg')) return '.svg';
        return '.jpg';
    }

    if (mime.includes('quicktime')) return '.mov';
    if (mime.includes('webm')) return '.webm';
    if (mime.includes('ogg')) return '.ogv';
    return '.mp4';
}

function buildUniqueUploadName(file, mediaType) {
    const suffix = crypto.randomBytes(8).toString('hex');
    const extension = getSafeUploadExtension(file, mediaType);
    return `${Date.now()}-${suffix}${extension}`;
}

async function persistUploadFile(file, mediaType) {
    const folder = mediaType === 'video' ? 'videos' : 'images';
    const fileName = buildUniqueUploadName(file, mediaType);

    if (USE_SUPABASE) {
        const objectPath = `products/${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(SUPABASE_MEDIA_BUCKET)
            .upload(objectPath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) {
            throw wrapSupabaseError('Failed to upload media to Supabase Storage.', uploadError);
        }

        const { data } = supabase.storage
            .from(SUPABASE_MEDIA_BUCKET)
            .getPublicUrl(objectPath);

        if (!data?.publicUrl) {
            throw new Error('Could not generate public URL for uploaded file.');
        }

        return data.publicUrl;
    }

    ensureLocalUploadDirs();

    const relativePath = path.posix.join('uploads', 'products', folder, fileName);
    const absolutePath = path.join(__dirname, relativePath);
    fs.writeFileSync(absolutePath, file.buffer);
    return `/${relativePath}`;
}

async function ensureSupabaseMediaBucket() {
    if (!USE_SUPABASE) return;

    const { error: bucketError } = await supabase.storage.getBucket(SUPABASE_MEDIA_BUCKET);
    if (!bucketError) return;

    const errorMessage = String(bucketError?.message || '').toLowerCase();
    const isMissingBucket = Number(bucketError?.status || bucketError?.statusCode || 0) === 404
        || errorMessage.includes('not found')
        || errorMessage.includes('does not exist');

    if (!isMissingBucket) {
        throw wrapSupabaseError('Failed to read Supabase storage bucket.', bucketError);
    }

    const { error: createError } = await supabase.storage.createBucket(SUPABASE_MEDIA_BUCKET, {
        public: true,
        fileSizeLimit: VIDEO_UPLOAD_MAX_BYTES,
        allowedMimeTypes: ['image/*', 'video/*']
    });

    if (createError) {
        const createMessage = String(createError?.message || '').toLowerCase();
        if (!createMessage.includes('already exists')) {
            throw wrapSupabaseError('Failed to create Supabase storage bucket.', createError);
        }
    }
}

function isSupabaseStorageObjectMissingError(error) {
    const message = String(error?.message || '').toLowerCase();
    const status = Number(error?.status || error?.statusCode || 0);
    return status === 404
        || message.includes('not found')
        || message.includes('does not exist')
        || message.includes('no such file');
}

async function ensureSupabaseStateBucket() {
    if (!USE_SUPABASE) return;

    const { error: bucketError } = await supabase.storage.getBucket(SUPABASE_STATE_BUCKET);
    if (!bucketError) return;

    const errorMessage = String(bucketError?.message || '').toLowerCase();
    const isMissingBucket = Number(bucketError?.status || bucketError?.statusCode || 0) === 404
        || errorMessage.includes('not found')
        || errorMessage.includes('does not exist');

    if (!isMissingBucket) {
        throw wrapSupabaseError('Failed to read Supabase state bucket.', bucketError);
    }

    const { error: createError } = await supabase.storage.createBucket(SUPABASE_STATE_BUCKET, {
        public: false,
        fileSizeLimit: 2 * 1024 * 1024,
        allowedMimeTypes: ['application/json']
    });

    if (createError) {
        const createMessage = String(createError?.message || '').toLowerCase();
        if (!createMessage.includes('already exists')) {
            throw wrapSupabaseError('Failed to create Supabase state bucket.', createError);
        }
    }
}

async function readSupabaseStateJsonObject(objectPath, fallback = {}) {
    const { data, error } = await supabase.storage
        .from(SUPABASE_STATE_BUCKET)
        .download(objectPath);

    if (error) {
        if (isSupabaseStorageObjectMissingError(error)) {
            return fallback;
        }

        throw wrapSupabaseError('Failed to read Supabase state object.', error);
    }

    try {
        const text = await data.text();
        if (!text.trim()) {
            return fallback;
        }

        return JSON.parse(text);
    } catch (parseError) {
        return fallback;
    }
}

async function writeSupabaseStateJsonObject(objectPath, payload) {
    const body = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');

    const { error } = await supabase.storage
        .from(SUPABASE_STATE_BUCKET)
        .upload(objectPath, body, {
            contentType: 'application/json',
            upsert: true
        });

    if (error) {
        throw wrapSupabaseError('Failed to write Supabase state object.', error);
    }
}

function deriveCatalogSettingsFromProducts(products = []) {
    const categories = new Set();
    const apparelSizes = new Set();
    const footwearSizes = new Set();
    const colors = new Set();

    (Array.isArray(products) ? products : []).forEach((product) => {
        const category = normalizeCategoryValue(product?.category);
        if (category) categories.add(category);

        const sizeValues = normalizeStringArray(product?.sizes, []);
        sizeValues.forEach((size) => {
            const normalized = normalizeSizeValue(size);
            if (!normalized) return;

            if (isFootwearSizeToken(normalized)) {
                footwearSizes.add(normalized);
            } else {
                apparelSizes.add(normalized);
            }
        });

        const colorValues = normalizeStringArray(product?.colors, []);
        colorValues.forEach((color) => {
            const normalized = normalizeColorValue(color);
            if (normalized) colors.add(normalized);
        });
    });

    return {
        categories: Array.from(categories),
        sizes: {
            apparel: Array.from(apparelSizes),
            footwear: Array.from(footwearSizes)
        },
        colors: Array.from(colors)
    };
}

function normalizeCatalogSettings(input = {}, products = []) {
    const fromProducts = deriveCatalogSettingsFromProducts(products);
    const sourceUpdatedAt = String(input?.updatedAt || '');

    const categories = uniqueBy(
        [
            ...DEFAULT_CATALOG_SETTINGS.categories,
            ...(fromProducts.categories || []),
            ...normalizeStringArray(input.categories, [])
        ],
        normalizeCategoryValue
    ).map(normalizeCategoryValue).filter(Boolean);

    const apparelSizes = uniqueBy(
        [
            ...DEFAULT_CATALOG_SETTINGS.sizes.apparel,
            ...(fromProducts.sizes?.apparel || []),
            ...normalizeStringArray(input?.sizes?.apparel, [])
        ],
        normalizeSizeValue
    ).map(normalizeSizeValue).filter(Boolean);

    const footwearSizes = uniqueBy(
        [
            ...DEFAULT_CATALOG_SETTINGS.sizes.footwear,
            ...(fromProducts.sizes?.footwear || []),
            ...normalizeStringArray(input?.sizes?.footwear, [])
        ],
        normalizeSizeValue
    ).map(normalizeSizeValue).filter(Boolean);

    const colors = uniqueBy(
        [
            ...DEFAULT_CATALOG_SETTINGS.colors,
            ...(fromProducts.colors || []),
            ...normalizeStringArray(input.colors, [])
        ],
        normalizeColorValue
    ).map(normalizeColorValue).filter(Boolean);

    return {
        categories,
        sizes: {
            apparel: apparelSizes,
            footwear: footwearSizes
        },
        colors,
        updatedAt: sourceUpdatedAt || new Date().toISOString()
    };
}

function mergeCatalogSettingsWithProduct(existingSettings = {}, product = {}) {
    const category = normalizeCategoryValue(product.category);
    const sizeValues = normalizeStringArray(product.sizes, []);
    const colorValues = normalizeStringArray(product.colors, []);

    const mergedInput = {
        categories: [
            ...normalizeStringArray(existingSettings.categories, []),
            category
        ].filter(Boolean),
        sizes: {
            apparel: [
                ...normalizeStringArray(existingSettings?.sizes?.apparel, []),
                ...sizeValues.filter((size) => !isFootwearSizeToken(size))
            ],
            footwear: [
                ...normalizeStringArray(existingSettings?.sizes?.footwear, []),
                ...sizeValues.filter((size) => isFootwearSizeToken(size))
            ]
        },
        colors: [
            ...normalizeStringArray(existingSettings.colors, []),
            ...colorValues
        ]
    };

    const merged = normalizeCatalogSettings(mergedInput, []);
    merged.updatedAt = new Date().toISOString();
    return merged;
}

function ensureDbMeta(db) {
    if (!db.meta || typeof db.meta !== 'object') {
        db.meta = {};
    }

    const now = new Date().toISOString();
    if (!db.meta.productsUpdatedAt) {
        db.meta.productsUpdatedAt = now;
    }

    if (!db.meta.catalogSettingsUpdatedAt) {
        db.meta.catalogSettingsUpdatedAt = now;
    }
}

function touchDbMeta(db, key) {
    ensureDbMeta(db);
    db.meta[key] = new Date().toISOString();
}

function readSeedProductsFromFrontend() {
    try {
        const source = fs.readFileSync(FRONTEND_PRODUCTS_PATH, 'utf8');
        const match = source.match(/const\s+(?:fallbackProducts|products)\s*=\s*(\[[\s\S]*?\]);/);

        if (!match) return [];

        const parsed = Function(`"use strict"; return (${match[1]});`)();
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Could not read frontend seed products:', error.message);
        return [];
    }
}

function ensureDatabase() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_PATH)) {
        const seedProducts = readSeedProductsFromFrontend();
        const catalogSettings = normalizeCatalogSettings({}, seedProducts);
        const now = new Date().toISOString();
        const initialDb = {
            users: [],
            products: seedProducts,
            catalogSettings,
            userState: {},
            meta: {
                productsUpdatedAt: now,
                catalogSettingsUpdatedAt: now
            }
        };

        fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), 'utf8');
        return;
    }

    try {
        const existingDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const normalizedDb = {
            users: Array.isArray(existingDb.users) ? existingDb.users : [],
            products: Array.isArray(existingDb.products) ? existingDb.products : [],
            catalogSettings: existingDb.catalogSettings && typeof existingDb.catalogSettings === 'object'
                ? existingDb.catalogSettings
                : {},
            userState: existingDb.userState && typeof existingDb.userState === 'object'
                ? existingDb.userState
                : {},
            meta: existingDb.meta && typeof existingDb.meta === 'object'
                ? existingDb.meta
                : {}
        };

        if (normalizedDb.products.length === 0) {
            const seedProducts = readSeedProductsFromFrontend();
            if (seedProducts.length > 0) {
                normalizedDb.products = seedProducts;
            }
        }

        normalizedDb.catalogSettings = normalizeCatalogSettings(normalizedDb.catalogSettings, normalizedDb.products);
        ensureDbMeta(normalizedDb);

        fs.writeFileSync(DB_PATH, JSON.stringify(normalizedDb, null, 2), 'utf8');
    } catch (error) {
        const seedProducts = readSeedProductsFromFrontend();
        const catalogSettings = normalizeCatalogSettings({}, seedProducts);
        const now = new Date().toISOString();
        fs.writeFileSync(DB_PATH, JSON.stringify({
            users: [],
            products: seedProducts,
            catalogSettings,
            userState: {},
            meta: {
                productsUpdatedAt: now,
                catalogSettingsUpdatedAt: now
            }
        }, null, 2), 'utf8');
    }
}

function readDb() {
    ensureDatabase();
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function getUserStateObjectPath(userId) {
    return `users/${Number(userId) || 0}/state.json`;
}

function sanitizeWishlistIds(ids = []) {
    const seen = new Set();
    const next = [];

    normalizeStringArray(ids, [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
        .forEach((id) => {
            if (seen.has(id)) return;
            seen.add(id);
            next.push(id);
        });

    return next;
}

function sanitizeCartItems(items = []) {
    if (!Array.isArray(items)) return [];

    const merged = new Map();

    items.forEach((rawItem) => {
        if (!rawItem || typeof rawItem !== 'object') return;

        const id = Number(rawItem.id);
        const quantity = Math.max(1, Math.round(Number(rawItem.quantity || 1)));
        const size = String(rawItem.size || 'M').trim() || 'M';
        const color = String(rawItem.color || 'Black').trim() || 'Black';

        if (!Number.isFinite(id) || id <= 0) return;

        const key = `${id}::${size}::${color}`;
        const existing = merged.get(key);

        if (existing) {
            existing.quantity += quantity;
            return;
        }

        merged.set(key, {
            id,
            name: String(rawItem.name || '').trim(),
            price: Number.isFinite(Number(rawItem.price)) ? Number(rawItem.price) : 0,
            image: String(rawItem.image || '').trim(),
            size,
            color,
            quantity
        });
    });

    return Array.from(merged.values()).slice(0, 100);
}

function mergeCartItems(existing = [], incoming = []) {
    return sanitizeCartItems([...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]);
}

function normalizeUserStatePayload(payload = {}) {
    return {
        cart: sanitizeCartItems(payload.cart || []),
        wishlist: sanitizeWishlistIds(payload.wishlist || []),
        updatedAt: String(payload.updatedAt || new Date().toISOString())
    };
}

async function getUserState(userId) {
    const safeUserId = Number(userId);
    if (!Number.isFinite(safeUserId) || safeUserId <= 0) {
        return normalizeUserStatePayload({});
    }

    if (USE_SUPABASE) {
        const [cartResult, wishlistResult] = await Promise.all([
            supabase
                .from('user_cart_items')
                .select('product_id,name,price,image,size,color,quantity,updated_at,created_at')
                .eq('user_id', safeUserId)
                .order('id', { ascending: true }),
            supabase
                .from('user_wishlist_items')
                .select('product_id,created_at')
                .eq('user_id', safeUserId)
                .order('id', { ascending: true })
        ]);

        if (cartResult.error) {
            throw wrapSupabaseStateError('Failed to read cart items from Supabase.', cartResult.error);
        }

        if (wishlistResult.error) {
            throw wrapSupabaseStateError('Failed to read wishlist items from Supabase.', wishlistResult.error);
        }

        const cart = sanitizeCartItems((cartResult.data || []).map((row) => ({
            id: Number(row.product_id),
            name: String(row.name || '').trim(),
            price: Number(row.price || 0),
            image: String(row.image || '').trim(),
            size: String(row.size || 'M').trim() || 'M',
            color: String(row.color || 'Black').trim() || 'Black',
            quantity: Number(row.quantity || 1)
        })));

        const wishlist = sanitizeWishlistIds((wishlistResult.data || []).map((row) => Number(row.product_id)));

        const timestamps = [
            ...(cartResult.data || []).map((row) => String(row.updated_at || row.created_at || '')),
            ...(wishlistResult.data || []).map((row) => String(row.created_at || ''))
        ].filter(Boolean);

        const updatedAt = timestamps.length
            ? timestamps.sort().at(-1)
            : new Date().toISOString();

        return normalizeUserStatePayload({ cart, wishlist, updatedAt });
    }

    const db = readDb();
    if (!db.userState || typeof db.userState !== 'object') {
        db.userState = {};
    }

    const stored = db.userState[String(safeUserId)] || {};
    const normalized = normalizeUserStatePayload(stored);

    db.userState[String(safeUserId)] = normalized;
    writeDb(db);
    return normalized;
}

async function writeUserState(userId, payload = {}) {
    const safeUserId = Number(userId);
    if (!Number.isFinite(safeUserId) || safeUserId <= 0) {
        const err = new Error('Invalid user id.');
        err.status = 400;
        throw err;
    }

    const normalized = normalizeUserStatePayload({
        ...payload,
        updatedAt: new Date().toISOString()
    });

    if (USE_SUPABASE) {
        const deleteCartResult = await supabase
            .from('user_cart_items')
            .delete()
            .eq('user_id', safeUserId);

        if (deleteCartResult.error) {
            throw wrapSupabaseStateError('Failed to clear existing cart items in Supabase.', deleteCartResult.error);
        }

        if (normalized.cart.length) {
            const cartRows = normalized.cart.map((item) => ({
                user_id: safeUserId,
                product_id: Number(item.id),
                name: String(item.name || '').trim(),
                price: Number(item.price || 0),
                image: String(item.image || '').trim(),
                size: String(item.size || 'M').trim() || 'M',
                color: String(item.color || 'Black').trim() || 'Black',
                quantity: Math.max(1, Math.round(Number(item.quantity || 1)))
            }));

            const insertCartResult = await supabase
                .from('user_cart_items')
                .insert(cartRows);

            if (insertCartResult.error) {
                throw wrapSupabaseStateError('Failed to write cart items to Supabase.', insertCartResult.error);
            }
        }

        const deleteWishlistResult = await supabase
            .from('user_wishlist_items')
            .delete()
            .eq('user_id', safeUserId);

        if (deleteWishlistResult.error) {
            throw wrapSupabaseStateError('Failed to clear existing wishlist items in Supabase.', deleteWishlistResult.error);
        }

        if (normalized.wishlist.length) {
            const wishlistRows = normalized.wishlist.map((productId) => ({
                user_id: safeUserId,
                product_id: Number(productId)
            }));

            const insertWishlistResult = await supabase
                .from('user_wishlist_items')
                .insert(wishlistRows);

            if (insertWishlistResult.error) {
                throw wrapSupabaseStateError('Failed to write wishlist items to Supabase.', insertWishlistResult.error);
            }
        }

        return normalized;
    }

    const db = readDb();
    if (!db.userState || typeof db.userState !== 'object') {
        db.userState = {};
    }

    db.userState[String(safeUserId)] = normalized;
    writeDb(db);
    return normalized;
}

function mapUserRowToUser(row) {
    return {
        id: row.id,
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        name: row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'User',
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role || 'user',
        createdAt: row.created_at
    };
}

function mapUserToRow(user) {
    return {
        first_name: user.firstName,
        last_name: user.lastName,
        name: user.name,
        email: user.email,
        password_hash: user.passwordHash,
        role: user.role,
        created_at: user.createdAt
    };
}

function mapProductToRow(product, options = {}) {
    const includeId = Boolean(options.includeId);
    const includeVideoColumn = options.includeVideoColumn !== false;
    const includeVideosColumn = options.includeVideosColumn !== false;
    const normalizedProduct = normalizeProductMedia(product);
    const normalizedVideos = normalizeStringArray(
        normalizedProduct.videos,
        normalizedProduct.video ? [normalizedProduct.video] : []
    );

    const row = {
        name: String(normalizedProduct.name).trim(),
        category: String(normalizedProduct.category).trim().toLowerCase(),
        price: Number(normalizedProduct.price),
        original_price: normalizedProduct.originalPrice !== null && normalizedProduct.originalPrice !== undefined && normalizedProduct.originalPrice !== ''
            ? Number(normalizedProduct.originalPrice)
            : null,
        image: String(normalizedProduct.image).trim(),
        images: normalizeStringArray(normalizedProduct.images, [String(normalizedProduct.image).trim()]),
        description: String(normalizedProduct.description || '').trim(),
        sizes: normalizeStringArray(normalizedProduct.sizes, ['M', 'L', 'XL']),
        colors: normalizeStringArray(normalizedProduct.colors, ['Black']),
        rating: Number(normalizedProduct.rating || 0),
        reviews: Number(normalizedProduct.reviews || 0),
        badge: normalizedProduct.badge || null,
        in_stock: Boolean(normalizedProduct.inStock)
    };

    if (includeVideoColumn) {
        row.video = normalizedVideos[0] || null;
    }

    if (includeVideosColumn) {
        row.videos = normalizedVideos;
    }

    if (includeId) {
        row.id = Number(product.id);
    }

    return row;
}

function mapProductRowToProduct(row) {
    const normalizedVideos = normalizeStringArray(row.videos, row.video ? [row.video] : []);

    return normalizeProductMedia({
        id: Number(row.id),
        name: row.name,
        category: row.category,
        price: Number(row.price),
        originalPrice: row.original_price !== null && row.original_price !== undefined
            ? Number(row.original_price)
            : null,
        image: row.image,
        images: normalizeStringArray(row.images, [row.image]),
        description: row.description || '',
        sizes: normalizeStringArray(row.sizes, ['M', 'L', 'XL']),
        colors: normalizeStringArray(row.colors, ['Black']),
        rating: Number(row.rating || 0),
        reviews: Number(row.reviews || 0),
        video: normalizedVideos[0] || row.video || '',
        videos: normalizedVideos,
        badge: row.badge || null,
        inStock: Boolean(row.in_stock)
    });
}

async function getUserByEmail(email) {
    if (USE_SUPABASE) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (error) {
            throw wrapSupabaseError('Failed to read users from Supabase.', error);
        }

        return data ? mapUserRowToUser(data) : null;
    }

    const db = readDb();
    return db.users.find(user => user.email === email) || null;
}

async function createUser(user) {
    if (USE_SUPABASE) {
        const { data, error } = await supabase
            .from('users')
            .insert(mapUserToRow(user))
            .select('*')
            .single();

        if (error) {
            if (error.code === '23505') {
                const duplicate = new Error('Account already exists for this email.');
                duplicate.status = 409;
                throw duplicate;
            }

            throw wrapSupabaseError('Failed to create user in Supabase.', error);
        }

        return mapUserRowToUser(data);
    }

    const db = readDb();
    db.users.push(user);
    writeDb(db);
    return user;
}

async function listProducts() {
    if (USE_SUPABASE) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            throw wrapSupabaseError('Failed to load products from Supabase.', error);
        }

        return (data || []).map(mapProductRowToProduct);
    }

    const db = readDb();
    return (db.products || []).map((product) => normalizeProductMedia(product));
}

async function addProduct(product) {
    if (USE_SUPABASE) {
        const row = mapProductToRow(product, {
            includeVideoColumn: SUPABASE_PRODUCTS_HAS_VIDEO_COLUMN,
            includeVideosColumn: SUPABASE_PRODUCTS_HAS_VIDEOS_COLUMN
        });

        let { data, error } = await supabase
            .from('products')
            .insert(row)
            .select('*')
            .single();

        const duplicatePrimaryKey = String(error?.code || '') === '23505'
            && String(error?.message || '').toLowerCase().includes('products_pkey');

        if (duplicatePrimaryKey) {
            const { data: latestRows, error: latestError } = await supabase
                .from('products')
                .select('id')
                .order('id', { ascending: false })
                .limit(1);

            if (latestError) {
                throw wrapSupabaseError('Failed to recover product id sequence in Supabase.', latestError);
            }

            const nextId = Number(latestRows?.[0]?.id || 0) + 1;
            const retryRow = {
                ...row,
                id: nextId
            };

            const retry = await supabase
                .from('products')
                .insert(retryRow)
                .select('*')
                .single();

            data = retry.data;
            error = retry.error;
        }

        if (error) {
            throw wrapSupabaseError('Failed to add product in Supabase.', error);
        }

        return mapProductRowToProduct(data);
    }

    const db = readDb();
    const nextId = (db.products || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const created = normalizeProductMedia({
        ...product,
        id: nextId
    });

    db.products.push(created);
    db.catalogSettings = mergeCatalogSettingsWithProduct(db.catalogSettings || {}, created);
    touchDbMeta(db, 'productsUpdatedAt');
    touchDbMeta(db, 'catalogSettingsUpdatedAt');
    writeDb(db);
    return created;
}

async function removeProductById(productId) {
    if (USE_SUPABASE) {
        const { data, error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId)
            .select('*');

        if (error) {
            throw wrapSupabaseError('Failed to remove product in Supabase.', error);
        }

        if (!data || data.length === 0) {
            return null;
        }

        return mapProductRowToProduct(data[0]);
    }

    const db = readDb();
    const index = db.products.findIndex(product => Number(product.id) === productId);

    if (index === -1) {
        return null;
    }

    const [deleted] = db.products.splice(index, 1);
    touchDbMeta(db, 'productsUpdatedAt');
    writeDb(db);
    return deleted;
}

async function updateProductById(productId, product) {
    if (USE_SUPABASE) {
        const row = mapProductToRow(product, {
            includeVideoColumn: SUPABASE_PRODUCTS_HAS_VIDEO_COLUMN,
            includeVideosColumn: SUPABASE_PRODUCTS_HAS_VIDEOS_COLUMN
        });

        const { data, error } = await supabase
            .from('products')
            .update(row)
            .eq('id', productId)
            .select('*')
            .maybeSingle();

        if (error) {
            throw wrapSupabaseError('Failed to update product in Supabase.', error);
        }

        return data ? mapProductRowToProduct(data) : null;
    }

    const db = readDb();
    const index = db.products.findIndex(item => Number(item.id) === Number(productId));

    if (index === -1) {
        return null;
    }

    const updated = normalizeProductMedia({
        ...db.products[index],
        ...product,
        id: Number(productId)
    });

    db.products[index] = updated;
    db.catalogSettings = mergeCatalogSettingsWithProduct(db.catalogSettings || {}, updated);
    touchDbMeta(db, 'productsUpdatedAt');
    touchDbMeta(db, 'catalogSettingsUpdatedAt');
    writeDb(db);
    return updated;
}

async function getCatalogSettings() {
    if (USE_SUPABASE) {
        const products = await listProducts();
        const { data, error } = await supabase
            .from('catalog_settings')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        if (error) {
            throw wrapSupabaseStateError('Failed to load catalog settings from Supabase.', error);
        }

        const fromRow = data
            ? {
                categories: normalizeStringArray(data.categories, []),
                sizes: data.sizes && typeof data.sizes === 'object'
                    ? data.sizes
                    : {},
                colors: normalizeStringArray(data.colors, []),
                updatedAt: data.updated_at
            }
            : {};

        const normalized = normalizeCatalogSettings(fromRow, products);

        const shouldInsert = !data;
        const shouldUpdate = data
            && (
                JSON.stringify(normalizeStringArray(data.categories, [])) !== JSON.stringify(normalized.categories)
                || JSON.stringify(data.sizes && typeof data.sizes === 'object' ? data.sizes : {}) !== JSON.stringify(normalized.sizes)
                || JSON.stringify(normalizeStringArray(data.colors, [])) !== JSON.stringify(normalized.colors)
                || String(data.updated_at || '') !== String(normalized.updatedAt || '')
            );

        if (shouldInsert || shouldUpdate) {
            const { error: upsertError } = await supabase
                .from('catalog_settings')
                .upsert({
                    id: 1,
                    categories: normalized.categories,
                    sizes: normalized.sizes,
                    colors: normalized.colors,
                    updated_at: normalized.updatedAt
                }, {
                    onConflict: 'id'
                });

            if (upsertError) {
                throw wrapSupabaseStateError('Failed to persist catalog settings in Supabase.', upsertError);
            }
        }

        return normalized;
    }

    const db = readDb();
    const normalized = normalizeCatalogSettings(db.catalogSettings || {}, db.products || []);

    const previousSerialized = JSON.stringify(db.catalogSettings || {});
    const normalizedSerialized = JSON.stringify(normalized);

    if (previousSerialized !== normalizedSerialized) {
        db.catalogSettings = normalized;
        touchDbMeta(db, 'catalogSettingsUpdatedAt');
        writeDb(db);
    }

    return normalized;
}

async function updateCatalogSettings(settingsInput = {}) {
    if (USE_SUPABASE) {
        const products = await listProducts();
        const merged = normalizeCatalogSettings(settingsInput, products);
        merged.updatedAt = new Date().toISOString();

        const { error } = await supabase
            .from('catalog_settings')
            .upsert({
                id: 1,
                categories: merged.categories,
                sizes: merged.sizes,
                colors: merged.colors,
                updated_at: merged.updatedAt
            }, {
                onConflict: 'id'
            });

        if (error) {
            throw wrapSupabaseStateError('Failed to update catalog settings in Supabase.', error);
        }

        return merged;
    }

    const db = readDb();
    const merged = normalizeCatalogSettings(settingsInput, db.products || []);
    merged.updatedAt = new Date().toISOString();
    db.catalogSettings = merged;
    touchDbMeta(db, 'catalogSettingsUpdatedAt');
    writeDb(db);
    return merged;
}

async function verifySupabaseSchema() {
    if (!USE_SUPABASE) return;

    const usersCheck = await supabase.from('users').select('id').limit(1);
    if (usersCheck.error) {
        throw wrapSupabaseError('Supabase schema check failed for users table.', usersCheck.error);
    }

    const productsCheck = await supabase.from('products').select('id').limit(1);
    if (productsCheck.error) {
        throw wrapSupabaseError('Supabase schema check failed for products table.', productsCheck.error);
    }

    const videoCheck = await supabase.from('products').select('video').limit(1);
    if (videoCheck.error) {
        if (isMissingColumnError(videoCheck.error, 'video')) {
            SUPABASE_PRODUCTS_HAS_VIDEO_COLUMN = false;
            console.warn('Supabase products.video column is missing. Video URL will be skipped for DB writes. Run backend/sql/supabase-schema.sql (or execute: ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video text;).');
        } else {
            throw wrapSupabaseError('Supabase schema check failed for products.video column.', videoCheck.error);
        }
    }

    const videosCheck = await supabase.from('products').select('videos').limit(1);
    if (videosCheck.error) {
        if (isMissingColumnError(videosCheck.error, 'videos')) {
            SUPABASE_PRODUCTS_HAS_VIDEOS_COLUMN = false;
            console.warn("Supabase products.videos column is missing. Video gallery will be skipped for DB writes. Run backend/sql/supabase-schema.sql (or execute: ALTER TABLE public.products ADD COLUMN IF NOT EXISTS videos jsonb NOT NULL DEFAULT '[]'::jsonb;).");
        } else {
            throw wrapSupabaseError('Supabase schema check failed for products.videos column.', videosCheck.error);
        }
    }
}

async function verifySupabaseStateSchema() {
    if (!USE_SUPABASE) return;

    const catalogCheck = await supabase.from('catalog_settings').select('id').limit(1);
    if (catalogCheck.error) {
        throw wrapSupabaseStateError('Supabase schema check failed for catalog_settings table.', catalogCheck.error);
    }

    const cartCheck = await supabase.from('user_cart_items').select('id').limit(1);
    if (cartCheck.error) {
        throw wrapSupabaseStateError('Supabase schema check failed for user_cart_items table.', cartCheck.error);
    }

    const wishlistCheck = await supabase.from('user_wishlist_items').select('id').limit(1);
    if (wishlistCheck.error) {
        throw wrapSupabaseStateError('Supabase schema check failed for user_wishlist_items table.', wishlistCheck.error);
    }
}

async function migrateLegacySupabaseStateToRelationalTables() {
    if (!USE_SUPABASE) return;

    await ensureSupabaseStateBucket();

    const products = await listProducts();
    const { data: existingCatalogRow, error: existingCatalogError } = await supabase
        .from('catalog_settings')
        .select('id')
        .eq('id', 1)
        .maybeSingle();

    if (existingCatalogError) {
        throw wrapSupabaseStateError('Failed to check existing relational catalog settings.', existingCatalogError);
    }

    if (!existingCatalogRow) {
        const legacySettings = await readSupabaseStateJsonObject(SUPABASE_CATALOG_SETTINGS_OBJECT, {});
        const normalized = normalizeCatalogSettings(legacySettings, products);
        normalized.updatedAt = String(normalized.updatedAt || new Date().toISOString());

        const { error: upsertCatalogError } = await supabase
            .from('catalog_settings')
            .upsert({
                id: 1,
                categories: normalized.categories,
                sizes: normalized.sizes,
                colors: normalized.colors,
                updated_at: normalized.updatedAt
            }, {
                onConflict: 'id'
            });

        if (upsertCatalogError) {
            throw wrapSupabaseStateError('Failed to migrate catalog settings from storage JSON to SQL tables.', upsertCatalogError);
        }
    }

    const usersListResult = await supabase.storage
        .from(SUPABASE_STATE_BUCKET)
        .list('users', { limit: 1000, offset: 0 });

    if (usersListResult.error) {
        if (isSupabaseStorageObjectMissingError(usersListResult.error)) {
            return;
        }

        throw wrapSupabaseError('Failed to list legacy user state objects from Supabase storage.', usersListResult.error);
    }

    const userFolders = Array.isArray(usersListResult.data) ? usersListResult.data : [];

    for (const folder of userFolders) {
        const userId = Number(folder?.name || 0);
        if (!Number.isFinite(userId) || userId <= 0) continue;

        const legacyState = await readSupabaseStateJsonObject(getUserStateObjectPath(userId), null);
        if (!legacyState || typeof legacyState !== 'object') continue;

        const currentState = await getUserState(userId);
        const hasRelationalState = (Array.isArray(currentState.cart) && currentState.cart.length > 0)
            || (Array.isArray(currentState.wishlist) && currentState.wishlist.length > 0);

        if (hasRelationalState) continue;

        await writeUserState(userId, {
            cart: legacyState.cart || [],
            wishlist: legacyState.wishlist || []
        });
    }
}

async function seedProductsIfNeeded() {
    const seedProducts = readSeedProductsFromFrontend();
    if (seedProducts.length === 0) return;

    if (USE_SUPABASE) {
        const { count, error } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true });

        if (error) {
            throw wrapSupabaseError('Failed to check products count in Supabase.', error);
        }

        if ((count || 0) > 0) {
            return;
        }

        const rows = seedProducts.map(item => mapProductToRow(item, {
            includeVideoColumn: SUPABASE_PRODUCTS_HAS_VIDEO_COLUMN,
            includeVideosColumn: SUPABASE_PRODUCTS_HAS_VIDEOS_COLUMN
        }));
        const { error: insertError } = await supabase
            .from('products')
            .insert(rows);

        if (insertError) {
            throw wrapSupabaseError('Failed to seed products in Supabase.', insertError);
        }

        console.log(`Seeded ${rows.length} products into Supabase.`);
        return;
    }

    ensureDatabase();
}

function sanitizeUser(user) {
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
    };
}

function createToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function buildProductsSyncSignature(products = []) {
    const normalized = (Array.isArray(products) ? products : [])
        .map((product) => ({
            id: Number(product?.id) || 0,
            name: String(product?.name || ''),
            category: String(product?.category || ''),
            price: Number(product?.price || 0),
            originalPrice: product?.originalPrice === null || product?.originalPrice === undefined
                ? null
                : Number(product.originalPrice),
            image: String(product?.image || ''),
            images: normalizeStringArray(product?.images, []),
            video: String(product?.video || ''),
            videos: normalizeStringArray(product?.videos, []),
            description: String(product?.description || ''),
            sizes: normalizeStringArray(product?.sizes, []),
            colors: normalizeStringArray(product?.colors, []),
            rating: Number(product?.rating || 0),
            reviews: Number(product?.reviews || 0),
            badge: product?.badge === null || product?.badge === undefined ? null : String(product.badge),
            inStock: Boolean(product?.inStock)
        }))
        .sort((a, b) => a.id - b.id);

    const digest = crypto
        .createHash('sha1')
        .update(JSON.stringify(normalized))
        .digest('hex');

    return `sha1:${digest}`;
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token is required.' });
    }

    const token = authHeader.slice(7);

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
}

function adminOnlyMiddleware(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }

    next();
}

function uploadFilesMiddleware(req, res, next) {
    upload.array('files', MAX_UPLOAD_FILES)(req, res, (error) => {
        if (!error) return next();

        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: `File is too large. Max upload size is ${Math.floor(VIDEO_UPLOAD_MAX_BYTES / (1024 * 1024))}MB.` });
            }

            if (error.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ message: `Too many files in one upload. Maximum is ${MAX_UPLOAD_FILES}.` });
            }

            return res.status(400).json({ message: error.message || 'Invalid upload request.' });
        }

        return res.status(400).json({ message: error?.message || 'Upload failed.' });
    });
}

async function ensureAdminUser() {
    const existingAdmin = await getUserByEmail(ADMIN_EMAIL);

    if (existingAdmin) {
        return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const adminPayload = {
        id: Date.now(),
        firstName: 'Admin',
        lastName: 'User',
        name: 'Admin User',
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'admin',
        createdAt: new Date().toISOString()
    };

    await createUser(adminPayload);

    console.log(`Seeded admin user: ${ADMIN_EMAIL}`);
}

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        service: 'urban-threads-api',
        database: USE_SUPABASE ? 'supabase' : 'local-json'
    });
});

app.get('/api/sync-state', async (req, res) => {
    try {
        if (USE_SUPABASE) {
            const settings = await getCatalogSettings();
            const products = await listProducts();
            const productsSyncFingerprint = buildProductsSyncSignature(products);

            return res.json({
                productsUpdatedAt: productsSyncFingerprint,
                catalogSettingsUpdatedAt: String(settings.updatedAt || '')
            });
        }

        const db = readDb();
        ensureDbMeta(db);

        return res.json({
            productsUpdatedAt: db.meta.productsUpdatedAt,
            catalogSettingsUpdatedAt: db.meta.catalogSettingsUpdatedAt
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to read sync state.' });
    }
});

app.get('/api/catalog-settings', async (req, res) => {
    try {
        const settings = await getCatalogSettings();
        return res.json(settings);
    } catch (error) {
        console.error('Get catalog settings error:', error);
        return res.status(error.status || 500).json({ message: error.message || 'Failed to load catalog settings.' });
    }
});

app.put('/api/catalog-settings', authMiddleware, adminOnlyMiddleware, async (req, res) => {
    try {
        const payload = req.body || {};
        const updated = await updateCatalogSettings(payload);
        return res.json(updated);
    } catch (error) {
        console.error('Update catalog settings error:', error);
        return res.status(error.status || 500).json({ message: error.message || 'Failed to update catalog settings.' });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { firstName = '', lastName = '', email = '', password = '' } = req.body || {};
        const normalizedEmail = String(email).trim().toLowerCase();

        if (!normalizedEmail || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        if (String(password).length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const exists = await getUserByEmail(normalizedEmail);

        if (exists) {
            return res.status(409).json({ message: 'Account already exists for this email.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const userPayload = {
            id: Date.now(),
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
            name: `${String(firstName).trim()} ${String(lastName).trim()}`.trim() || 'User',
            email: normalizedEmail,
            passwordHash,
            role: 'user',
            createdAt: new Date().toISOString()
        };

        const user = await createUser(userPayload);

        const token = createToken(user);
        return res.status(201).json({ token, user: sanitizeUser(user) });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(error.status || 500).json({ message: error.message || 'Failed to create account.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email = '', password = '' } = req.body || {};
        const normalizedEmail = String(email).trim().toLowerCase();

        if (!normalizedEmail || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = await getUserByEmail(normalizedEmail);

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = createToken(user);
        return res.json({ token, user: sanitizeUser(user) });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Login failed.' });
    }
});

app.get('/api/me/cart', authMiddleware, async (req, res) => {
    try {
        const state = await getUserState(req.user.userId);
        return res.json({ items: state.cart, updatedAt: state.updatedAt });
    } catch (error) {
        console.error('Get cart error:', error);
        return res.status(error.status || 500).json({ message: error.message || 'Failed to load cart.' });
    }
});

app.put('/api/me/cart', authMiddleware, async (req, res) => {
    try {
        const incomingItems = sanitizeCartItems(req.body?.items || []);
        const current = await getUserState(req.user.userId);
        const next = await writeUserState(req.user.userId, {
            ...current,
            cart: incomingItems
        });

        return res.json({ items: next.cart, updatedAt: next.updatedAt });
    } catch (error) {
        console.error('Update cart error:', error);
        return res.status(error.status || 500).json({ message: error.message || 'Failed to update cart.' });
    }
});

app.post('/api/me/cart/merge', authMiddleware, async (req, res) => {
    try {
        const incomingItems = sanitizeCartItems(req.body?.items || []);
        const current = await getUserState(req.user.userId);
        const mergedCart = mergeCartItems(current.cart, incomingItems);
        const next = await writeUserState(req.user.userId, {
            ...current,
            cart: mergedCart
        });

        return res.json({ items: next.cart, updatedAt: next.updatedAt });
    } catch (error) {
        console.error('Merge cart error:', error);
        return res.status(error.status || 500).json({ message: error.message || 'Failed to merge cart.' });
    }
});

app.get('/api/me/wishlist', authMiddleware, async (req, res) => {
    try {
        const state = await getUserState(req.user.userId);
        return res.json({ ids: state.wishlist, updatedAt: state.updatedAt });
    } catch (error) {
        console.error('Get wishlist error:', error);
        return res.status(error.status || 500).json({ message: error.message || 'Failed to load wishlist.' });
    }
});

app.put('/api/me/wishlist', authMiddleware, async (req, res) => {
    try {
        const incomingIds = sanitizeWishlistIds(req.body?.ids || []);
        const current = await getUserState(req.user.userId);
        const next = await writeUserState(req.user.userId, {
            ...current,
            wishlist: incomingIds
        });

        return res.json({ ids: next.wishlist, updatedAt: next.updatedAt });
    } catch (error) {
        console.error('Update wishlist error:', error);
        return res.status(error.status || 500).json({ message: error.message || 'Failed to update wishlist.' });
    }
});

app.post('/api/me/wishlist/merge', authMiddleware, async (req, res) => {
    try {
        const incomingIds = sanitizeWishlistIds(req.body?.ids || []);
        const current = await getUserState(req.user.userId);
        const mergedWishlist = sanitizeWishlistIds([...(current.wishlist || []), ...incomingIds]);
        const next = await writeUserState(req.user.userId, {
            ...current,
            wishlist: mergedWishlist
        });

        return res.json({ ids: next.wishlist, updatedAt: next.updatedAt });
    } catch (error) {
        console.error('Merge wishlist error:', error);
        return res.status(error.status || 500).json({ message: error.message || 'Failed to merge wishlist.' });
    }
});

app.post('/api/uploads', authMiddleware, adminOnlyMiddleware, uploadFilesMiddleware, async (req, res) => {
    try {
        const mediaType = String(req.body?.mediaType || '').trim().toLowerCase();
        if (!['image', 'video'].includes(mediaType)) {
            return res.status(400).json({ message: 'mediaType must be either "image" or "video".' });
        }

        const files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) {
            return res.status(400).json({ message: 'Please attach at least one file.' });
        }

        const maxPerType = mediaType === 'video' ? 3 : 8;
        if (files.length > maxPerType) {
            return res.status(400).json({ message: `You can upload up to ${maxPerType} ${mediaType} file(s) at once.` });
        }

        const maxSize = mediaType === 'video' ? VIDEO_UPLOAD_MAX_BYTES : IMAGE_UPLOAD_MAX_BYTES;

        for (const file of files) {
            const mime = String(file.mimetype || '').toLowerCase();
            if (!mime.startsWith(`${mediaType}/`)) {
                return res.status(400).json({ message: `Invalid file type for ${mediaType} upload: ${file.originalname}` });
            }

            if (Number(file.size || 0) > maxSize) {
                return res.status(400).json({ message: `${file.originalname} exceeds max size of ${Math.floor(maxSize / (1024 * 1024))}MB.` });
            }
        }

        const uploadedFiles = [];
        for (const file of files) {
            const url = await persistUploadFile(file, mediaType);
            uploadedFiles.push({
                name: file.originalname,
                url,
                mimeType: file.mimetype,
                size: Number(file.size || 0)
            });
        }

        return res.status(201).json({
            storage: USE_SUPABASE ? 'supabase' : 'local',
            files: uploadedFiles
        });
    } catch (error) {
        console.error('Upload media error:', error);
        return res.status(error.status || 500).json({ message: error.message || 'Failed to upload files.' });
    }
});

app.get('/api/products', (req, res) => {
    listProducts().then((items) => {
        res.json(items);
    }).catch((error) => {
        console.error('Get products error:', error);
        res.status(500).json({ message: error.message || 'Failed to load products.' });
    });
});

app.post('/api/products', authMiddleware, adminOnlyMiddleware, async (req, res) => {
    try {
        const {
            name,
            category,
            price,
            image,
            images = [],
            video = '',
            videos = [],
            originalPrice = null,
            description = '',
            sizes = ['M', 'L', 'XL'],
            colors = ['Black'],
            rating = 0,
            reviews = 0,
            badge = null,
            inStock = true
        } = req.body || {};

        if (!name || !category || price === undefined) {
            return res.status(400).json({ message: 'name, category, price, and image are required.' });
        }

        const parsedPrice = Number(price);
        const parsedOriginalPrice = originalPrice !== null && originalPrice !== '' ? Number(originalPrice) : null;
        const parsedRating = Number(rating);
        const parsedReviews = Number(reviews);
        const normalizedCategory = normalizeCategoryValue(category);
        const sizeSelection = sanitizeSizeSelection(sizes, ['M', 'L', 'XL']);

        const normalizedImages = normalizeStringArray(images, [String(image || '').trim()])
            .map((value) => normalizeImageUrl(value))
            .filter(Boolean);

        const normalizedVideos = normalizeStringArray(videos, String(video || '').trim() ? [String(video || '').trim()] : [])
            .map((value) => normalizeVideoUrl(value))
            .filter(Boolean);

        const primaryImage = normalizeImageUrl(image || normalizedImages[0] || '');

        if (primaryImage && !normalizedImages.length) {
            normalizedImages.push(primaryImage);
        }

        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({ message: 'price must be a valid non-negative number.' });
        }

        if (!primaryImage) {
            return res.status(400).json({ message: 'name, category, price, and image are required.' });
        }

        if (!normalizedCategory) {
            return res.status(400).json({ message: 'Please provide a valid category.' });
        }

        if (normalizedImages.length > 8) {
            return res.status(400).json({ message: 'A maximum of 8 images is allowed per product.' });
        }

        if (normalizedVideos.length > 3) {
            return res.status(400).json({ message: 'A maximum of 3 videos is allowed per product.' });
        }

        if (!Number.isFinite(parsedRating) || parsedRating < 0 || parsedRating > 5) {
            return res.status(400).json({ message: 'rating must be a number between 0 and 5.' });
        }

        if (!Number.isFinite(parsedReviews) || parsedReviews < 0) {
            return res.status(400).json({ message: 'reviews must be a non-negative number.' });
        }

        if (sizeSelection.hasMixed) {
            return res.status(400).json({ message: 'Select either apparel sizes or footwear sizes for a product, not both.' });
        }

        const created = await addProduct({
            name: String(name).trim(),
            category: normalizedCategory,
            price: parsedPrice,
            originalPrice: Number.isFinite(parsedOriginalPrice) ? parsedOriginalPrice : null,
            image: primaryImage,
            images: normalizedImages,
            video: normalizedVideos[0] || '',
            videos: normalizedVideos,
            description: String(description || '').trim(),
            sizes: sizeSelection.values,
            colors: Array.isArray(colors) && colors.length ? colors : ['Black'],
            rating: Math.round(parsedRating * 10) / 10,
            reviews: Math.max(0, Math.round(parsedReviews)),
            badge: badge || null,
            inStock: Boolean(inStock)
        });

        return res.status(201).json(created);
    } catch (error) {
        console.error('Add product error:', error);
        return res.status(500).json({ message: error.message || 'Failed to add product.' });
    }
});

app.delete('/api/products/:id', authMiddleware, adminOnlyMiddleware, async (req, res) => {
    try {
        const productId = Number(req.params.id);

        if (!Number.isFinite(productId)) {
            return res.status(400).json({ message: 'Invalid product id.' });
        }

        const deleted = await removeProductById(productId);

        if (!deleted) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        return res.json({ message: 'Product removed.', product: deleted });
    } catch (error) {
        console.error('Delete product error:', error);
        return res.status(500).json({ message: error.message || 'Failed to remove product.' });
    }
});

app.put('/api/products/:id', authMiddleware, adminOnlyMiddleware, async (req, res) => {
    try {
        const productId = Number(req.params.id);

        if (!Number.isFinite(productId)) {
            return res.status(400).json({ message: 'Invalid product id.' });
        }

        const {
            name,
            category,
            price,
            image,
            images = [],
            video = '',
            videos = [],
            originalPrice = null,
            description = '',
            sizes = ['M', 'L', 'XL'],
            colors = ['Black'],
            rating = 0,
            reviews = 0,
            badge = null,
            inStock = true
        } = req.body || {};

        if (!name || !category || price === undefined) {
            return res.status(400).json({ message: 'name, category, price, and image are required.' });
        }

        const parsedPrice = Number(price);
        const parsedOriginalPrice = originalPrice !== null && originalPrice !== '' ? Number(originalPrice) : null;
        const parsedRating = Number(rating);
        const parsedReviews = Number(reviews);
        const normalizedCategory = normalizeCategoryValue(category);
        const sizeSelection = sanitizeSizeSelection(sizes, ['M', 'L', 'XL']);

        const normalizedImages = normalizeStringArray(images, [String(image || '').trim()])
            .map((value) => normalizeImageUrl(value))
            .filter(Boolean);

        const normalizedVideos = normalizeStringArray(videos, String(video || '').trim() ? [String(video || '').trim()] : [])
            .map((value) => normalizeVideoUrl(value))
            .filter(Boolean);

        const primaryImage = normalizeImageUrl(image || normalizedImages[0] || '');

        if (primaryImage && !normalizedImages.length) {
            normalizedImages.push(primaryImage);
        }

        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({ message: 'price must be a valid non-negative number.' });
        }

        if (!primaryImage) {
            return res.status(400).json({ message: 'name, category, price, and image are required.' });
        }

        if (!normalizedCategory) {
            return res.status(400).json({ message: 'Please provide a valid category.' });
        }

        if (normalizedImages.length > 8) {
            return res.status(400).json({ message: 'A maximum of 8 images is allowed per product.' });
        }

        if (normalizedVideos.length > 3) {
            return res.status(400).json({ message: 'A maximum of 3 videos is allowed per product.' });
        }

        if (!Number.isFinite(parsedRating) || parsedRating < 0 || parsedRating > 5) {
            return res.status(400).json({ message: 'rating must be a number between 0 and 5.' });
        }

        if (!Number.isFinite(parsedReviews) || parsedReviews < 0) {
            return res.status(400).json({ message: 'reviews must be a non-negative number.' });
        }

        if (sizeSelection.hasMixed) {
            return res.status(400).json({ message: 'Select either apparel sizes or footwear sizes for a product, not both.' });
        }

        const updated = await updateProductById(productId, {
            name: String(name).trim(),
            category: normalizedCategory,
            price: parsedPrice,
            originalPrice: Number.isFinite(parsedOriginalPrice) ? parsedOriginalPrice : null,
            image: primaryImage,
            images: normalizedImages,
            video: normalizedVideos[0] || '',
            videos: normalizedVideos,
            description: String(description || '').trim(),
            sizes: sizeSelection.values,
            colors: Array.isArray(colors) && colors.length ? colors : ['Black'],
            rating: Math.round(parsedRating * 10) / 10,
            reviews: Math.max(0, Math.round(parsedReviews)),
            badge: badge || null,
            inStock: Boolean(inStock)
        });

        if (!updated) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        return res.json(updated);
    } catch (error) {
        console.error('Update product error:', error);
        return res.status(500).json({ message: error.message || 'Failed to update product.' });
    }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(FRONTEND_DIR, {
    setHeaders: (res, filePath) => {
        const normalizedPath = String(filePath || '').toLowerCase();
        const isPageAsset = normalizedPath.endsWith('.html')
            || normalizedPath.endsWith('.js')
            || normalizedPath.endsWith('.css');

        if (isPageAsset) {
            res.setHeader('Cache-Control', 'no-store');
        }
    }
}));

async function start() {
    if (SUPABASE_MODE === 'true' && !HAS_SUPABASE_KEYS) {
        throw new Error('USE_SUPABASE=true but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env.');
    }

    if (USE_SUPABASE) {
        await verifySupabaseSchema();
        await verifySupabaseStateSchema();
        await ensureSupabaseMediaBucket();
        await migrateLegacySupabaseStateToRelationalTables();
    } else {
        ensureDatabase();
        ensureLocalUploadDirs();
    }

    await seedProductsIfNeeded();
    await ensureAdminUser();

    app.listen(PORT, () => {
        console.log(`Urban Threads backend running at http://localhost:${PORT}`);
        console.log(`Database provider: ${USE_SUPABASE ? 'supabase' : 'local-json'}`);
    });
}

start().catch((error) => {
    console.error('Startup failed:', error.message);
    process.exit(1);
});
