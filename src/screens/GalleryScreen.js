import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    FlatList,
    Dimensions,
    ActivityIndicator,
    Platform,
    Alert,
    StatusBar,
    SafeAreaView
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
// Removed BlurView as it is not used and missing from native build

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const SPACING = 2;
const ITEM_SIZE = (SCREEN_WIDTH - (SPACING * (NUM_COLUMNS - 1))) / NUM_COLUMNS;
const isWeb = Platform.OS === 'web';

// Demo photos for web fallback
const DEMO_PHOTOS = Array.from({ length: 24 }, (_, i) => ({
    id: String(i + 1),
    uri: `https://picsum.photos/400/400?random=${i + 1}`,
    mediaType: i % 5 === 0 ? 'video' : 'photo',
    creationTime: Date.now() - (i * 86400000),
    duration: i % 5 === 0 ? Math.floor(Math.random() * 60) + 5 : 0,
}));

export default function GalleryScreen({ onOpenPhoto, onOpenTrash, trashedCount, onDeleteSelected }) {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [photoCount, setPhotoCount] = useState(0);
    const [videoCount, setVideoCount] = useState(0);
    const [totalSizeMB, setTotalSizeMB] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [endCursor, setEndCursor] = useState(null);

    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        if (isWeb) {
            setAssets(DEMO_PHOTOS);
            setPhotoCount(20);
            setVideoCount(4);
            setTotalSizeMB(1250);
            setLoading(false);
            return;
        }

        try {
            const result = await MediaLibrary.getAssetsAsync({
                mediaType: ['photo', 'video'],
                first: 50,
                sortBy: MediaLibrary.SortBy.creationTime,
            });

            setAssets(result.assets);
            setEndCursor(result.endCursor);
            setHasMore(result.hasNextPage);

            let photos = 0;
            let videos = 0;
            result.assets.forEach(asset => {
                if (asset.mediaType === 'photo') photos++;
                else if (asset.mediaType === 'video') videos++;
            });
            setPhotoCount(photos);
            setVideoCount(videos);

            const estimatedSize = (photos * 3) + (videos * 50);
            setTotalSizeMB(estimatedSize);

            setLoading(false);
        } catch (error) {
            console.log('Error loading assets:', error);
            setAssets(DEMO_PHOTOS);
            setLoading(false);
        }
    };

    const loadMore = async () => {
        if (!hasMore || isWeb || loading) return;

        try {
            const result = await MediaLibrary.getAssetsAsync({
                mediaType: ['photo', 'video'],
                first: 50,
                after: endCursor,
                sortBy: MediaLibrary.SortBy.creationTime,
            });

            if (result.assets.length > 0) {
                setAssets(prev => [...prev, ...result.assets]);
                setEndCursor(result.endCursor);
                setHasMore(result.hasNextPage);

                let photos = photoCount;
                let videos = videoCount;
                result.assets.forEach(asset => {
                    if (asset.mediaType === 'photo') photos++;
                    else if (asset.mediaType === 'video') videos++;
                });
                setPhotoCount(photos);
                setVideoCount(videos);

                const estimatedSize = (photos * 3) + (videos * 50);
                setTotalSizeMB(estimatedSize);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.log('Error loading more assets:', error);
        }
    };

    const formatSize = (mb) => {
        if (mb >= 1000) {
            return `${(mb / 1000).toFixed(1)} GB`;
        }
        return `${mb} MB`;
    };

    const toggleSelection = (id) => {
        if (selectedIds.includes(id)) {
            const newSelection = selectedIds.filter(i => i !== id);
            setSelectedIds(newSelection);
            if (newSelection.length === 0) {
                setIsSelectionMode(false);
            }
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleLongPress = (id) => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedIds([id]);
        }
    };

    const handleTap = (item, index) => {
        if (isSelectionMode) {
            toggleSelection(item.id);
        } else {
            onOpenPhoto(assets, index);
        }
    };

    const handleDeleteSelected = () => {
        Alert.alert(
            'Delete Photos',
            `Move ${selectedIds.length} items to trash?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        const selectedItems = assets.filter(a => selectedIds.includes(a.id));
                        if (onDeleteSelected) {
                            onDeleteSelected(selectedItems);
                        }
                        setAssets(assets.filter(a => !selectedIds.includes(a.id)));
                        setSelectedIds([]);
                        setIsSelectionMode(false);
                        setPhotoCount(prev => prev - selectedItems.filter(a => a.mediaType === 'photo').length);
                        setVideoCount(prev => prev - selectedItems.filter(a => a.mediaType === 'video').length);
                    }
                },
            ]
        );
    };

    const cancelSelection = () => {
        setSelectedIds([]);
        setIsSelectionMode(false);
    };

    const selectAll = () => {
        setSelectedIds(assets.map(a => a.id));
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const renderItem = useCallback(({ item, index }) => {
        const isSelected = selectedIds.includes(item.id);

        return (
            <TouchableOpacity
                style={styles.gridItem}
                onPress={() => handleTap(item, index)}
                onLongPress={() => handleLongPress(item.id)}
                activeOpacity={0.8}
            >
                <Image
                    source={{ uri: item.uri }}
                    style={styles.thumbnail}
                    contentFit="cover"
                />

                {item.mediaType === 'video' && (
                    <View style={styles.videoBadge}>
                        <Ionicons name="videocam" size={12} color="#fff" />
                        <Text style={styles.videoDuration}>
                            {formatDuration(item.duration)}
                        </Text>
                    </View>
                )}

                {isSelectionMode && (
                    <View style={[styles.selectionOverlay, isSelected && styles.selectedOverlay]}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [selectedIds, isSelectionMode, assets, handleTap]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>All Photos</Text>
                    <Text style={styles.subtitle}>{assets.length} items</Text>
                </View>
                <TouchableOpacity style={styles.iconButton} onPress={onOpenTrash}>
                    <Ionicons name="trash-outline" size={24} color="#000" />
                    {trashedCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{trashedCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Selection Mode Header */}
            {isSelectionMode ? (
                <View style={styles.selectionHeader}>
                    <TouchableOpacity onPress={cancelSelection}>
                        <Text style={styles.actionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.selectionTitle}>{selectedIds.length} Selected</Text>
                    <TouchableOpacity onPress={selectAll}>
                        <Text style={styles.actionButtonText}>Select All</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                /* Stats Bar - Only shown when not selecting */
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{photoCount}</Text>
                        <Text style={styles.statLabel}>Photos</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{videoCount}</Text>
                        <Text style={styles.statLabel}>Videos</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{formatSize(totalSizeMB)}</Text>
                        <Text style={styles.statLabel}>Size</Text>
                    </View>
                </View>
            )}

            <FlatList
                data={assets}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={NUM_COLUMNS}
                contentContainerStyle={styles.grid}
                columnWrapperStyle={{ gap: SPACING }}
                showsVerticalScrollIndicator={false}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                removeClippedSubviews={true}
                initialNumToRender={20}
            />

            {/* Selection Footer */}
            {isSelectionMode && selectedIds.length > 0 && (
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSelected}>
                        <Ionicons name="trash" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.deleteButtonText}>Delete ({selectedIds.length})</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#000',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        fontWeight: '500',
        marginTop: 2,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        marginHorizontal: 20,
        marginBottom: 15,
        padding: 12,
        borderRadius: 16,
        justifyContent: 'space-between',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#e1e4e8',
        height: '80%',
        alignSelf: 'center',
    },
    selectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        marginBottom: 10,
    },
    selectionTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    actionButtonText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '500',
    },
    grid: {
        paddingBottom: 100, // Space for footer
        gap: SPACING,
    },
    gridItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        backgroundColor: '#f0f0f0',
        overflow: 'hidden',
    },
    thumbnail: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    videoBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    videoDuration: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 4,
    },
    selectionOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: 8,
    },
    selectedOverlay: {
        backgroundColor: 'rgba(0, 122, 255, 0.2)',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    checkboxSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 10,
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
});
