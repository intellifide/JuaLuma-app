#!/usr/bin/env bash
set -euo pipefail
source "$HOME/.zprofile" || true
java -version
sdkmanager --version
xcodebuild -version
xcodebuild -showsdks | head -n 20
