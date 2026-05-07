import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { generateTerrainFromScan } from '../utils/terrainGenerator';

const { width, height } = Dimensions.get('window');
const SCAN_DURATION = 45000; // 45 seconds

export default function ScanScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [pointCount, setPointCount] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(null);
  const pointInterval = useRef(null);

  useEffect(() => {
    return () => {
      progressAnimation.current?.stop();
      clearInterval(pointInterval.current);
    };
  }, []);

  const startScan = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setScanning(true);
    setPointCount(0);

    // Animate progress bar
    progressAnimation.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: SCAN_DURATION,
      useNativeDriver: false,
    });
    progressAnimation.current.start(({ finished }) => {
      if (finished) {
        completeScan();
      }
    });

    // Simulate point cloud accumulation
    pointInterval.current = setInterval(() => {
      setPointCount((prev) => {
        const increment = Math.floor(Math.random() * 800 + 400);
        return prev + increment;
      });
    }, 500);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const completeScan = async () => {
    clearInterval(pointInterval.current);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScanning(false);
    setScanComplete(true);
  };

  const stopScanEarly = () => {
    progressAnimation.current?.stop();
    completeScan();
  };

  const processAndContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setProcessing(true);

    // Simulate processing time
    setTimeout(async () => {
      const terrainData = generateTerrainFromScan(pointCount);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('Green', { demo: false, terrainData });
    }, 2500);
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>CAMERA ACCESS NEEDED</Text>
          <Text style={styles.permissionText}>
            Scan2Golf needs camera access to scan your golf green terrain.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>GRANT ACCESS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← BACK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Scan grid overlay */}
      {scanning && (
        <Animated.View style={[styles.scanGrid, { opacity: pulseOpacity }]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={`h${i}`}
              style={[styles.scanLineH, { top: `${(100 / 6) * i}%` }]}
            />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <View
              key={`v${i}`}
              style={[styles.scanLineV, { left: `${(100 / 4) * i}%` }]}
            />
          ))}
        </Animated.View>
      )}

      {/* Corner brackets */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      {/* Top HUD */}
      <View style={[styles.topHUD, { paddingTop: insets.top + 16 }]}>
        {!scanning && !scanComplete && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← BACK</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.hudTitle}>
          {processing
            ? 'PROCESSING TERRAIN'
            : scanComplete
            ? 'SCAN COMPLETE'
            : scanning
            ? 'SCANNING GREEN'
            : 'READY TO SCAN'}
        </Text>
        {scanning && (
          <Text style={styles.pointCounter}>
            {pointCount.toLocaleString()} pts
          </Text>
        )}
      </View>

      {/* Processing overlay */}
      {processing && (
        <View style={styles.processingOverlay}>
          <Text style={styles.processingTitle}>BUILDING TERRAIN MODEL</Text>
          <Text style={styles.processingSubtitle}>
            Converting {pointCount.toLocaleString()} points to mesh...
          </Text>
          <View style={styles.processingDots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
        </View>
      )}

      {/* Bottom controls */}
      {!processing && (
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 24 }]}>
          {!scanning && !scanComplete && (
            <>
              <Text style={styles.instruction}>
                Point camera at the green and walk slowly around it
              </Text>
              <TouchableOpacity style={styles.scanButton} onPress={startScan}>
                <Text style={styles.scanButtonText}>START SCANNING</Text>
              </TouchableOpacity>
            </>
          )}

          {scanning && (
            <>
              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[styles.progressFill, { width: progressWidth }]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  Walk around the green slowly...
                </Text>
              </View>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={stopScanEarly}
              >
                <Text style={styles.doneButtonText}>DONE SCANNING</Text>
              </TouchableOpacity>
            </>
          )}

          {scanComplete && (
            <>
              <Text style={styles.completeText}>
                ✓ {pointCount.toLocaleString()} points captured
              </Text>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={processAndContinue}
              >
                <Text style={styles.scanButtonText}>BUILD GREEN →</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  scanGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  scanLineH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  scanLineV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#4ade80',
    zIndex: 10,
  },
  cornerTL: { top: 100, left: 24, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 100, right: 24, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 180, left: 24, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 180, right: 24, borderBottomWidth: 2, borderRightWidth: 2 },
  topHUD: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    alignItems: 'center',
  },
  backText: {
    color: '#4ade80',
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 8,
  },
  hudTitle: {
    fontSize: 13,
    color: '#4ade80',
    letterSpacing: 4,
    fontWeight: '700',
  },
  pointCounter: {
    fontSize: 11,
    color: 'rgba(74, 222, 128, 0.7)',
    letterSpacing: 2,
    marginTop: 4,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    alignItems: 'center',
  },
  instruction: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  scanButton: {
    width: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  scanButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0a1628',
    letterSpacing: 3,
  },
  doneButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4ade80',
    paddingVertical: 18,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4ade80',
    letterSpacing: 3,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 2,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 1,
  },
  completeText: {
    color: '#4ade80',
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 16,
    fontWeight: '600',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,22,40,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 4,
    marginBottom: 12,
  },
  processingSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 32,
  },
  processingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 3,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#4ade80',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0a1628',
    letterSpacing: 3,
  },
  backButton: {
    padding: 16,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    letterSpacing: 2,
  },
});
