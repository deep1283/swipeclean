import { getItem, setItem, STORAGE_KEYS } from './storage';

// Key for premium status
const PREMIUM_KEY = 'is_premium_user';

export const isPremiumUser = async () => {
    try {
        const val = await getItem(PREMIUM_KEY);
        return val === true;
    } catch (e) {
        return false;
    }
};

export const setPremiumStatus = async (status) => {
    try {
        await setItem(PREMIUM_KEY, status);
    } catch (e) {
        console.error('Failed to set premium status:', e);
    }
};
