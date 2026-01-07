import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Linking,
    Modal,
    ScrollView,
    SafeAreaView,
    Platform,
    StatusBar,
    Alert,
    BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isPremiumUser, setPremiumStatus } from '../utils/premium';
import { getPremiumPrice } from '../utils/pricing';
import CustomModal from '../components/CustomModal';

const LegalHeader = ({ children }) => (
    <Text style={styles.legalHeader}>{children}</Text>
);

const LegalText = ({ children }) => (
    <Text style={styles.legalText}>{children}</Text>
);

const PrivacyPolicyContent = () => (
    <View>
        <LegalText>
            <Text style={{ fontWeight: 'bold' }}>Last Updated:</Text> January 6, 2026
        </LegalText>
        <View style={{ height: 16 }} />

        <LegalHeader>1. Data Storage & Privacy</LegalHeader>
        <LegalText>SwipeClean is designed with privacy as a priority.</LegalText>
        <LegalText>• <Text style={{ fontWeight: 'bold' }}>Local Processing:</Text> All photo and video analysis happens locally on your device. We do not upload your personal media to any external servers.</LegalText>
        <LegalText>• <Text style={{ fontWeight: 'bold' }}>No Account Required:</Text> You do not need to create an account to use SwipeClean.</LegalText>
        <LegalText>• <Text style={{ fontWeight: 'bold' }}>Data Deletion:</Text> When you delete a photo or video in SwipeClean, it is moved to the "Trash" (bin icon) before deleting it permanently. Please be careful when deleting items.</LegalText>

        <LegalHeader>2. Advertising</LegalHeader>
        <LegalText>We use Google AdMob to display advertisements in the free version of the app.</LegalText>

        <LegalText>You can remove ads via the Premium purchase.</LegalText>

        <LegalHeader>3. Contact Us</LegalHeader>
        <LegalText>If you have questions about privacy, please contact us at: deepmishra1283@gmail.com</LegalText>
    </View>
);

const TermsContent = () => (
    <View>
        <LegalText>
            <Text style={{ fontWeight: 'bold' }}>Last Updated:</Text> January 6, 2026
        </LegalText>
        <View style={{ height: 16 }} />

        <LegalHeader>1. Welcome</LegalHeader>
        <LegalText>By using SwipeClean, you agree to these terms. We hope you find the app helpful!</LegalText>

        <LegalHeader>2. Your Content, Your Choice</LegalHeader>
        <LegalText>• You are in full control of your photos and videos. SwipeClean is here to help you organize, but the final decision to delete something is always yours.</LegalText>
        <LegalText>• We recommend backing up your favorite memories before doing a big cleanup, just to be safe.</LegalText>
        <LegalText>• Please double-check before confirming deletions, as we cannot be responsible for any accidental loss of data.</LegalText>

        <LegalHeader>3. Premium Purchases</LegalHeader>
        <LegalText>• "Remove Ads" is a one-time purchase.</LegalText>
        <LegalText>• You may restore this purchase on other devices linked to the same app store account.</LegalText>

        <LegalHeader>4. Changes to Terms</LegalHeader>
        <LegalText>We reserve the right to modify these terms at any time.</LegalText>
    </View>
);

