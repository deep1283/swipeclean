import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_PADDING = 20;
const ASSET_SPACING = 4;
const AVAILABLE_WIDTH = SCREEN_WIDTH - (GRID_PADDING * 2);
const ASSET_SIZE = (AVAILABLE_WIDTH - (ASSET_SPACING * (NUM_COLUMNS - 1))) / NUM_COLUMNS;

const SkeletonItem = ({ style }) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 800 }),
                withTiming(0.3, { duration: 800 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.skeletonBase, style, animatedStyle]} />
    );
};

export const AlbumSkeleton = () => {
    return (
        <View style={styles.albumGrid}>
            {[1, 2, 3, 4, 5, 6].map((key) => (
                <View key={key} style={styles.albumCard}>
                    <SkeletonItem style={styles.albumCover} />
                    <SkeletonItem style={styles.albumTextTitle} />
                    <SkeletonItem style={styles.albumTextSubtitle} />
                </View>
            ))}
        </View>
    );
};

export const AssetSkeleton = () => {
    return (
        <View style={styles.assetGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((key) => (
                <SkeletonItem key={key} style={styles.assetItem} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    skeletonBase: {
        backgroundColor: '#E1E9EE',
        overflow: 'hidden',
    },
    // Album Styles
    albumGrid: {
        padding: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    albumCard: {
        width: '47%',
        marginBottom: 20,
    },
    albumCover: {
        width: '100%',
        height: 170, // Match new height
        borderRadius: 16,
        marginBottom: 10,
    },
    albumTextTitle: {
        width: '70%',
        height: 16,
        borderRadius: 4,
        marginBottom: 6,
    },
    albumTextSubtitle: {
        width: '40%',
        height: 12,
        borderRadius: 4,
    },
    // Asset Styles
    assetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: ASSET_SPACING,
        paddingHorizontal: 20,
        marginBottom: 4,
    },
    assetItem: {
        width: ASSET_SIZE,
        height: ASSET_SIZE,
        borderRadius: 8,
    },
});
