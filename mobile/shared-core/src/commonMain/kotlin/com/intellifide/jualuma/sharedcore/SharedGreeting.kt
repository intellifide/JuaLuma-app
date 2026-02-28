package com.intellifide.jualuma.sharedcore

expect fun platformName(): String

class SharedGreeting {
    fun message(): String = "JuaLuma shared-core initialized on ${platformName()}"
}

