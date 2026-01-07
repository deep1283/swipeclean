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
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

// --- Single Swipeable Card Component ---
function SwipeableCard({ asset, onSwipeComplete, hasPrev, hasNext }) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);
    const context = useSharedValue({ x: 0, y: 0 });

    // Reset position and fade in when asset changes
    useEffect(() => {
        // Immediately hide, reset position, then fade in
        opacity.value = 0;
        translateX.value = 0;
        translateY.value = 0;

        // Fade in after a brief delay to allow Video component to switch
        const timeout = setTimeout(() => {
            opacity.value = withTiming(1, { duration: 150 });
        }, 50);

        return () => clearTimeout(timeout);
    }, [asset.id]);

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
                // DELETE (Swipe Left)
                if (translationX < -SWIPE_THRESHOLD || velocityX < -800) {
                    translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 200 }, () => {
                        runOnJS(onSwipeComplete)('delete');
                    });
                    return;
                }
            } else {
                // NEXT (Swipe Up)
                if ((translationY < -80 || velocityY < -800) && hasNext) {
                    translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 250, easing: Easing.out(Easing.cubic) }, () => {
                        runOnJS(onSwipeComplete)('next');
                    });
                    return;
                }
                // PREV (Swipe Down)
                if ((translationY > 80 || velocityY > 800) && hasPrev) {
                    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250, easing: Easing.out(Easing.cubic) }, () => {
                        runOnJS(onSwipeComplete)('prev');
                    });
                    return;
                }
            }

            // Bounce back if no action
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
            opacity: opacity.value,
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotate}deg` },
            ],
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

    // Reset video state when asset changes
    useEffect(() => {
        setIsPlaying(false);
    }, [asset.id]);

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
                            onError={(error) => {/* console.log('Video Error:', error) */ }}
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

// --- Main Photo Viewer (Simplified) ---
export default function PhotoViewer({ assets, initialIndex, onClose, onTrash }) {
    const [localAssets, setLocalAssets] = useState(assets);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const handleSwipeComplete = useCallback((action) => {
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
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < localAssets.length - 1;
    if (!currentAsset) return null;

    // Handle Android Back Button
    useEffect(() => {
        const onBackPress = () => {
            onClose();
            return true;
        };

        const subscription = BackHandler.addEventListener(
            'hardwareBackPress',
            onBackPress
        );

        return () => subscription.remove();
    }, [onClose]);

    // Prefetch adjacent images
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <SafeAreaView style={styles.headerContainer}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.counterContainer}>
                        <Text style={styles.counterText}>{currentIndex + 1} / {localAssets.length}</Text>
                    </View>
                    <View style={styles.iconButtonPlaceholder} />
                </View>
            </SafeAreaView>

            <View style={styles.cardContainer}>
                {/* Single Card - Simple and Clean */}
                <SwipeableCard
                    asset={currentAsset}
                    onSwipeComplete={handleSwipeComplete}
                    hasPrev={hasPrev}
                    hasNext={hasNext}
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
    card: { width: SCREEN_WIDTH - 20, height: SCREEN_HEIGHT * 0.7, backgroundColor: '#000', borderRadius: 24, overflow: 'hidden' },
    image: { flex: 1, width: '100%', height: '100%' },
    videoPlayButton: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    stampContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    deleteStamp: { borderWidth: 4, borderColor: '#FF3B30', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
    deleteStampText: { color: '#FF3B30', fontSize: 24, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },
});
