import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as MediaLibrary from 'expo-media-library';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import GalleryScreen from './src/screens/GalleryScreen';
import PhotoViewer from './src/screens/PhotoViewer';
import TrashScreen from './src/screens/TrashScreen';

const isWeb = Platform.OS === 'web';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('gallery');
  const [hasPermission, setHasPermission] = useState(isWeb ? true : null);
  const [trashedItems, setTrashedItems] = useState([]);

  // For photo viewer
  const [viewerAssets, setViewerAssets] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    if (!isWeb) {
      checkPermission();
    }
  }, []);

  const checkPermission = async () => {
    try {
      const result = await MediaLibrary.requestPermissionsAsync();
      console.log('Permission result:', result);

      if (result.status === 'granted' || result.status === 'limited' || result.accessPrivileges === 'limited') {
        setHasPermission(true);
      } else {
        setHasPermission(false);
      }
    } catch (error) {
      console.log('Permission error (proceeding anyway):', error);
      setHasPermission(true);
    }
  };

  const requestPermission = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    setHasPermission(status === 'granted' || status === 'limited');
  };

  const addToTrash = (item) => {
    const trashedItem = {
      ...item,
      trashedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };
    setTrashedItems(prev => [...prev, trashedItem]);
  };

  const restoreFromTrash = (itemId) => {
    setTrashedItems(trashedItems.filter(item => item.id !== itemId));
  };

  const deleteFromTrash = async (itemId) => {
    const item = trashedItems.find(i => i.id === itemId);
    if (item) {
      try {
        if (!isWeb) {
          await MediaLibrary.deleteAssetsAsync([item.id]);
        }
        setTrashedItems(trashedItems.filter(i => i.id !== itemId));
      } catch (error) {
        Alert.alert('Error', 'Could not delete the file');
      }
    }
  };

  const emptyTrash = async () => {
    try {
      if (!isWeb) {
        const ids = trashedItems.map(item => item.id);
        if (ids.length > 0) {
          await MediaLibrary.deleteAssetsAsync(ids);
        }
      }
      setTrashedItems([]);
    } catch (error) {
      Alert.alert('Error', 'Could not empty trash');
    }
  };

  const openPhotoViewer = (assets, index) => {
    console.log('openPhotoViewer called');
    console.log('Assets count:', assets ? assets.length : 'null');
    console.log('Index:', index);
    if (!assets || assets.length === 0) {
      console.error('No assets passed to viewer!');
      return;
    }
    setViewerAssets(assets);
    setViewerIndex(index);
    setCurrentScreen('viewer');
  };

  // Permission screen
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>SwipeClean</Text>
        <Text style={styles.message}>
          We need access to your photos and videos to help you clean them up.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <StatusBar style="dark" />
      </View>
    );
  }

  // Loading screen
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>SwipeClean</Text>
        <Text style={styles.message}>Loading...</Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.appContainer}>
        {currentScreen === 'gallery' && (
          <GalleryScreen
            onOpenPhoto={openPhotoViewer}
            onOpenTrash={() => setCurrentScreen('trash')}
            trashedCount={trashedItems.length}
            onDeleteSelected={(items) => {
              items.forEach(item => addToTrash(item));
            }}
          />
        )}
        {currentScreen === 'viewer' && (
          <PhotoViewer
            assets={viewerAssets}
            initialIndex={viewerIndex}
            onClose={() => setCurrentScreen('gallery')}
            onTrash={addToTrash}
          />
        )}
        {currentScreen === 'trash' && (
          <TrashScreen
            onBack={() => setCurrentScreen('gallery')}
            items={trashedItems}
            onRestore={restoreFromTrash}
            onDelete={deleteFromTrash}
            onEmptyTrash={emptyTrash}
          />
        )}
        <StatusBar style={currentScreen === 'viewer' ? 'light' : 'dark'} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
