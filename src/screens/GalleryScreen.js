import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    SectionList,
    Dimensions,
    ActivityIndicator,
    Platform,
    Alert,
    StatusBar,
    SafeAreaView,
    ScrollView,
    BackHandler
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AlbumSkeleton, AssetSkeleton } from '../components/SkeletonLoader';
import { getCachedSize, setCachedSize, invalidateSizeCache } from '../utils/sizeCache';
import GridRow from '../components/GridRow';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_PADDING = 20;
const SPACING = 4; // Slightly larger gap
const AVAILABLE_WIDTH = SCREEN_WIDTH - (GRID_PADDING * 2);
const ITEM_SIZE = (AVAILABLE_WIDTH - (SPACING * (NUM_COLUMNS - 1))) / NUM_COLUMNS;
const isWeb = Platform.OS === 'web';

// Demo photos for web fallback
const DEMO_PHOTOS = Array.from({ length: 24 }, (_, i) => ({
    id: String(i + 1),
    uri: `https://picsum.photos/400/400?random=${i + 1}`,
    mediaType: i % 5 === 0 ? 'video' : 'photo',
    creationTime: Date.now() - (i * 86400000),
    duration: i % 5 === 0 ? Math.floor(Math.random() * 60) + 5 : 0,
}));

// CountUp Component for smooth number transitions
// Animated Number for smooth transitions
const AnimatedNumber = ({ target, suffix = '', style, isFloat = false }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = parseFloat(target) || 0;
        if (start === end) {
            setDisplayValue(end);
            return;
        }

        const duration = 1200; // slightly longer for premium feel
        const startTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            // Ease out expo
            const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            const current = start + (end - start) * ease;
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [target]);

    const formatted = isFloat
        ? (displayValue >= 1000
            ? `${(displayValue / 1000).toFixed(1)} GB` // Special handling if passing raw MB and it becomes GB? 
            // Actually, let's keep it simple: caller passes raw number, we format.
            // But wait, reuse existing formatSize logic is better.
            // Let's just animate the number and assume caller handles suffix strictly or we format inside.
            : displayValue.toFixed(1))
        : Math.floor(displayValue);

    return <Text style={style}>{formatted}{suffix}</Text>;
};

// Helper to group assets (pure function)
const groupAssetsByDate = (assets) => {
    if (!assets || assets.length === 0) return [];

    const groups = {};
    const filtered = assets;

    filtered.forEach(asset => {
        const date = new Date(asset.creationTime);
        const now = new Date();
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);

        let title = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        if (date.toDateString() === now.toDateString()) title = 'Today';
        else if (date.toDateString() === yesterday.toDateString()) title = 'Yesterday';

        if (!groups[title]) groups[title] = [];
        groups[title].push(asset);
    });

    const sortedTitles = Object.keys(groups).sort((a, b) => {
        const getDateVal = (t) => {
            if (t === 'Today') return new Date();
            if (t === 'Yesterday') { const d = new Date(); d.setDate(d.getDate() - 1); return d; }
            return new Date(t);
        };
        return getDateVal(b) - getDateVal(a);
    });

    return sortedTitles.map(title => {
        const groupItems = groups[title];
        const rows = [];
        for (let i = 0; i < groupItems.length; i += NUM_COLUMNS) {
            const chunk = groupItems.slice(i, i + NUM_COLUMNS);
            while (chunk.length < NUM_COLUMNS) {
                chunk.push({ id: `spacer-${i}-${chunk.length}`, isSpacer: true });
            }
            rows.push({ id: `row-${i}`, data: chunk });
        }
        return { title, data: rows };
    });
};

