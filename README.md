# Scan2Golf

**Read the green. Roll the putt.**

A React Native + Expo app that uses your iPhone's LiDAR camera to scan a golf green and simulate ball physics on the actual terrain shape.

---

## Features

- **LiDAR Green Scanning** — walk around the green for 30–60 seconds to capture terrain
- **3D Terrain Visualization** — rendered with Three.js via @react-three/fiber
- **Real Ball Physics** — balls roll based on actual slope and gravity
- **Swipe to Launch** — gesture-based ball launching
- **Demo Mode** — 4 procedural green variants (Left Tier, Right Tier, Back Bowl, False Front)
- **Hole Detection** — tracks putts made

---

## Tech Stack

- **React Native + Expo** (~51)
- **@react-three/fiber** for 3D rendering
- **Three.js** for geometry and materials
- **expo-camera** for LiDAR capture
- **expo-haptics** for tactile feedback
- **React Navigation** for screen routing

---

## Setup

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your iPhone (App Store)

### Install & Run

```bash
npm install
npx expo start
```

Scan the QR code with your iPhone camera — it opens in Expo Go.

---

## Build for iPhone (no Mac required)

Uses EAS Build (Expo's cloud build service):

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
```

This builds the IPA in the cloud and sends you a link to install via TestFlight or direct install.

**First time setup:**
1. Create an account at expo.dev
2. Run `eas init` in the project folder
3. Update `app.json` with your EAS project ID

---

## Project Structure

```
Scan2Golf/
├── App.js                    # Navigation root
├── app.json                  # Expo config
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js     # Landing + instructions
│   │   ├── ScanScreen.js     # Camera scanning UI
│   │   └── GreenScreen.js    # 3D green + ball physics
│   └── utils/
│       ├── terrainGenerator.js  # Heightmap generation
│       └── ballPhysics.js       # Ball simulation engine
└── assets/
```

---

## LiDAR Note

The iPhone 15 Pro Max has a LiDAR scanner. In this Expo implementation, the camera session captures depth data via `expo-camera`. Full point cloud processing requires a native module or EAS build with native LiDAR APIs (`ARKit`). The current implementation simulates terrain from scan session data — a native ARKit integration can be added as a follow-on.

---

## Built By

**Twin Axis Studio** — twinaxisstudio.com  
Visualization, digital twin, and immersive experience design.
