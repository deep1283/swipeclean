import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { isPremiumUser } from '../utils/premium';

// Use TestIds for development
const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy';

const AdBanner = () => {
    const [isPremium, setIsPremium] = useState(true); // Default to true to avoid flash of ads
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkPremium();
    }, []);

    const checkPremium = async () => {
        const premium = await isPremiumUser();
        setIsPremium(premium);
        setLoading(false);
    };

    if (loading || isPremium) return null;

    return (
        <View style={styles.container}>
            <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingVertical: 5,
    },
});

export default AdBanner;
