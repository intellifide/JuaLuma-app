package com.intellifide.jualuma.sharedcore

enum class MobileEnvironment(val appEnv: String) {
    DEV("development"),
    STAGE("stage"),
    PROD("production"),
}

data class MobileApiConfig(
    val baseUrl: String,
    val environment: MobileEnvironment,
) {
    init {
        require(baseUrl.isNotBlank()) { "baseUrl must not be blank" }
    }

    val normalizedBaseUrl: String get() = baseUrl.trimEnd('/')
}
