import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Animated,
    PanResponder,
    Platform
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const isWeb = Platform.OS === 'web';

// Demo photos for web testing
const DEMO_PHOTOS = [
    { id: '1', uri: 'https://picsum.photos/400/600?random=1', mediaType: 'photo', creationTime: Date.now() - 86400000 },
    { id: '2', uri: 'https://picsum.photos/400/600?random=2', mediaType: 'photo', creationTime: Date.now() - 172800000 },
    { id: '3', uri: 'https://picsum.photos/400/600?random=3', mediaType: 'photo', creationTime: Date.now() - 259200000 },
    { id: '4', uri: 'https://picsum.photos/400/600?random=4', mediaType: 'video', creationTime: Date.now() - 345600000 },
    { id: '5', uri: 'https://picsum.photos/400/600?random=5', mediaType: 'photo', creationTime: Date.now() - 432000000 },
    { id: '6', uri: 'https://picsum.photos/400/600?random=6', mediaType: 'photo', creationTime: Date.now() - 518400000 },
    { id: '7', uri: 'https://picsum.photos/400/600?random=7', mediaType: 'photo', creationTime: Date.now() - 604800000 },
    { id: '8', uri: 'https://picsum.photos/400/600?random=8', mediaType: 'video', creationTime: Date.now() - 691200000 },
];

export default function SwipeScreen({ onBack, onTrash }) {
    const [assets, setAssets] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    const position = useRef(new Animated.ValueXY()).current;

    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        if (isWeb) {
            // Use demo photos on web
            setAssets(DEMO_PHOTOS);
            setTotalCount(DEMO_PHOTOS.length);
            setLoading(false);
            return;
        }

        try {
            const result = await MediaLibrary.getAssetsAsync({
                mediaType: ['photo', 'video'],
                first: 100,
                sortBy: MediaLibrary.SortBy.creationTime,
            });
            setAssets(result.assets);
            setTotalCount(result.totalCount);
            setLoading(false);
        } catch (error) {
            console.log('Error loading assets:', error);
            // Use demo photos on error
            setAssets(DEMO_PHOTOS);
            setTotalCount(DEMO_PHOTOS.length);
            setLoading(false);
        }
    };

    const handleSwipeComplete = (direction) => {
        if (direction === 'left' && assets[currentIndex]) {
            onTrash(assets[currentIndex]);
        }

        position.setValue({ x: 0, y: 0 });

        if (currentIndex < assets.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onBack();
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gesture) => {
                position.setValue({ x: gesture.dx, y: 0 });
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx < -SWIPE_THRESHOLD) {
                    // Swipe left - delete
                    Animated.timing(position, {
                        toValue: { x: -SCREEN_WIDTH, y: 0 },
                        duration: 200,
                        useNativeDriver: false,
                    }).start(() => handleSwipeComplete('left'));
                } else if (gesture.dx > SWIPE_THRESHOLD) {
                    // Swipe right - keep
                    Animated.timing(position, {
                        toValue: { x: SCREEN_WIDTH, y: 0 },
                        duration: 200,
                        useNativeDriver: false,
                    }).start(() => handleSwipeComplete('right'));
                } else {
                    // Snap back
                    Animated.spring(position, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false,
                    }).start();
                }
            },
        })
    ).current;

    const deleteOpacity = position.x.interpolate({
        inputRange: [-SWIPE_THRESHOLD, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const keepOpacity = position.x.interpolate({
        inputRange: [0, SWIPE_THRESHOLD],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const cardRotation = position.x.interpolate({
        inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        outputRange: ['-10deg', '0deg', '10deg'],
    });

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading your photos...</Text>
            </View>
        );
    }

    if (assets.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No photos or videos found</Text>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentAsset = assets[currentIndex];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}>
                    <Text style={styles.headerButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.counter}>
                    {currentIndex + 1} / {totalCount}
                </Text>
                <View style={{ width: 50 }} />
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
                <Text style={styles.instructionText}>
                    ← Swipe left to delete | Swipe right to keep →
                </Text>
            </View>

            {/* Image Card */}
            <View style={styles.cardContainer}>
                {/* Delete indicator */}
                <Animated.View style={[styles.indicator, styles.deleteIndicator, { opacity: deleteOpacity }]}>
                    <Text style={styles.indicatorText}>DELETE</Text>
                </Animated.View>

                {/* Keep indicator */}
                <Animated.View style={[styles.indicator, styles.keepIndicator, { opacity: keepOpacity }]}>
                    <Text style={[styles.indicatorText, { color: '#4CAF50' }]}>KEEP</Text>
                </Animated.View>

                <Animated.View
                    style={[
                        styles.card,
                        {
                            transform: [
                                { translateX: position.x },
                                { rotate: cardRotation }
                            ]
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    <Image
                        source={{ uri: currentAsset.uri }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                    <View style={styles.imageInfo}>
                        <Text style={styles.imageDate}>
                            {new Date(currentAsset.creationTime).toLocaleDateString()}
                        </Text>
                        <Text style={styles.imageType}>
                            {currentAsset.mediaType === 'video' ? '🎬 Video' : '📷 Photo'}
                        </Text>
                    </View>
                </Animated.View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => {
                        Animated.timing(position, {
                            toValue: { x: -SCREEN_WIDTH, y: 0 },
                            duration: 200,
                            useNativeDriver: false,
                        }).start(() => handleSwipeComplete('left'));
                    }}
                >
                    <Text style={styles.actionButtonText}>🗑️ Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.keepButton]}
                    onPress={() => {
                        Animated.timing(position, {
                            toValue: { x: SCREEN_WIDTH, y: 0 },
                            duration: 200,
                            useNativeDriver: false,
                        }).start(() => handleSwipeComplete('right'));
                    }}
                >
                    <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>✓ Keep</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centerContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 10,
    },
    headerButton: {
        fontSize: 16,
        color: '#007AFF',
    },
    counter: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    instructions: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        alignItems: 'center',
    },
    instructionText: {
        fontSize: 12,
        color: '#888',
    },
    cardContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: SCREEN_WIDTH - 40,
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 15,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    image: {
        flex: 1,
        width: '100%',
        backgroundColor: '#eee',
    },
    imageInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    imageDate: {
        fontSize: 14,
        color: '#666',
    },
    imageType: {
        fontSize: 14,
        color: '#666',
    },
    indicator: {
        position: 'absolute',
        top: '45%',
        padding: 10,
        borderRadius: 5,
        borderWidth: 3,
        zIndex: 10,
    },
    deleteIndicator: {
        right: 30,
        borderColor: '#FF3B30',
    },
    keepIndicator: {
        left: 30,
        borderColor: '#4CAF50',
    },
    indicatorText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF3B30',
    },
    quickActions: {
        flexDirection: 'row',
        padding: 20,
        paddingBottom: 40,
    },
    actionButton: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    deleteButton: {
        backgroundColor: '#FFE5E5',
    },
    keepButton: {
        backgroundColor: '#E5FFE5',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF3B30',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#666',
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
