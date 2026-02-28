#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SPLASH_SRC="$ROOT_DIR/frontend-app/node_modules/@capacitor/splash-screen"
SPLASH_DST="$ROOT_DIR/mobile/vendor/capacitor-splash-screen-local"

if [[ ! -d "$SPLASH_SRC/ios/Sources/SplashScreenPlugin" ]]; then
  echo "Missing Capacitor splash-screen sources at $SPLASH_SRC" >&2
  echo "Run npm install in frontend-app first." >&2
  exit 1
fi

mkdir -p "$SPLASH_DST"
rsync -a --delete "$SPLASH_SRC/ios/" "$SPLASH_DST/ios/"
cp "$SPLASH_SRC/LICENSE" "$SPLASH_DST/LICENSE"
cp "$SPLASH_SRC/README.md" "$SPLASH_DST/README.md"

cat > "$SPLASH_DST/Package.swift" <<'SWIFT'
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorSplashScreenLocal",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapacitorSplashScreen",
            targets: ["SplashScreenPlugin"]
        )
    ],
    dependencies: [
        .package(name: "capacitor-swift-pm-local", path: "../capacitor-swift-pm-local")
    ],
    targets: [
        .target(
            name: "SplashScreenPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm-local"),
                .product(name: "Cordova", package: "capacitor-swift-pm-local")
            ],
            path: "ios/Sources/SplashScreenPlugin"
        ),
        .testTarget(
            name: "SplashScreenPluginTests",
            dependencies: ["SplashScreenPlugin"],
            path: "ios/Tests/SplashScreenPluginTests"
        )
    ]
)
SWIFT

echo "Vendored iOS SPM packages synced to mobile/vendor/."
