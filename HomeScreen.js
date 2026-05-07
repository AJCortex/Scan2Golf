import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for the logo circle
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleScan = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Scan');
  };

  const handleDemo = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Green', { demo: true, terrainData: null });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background grid */}
      <View style={styles.gridOverlay} pointerEvents="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[styles.gridLine, { top: (height / 8) * i }]} />
        ))}
      </View>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[styles.logoCircle, { transform: [{ scale: pulseAnim }] }]}
        >
          <Text style={styles.logoIcon}>⛳</Text>
        </Animated.View>

        <Text style={styles.title}>SCAN2GOLF</Text>
        <Text style={styles.subtitle}>Read the green. Roll the putt.</Text>

        <View style={styles.divider} />

        {/* Instructions */}
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>HOW TO SCAN YOUR GREEN</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>01</Text>
            <Text style={styles.stepText}>
              Tap <Text style={styles.stepBold}>Scan Golf Green</Text> — walk
              slowly around the green for 30–60 seconds
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>02</Text>
            <Text style={styles.stepText}>
              Tap <Text style={styles.stepBold}>Done Scanning</Text> — terrain
              processes into a 3D model
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>03</Text>
            <Text style={styles.stepText}>
              Swipe to launch balls — they roll on your actual green terrain
            </Text>
          </View>
        </View>

        {/* CTA Buttons */}
        <TouchableOpacity style={styles.primaryButton} onPress={handleScan}>
          <Text style={styles.primaryButtonText}>SCAN GOLF GREEN</Text>
          <Text style={styles.primaryButtonSub}>Use LiDAR camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleDemo}>
          <Text style={styles.secondaryButtonText}>DEMO GREEN</Text>
          <Text style={styles.secondaryButtonSub}>
            Play on procedural terrain
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.footerText}>
          TWIN AXIS STUDIO · SCAN2GOLF v1.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    justifyContent: 'space-between',
  },
  gridOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(74, 222, 128, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    fontSize: 44,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#4ade80',
    letterSpacing: 2,
    marginTop: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: '#4ade80',
    marginVertical: 28,
  },
  instructionsBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    marginBottom: 28,
  },
  instructionsTitle: {
    fontSize: 10,
    color: '#4ade80',
    letterSpacing: 3,
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 11,
    color: '#4ade80',
    fontWeight: '700',
    width: 28,
    letterSpacing: 1,
    marginTop: 1,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 19,
  },
  stepBold: {
    color: '#ffffff',
    fontWeight: '600',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0a1628',
    letterSpacing: 3,
  },
  primaryButtonSub: {
    fontSize: 11,
    color: 'rgba(10,22,40,0.6)',
    marginTop: 3,
    letterSpacing: 1,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 3,
  },
  secondaryButtonSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 3,
    letterSpacing: 1,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 2,
  },
});
