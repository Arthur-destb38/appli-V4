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

interface SectionProps {
  number: string;
  title: string;
  icon: string;
  iconColor: string;
  children: React.ReactNode;
  delay: number;
}

const Section: React.FC<SectionProps> = ({ number, title, icon, iconColor, children, delay }) => {
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
        <View style={[styles.sectionNumber, { backgroundColor: iconColor + '20' }]}>
          <Text style={[styles.sectionNumberText, { color: iconColor }]}>{number}</Text>
        </View>
        <View style={styles.sectionTitleContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
        </View>
        <View style={[styles.sectionIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
      </View>
      <Text style={[styles.sectionContent, { color: theme.colors.textSecondary }]}>{children}</Text>
    </Animated.View>
  );
};

const TermsScreen: React.FC = () => {
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
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.headerIcon}>
            <Ionicons name="document-text" size={20} color="#fff" />
          </LinearGradient>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Conditions d&apos;utilisation
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
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.introIcon}>
              <Ionicons name="fitness" size={24} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={[styles.introText, { color: theme.colors.textSecondary }]}>
            En utilisant Gorillax, tu acceptes les conditions suivantes. Lis-les attentivement.
          </Text>
        </Animated.View>

        {/* Sections */}
        <Section
          number="1"
          title="Objet"
          icon="apps"
          iconColor="#6366f1"
          delay={100}
        >
          Gorillax permet de planifier, suivre et partager des séances d&apos;entraînement. En utilisant l&apos;application, tu acceptes ces conditions et t&apos;engages à une utilisation personnelle et non commerciale.
        </Section>

        <Section
          number="2"
          title="Comptes et données"
          icon="person-circle"
          iconColor="#10b981"
          delay={200}
        >
          Tu es responsable des informations saisies dans l&apos;application. Nous ne vendons pas tes données. Les séances sont stockées localement et synchronisées uniquement lorsque tu actives la sync.
        </Section>

        <Section
          number="3"
          title="Contenus partagés"
          icon="share-social"
          iconColor="#f59e0b"
          delay={300}
        >
          Les séances que tu rends publiques via le feed doivent rester respectueuses. Nous pouvons retirer tout contenu jugé inapproprié ou contraire à la loi.
        </Section>

        <Section
          number="4"
          title="Limitations"
          icon="warning"
          iconColor="#ef4444"
          delay={400}
        >
          Gorillax ne remplace pas l&apos;avis d&apos;un professionnel de santé. Utilise l&apos;application à tes propres risques. Nous ne sommes pas responsables des dommages résultant d&apos;une mauvaise utilisation.
        </Section>

        <Section
          number="5"
          title="Support"
          icon="help-circle"
          iconColor="#3b82f6"
          delay={500}
        >
          Pour toute question, écris-nous à support@gorillax.dev ou via l&apos;adresse support figurant sur notre site web.
        </Section>

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
};

export default TermsScreen;

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
    marginBottom: 20,
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
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
  },
});
