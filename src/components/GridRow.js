import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_PADDING = 20;
const SPACING = 4;
const AVAILABLE_WIDTH = SCREEN_WIDTH - (GRID_PADDING * 2);
const ITEM_SIZE = (AVAILABLE_WIDTH - (SPACING * (NUM_COLUMNS - 1))) / NUM_COLUMNS;

const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const GridRow = React.memo(({ row, rowIndex, selectedIds, isSelectionMode, onTap, onLongPress }) => (
    <View style={styles.row}>
        {row.data.map((item, colIndex) => {
            if (item.isSpacer) return <View key={item.id} style={styles.gridItemSpacer} />;
            const isSelected = selectedIds.includes(item.id);
            return (
                <View key={item.id}>
                    <TouchableOpacity
                        style={styles.gridItem}
                        onPress={() => onTap(item)}
                        onLongPress={() => onLongPress(item.id)}
                        activeOpacity={0.7}
                        delayLongPress={200}
                    >
                        <Image source={{ uri: item.uri }} style={styles.thumbnail} />
                        {item.mediaType === 'video' && (
                            <View style={styles.videoBadge}>
                                <Ionicons name="videocam" size={12} color="#fff" />
                                <Text style={styles.videoDuration}>{formatDuration(item.duration)}</Text>
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
                </View>
            );
        })}
    </View>
), (prevProps, nextProps) => {
    // Custom comparison for better memoization
    if (prevProps.isSelectionMode !== nextProps.isSelectionMode) return false;
    if (prevProps.row.id !== nextProps.row.id) return false;

    // Check if any item in this row changed selection status
    for (const item of prevProps.row.data) {
        if (item.isSpacer) continue;
        const wasSelected = prevProps.selectedIds.includes(item.id);
        const isSelected = nextProps.selectedIds.includes(item.id);
        if (wasSelected !== isSelected) return false;
    }
    return true;
});

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        marginBottom: SPACING,
        paddingHorizontal: GRID_PADDING,
        gap: SPACING,
    },
    gridItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        marginBottom: SPACING,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
    },
    gridItemSpacer: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        marginBottom: SPACING, // Same as gridItem
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    videoBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
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
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: 8,
    },
    selectedOverlay: {
        backgroundColor: 'rgba(0,0,0,0.4)',
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
        backgroundColor: '#007AFF', // iOS Blue
        borderColor: '#007AFF',
    },
});

export default GridRow;
