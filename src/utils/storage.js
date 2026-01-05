/**
 * Storage Utility - Wrapper for AsyncStorage
 * Handles JSON serialization and error handling
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    TRASH_ITEMS: '@swipeclean/trash_items',
    SIZE_CACHE: '@swipeclean/size_cache',
};

/**
 * Get item from storage
 * @param {string} key - Storage key
 * @returns {Promise<any>} - Parsed value or null
 */
export const getItem = async (key) => {
    try {
        const value = await AsyncStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error('Storage getItem error:', error);
        return null;
    }
};

/**
 * Set item in storage
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
 * @returns {Promise<boolean>} - Success status
 */
export const setItem = async (key, value) => {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Storage setItem error:', error);
        return false;
    }
};

/**
 * Remove item from storage
 * @param {string} key - Storage key
 * @returns {Promise<boolean>} - Success status
 */
export const removeItem = async (key) => {
    try {
        await AsyncStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Storage removeItem error:', error);
        return false;
    }
};

export { STORAGE_KEYS };
export default { getItem, setItem, removeItem, STORAGE_KEYS };
