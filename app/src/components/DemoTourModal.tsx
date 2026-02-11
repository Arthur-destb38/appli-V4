import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/theme/ThemeProvider';

const STEP_DURATION_MS = 4000;
const TOTAL_STEPS = 8;

const DEMO_STEPS: { icon: string; iconColor: string; title: string; description: string }[] = [
  {
    icon: 'home',
    iconColor: '#6366f1',
    title: 'Accueil',
    description: 'Ton tableau de bord : streak, objectif de la semaine et prochaine séance.',
  },
  {
    icon: 'barbell',
    iconColor: '#10b981',
    title: 'Créer une séance',
    description: 'Donne un titre, ajoute des exercices, note tes séries (poids, reps) pendant l\'entraînement.',
  },
  {
    icon: 'calendar',
    iconColor: '#f59e0b',
    title: 'Mon Programme',
    description: 'Organise tes semaines et lance une séance en un clic depuis ton programme.',
  },
  {
    icon: 'people',
    iconColor: '#ec4899',
    title: 'Réseau (Feed)',
    description: 'Vois les séances partagées, like, commente et consulte les profils.',
  },
  {
    icon: 'trophy',
    iconColor: '#8b5cf6',
    title: 'Explorer & Défis',
    description: 'Rejoins des défis communautaires et compare-toi aux autres.',
  },
  {
    icon: 'chatbubbles',
    iconColor: '#06b6d4',
    title: 'Messages',
    description: 'Échange en privé avec d\'autres membres depuis l\'onglet Messages.',
  },
  {
    icon: 'person',
    iconColor: '#6366f1',
    title: 'Profil & Paramètres',
    description: 'Gère ton profil, tes stats, les réglages et déconnecte-toi si besoin.',
  },
  {
    icon: 'fitness',
    iconColor: '#10b981',
    title: 'C\'est parti !',
    description: 'Tu connais les bases. Bonne séance avec Gorillax 🦍',
  },
];

interface DemoTourModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DemoTourModal({ visible, onClose }: DemoTourModalProps) {
  const { theme } = useAppTheme();
  const [step, setStep] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) {
      setStep(0);
      progressAnim.setValue(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STEP_DURATION_MS,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setStep((prev) => {
        if (prev >= TOTAL_STEPS - 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setTimeout(onClose, 400);
          return prev;
        }
        progressAnim.setValue(0);
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: STEP_DURATION_MS,
          useNativeDriver: false,
        }).start();
        return prev + 1;
      });
    }, STEP_DURATION_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  const current = DEMO_STEPS[step];
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={[styles.stepLabel, { color: theme.colors.textSecondary }]}>
              Étape {step + 1}/{TOTAL_STEPS}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[styles.skipButton, { backgroundColor: theme.colors.surfaceMuted }]}
            >
              <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>Passer</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: current.iconColor + '20' }]}>
              <Ionicons name={current.icon as any} size={44} color={current.iconColor} />
            </View>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{current.title}</Text>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {current.description}
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
            <Animated.View
              style={[
                styles.progressBar,
                { backgroundColor: current.iconColor },
                { width: progressWidth },
              ]}
            />
          </View>

          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            Démo automatique • ~30 s
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: width - 48,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
  },
});
