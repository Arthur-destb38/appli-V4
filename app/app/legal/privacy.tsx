import React, { useRef, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '@/theme/ThemeProvider';

interface PrivacySectionProps {
  icon: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
  delay: number;
}

const PrivacySection: React.FC<PrivacySectionProps> = ({ icon, iconColor, title, children, delay }) => {
  const { theme } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.section,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon as any} size={22} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </Animated.View>
  );
};

interface BulletPointProps {
  children: React.ReactNode;
}

const BulletPoint: React.FC<BulletPointProps> = ({ children }) => {
  const { theme } = useAppTheme();
  return (
    <View style={styles.bulletPoint}>
      <View style={[styles.bulletDot, { backgroundColor: theme.colors.accent }]} />
      <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>{children}</Text>
    </View>
  );
};

export default function PrivacyScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { paddingTop: insets.top + 8 },
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.surfaceMuted }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LinearGradient colors={['#10b981', '#14b8a6']} style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
          </LinearGradient>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Confidentialité
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <Animated.View
          style={[
            styles.introCard,
            { backgroundColor: theme.colors.surfaceMuted },
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <View style={styles.introIconContainer}>
            <LinearGradient colors={['#10b981', '#14b8a6']} style={styles.introIcon}>
              <Ionicons name="lock-closed" size={24} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={[styles.introText, { color: theme.colors.textSecondary }]}>
            Ta vie privée est notre priorité. Voici comment nous protégeons tes données.
          </Text>
        </Animated.View>

        {/* Badge de confiance */}
        <Animated.View
          style={[
            styles.trustBadge,
            { backgroundColor: '#10b98115', borderColor: '#10b98130' },
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          <Text style={[styles.trustBadgeText, { color: '#10b981' }]}>
            Aucune donnée vendue à des tiers
          </Text>
        </Animated.View>

        {/* Sections */}
        <PrivacySection
          icon="phone-portrait"
          iconColor="#6366f1"
          title="Stockage local"
          delay={100}
        >
          <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
            Nous stockons tes données d&apos;entraînement localement sur ton appareil. Aucune donnée n&apos;est partagée sans ton action explicite.
          </Text>
        </PrivacySection>

        <PrivacySection
          icon="share-social"
          iconColor="#f59e0b"
          title="Partage public"
          delay={200}
        >
          <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
            Le partage dans le feed n&apos;est activé que si tu consens au partage public. Tu peux retirer ce consentement à tout moment dans les paramètres.
          </Text>
        </PrivacySection>

        <PrivacySection
          icon="server"
          iconColor="#8b5cf6"
          title="Données collectées"
          delay={300}
        >
          <View style={styles.bulletList}>
            <BulletPoint>Séances et séries enregistrées localement</BulletPoint>
            <BulletPoint>Données de profil (pseudo, consentement) pour le partage</BulletPoint>
            <BulletPoint>Aucune donnée publicitaire</BulletPoint>
            <BulletPoint>Aucun tracking tiers</BulletPoint>
          </View>
        </PrivacySection>

        <PrivacySection
          icon="trash"
          iconColor="#ef4444"
          title="Suppression"
          delay={400}
        >
          <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
            Tu peux supprimer tes données locales en réinstallant l&apos;application. Pour les données partagées sur nos serveurs, contacte le support.
          </Text>
        </PrivacySection>

        <PrivacySection
          icon="mail"
          iconColor="#3b82f6"
          title="Contact"
          delay={500}
        >
          <View style={styles.contactContainer}>
            <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
              Pour toute question concernant tes données :
            </Text>
            <View style={[styles.emailBadge, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="mail" size={16} color="#3b82f6" />
              <Text style={[styles.emailText, { color: '#3b82f6' }]}>support@gorillax.dev</Text>
            </View>
          </View>
        </PrivacySection>

        {/* Footer */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: headerAnim,
            },
          ]}
        >
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Dernière mise à jour : Décembre 2024
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 14,
  },
  introIconContainer: {},
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  trustBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionContent: {},
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
  },
  bulletList: {
    gap: 8,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  contactContainer: {
    gap: 12,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
  },
});
