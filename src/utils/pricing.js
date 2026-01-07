let ExpoLocalization;
try {
    ExpoLocalization = require('expo-localization');
} catch (e) {
    // Module not found or not linked
}

export const getPremiumPrice = () => {
    let regionCode = 'US'; // Default

    try {
        if (ExpoLocalization) {
            const locales = ExpoLocalization.getLocales();
            if (locales && locales.length > 0) {
                regionCode = locales[0].regionCode;
            }
        }
    } catch (error) {
        // Fallback to default
        console.log('Error getting locale for pricing:', error);
    }

    // If region is India ('IN'), return ₹129
    if (regionCode === 'IN') {
        return {
            amount: '129.00',
            currency: 'INR',
            symbol: '₹',
            label: '₹129'
        };
    }

    // Default for everyone else (US, CH, etc.)
    return {
        amount: '1.99',
        currency: 'USD',
        symbol: '$',
        label: '$1.99'
    };
};
