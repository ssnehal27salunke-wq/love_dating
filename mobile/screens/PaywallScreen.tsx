import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function PaywallScreen({ navigation }: any) {
  const features = [
    'See who liked you',
    'Unlimited daily matches',
    'Advanced filters (Height, Religion, etc.)',
    'Message before matching',
    'Incognito mode',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>Get 3x more matches and find your person faster.</Text>
        </View>

        <View style={styles.featuresList}>
          {features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.pricingOptions}>
          <TouchableOpacity style={[styles.pricingCard, styles.pricingCardActive]} activeOpacity={0.9}>
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
              style={styles.gradientCard}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>MOST POPULAR</Text>
              </View>
              <Text style={styles.planDuration}>6 Months</Text>
              <Text style={styles.planPrice}>$14.99 / mo</Text>
              <Text style={styles.planTotal}>Billed $89.94</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pricingCard} activeOpacity={0.9}>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.gradientCard}
            >
              <Text style={styles.planDuration}>1 Month</Text>
              <Text style={styles.planPrice}>$29.99 / mo</Text>
              <Text style={styles.planTotal}>Billed monthly</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.subscribeButton} activeOpacity={0.9}>
          <Text style={styles.subscribeButtonText}>Continue</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          Recurring billing. Cancel anytime. By continuing, you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'flex-end',
    paddingVertical: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#FFF',
    fontSize: 20,
  },
  heroSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    lineHeight: 24,
  },
  featuresList: {
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureCheck: {
    color: '#0A84FF', // Apple Blue
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 16,
  },
  featureText: {
    color: '#FFF',
    fontSize: 18,
  },
  pricingOptions: {
    gap: 16,
  },
  pricingCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pricingCardActive: {
    borderColor: '#0A84FF',
    borderWidth: 2,
  },
  gradientCard: {
    padding: 24,
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#0A84FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  planDuration: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 10,
  },
  planPrice: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  planTotal: {
    color: '#8E8E93',
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 10 : 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  subscribeButton: {
    backgroundColor: '#FFF',
    height: 56,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscribeButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  disclaimer: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
