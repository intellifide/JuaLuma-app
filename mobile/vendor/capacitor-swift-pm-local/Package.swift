// swift-tools-version:5.3

import PackageDescription

let package = Package(
    name: "capacitor-swift-pm-local",
    products: [
        .library(
            name: "Capacitor",
            targets: ["Capacitor"]
        ),
        .library(
            name: "Cordova",
            targets: ["Cordova"]
        )
    ],
    dependencies: [],
    targets: [
        .binaryTarget(
            name: "Capacitor",
            path: "artifacts/Capacitor.xcframework"
        ),
        .binaryTarget(
            name: "Cordova",
            path: "artifacts/Cordova.xcframework"
        )
    ]
)
