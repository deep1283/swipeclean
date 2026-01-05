import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    SafeAreaView,
    Platform,
    BackHandler
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    Easing,
    runOnJS,
    interpolate,
    Extrapolate,
    useAnimatedReaction,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;



const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });
};

// Helper to calculate card dimensions based on asset aspect ratio
const getCardDimensions = (asset) => {
    const maxWidth = SCREEN_WIDTH - 20;
    const maxHeight = SCREEN_HEIGHT * 0.7;

    const assetWidth = asset?.width || 1;
    const assetHeight = asset?.height || 1;
    const aspectRatio = assetWidth / assetHeight;

    if (aspectRatio > maxWidth / maxHeight) {
        return { width: maxWidth, height: maxWidth / aspectRatio };
    } else {
        return { width: maxHeight * aspectRatio, height: maxHeight };
    }
};

// --- Child Component: Handles individual card swipe ---
function SwipeableAsset({ asset, onSwipeComplete, onUpdateSwipe, hasPrev, hasNext }) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const context = useSharedValue({ x: 0, y: 0 });

    // Sync child's movement with parent's background scaler
    useAnimatedReaction(
        () => ({ x: translateX.value, y: translateY.value }),
        (current) => {
            if (onUpdateSwipe) {
                runOnJS(onUpdateSwipe)(current.x, current.y);
            }
        }
    );

    const panGesture = Gesture.Pan()
        .activeOffsetX([-20, 20])
        .activeOffsetY([-20, 20])
        .onStart(() => {
            context.value = { x: translateX.value, y: translateY.value };
        })
        .onUpdate((event) => {
            translateX.value = context.value.x + event.translationX;
            translateY.value = context.value.y + event.translationY;
        })
        .onEnd((event) => {
            const { translationX, translationY, velocityX, velocityY } = event;
            const isHorizontal = Math.abs(translationX) > Math.abs(translationY);

            if (isHorizontal) {
                // DELETE (Left)
                if (translationX < -SWIPE_THRESHOLD || velocityX < -800) {
                    translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 250 }, () => {
                        runOnJS(onSwipeComplete)('delete');
                    });
                    return;
                }
            } else {
                // NEXT (Up) - only if hasNext
                if ((translationY < -80 || velocityY < -800) && hasNext) {
                    translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 350, easing: Easing.out(Easing.cubic) }, () => {
                        runOnJS(onSwipeComplete)('next');
                    });
                    return;
                }
                // PREV (Down) - only if hasPrev
                if ((translationY > 80 || velocityY > 800) && hasPrev) {
                    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 350, easing: Easing.out(Easing.cubic) }, () => {
                        runOnJS(onSwipeComplete)('prev');
                    });
                    return;
                }
            }

            // Reset if no action (bounce back)
            translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
            translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
        });

    const cardStyle = useAnimatedStyle(() => {
        const rotate = interpolate(
            translateX.value,
            [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
            [-10, 0, 10],
            Extrapolate.CLAMP
        );
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotate}deg` },
            ],
            zIndex: 2,
        };
    });

    const deleteOverlayStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateX.value,
            [-SWIPE_THRESHOLD, -50, 0],
            [1, 0.5, 0],
            Extrapolate.CLAMP
        );
        return { opacity };
    });

    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    console.log('SwipeableAsset asset:', asset.id, asset.mediaType, asset.uri);

    const togglePlayback = () => {
        setIsPlaying(!isPlaying);
    };

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.card, cardStyle]}>
                {asset.mediaType === 'video' ? (
                    <>
                        <Video
                            ref={videoRef}
                            source={{ uri: asset.uri }}
                            style={styles.image}
                            resizeMode={ResizeMode.CONTAIN}
                            isLooping
                            shouldPlay={isPlaying}
                            onPlaybackStatusUpdate={(status) => {
                                if (status.didJustFinish) setIsPlaying(false);
                            }}
                            onError={(error) => console.log('Video Error:', error)}
                        />
                        <TouchableOpacity
                            style={styles.videoPlayButton}
                            onPress={togglePlayback}
                            activeOpacity={0.7}
                        >
                            {!isPlaying && (
                                <Ionicons
                                    name="play-circle"
                                    size={70}
                                    color="rgba(255,255,255,0.9)"
                                />
                            )}
                        </TouchableOpacity>
                        {/* Pause overlay - empty touchable when playing to pause */}
                        {isPlaying && (
                            <TouchableOpacity
                                style={styles.videoPlayButton}
                                onPress={togglePlayback}
                                activeOpacity={1}
                            />
                        )}
                    </>
                ) : (
                    <Image
                        source={{ uri: asset.uri }}
                        style={styles.image}
                        resizeMode="contain"
                        fadeDuration={0}
                    />
                )}

                <Animated.View style={[styles.stampContainer, deleteOverlayStyle]}>
                    <View style={styles.deleteStamp}>
                        <Ionicons name="trash" size={32} color="#FF3B30" />
                        <Text style={styles.deleteStampText}>TRASH</Text>
                    </View>
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
}

// --- Main Photo Viewer ---
export default function PhotoViewer({ assets, initialIndex, onClose, onTrash }) {
    const [localAssets, setLocalAssets] = useState(assets);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const [bgScale, setBgScale] = useState(0.5);
    const [bgOpacity, setBgOpacity] = useState(0);
    const [swipeDirection, setSwipeDirection] = useState('next'); // 'next' (Up/Left) or 'prev' (Down)

    const handleUpdateSwipe = (x, y) => {
        const displacement = Math.max(Math.abs(x), Math.abs(y));
        // Progress from 0 to 1 based on swipe distance
        const progress = Math.min(displacement, SCREEN_HEIGHT / 3) / (SCREEN_HEIGHT / 3);

        // Scale: 0.5 to 1.0
        const newScale = 0.5 + (progress * 0.5);
        setBgScale(newScale);

        // Opacity: 0 to 1 (fade in as scale grows)
        setBgOpacity(progress);

        // Determine swipe direction
        // For horizontal swipes (delete), always show 'next' card behind
        const isHorizontal = Math.abs(x) > Math.abs(y);
        if (isHorizontal) {
            setSwipeDirection('next');
        } else {
            // For vertical swipes, use Y direction
            if (y > 10) setSwipeDirection('prev');
            else setSwipeDirection('next');
        }
    };

    const handleSwipeComplete = useCallback((action) => {
        setBgScale(0.5); // Reset BG to small
        setBgOpacity(0); // Reset opacity
        if (action === 'delete') {
            const currentAsset = localAssets[currentIndex];
            onTrash(currentAsset);
            const newAssets = localAssets.filter(a => a.id !== currentAsset.id);
            setLocalAssets(newAssets);
            if (newAssets.length === 0) onClose();
            else if (currentIndex >= newAssets.length) setCurrentIndex(newAssets.length - 1);
        } else if (action === 'next') {
            if (currentIndex < localAssets.length - 1) setCurrentIndex(prev => prev + 1);
        } else if (action === 'prev') {
            if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
        }
    }, [currentIndex, localAssets, onTrash, onClose]);

    // Derived State
    if (!localAssets || localAssets.length === 0) return null;
    const currentAsset = localAssets[currentIndex];
    const nextAsset = currentIndex < localAssets.length - 1 ? localAssets[currentIndex + 1] : null;
    const prevAsset = currentIndex > 0 ? localAssets[currentIndex - 1] : null;
    if (!currentAsset) return null;

    // Handle Android Back Button
    useEffect(() => {
        const onBackPress = () => {
            onClose();
            return true; // Prevent default behavior (exit app)
        };

        const subscription = BackHandler.addEventListener(
            'hardwareBackPress',
            onBackPress
        );

        return () => subscription.remove();
    }, [onClose]);

    // Prefetching
    useEffect(() => {
        const prefetch = async () => {
            const urls = [];
            for (let i = 1; i <= 3; i++) {
                if (currentIndex + i < localAssets.length) urls.push(localAssets[currentIndex + i].uri);
            }
            for (let i = 1; i <= 2; i++) {
                if (currentIndex - i >= 0) urls.push(localAssets[currentIndex - i].uri);
            }
            urls.forEach(url => Image.prefetch(url).catch(() => { }));
        };
        prefetch();
    }, [currentIndex, localAssets]);

    // Manual Nav Wrappers
    const manualNext = () => handleSwipeComplete('next');
    const manualPrev = () => handleSwipeComplete('prev');
    const manualDelete = () => {
        // We can't trigger swipe animation from here easily without ref
        // So we just do the logic. Ideally we animate it out, but for now instant is safer glitch-wise.
        handleSwipeComplete('delete');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <SafeAreaView style={styles.headerContainer}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.iconButtonPlaceholder} />
                </View>
            </SafeAreaView>

            <View style={styles.cardContainer}>
                {/* Background Cards (Visuals controlled by parent state) */}
                {nextAsset && (
                    <View style={[
                        styles.card,
                        styles.backgroundCard,
                        {
                            transform: [{ scale: bgScale }],
                            zIndex: 1,
                            opacity: swipeDirection === 'next' ? bgOpacity : 0
                        }
                    ]}>
                        <Image source={{ uri: nextAsset.uri }} style={styles.image} resizeMode="contain" fadeDuration={0} />
                        <View style={styles.dimLayer} />
                    </View>
                )}
                {prevAsset && (
                    <View style={[
                        styles.card,
                        styles.backgroundCard,
                        {
                            transform: [{ scale: bgScale }],
                            zIndex: 1,
                            opacity: swipeDirection === 'prev' ? bgOpacity : 0
                        }
                    ]}>
                        <Image source={{ uri: prevAsset.uri }} style={styles.image} resizeMode="contain" fadeDuration={0} />
                        <View style={styles.dimLayer} />
                    </View>
                )}



                {/* Foreground Card - Keyed by ID to force remount on change */}
                <SwipeableAsset
                    key={currentAsset.id}
                    asset={currentAsset}
                    onSwipeComplete={handleSwipeComplete}
                    onUpdateSwipe={handleUpdateSwipe}
                    hasPrev={!!prevAsset}
                    hasNext={!!nextAsset}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    headerContainer: {
        zIndex: 10,
        backgroundColor: 'transparent',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
    iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    iconButtonPlaceholder: { width: 40 },
    counterContainer: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    counterText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
    card: { width: SCREEN_WIDTH - 20, height: SCREEN_HEIGHT * 0.7, backgroundColor: '#000', borderRadius: 24, overflow: 'hidden', position: 'absolute' },
    backgroundCard: { borderColor: '#222', backgroundColor: '#111' },
    dimLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
    image: { flex: 1, width: '100%', height: '100%' },
    videoIndicator: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
    videoPlayButton: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    cardInfoGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, justifyContent: 'flex-end', padding: 20, backgroundColor: 'rgba(0,0,0,0.6)' },
    cardInfo: { justifyContent: 'flex-end' },
    dateText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
    typeText: { color: '#aaa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
    stampContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    deleteStamp: { borderWidth: 4, borderColor: '#FF3B30', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
    deleteStampText: { color: '#FF3B30', fontSize: 24, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },
});
