import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

/**
 * Custom Modal for Confirmations and Alerts
 * @param {boolean} visible - Visibility state
 * @param {string} title - Title of the modal
 * @param {string} message - Message body
 * @param {string} icon - Ionicons name (optional)
 * @param {string} confirmText - Text for confirm button (default: "OK")
 * @param {string} cancelText - Text for cancel button (optional)
 * @param {function} onConfirm - Confirm action handler
 * @param {function} onCancel - Cancel action handler (if cancelText provided)
 * @param {string} type - 'success' | 'danger' | 'info' (default: 'info')
 */
export default function CustomModal({
    visible,
    title,
    message,
    icon,
    confirmText = "OK",
    cancelText,
    onConfirm,
    onCancel,
    type = 'info'
}) {
    if (!visible) return null;

    const getIconColor = () => {
        if (type === 'success') return '#34C759'; // iOS Green
        if (type === 'danger') return '#FF3B30'; // iOS Red
        return '#007AFF'; // iOS Blue
    };

    const getButtonColor = () => {
        if (type === 'danger') return '#FF3B30';
        return '#007AFF';
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel || onConfirm}
        >
            <View style={styles.overlay}>
                {Platform.OS === 'ios' && (
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                )}

                <View style={styles.modalContainer}>
                    {icon && (
                        <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '20' }]}>
                            <Ionicons name={icon} size={32} color={getIconColor()} />
                        </View>
                    )}

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonRow}>
                        {cancelText && (
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={onCancel}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelButtonText}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.confirmButton,
                                { backgroundColor: getButtonColor(), flex: cancelText ? 1 : 0, minWidth: cancelText ? 0 : 120 }
                            ]}
                            onPress={onConfirm}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.confirmButtonText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: Platform.OS === 'android' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: Math.min(width - 60, 340),
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'center',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#F2F2F7',
        flex: 1,
    },
    confirmButton: {
        // bg color set dynamically
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8.0,
        elevation: 4,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    }
});