export default function SettingsScreen({ onClose, onRestore }) {
    const [privacyVisible, setPrivacyVisible] = useState(false);
    const [termsVisible, setTermsVisible] = useState(false);
    const [premiumStatus, setPremiumStatusLocal] = useState('Checking...');

    // Custom Modal State
    const [modalConfig, setModalConfig] = useState({
        visible: false,
        title: '',
        message: '',
        icon: '',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => { },
        type: 'info'
    });

    const price = getPremiumPrice();

    const showModal = (config) => {
        setModalConfig({ ...config, visible: true });
    };

    const hideModal = () => {
        setModalConfig(prev => ({ ...prev, visible: false }));
    };

    React.useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (modalConfig.visible) {
                setModalConfig({ ...modalConfig, visible: false });
                return true;
            }
            if (privacyVisible) {
                setPrivacyVisible(false);
                return true;
            }
            if (termsVisible) {
                setTermsVisible(false);
                return true;
            }
            if (onClose) {
                onClose();
                return true; // prevent default behavior
            }
            return false;
        });

        return () => backHandler.remove();
    }, [privacyVisible, termsVisible, onClose, modalConfig]);

    React.useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        const isPrem = await isPremiumUser();
        setPremiumStatusLocal(isPrem ? 'Premium Member' : 'Free User');
    };

    const handleEmail = () => {
        Linking.openURL('mailto:deepmishra1283@gmail.com?subject=SwipeClean Support');
    };

    const handlePurchase = () => {
        showModal({
            title: "Remove Ads",
            message: `Remove all ads for a one-time payment of ${price.label}?`,
            icon: "diamond-outline",
            confirmText: `Pay ${price.label}`,
            cancelText: "Cancel",
            type: 'default',
            onConfirm: async () => {
                hideModal();
                // Simulate processing
                setTimeout(async () => {
                    await setPremiumStatus(true);
                    await checkStatus();
                    showModal({
                        title: "Success!",
                        message: "Ads have been removed. Thank you for your support!",
                        icon: "checkmark-circle",
                        type: 'success',
                        onConfirm: hideModal
                    });
                }, 500);
            },
            onCancel: hideModal
        });
    };

    const handleRestore = async () => {
        showModal({
            title: "Restore Purchase",
            message: "Checking for previous purchases...",
            icon: "refresh",
            type: 'info',
            onConfirm: async () => {
                hideModal();
                // Simulate restore check
                setTimeout(async () => {
                    const isPrem = await isPremiumUser();
                    if (isPrem) {
                        showModal({
                            title: "Already Premium",
                            message: "You already have the premium version enabled.",
                            icon: "information-circle",
                            type: 'info',
                            onConfirm: hideModal
                        });
                    } else {
                        await checkStatus();
                        if (onRestore) onRestore();
                        showModal({
                            title: "Restore Completed",
                            message: "Purchases have been restored.",
                            icon: "checkmark-circle",
                            type: 'success',
                            onConfirm: hideModal
                        });
                    }
                }, 1500);
            }
        });
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="close" size={28} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>

                    {/* Status Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>MEMBERSHIP</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Status</Text>
                            <View style={[styles.badge, premiumStatus === 'Premium Member' ? styles.premiumBadge : styles.freeBadge]}>
                                <Text style={[styles.badgeText, premiumStatus === 'Premium Member' ? styles.premiumBadgeText : styles.freeBadgeText]}>
                                    {premiumStatus}
                                </Text>
                            </View>
                        </View>
                        {premiumStatus !== 'Premium Member' && (
                            <TouchableOpacity style={styles.row} onPress={handlePurchase}>
                                <Text style={styles.label}>Remove Ads (₹129)</Text>
                                <Ionicons name="card-outline" size={20} color="#007AFF" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.row} onPress={handleRestore}>
                            <Text style={styles.label}>Restore Purchase</Text>
                            <Ionicons name="refresh" size={20} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Support Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>SUPPORT</Text>
                        <TouchableOpacity style={styles.row} onPress={handleEmail}>
                            <Text style={styles.label}>Contact Us</Text>
                            <Ionicons name="mail-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                        <Text style={styles.sectionFooter}>
                            Suggestions and complaints are always welcomed.
                        </Text>
                    </View>

                    {/* Legal Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>LEGAL</Text>
                        <TouchableOpacity style={styles.row} onPress={() => setPrivacyVisible(true)}>
                            <Text style={styles.label}>Privacy Policy</Text>
                            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.row} onPress={() => setTermsVisible(true)}>
                            <Text style={styles.label}>Terms & Conditions</Text>
                            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.version}>Version 1.0.0</Text>
                </ScrollView>
            </SafeAreaView>

            {/* Legal Modals */}
            <Modal
                visible={privacyVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setPrivacyVisible(false)} // Handle Android Back Button
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Privacy Policy</Text>
                        <TouchableOpacity onPress={() => setPrivacyVisible(false)}>
                            <Text style={styles.doneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <PrivacyPolicyContent />
                    </ScrollView>
                </View>
            </Modal>

            <Modal
                visible={termsVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setTermsVisible(false)} // Handle Android Back Button
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Terms of Service</Text>
                        <TouchableOpacity onPress={() => setTermsVisible(false)}>
                            <Text style={styles.doneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <TermsContent />
                    </ScrollView>
                </View>
            </Modal>

            <CustomModal
                {...modalConfig}
                onCancel={modalConfig.cancelText ? hideModal : undefined}
                onConfirm={modalConfig.onConfirm || hideModal}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#F2F2F7',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    content: {
        paddingVertical: 20,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginHorizontal: 16,
        marginBottom: 24,
        overflow: 'hidden',
    },
    sectionHeader: {
        fontSize: 13,
        color: '#8E8E93',
        marginBottom: 8,
        marginLeft: 32, // align with text in rows roughly, actually usually outside
        marginTop: 0,
    },
    // Actually iOS grouped style has headers outside
    // Let's adjust
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '400',
        color: '#6D6D72',
        marginBottom: 6,
        marginLeft: 32,
        textTransform: 'uppercase',
    },
    sectionFooter: {
        marginTop: 6,
        marginLeft: 16,
        marginRight: 16,
        marginBottom: 6,
        fontSize: 13,
        color: '#8E8E93',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#C6C6C8',
    },
    label: {
        fontSize: 17,
        color: '#000',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    premiumBadge: {
        backgroundColor: '#FFD700',
    },
    freeBadge: {
        backgroundColor: '#E5E5EA',
    },
    premiumBadgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8B6914',
    },
    freeBadgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
    },
    version: {
        textAlign: 'center',
        color: '#8E8E93',
        marginTop: 20,
        marginBottom: 40,
    },
    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 20 : 60, // Increased top padding for notch/status bar
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700', // Bolder title
    },
    doneText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#007AFF',
    },
    modalContent: {
        padding: 24, // More padding
        paddingBottom: 40,
    },
    legalHeader: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 24,
        color: '#000',
    },
    legalText: {
        fontSize: 16,
        lineHeight: 24, // Better line height
        color: '#333',
        marginBottom: 8,
    },
});
