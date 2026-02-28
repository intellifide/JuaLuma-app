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
