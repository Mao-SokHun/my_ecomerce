# SH-Shop Mobile (iOS & Android)

Native mobile app for SH-Shop built with **Expo** and **React Native**, featuring a **liquid glass** UI (frosted blur, translucent surfaces, mesh gradients) inspired by modern iOS design.

## Features

- Home with featured products & horizontal category pills
- Product catalog with category filters
- Product detail with glass sticky add-to-cart bar
- Cart with quantity controls
- Profile, login & register (Khmer / English / Chinese)
- Connects to the same `shop-backend` API as the web store

## Prerequisites

- Node.js 20+
- [Expo Go](https://expo.dev/go) on your phone (quickest way to test), **or**
- Android Studio / Xcode for device builds

## Setup

```bash
cd shop-mobile
npm install
cp .env.example .env
```

Edit `.env` and set `EXPO_PUBLIC_API_URL` to your backend:

| Environment | Example |
|-------------|---------|
| Local (phone on same Wi‑Fi) | `http://192.168.x.x:5000/api` |
| Production | `https://your-backend.onrender.com/api` |

Ensure `FRONTEND_URL` on the backend allows your app origin if you use CORS restrictions.

## Run

```bash
# Start dev server
npm start

# Open on Android emulator / device
npm run android

# Open on iOS simulator (macOS only)
npm run ios
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS).

## Build for stores

```bash
# Install EAS CLI once
npm install -g eas-cli
eas login

# Configure project
eas build:configure

# Production builds
eas build --platform ios
eas build --platform android
```

See [Expo EAS Build](https://docs.expo.dev/build/introduction/) for App Store and Play Store submission.

## Design system

| Component | Location |
|-----------|----------|
| Glass blur surfaces | `components/glass/GlassSurface.tsx` |
| Mesh gradient background | `components/glass/MeshBackground.tsx` |
| Primary CTA | `components/glass/GlassButton.tsx` |
| Floating glass tab bar | `app/(tabs)/_layout.tsx` |
| Theme tokens | `constants/glassTheme.ts` |

## Project structure

```text
shop-mobile/
├── app/                 # Expo Router screens
│   ├── (tabs)/          # Home, Shop, Cart, Profile
│   ├── product/[slug]   # Product detail
│   └── auth/            # Login & register
├── components/          # UI components
├── lib/                 # API, i18n, storage
└── store/               # Zustand state
```
