import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslations } from '@/hooks/usePreferences';

export default function PaywallScreen() {
  const { theme, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslations();
  const {
    purchaseMonthly,
    purchaseYearly,
    restorePurchases,
    offerings,
  } = useSubscription();

  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');

  const isDark = mode === 'dark';
  const accent = theme.colors.primary;

  const handlePurchase = async () => {
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (selectedPlan === 'yearly') {
        await purchaseYearly();
      } else {
        await purchaseMonthly();
      }
      Alert.alert(t('premiumActivated'), t('premiumActivatedDesc'));
      router.back();
    } catch (e: any) {
      if (e?.userCancelled) return;
      Alert.alert(t('error'), e?.message || t('purchaseError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      await restorePurchases();
      Alert.alert(t('restored'), t('restoredDesc'));
      router.back();
    } catch {
      Alert.alert(t('error'), t('restoreError'));
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: 'barbell-outline' as const, text: t('featureUnlimitedPrograms') },
    { icon: 'analytics-outline' as const, text: t('featureAdvancedStats') },
    { icon: 'time-outline' as const, text: t('featureFullHistory') },
    { icon: 'flag-outline' as const, text: t('featureUnlimitedObjectives') },
    { icon: 'sparkles-outline' as const, text: t('featurePriority') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Close button */}
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={28} color={isDark ? '#fff' : '#333'} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={[accent + '30', 'transparent']}
          style={styles.headerGradient}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="diamond" size={48} color={accent} />
          </View>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#111' }]}>
            Gorillax Premium
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
            {t('paywallSubtitle')}
          </Text>
        </LinearGradient>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: accent + '20' }]}>
                <Ionicons name={feature.icon} size={20} color={accent} />
              </View>
              <Text style={[styles.featureText, { color: isDark ? '#ddd' : '#333' }]}>
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Plan selection */}
        <View style={styles.plansContainer}>
          {/* Yearly */}
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                borderColor: selectedPlan === 'yearly' ? accent : (isDark ? '#333' : '#ddd'),
                backgroundColor: selectedPlan === 'yearly'
                  ? accent + '10'
                  : (isDark ? '#1a1a2e' : '#f8f8f8'),
              },
            ]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.8}
          >
            {selectedPlan === 'yearly' && (
              <View style={[styles.bestValueBadge, { backgroundColor: accent }]}>
                <Text style={styles.bestValueText}>{t('bestValue')}</Text>
              </View>
            )}
            <View style={styles.planHeader}>
              <View style={[
                styles.radioCircle,
                { borderColor: selectedPlan === 'yearly' ? accent : (isDark ? '#555' : '#ccc') },
              ]}>
                {selectedPlan === 'yearly' && (
                  <View style={[styles.radioFill, { backgroundColor: accent }]} />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text style={[styles.planName, { color: isDark ? '#fff' : '#111' }]}>
                  {t('yearlyPlan')}
                </Text>
                <Text style={[styles.planPrice, { color: isDark ? '#aaa' : '#666' }]}>
                  39,99 {t('perYear')}
                </Text>
              </View>
              <View style={styles.planSaving}>
                <Text style={[styles.monthlyEquiv, { color: accent }]}>
                  3,33 /mois
                </Text>
                <Text style={[styles.savingText, { color: isDark ? '#888' : '#999' }]}>
                  {t('save33')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Monthly */}
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                borderColor: selectedPlan === 'monthly' ? accent : (isDark ? '#333' : '#ddd'),
                backgroundColor: selectedPlan === 'monthly'
                  ? accent + '10'
                  : (isDark ? '#1a1a2e' : '#f8f8f8'),
              },
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <View style={styles.planHeader}>
              <View style={[
                styles.radioCircle,
                { borderColor: selectedPlan === 'monthly' ? accent : (isDark ? '#555' : '#ccc') },
              ]}>
                {selectedPlan === 'monthly' && (
                  <View style={[styles.radioFill, { backgroundColor: accent }]} />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text style={[styles.planName, { color: isDark ? '#fff' : '#111' }]}>
                  {t('monthlyPlan')}
                </Text>
                <Text style={[styles.planPrice, { color: isDark ? '#aaa' : '#666' }]}>
                  4,99 {t('perMonth')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: accent, opacity: loading ? 0.7 : 1 }]}
          onPress={handlePurchase}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>{t('subscribe')}</Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
          <Text style={[styles.restoreText, { color: isDark ? '#888' : '#999' }]}>
            {t('restorePurchases')}
          </Text>
        </TouchableOpacity>

        {/* Legal */}
        <Text style={[styles.legalText, { color: isDark ? '#555' : '#bbb' }]}>
          {t('subscriptionLegal')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  headerGradient: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 20,
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  featuresContainer: { marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: { fontSize: 15, fontWeight: '500', flex: 1 },
  plansContainer: { marginBottom: 24, gap: 12 },
  planCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  bestValueText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  planHeader: { flexDirection: 'row', alignItems: 'center' },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioFill: { width: 12, height: 12, borderRadius: 6 },
  planInfo: { flex: 1 },
  planName: { fontSize: 16, fontWeight: '700' },
  planPrice: { fontSize: 13, marginTop: 2 },
  planSaving: { alignItems: 'flex-end' },
  monthlyEquiv: { fontSize: 15, fontWeight: '700' },
  savingText: { fontSize: 11, marginTop: 2 },
  ctaButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  restoreButton: { alignItems: 'center', paddingVertical: 12 },
  restoreText: { fontSize: 14, textDecorationLine: 'underline' },
  legalText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
    paddingHorizontal: 16,
  },
});
