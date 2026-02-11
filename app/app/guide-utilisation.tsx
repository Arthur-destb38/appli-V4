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
import { useDemo } from '../src/contexts/DemoContext';
import { useTranslations } from '@/hooks/usePreferences';

interface GuideSectionProps {
  number: string;
  title: string;
  icon: string;
  iconColor: string;
  children: React.ReactNode;
  delay: number;
}

const GuideSection: React.FC<GuideSectionProps> = ({
  number,
  title,
  icon,
  iconColor,
  children,
  delay,
}) => {
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

export default function GuideUtilisationScreen() {
  const { theme } = useAppTheme();
  const { t } = useTranslations();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const { startDemo } = useDemo();

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
            <Ionicons name="book" size={20} color="#fff" />
          </LinearGradient>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Guide d&apos;utilisation
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.introCard,
            { backgroundColor: theme.colors.surfaceMuted },
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
                },
              ],
            },
          ]}
        >
          <View style={styles.introIconContainer}>
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.introIcon}>
              <Ionicons name="fitness" size={24} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={[styles.introText, { color: theme.colors.textSecondary }]}>
            Découvre comment tirer le meilleur parti de Gorillax : suivi des séances, programmes,
            feed social et plus encore.
          </Text>
          <TouchableOpacity
            style={[styles.demoButton, { backgroundColor: theme.colors.accent + '20', marginTop: 12 }]}
            onPress={() => { router.replace('/(tabs)' as any); startDemo(); }}
          >
            <Ionicons name="videocam-outline" size={20} color={theme.colors.accent} />
            <Text style={[styles.demoButtonText, { color: theme.colors.accent }]}>
              {t('demoButton')}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <GuideSection
          number="1"
          title="Accueil"
          icon="home"
          iconColor="#6366f1"
          delay={100}
        >
          Sur l&apos;onglet Accueil tu vois ton tableau de bord : ton streak (jours consécutifs),
          l&apos;objectif de la semaine (ex. 3/4 séances) et ta prochaine séance. Utilise le menu
          (icône hamburger) pour accéder à la Progression, à Mon Programme et aux Paramètres. Tu
          peux lancer une séance en un clic depuis la carte « Prochaine séance ».
        </GuideSection>

        <GuideSection
          number="2"
          title="Créer et faire une séance"
          icon="barbell"
          iconColor="#10b981"
          delay={150}
        >
          Depuis l&apos;accueil ou le menu, choisis « Créer une séance ». Donne un titre (ex. Push
          Day), ajoute des exercices depuis la bibliothèque (recherche par nom). Pendant
          l&apos;entraînement, note tes séries : poids, reps, RPE. Le chrono entre les séries t&apos;aide
          à garder le rythme. Quand tu as fini, marque la séance comme terminée : elle sera
          enregistrée dans ton historique et ta progression.
        </GuideSection>

        <GuideSection
          number="3"
          title="Mon Programme"
          icon="calendar"
          iconColor="#f59e0b"
          delay={200}
        >
          Dans Mon Programme tu organises tes semaines : tu vois tes séances par jour. Clique sur une
          séance pour la lancer et la faire. Tu peux aussi créer un nouveau programme (Créer un
          programme) pour planifier plusieurs semaines à l&apos;avance.
        </GuideSection>

        <GuideSection
          number="4"
          title="Réseau (Feed)"
          icon="people"
          iconColor="#ec4899"
          delay={250}
        >
          L&apos;onglet Réseau affiche le feed : les séances partagées par la communauté. Tu peux liker
          un post (cœur), commenter, et cliquer sur un pseudo pour voir le profil public (stats, bio,
          séances). Le classement (volume, fréquence) est accessible depuis le feed pour te comparer
          aux autres.
        </GuideSection>

        <GuideSection
          number="5"
          title="Explorer et défis"
          icon="trophy"
          iconColor="#8b5cf6"
          delay={300}
        >
          Dans l&apos;onglet Explorer tu découvres les défis communautaires. Ouvre un défi pour voir les
          règles et les récompenses, puis rejoins-le. Tu peux aussi rechercher des séances ou des
          utilisateurs depuis la barre de recherche.
        </GuideSection>

        <GuideSection
          number="6"
          title="Messages"
          icon="chatbubbles"
          iconColor="#06b6d4"
          delay={350}
        >
          L&apos;onglet Messages liste tes conversations. Ouvre une conversation ou crée un nouveau
          message pour échanger en privé avec un autre membre. Tu peux aussi envoyer un message
          depuis le profil d&apos;un utilisateur (bouton « Envoyer un message »).
        </GuideSection>

        <GuideSection
          number="7"
          title="Profil et paramètres"
          icon="person"
          iconColor="#6366f1"
          delay={400}
        >
          Sur ton Profil tu vois ton avatar, pseudo, bio, objectif et tes stats (séances, exercices).
          Depuis le menu du profil : Mon profil public, Progression, Mon Programme, Mes Objectifs,
          Notifications. Les Réglages donnent accès aux Paramètres (infos, préférences, apparence,
          langue), aux Conditions d&apos;utilisation et à la Confidentialité. Le bouton Déconnexion te
          ramène à l&apos;écran de connexion.
        </GuideSection>

        <View style={[styles.footer, { marginTop: 24, marginBottom: 40 }]}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Bonne séance avec Gorillax 🦍
          </Text>
        </View>
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
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  demoButtonText: {
    fontSize: 15,
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
  },
  footerText: {
    fontSize: 14,
  },
});
