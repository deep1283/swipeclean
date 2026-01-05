import React, { useState, useCallback, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Image,
    Alert,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Platform,
    BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const SPACING = 2; // Match GalleryScreen
const ITEM_SIZE = (SCREEN_WIDTH - (SPACING * (NUM_COLUMNS - 1))) / NUM_COLUMNS;

export default function TrashScreen({ onBack, items, onRestore, onDelete, onEmptyTrash }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Handle Android Back Button
    useEffect(() => {
        const onBackPress = () => {
            onBack();
            return true; // Prevent default behavior (exit app)
        };

        const subscription = BackHandler.addEventListener(
            'hardwareBackPress',
            onBackPress
        );

        return () => subscription.remove();
    }, [onBack]);

    // --- Helpers ---
    const getTimeRemaining = (expiresAt) => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires - now;
        if (diff <= 0) return 'Expired';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days > 0) return `${days}d`;
        return `${hours}h`;
    };

    const confirmEmptyTrash = () => {
        Alert.alert(
            'Empty Trash',
            `Are you sure you want to permanently delete all ${items.length} items? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete All', style: 'destructive', onPress: onEmptyTrash },
            ]
        );
    };

    // --- Selection Logic ---
    const toggleSelection = (id) => {
        if (selectedIds.includes(id)) {
            const newSelection = selectedIds.filter(i => i !== id);
            setSelectedIds(newSelection);
            if (newSelection.length === 0) setIsSelectionMode(false);
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleTap = (item) => {
        if (isSelectionMode) {
            toggleSelection(item.id);
        } else {
            // Tap enters selection mode
            setIsSelectionMode(true);
            toggleSelection(item.id);
        }
    };

    const handleLongPress = (id) => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedIds([id]);
        }
    };

    const handleRestoreSelected = () => {
        selectedIds.forEach(id => onRestore(id));
        setIsSelectionMode(false);
        setSelectedIds([]);
    };

    const handleDeleteSelected = () => {
        Alert.alert(
            'Delete Permanently',
            `Are you sure you want to delete ${selectedIds.length} items forever?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: () => {
                        selectedIds.forEach(id => onDelete(id));
                        setIsSelectionMode(false);
                        setSelectedIds([]);
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
        setSelectedIds(items.map(i => i.id));
    };

    const renderItem = useCallback(({ item }) => {
        const isSelected = selectedIds.includes(item.id);

        return (
            <TouchableOpacity
                style={styles.gridItem}
                onPress={() => handleTap(item)}
                onLongPress={() => handleLongPress(item.id)}
                activeOpacity={0.8}
            >
                <Image source={{ uri: item.uri }} style={styles.thumbnail} resizeMode="cover" />

                <View style={styles.expiryBadge}>
                    <Text style={styles.expiryText}>{getTimeRemaining(item.expiresAt)}</Text>
                </View>

                {isSelectionMode && (
                    <View style={[styles.selectionOverlay, isSelected && styles.selectedOverlay]}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [selectedIds, isSelectionMode]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <SafeAreaView style={styles.headerContainer}>
                <View style={styles.header}>
                    {isSelectionMode ? (
                        <View style={styles.selectionHeaderContent}>
                            <TouchableOpacity onPress={cancelSelection}>
                                <Text style={styles.headerActionText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>{selectedIds.length} Selected</Text>
                            <TouchableOpacity onPress={selectAll}>
                                <Text style={styles.headerActionText}>Select All</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                                <Ionicons name="chevron-back" size={28} color="#007AFF" />
                                <Text style={styles.backText}>Gallery</Text>
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Trash</Text>
                            <TouchableOpacity onPress={confirmEmptyTrash} disabled={items.length === 0}>
                                <Text style={[styles.headerActionText, styles.destructiveText, items.length === 0 && styles.disabledText]}>
                                    Empty
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </SafeAreaView>

            {!isSelectionMode && items.length > 0 && (
                <View style={styles.infoBar}>
                    <Text style={styles.infoText}>Items are deleted after 30 days.</Text>
                </View>
            )}

            {items.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="trash-outline" size={60} color="#ccc" />
                    </View>
                    <Text style={styles.emptyTitle}>Trash is Empty</Text>
                    <Text style={styles.emptySubtitle}>Photos you delete will appear here.</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={NUM_COLUMNS}
                    contentContainerStyle={styles.grid}
                    columnWrapperStyle={{ gap: SPACING }}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {isSelectionMode && (
                <View style={[styles.bottomBar, { justifyContent: 'space-between', paddingHorizontal: 30 }]}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.restoreButton]}
                        onPress={handleRestoreSelected}
                        disabled={selectedIds.length === 0}
                    >
                        <Ionicons name="refresh" size={20} color="#007AFF" />
                        <Text style={styles.restoreButtonText}>Restore</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={handleDeleteSelected}
                        disabled={selectedIds.length === 0}
                    >
                        <Ionicons name="trash" size={20} color="#FF3B30" />
                        <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 50,
    },
    selectionHeaderContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backText: {
        fontSize: 17,
        color: '#007AFF',
        marginLeft: -4,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
    },
    headerActionText: {
        fontSize: 17,
        color: '#007AFF',
        fontWeight: '500',
    },
    destructiveText: {
        color: '#FF3B30',
    },
    disabledText: {
        opacity: 0.3,
    },
    infoBar: {
        backgroundColor: '#f8f8f8',
        paddingVertical: 8,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoText: {
        fontSize: 12,
        color: '#888',
    },
    grid: {
        paddingTop: SPACING,
        paddingBottom: 100,
    },
    gridItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        backgroundColor: '#f0f0f0',
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    expiryBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    expiryText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    selectionOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.4)',
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
    },
    checkboxSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        paddingBottom: 100,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingBottom: 34,
        flexDirection: 'row',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 5,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    restoreButton: {
        backgroundColor: '#F0F8FF',
        flex: 1,
        marginRight: 10,
    },
    restoreButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    deleteButton: {
        backgroundColor: '#FFE5E5',
        flex: 1,
        marginLeft: 10,
    },
    deleteButtonText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