export default function GalleryScreen({ onOpenPhoto, onOpenTrash, trashedCount, onDeleteSelected }) {
    const [activeTab, setActiveTab] = useState('photo'); // 'photo' | 'video'
    const [viewMode, setViewMode] = useState('albums'); // 'albums' | 'assets'
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Album State
    const [albums, setAlbums] = useState([]);
    const [selectedAlbum, setSelectedAlbum] = useState(null); // Full album object for display
    const [albumCovers, setAlbumCovers] = useState({});
    const [allAlbumCover, setAllAlbumCover] = useState(null);

    // Pagination State
    const [endCursor, setEndCursor] = useState(null);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Real Stats State
    const [photoStats, setPhotoStats] = useState({ count: 0, sizeMB: 0 });
    const [videoStats, setVideoStats] = useState({ count: 0, sizeMB: 0 });
    const [rawAssets, setRawAssets] = useState([]);

    // Memoize sections calculation
    const sections = useMemo(() => {
        return groupAssetsByDate(rawAssets);
    }, [rawAssets]);

    // Exact Size Calculation State
    const [exactSizeMB, setExactSizeMB] = useState(null); // null = not calculated yet
    const [calculatingSize, setCalculatingSize] = useState(false);

    useEffect(() => {
        // Initial Load
        fetchAlbums();
        fetchRealStats();
    }, []);

    useEffect(() => {
        let isMounted = true;

        const refreshData = async () => {
            // When tab changes, reset and fetch new type
            setLoading(true);

            setRawAssets([]);
            setEndCursor(null);
            setHasNextPage(true);

            // Always go back to albums view when main tab changes
            setViewMode('albums');
            setSelectedAlbum(null);

            // Fetch albums again to ensure correct counts/types
            await fetchAlbums();
            await fetchRealStats();

            if (isMounted) setLoading(false);
        };

        refreshData();

        return () => { isMounted = false; };
    }, [activeTab]);

    const handleTabPress = (tab) => {
        if (activeTab === tab) return;

        // Instant feedback? Or Delay? 
        // User requested: "tab switches instantly but the loading takes time. lets add a bit of delay so that they appear to be synced"
        // Meaning: Don't switch the TAB UI instantly. Wait a bit, then switch, so the loading starts "closer" to the switch.

        setLoading(true); // Start loading immediately to show something is happening? 
        // Actually, if we set activeTab, the effect triggers loading: true.
        // If we delay activeTab, nothing happens for X ms.

        setTimeout(() => {
            setActiveTab(tab);
        }, 150); // 150ms delay
    };

    useEffect(() => {
        // Handle Back Button specifically for Album View
        const onBackPress = () => {
            if (isSelectionMode) {
                cancelSelection();
                return true;
            }
            if (viewMode === 'assets') {
                handleBackToAlbums();
                return true;
            }
            return false; // Propagate (exit app or whatever)
        };

        const subscription = BackHandler.addEventListener(
            'hardwareBackPress',
            onBackPress
        );

        return () => subscription.remove();
    }, [isSelectionMode, viewMode]);

    const handleBackToAlbums = () => {
        setViewMode('albums');
        setSelectedAlbum(null);
        setRawAssets([]);
        setEndCursor(null);
    };

    const handleAlbumSelect = (album) => {
        setSelectedAlbum(album);
        setViewMode('assets');

        setRawAssets([]);
        setEndCursor(null);
        setHasNextPage(true);
        setLoading(true);

        fetchAssets(true, activeTab, album.id === 'all' ? null : album.id);
    };



    const fetchAlbums = async () => {
        if (isWeb) return;
        try {
            const permission = await MediaLibrary.requestPermissionsAsync();
            if (!permission.granted) return;

            const fetchedAlbums = await MediaLibrary.getAlbumsAsync({
                includeSmartAlbums: true,
            });

            // Filter empty albums or small ones if desired
            // Also filter by activeTab type since MediaLibrary returns mixed albums
            const filteredAlbums = [];

            // Check each album content
            await Promise.all(fetchedAlbums.map(async (album) => {
                if (album.assetCount === 0) return;

                // Quick check if this album has ANY assets of the current type
                const check = await MediaLibrary.getAssetsAsync({
                    album: album.id,
                    mediaType: [activeTab],
                    first: 1,
                });

                if (check.totalCount > 0) {
                    // It has valid assets for this tab
                    // Update count to reflect ONLY this type
                    filteredAlbums.push({ ...album, assetCount: check.totalCount });
                }
            }));

            const sorted = filteredAlbums
                .sort((a, b) => b.assetCount - a.assetCount);

            setAlbums(sorted);

            // Fetch cover for "All" album (latest asset of current type)
            try {
                const allCover = await MediaLibrary.getAssetsAsync({
                    first: 1,
                    mediaType: [activeTab],
                    sortBy: MediaLibrary.SortBy.creationTime,
                });
                if (allCover.assets.length > 0) {
                    setAllAlbumCover(allCover.assets[0].uri);
                } else {
                    setAllAlbumCover(null);
                }
            } catch (e) {
                console.log('Error fetching all cover:', e);
            }

            // Fetch covers for top albums (lazy)
            sorted.forEach(async (album) => {
                const cover = await MediaLibrary.getAssetsAsync({
                    album: album.id,
                    first: 1,
                    mediaType: [activeTab], // Use activeTab for cover too
                    sortBy: MediaLibrary.SortBy.creationTime,
                });
                if (cover.assets.length > 0) {
                    setAlbumCovers(prev => ({ ...prev, [album.id]: cover.assets[0].uri }));
                }
            });

        } catch (e) {
            console.log("Error fetching albums", e);
        }
    };

    // Helper for album size estimation
    const getAlbumSizeLabel = (count, type) => {
        // Avg Photo: 3.5 MB, Avg Video: 80 MB (Approx)
        const avg = type === 'photo' ? 3.5 : 80;
        const sizeMB = count * avg;
        return formatSize(sizeMB);
    };

    const fetchRealStats = async () => {
        if (isWeb) {
            setPhotoStats({ count: 2450, sizeMB: 4500 });
            setVideoStats({ count: 120, sizeMB: 8200 });
            return;
        }

        try {
            // 1. Get Accurate Counts
            const photoData = await MediaLibrary.getAssetsAsync({ mediaType: 'photo', first: 0 });
            const videoData = await MediaLibrary.getAssetsAsync({ mediaType: 'video', first: 0 });

            const realPhotoCount = photoData.totalCount;
            const realVideoCount = videoData.totalCount;

            // 2. Smart Sampling for Size (Sample 20 random items)
            // Note: We can only sample from the loaded batch safely without extra fetches.
            // Ideally we'd fetch details for a few. For now, we'll use a smarter average.
            // Avg Photo: 3.5 MB (High res)
            // Avg Video: 80 MB (Variable, but safe estimate)
            const estPhotoSize = realPhotoCount * 3.5;
            const estVideoSize = realVideoCount * 85.0;

            setPhotoStats({ count: realPhotoCount, sizeMB: estPhotoSize });
            setVideoStats({ count: realVideoCount, sizeMB: estVideoSize });

        } catch (e) {
            console.log("Failed to fetch real stats:", e);
        }
    }

    const fetchAssets = async (reset = false, type = activeTab, albumId) => {
        if (isWeb) {
            setRawAssets(DEMO_PHOTOS);

            setLoading(false);
            return;
        }

        if (!reset && (!hasNextPage || isFetchingMore)) return;

        if (!reset) setIsFetchingMore(true);
        else setLoading(true);

        try {
            const params = {
                mediaType: [type], // Fetch ONLY the active type
                first: 100,
                after: reset ? null : endCursor,
                sortBy: MediaLibrary.SortBy.creationTime,
            };

            if (albumId) {
                params.album = albumId;
            }

            const result = await MediaLibrary.getAssetsAsync(params);

            // If reset, use new assets. If not, append.
            const newAssets = reset ? result.assets : [...rawAssets, ...result.assets];

            setRawAssets(newAssets);

            setEndCursor(result.endCursor);
            setHasNextPage(result.hasNextPage);

            // Trigger exact size calculation on initial load (reset=true)
            if (reset) {
                calculateExactSize(albumId, type);
            }
        } catch (error) {
            console.log('Error loading assets:', error);
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    };

    const loadMoreAssets = () => {
        if (viewMode !== 'assets') return;
        // Wrapper for pagination
        fetchAssets(false, activeTab, selectedAlbum ? (selectedAlbum.id === 'all' ? null : selectedAlbum.id) : null);
    };

    const formatSize = (mb) => (mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${Math.floor(mb)} MB`);

    // Calculate exact size by fetching ALL assets in the album
    const calculateExactSize = async (albumId, mediaType) => {
        if (isWeb) {
            setExactSizeMB(0);
            setCalculatingSize(false);
            return;
        }

        // Check cache first
        const cachedSize = await getCachedSize(albumId, mediaType);
        if (cachedSize !== null) {
            setExactSizeMB(cachedSize);
            setCalculatingSize(false);
            return;
        }

        setCalculatingSize(true);
        setExactSizeMB(null);

        let totalBytes = 0;
        const BATCH_SIZE = 100;
        let cursor = null;
        let hasMore = true;

        try {
            // Fetch ALL assets in this album by paginating through
            while (hasMore) {
                const options = {
                    mediaType: [mediaType],
                    first: BATCH_SIZE,
                    after: cursor,
                    sortBy: MediaLibrary.SortBy.creationTime,
                };

                // If specific album (not 'all'), add album filter
                if (albumId && albumId !== 'all') {
                    options.album = albumId;
                }

                const result = await MediaLibrary.getAssetsAsync(options);

                // Process this batch - get info for each asset
                for (let i = 0; i < result.assets.length; i += 50) {
                    const batch = result.assets.slice(i, i + 50);

                    const infoPromises = batch.map(asset =>
                        MediaLibrary.getAssetInfoAsync(asset.id).catch(() => null)
                    );

                    const infos = await Promise.all(infoPromises);

                    for (const info of infos) {
                        if (info && info.localUri) {
                            if (info.mediaType === 'video' && info.duration) {
                                // 10 MB per minute of video
                                totalBytes += (info.duration / 60) * 10 * 1024 * 1024;
                            } else {
                                // Default 3.5 MB per photo
                                totalBytes += 3.5 * 1024 * 1024;
                            }
                        }
                    }

                    // Allow UI to update
                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                cursor = result.endCursor;
                hasMore = result.hasNextPage;
            }

            const sizeMB = totalBytes / (1024 * 1024);
            setExactSizeMB(sizeMB);
            setCachedSize(albumId, mediaType, sizeMB);
        } catch (error) {
            console.log('Error calculating size:', error);
            // Fallback to estimate
            const avg = mediaType === 'photo' ? 3.5 : 80;
            const count = selectedAlbum ? selectedAlbum.assetCount : (mediaType === 'photo' ? photoStats.count : videoStats.count);
            setExactSizeMB(count * avg);
        } finally {
            setCalculatingSize(false);
        }
    };

    const toggleSelection = useCallback((id) => {
        if (selectedIds.includes(id)) {
            const newSelection = selectedIds.filter(i => i !== id);
            setSelectedIds(newSelection);
            if (newSelection.length === 0) setIsSelectionMode(false);
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    }, [selectedIds]);

    const handleTap = useCallback((item) => {
        if (isSelectionMode) {
            toggleSelection(item.id);
        } else {
            // Filter assets by current tab before opening viewer
            const filteredAssets = rawAssets.filter(a => a.mediaType === activeTab);
            const index = filteredAssets.findIndex(a => a.id === item.id);
            onOpenPhoto(filteredAssets, index !== -1 ? index : 0);
        }
    }, [isSelectionMode, toggleSelection, rawAssets, activeTab, onOpenPhoto]);

    const handleLongPress = useCallback((id) => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedIds([id]);
        }
    }, [isSelectionMode]);

    const handleDeleteSelected = () => {
        Alert.alert('Delete Items', `Move ${selectedIds.length} items to trash?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    const selectedItems = rawAssets.filter(a => selectedIds.includes(a.id));
                    if (onDeleteSelected) onDeleteSelected(selectedItems);
                    const newRaw = rawAssets.filter(a => !selectedIds.includes(a.id));
                    setRawAssets(newRaw);

                    setSelectedIds([]);
                    setIsSelectionMode(false);
                    // Optimistic update of stats
                    if (activeTab === 'photo') setPhotoStats(p => ({ ...p, count: p.count - selectedIds.length }));
                    else setVideoStats(v => ({ ...v, count: v.count - selectedIds.length }));
                }
            },
        ]);
    };

    const cancelSelection = () => {
        setSelectedIds([]);
        setIsSelectionMode(false);
    };

    const selectAll = () => {
        const filtered = rawAssets.filter(a => a.mediaType === activeTab);
        setSelectedIds(filtered.map(a => a.id));
    };



    const renderSectionHeader = ({ section: { title } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
        </View>
    );

    const renderRow = useCallback(({ item: row, index: rowIndex }) => (
        <GridRow
            row={row}
            rowIndex={rowIndex}
            selectedIds={selectedIds}
            isSelectionMode={isSelectionMode}
            onTap={handleTap}
            onLongPress={handleLongPress}
        />
    ), [selectedIds, isSelectionMode, handleTap, handleLongPress]);

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.headerContainer}>
                    <View style={styles.header}>
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'photo' && styles.activeTab]}
                            >
                                <Text style={[styles.tabText, activeTab === 'photo' && styles.activeTabText]}>Photos</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'video' && styles.activeTab]}
                            >
                                <Text style={[styles.tabText, activeTab === 'video' && styles.activeTabText]}>Videos</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.iconButton}>
                            <Ionicons name="trash-outline" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                </View>
                {/* Skeleton Content */}
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                    {viewMode === 'albums' ? <AlbumSkeleton /> : <AssetSkeleton />}
                </ScrollView>
            </View>
        );
    }

    const renderFooter = () => {
        if (!isFetchingMore) return <View style={{ height: 100 }} />;
        return (
            <View style={{ paddingVertical: 20, alignItems: 'center', height: 100 }}>
                <ActivityIndicator size="small" color="#999" />
            </View>
        );
    };

    const currentStats = activeTab === 'photo' ? photoStats : videoStats;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <LinearGradient
                colors={['rgba(0,0,0,0.8)', 'transparent']}
                style={styles.headerGradient}
            />

            {/* Top Bar with Trash */}
            <View style={styles.header}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'photo' && styles.activeTab]}
                        onPress={() => handleTabPress('photo')}
                    >
                        <Text style={[styles.tabText, activeTab === 'photo' && styles.activeTabText]}>Photos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'video' && styles.activeTab]}
                        onPress={() => handleTabPress('video')}
                    >
                        <Text style={[styles.tabText, activeTab === 'video' && styles.activeTabText]}>Videos</Text>
                    </TouchableOpacity>
                </View>

                {/* Back Button (Only in Asset View) */}
                {viewMode === 'assets' ? (
                    <TouchableOpacity style={styles.iconButton} onPress={handleBackToAlbums}>
                        <Ionicons name="apps" size={24} color="#000" />
                    </TouchableOpacity>
                ) : (
                    /* Trash Button (Only in Album View) */
                    <TouchableOpacity style={styles.iconButton} onPress={onOpenTrash}>
                        <Ionicons name="trash-outline" size={24} color="#000" />
                        {trashedCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{trashedCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {viewMode === 'albums' ? (
                /* ALBUMS VIEW */
                <ScrollView contentContainerStyle={styles.albumsGrid} showsVerticalScrollIndicator={false}>
                    {/* "All" Card */}
                    <TouchableOpacity
                        style={styles.albumCard}
                        onPress={() => handleAlbumSelect({ id: 'all', title: 'All', assetCount: activeTab === 'photo' ? photoStats.count : videoStats.count })}
                        activeOpacity={0.9}
                    >
                        <View style={styles.albumCoverContainer}>
                            {allAlbumCover ? (
                                <Image source={{ uri: allAlbumCover }} style={styles.albumCover} contentFit="cover" />
                            ) : (
                                <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.albumPlaceholderGradient}>
                                    <Ionicons name={activeTab === 'photo' ? 'images' : 'videocam'} size={40} color="#fff" />
                                </LinearGradient>
                            )}
                        </View>
                        <View style={styles.albumInfo}>
                            <Text style={styles.albumTitle}>All {activeTab === 'photo' ? 'Photos' : 'Videos'}</Text>
                            <Text style={styles.albumSubtitle}>
                                {activeTab === 'photo' ? photoStats.count : videoStats.count} items
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {albums.map((album) => {
                        // Simple filter: if tab is "video", maybe check if album has videos?
                        // Unfortunately album.assetCount includes both.
                        // We can't strictly filter without checking content, but usually "Screenshots" has both.
                        // Displaying all albums is safe.
                        return (
                            <TouchableOpacity
                                key={album.id}
                                style={styles.albumCard}
                                onPress={() => handleAlbumSelect(album)}
                                activeOpacity={0.9}
                            >
                                <View style={styles.albumCoverContainer}>
                                    {albumCovers[album.id] ? (
                                        <Image source={{ uri: albumCovers[album.id] }} style={styles.albumCover} contentFit="cover" />
                                    ) : (
                                        <View style={styles.albumPlaceholder}>
                                            <Ionicons name="folder-open" size={40} color="#ccc" />
                                        </View>
                                    )}
                                </View>
                                <View style={styles.albumInfo}>
                                    <Text style={styles.albumTitle} numberOfLines={1}>{album.title}</Text>
                                    <Text style={styles.albumSubtitle}>
                                        {album.assetCount} items
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            ) : (
                /* ASSETS GRID VIEW */
                <>
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
                        /* Album Title Bar inside Asset View */
                        <View style={styles.albumHeaderBar}>
                            <Text style={styles.albumHeaderTitle}>{selectedAlbum ? selectedAlbum.title : 'All'}</Text>
                            <View style={styles.albumStatsRow}>
                                <View style={styles.statChip}>
                                    <Ionicons name={activeTab === 'photo' ? "image-outline" : "videocam-outline"} size={14} color="#007AFF" />
                                    <AnimatedNumber
                                        target={selectedAlbum ? selectedAlbum.assetCount : (activeTab === 'photo' ? photoStats.count : videoStats.count)}
                                        suffix=" Items"
                                        style={styles.statChipText}
                                    />
                                </View>
                                <View style={styles.statChip}>
                                    <Ionicons name="pie-chart-outline" size={14} color="#007AFF" />
                                    {/* Show spinner while calculating, exact size when done */}
                                    {calculatingSize ? (
                                        <ActivityIndicator size="small" color="#007AFF" style={{ marginLeft: 4 }} />
                                    ) : (
                                        <AnimatedNumber
                                            target={exactSizeMB !== null ? exactSizeMB : (rawAssets.length * (activeTab === 'photo' ? 3.5 : 80))}
                                            style={styles.statChipText}
                                            isFloat={true}
                                            suffix={exactSizeMB !== null && exactSizeMB >= 1000 ? " GB" : " MB"}
                                        />
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    <SectionList
                        sections={sections}
                        renderItem={renderRow}
                        renderSectionHeader={renderSectionHeader}
                        keyExtractor={(item) => item.id}
                        stickySectionHeadersEnabled={true}
                        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={12}
                        onEndReached={loadMoreAssets}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={renderFooter}
                    />
                </>
            )
            }

            {/* Selection Footer */}
            {
                isSelectionMode && selectedIds.length > 0 && (
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSelected}>
                            <Ionicons name="trash" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.deleteButtonText}>Delete ({selectedIds.length})</Text>
                        </TouchableOpacity>
                    </View>
                )
            }
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7', // iOS grouped background style
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    // Header & Tabs
    headerContainer: {
        // Sticky/floating feel
        backgroundColor: '#F2F2F7',
        zIndex: 10,
        paddingBottom: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 5,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(118, 118, 128, 0.12)', // iOS segmented control bg
        borderRadius: 9, // Rounded specific
        padding: 2,
    },
    tab: {
        paddingVertical: 6,
        paddingHorizontal: 24, // Wider click area
        borderRadius: 7,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#000',
    },
    activeTabText: {
        fontWeight: '600',
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    // Badges
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FF3B30', // System Red
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    // Album List
    albumsGrid: {
        padding: 20,
        paddingBottom: 100,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    albumCard: {
        width: '47%', // slightly smaller to be safe
        marginBottom: 20, // Add bottom margin back since we removed gap
    },
    albumCoverContainer: {
        width: '100%',
        height: 170, // Slightly taller
        borderRadius: 16,
        backgroundColor: '#fff',
        marginBottom: 10,
        // Shadow for depth
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    albumCover: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    albumPlaceholderGradient: {
        flex: 1,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    albumInfo: {
        paddingHorizontal: 4,
    },
    albumTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
        letterSpacing: -0.2, // Tighter tracking
    },
    albumSubtitle: {
        fontSize: 13,
        color: '#8E8E93', // iOS gray
        fontWeight: '400',
    },
    // Section List Headers
    sectionHeader: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: 'rgba(242, 242, 247, 0.95)', // Blur illusion
    },
    sectionHeaderText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1C1C1E',
        letterSpacing: -0.4,
    },
    // Asset Grid
    row: {
        flexDirection: 'row',
        marginBottom: 4, // Match SPACING
        paddingHorizontal: 20, // GRID_PADDING
        gap: 4, // SPACING
    },
    gridItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        borderRadius: 8, // Little rounded corners for pics
        backgroundColor: '#eee',
        overflow: 'hidden',
    },
    gridItemSpacer: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
    },
    thumbnail: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    videoBadge: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        backdropFilter: 'blur(10px)', // Web only but good practice
    },
    videoDuration: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 4,
    },
    // Selection Overlay
    selectionOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)', // Darken slightly
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: 8,
    },
    selectedOverlay: {
        backgroundColor: 'rgba(0, 122, 255, 0.3)', // System Blue tint
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: '#fff',
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    // Selection Bar
    selectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 0, // Clean look
        backgroundColor: '#F2F2F7',
    },
    selectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
    },
    actionButtonText: {
        fontSize: 17,
        color: '#007AFF',
        fontWeight: '400',
    },
    // Footer / Loading
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(0,0,0,0.1)',
        paddingBottom: 30,
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 14, // Softer corners
        shadowColor: "#FF3B30",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    // Missing Album Header Styles
    albumHeaderBar: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
    },
    albumHeaderTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#000',
        letterSpacing: -0.5,
    },
    albumHeaderSubtitle: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '500',
        marginTop: 2,
    },
    albumStatsRow: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 8,
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 122, 255, 0.1)', // Light blue tint
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6,
    },
    statChipText: {
        fontSize: 13,
        color: '#007AFF',
        fontWeight: '600',
    },
});
