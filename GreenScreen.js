import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as THREE from 'three';

import { generateDemoTerrain } from '../utils/terrainGenerator';
import { updateBall, launchBallFromSwipe, createBall } from '../utils/ballPhysics';

const { width, height } = Dimensions.get('window');

// ─── 3D Green Mesh ────────────────────────────────────────────────────────────

function GreenMesh({ terrainData }) {
  const meshRef = useRef();
  const gridSize = terrainData.gridSize;
  const segments = gridSize - 1;

  const geometry = React.useMemo(() => {
    const geo = new THREE.PlaneGeometry(4, 4, segments, segments);
    const positions = geo.attributes.position.array;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const idx = (i * gridSize + j) * 3;
        const h = terrainData.grid[i][j];
        positions[idx + 2] = h * 0.8; // Z is height (plane is XY)
      }
    }

    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [terrainData]);

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshLambertMaterial color="#2d6a2d" side={THREE.DoubleSide} />
    </mesh>
  );
}

function FringeMesh() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[5.5, 5.5]} />
      <meshLambertMaterial color="#1a4d1a" />
    </mesh>
  );
}

function HoleMarker({ position }) {
  const flagRef = useRef();
  useFrame((state) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.15;
    }
  });

  return (
    <group position={position}>
      {/* Cup */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshLambertMaterial color="#111111" />
      </mesh>
      {/* Flagstick */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.6]} />
        <meshLambertMaterial color="#cccccc" />
      </mesh>
      {/* Flag */}
      <mesh ref={flagRef} position={[0.08, 0.55, 0]}>
        <planeGeometry args={[0.18, 0.12]} />
        <meshLambertMaterial color="#ff3333" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function BallMesh({ ball }) {
  const meshRef = useRef();

  return (
    <mesh
      ref={meshRef}
      position={[
        (ball.x - 0.5) * 4,
        0.06,
        (ball.y - 0.5) * 4,
      ]}
    >
      <sphereGeometry args={[0.05, 12, 12]} />
      <meshLambertMaterial color="#ffffff" />
    </mesh>
  );
}

function Scene({ terrainData, balls }) {
  const holePos = terrainData.holePosition;
  const holeWorldPos = [
    (holePos.x - 0.5) * 4,
    0.05,
    (holePos.y - 0.5) * 4,
  ];

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 3]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 4, -2]} intensity={0.4} />

      <GreenMesh terrainData={terrainData} />
      <FringeMesh />
      <HoleMarker position={holeWorldPos} />

      {balls.map((ball) => (
        <BallMesh key={ball.id} ball={ball} />
      ))}
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GreenScreen({ navigation, route }) {
  const { demo, terrainData: scannedData } = route.params;
  const insets = useSafeAreaInsets();

  const [terrainData, setTerrainData] = useState(null);
  const [balls, setBalls] = useState([]);
  const [holeCount, setHoleCount] = useState(0);
  const [swipeStart, setSwipeStart] = useState(null);
  const [demoVariant, setDemoVariant] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const physicsInterval = useRef(null);
  const fadeHint = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (demo) {
      setTerrainData(generateDemoTerrain(demoVariant));
    } else {
      setTerrainData(scannedData);
    }
  }, [demoVariant]);

  // Physics loop
  useEffect(() => {
    if (!terrainData) return;

    physicsInterval.current = setInterval(() => {
      setBalls((prev) => {
        const updated = prev.map((b) => updateBall(b, terrainData));

        // Check for new holes
        const newHoles = updated.filter((b) => b.inHole && !prev.find((p) => p.id === b.id)?.inHole);
        if (newHoles.length > 0) {
          setHoleCount((c) => c + newHoles.length);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Remove balls that have been in hole or stopped for a while
        return updated.filter((b) => b.active || b.inHole).slice(-8);
      });
    }, 16);

    return () => clearInterval(physicsInterval.current);
  }, [terrainData]);

  // Hide swipe hint after 3s
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeHint, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => setShowSwipeHint(false));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setSwipeStart({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
      },
      onPanResponderRelease: (e, gestureState) => {
        if (!terrainData) return;
        const { dx, dy } = gestureState;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 10) return; // Ignore taps

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const newBall = launchBallFromSwipe(0, 0, dx, dy, terrainData);
        setBalls((prev) => [...prev.slice(-7), newBall]);
        setSwipeStart(null);
      },
    })
  ).current;

  const clearBalls = () => {
    setBalls([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const nextVariant = () => {
    setDemoVariant((v) => v + 1);
    setBalls([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!terrainData) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>PREPARING GREEN...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 3D Canvas */}
      <View style={styles.canvasContainer} {...panResponder.panHandlers}>
        <Canvas
          camera={{ position: [0, 5, 4], fov: 55 }}
          style={StyleSheet.absoluteFill}
        >
          <Scene terrainData={terrainData} balls={balls} />
        </Canvas>
      </View>

      {/* Swipe hint */}
      {showSwipeHint && (
        <Animated.View style={[styles.swipeHint, { opacity: fadeHint }]}>
          <Text style={styles.swipeHintText}>SWIPE TO LAUNCH BALL</Text>
        </Animated.View>
      )}

      {/* Top HUD */}
      <View style={[styles.topHUD, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>

        <View style={styles.hudCenter}>
          <Text style={styles.hudTitle}>
            {terrainData.scanned ? 'YOUR GREEN' : terrainData.variantName?.toUpperCase()}
          </Text>
          {terrainData.scanned && (
            <Text style={styles.hudSub}>
              {terrainData.pointCount?.toLocaleString()} pts scanned
            </Text>
          )}
        </View>

        <View style={styles.holeCounter}>
          <Text style={styles.holeCountNumber}>{holeCount}</Text>
          <Text style={styles.holeCountLabel}>HOLES</Text>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.controlButton} onPress={clearBalls}>
          <Text style={styles.controlButtonText}>CLEAR</Text>
        </TouchableOpacity>

        {demo && (
          <TouchableOpacity style={styles.controlButton} onPress={nextVariant}>
            <Text style={styles.controlButtonText}>NEXT GREEN</Text>
          </TouchableOpacity>
        )}

        {!demo && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => navigation.navigate('Scan')}
          >
            <Text style={styles.controlButtonText}>RESCAN</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ball count indicator */}
      {balls.length > 0 && (
        <View style={styles.ballIndicator}>
          <Text style={styles.ballIndicatorText}>{balls.length} balls</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  loading: {
    flex: 1,
    backgroundColor: '#0a1628',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#4ade80',
    fontSize: 14,
    letterSpacing: 4,
  },
  canvasContainer: {
    flex: 1,
  },
  topHUD: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(10,22,40,0.75)',
  },
  backText: {
    color: '#4ade80',
    fontSize: 13,
    letterSpacing: 2,
    paddingTop: 4,
  },
  hudCenter: {
    alignItems: 'center',
  },
  hudTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 3,
  },
  hudSub: {
    fontSize: 10,
    color: 'rgba(74,222,128,0.7)',
    letterSpacing: 1,
    marginTop: 2,
  },
  holeCounter: {
    alignItems: 'center',
  },
  holeCountNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4ade80',
    lineHeight: 24,
  },
  holeCountLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: 'rgba(10,22,40,0.75)',
  },
  controlButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
  },
  swipeHint: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  swipeHintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ballIndicator: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ballIndicatorText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
});
