// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(name: "capacitor-swift-pm-local", path: "../../../../mobile/vendor/capacitor-swift-pm-local"),
        .package(name: "CapacitorSplashScreenLocal", path: "../../../../mobile/vendor/capacitor-splash-screen-local"),
        .package(url: "https://github.com/plaid/plaid-link-ios-spm.git", exact: "6.4.3")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm-local"),
                .product(name: "Cordova", package: "capacitor-swift-pm-local"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreenLocal"),
                .product(name: "LinkKit", package: "plaid-link-ios-spm")
            ]
        )
    ]
)
