/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 */
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console (could send to analytics service in production)
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="warning-outline" size={64} color="#FF3B30" />
                        </View>
                        <Text style={styles.title}>Oops! Something went wrong</Text>
                        <Text style={styles.message}>
                            We encountered an unexpected error. Please try again.
                        </Text>
                        <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
                            <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    button: {
        flexDirection: 'row',
        backgroundColor: '#007AFF',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
});

export default ErrorBoundary;
