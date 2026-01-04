import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

const isWeb = Platform.OS === 'web';

export default function HomeScreen({ onStartCleaning, onOpenTrash, trashedCount }) {
    const [photoCount, setPhotoCount] = useState(isWeb ? 156 : 0);
    const [videoCount, setVideoCount] = useState(isWeb ? 23 : 0);
    const [storageUsed, setStorageUsed] = useState(isWeb ? '48.2 GB / 128 GB used' : 'Calculating...');

    useEffect(() => {
        if (!isWeb) {
            loadStats();
        }
    }, []);

    const loadStats = async () => {
        try {
            // Get photo count
            const photos = await MediaLibrary.getAssetsAsync({
                mediaType: 'photo',
                first: 1,
            });
            setPhotoCount(photos.totalCount);

            // Get video count
            const videos = await MediaLibrary.getAssetsAsync({
                mediaType: 'video',
                first: 1,
            });
            setVideoCount(videos.totalCount);

            // Get storage info
            const freeSpace = await FileSystem.getFreeDiskStorageAsync();
            const totalSpace = await FileSystem.getTotalDiskCapacityAsync();
            const usedSpace = totalSpace - freeSpace;
            const usedGB = (usedSpace / (1024 * 1024 * 1024)).toFixed(1);
            const totalGB = (totalSpace / (1024 * 1024 * 1024)).toFixed(1);
            setStorageUsed(`${usedGB} GB / ${totalGB} GB used`);
        } catch (error) {
            console.log('Error loading stats:', error);
            // Use demo data on error
            setPhotoCount(156);
            setVideoCount(23);
            setStorageUsed('48.2 GB / 128 GB used');
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>SwipeClean</Text>
                <Text style={styles.subtitle}>Clean your gallery with a swipe</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{photoCount}</Text>
                    <Text style={styles.statLabel}>Photos</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{videoCount}</Text>
                    <Text style={styles.statLabel}>Videos</Text>
                </View>
            </View>

            {/* Storage */}
            <View style={styles.storageBox}>
                <Text style={styles.storageLabel}>Device Storage</Text>
                <Text style={styles.storageValue}>{storageUsed}</Text>
            </View>

            {/* Buttons */}
            <TouchableOpacity style={styles.startButton} onPress={onStartCleaning}>
                <Text style={styles.startButtonText}>Start Cleaning</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.trashButton} onPress={onOpenTrash}>
                <Text style={styles.trashButtonText}>
                    Trash {trashedCount > 0 ? `(${trashedCount})` : ''}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
        paddingTop: 60,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
    },
    statsContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        marginRight: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    storageBox: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    storageLabel: {
        fontSize: 14,
        color: '#666',
    },
    storageValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 5,
    },
    startButton: {
        backgroundColor: '#007AFF',
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 15,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    trashButton: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    trashButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '500',
    },
});
