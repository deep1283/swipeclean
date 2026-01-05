/**
 * Size Cache Utility
 * Caches calculated album sizes to avoid recalculation
 */
import { getItem, setItem, STORAGE_KEYS } from './storage';

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cache key for album/media type combination
 */
const getCacheKey = (albumId, mediaType) => `${albumId || 'all'}_${mediaType}`;

/**
 * Get cached size for an album
 * @param {string} albumId - Album ID (null for 'all')
 * @param {string} mediaType - 'photo' or 'video'
 * @returns {Promise<number|null>} - Cached size in MB or null if not cached/expired
 */
export const getCachedSize = async (albumId, mediaType) => {
    try {
        const cache = await getItem(STORAGE_KEYS.SIZE_CACHE) || {};
        const key = getCacheKey(albumId, mediaType);
        const entry = cache[key];

        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
            return null;
        }

        return entry.sizeMB;
    } catch (error) {
        console.error('Size cache get error:', error);
        return null;
    }
};

/**
 * Set cached size for an album
 * @param {string} albumId - Album ID (null for 'all')
 * @param {string} mediaType - 'photo' or 'video'
 * @param {number} sizeMB - Size in MB
 * @returns {Promise<boolean>} - Success status
 */
export const setCachedSize = async (albumId, mediaType, sizeMB) => {
    try {
        const cache = await getItem(STORAGE_KEYS.SIZE_CACHE) || {};
        const key = getCacheKey(albumId, mediaType);

        cache[key] = {
            sizeMB,
            timestamp: Date.now(),
        };

        return await setItem(STORAGE_KEYS.SIZE_CACHE, cache);
    } catch (error) {
        console.error('Size cache set error:', error);
        return false;
    }
};

/**
 * Invalidate cache for a specific album or all caches
 * @param {string|null} albumId - Album ID to invalidate, or null to clear specific, undefined to clear all
 */
export const invalidateSizeCache = async (albumId = undefined) => {
    try {
        if (albumId === undefined) {
            // Clear all size cache
            await setItem(STORAGE_KEYS.SIZE_CACHE, {});
        } else {
            // Clear specific album entries
            const cache = await getItem(STORAGE_KEYS.SIZE_CACHE) || {};
            const keyPhoto = getCacheKey(albumId, 'photo');
            const keyVideo = getCacheKey(albumId, 'video');
            delete cache[keyPhoto];
            delete cache[keyVideo];
            await setItem(STORAGE_KEYS.SIZE_CACHE, cache);
        }
        return true;
    } catch (error) {
        console.error('Size cache invalidate error:', error);
        return false;
    }
};

export default { getCachedSize, setCachedSize, invalidateSizeCache };
