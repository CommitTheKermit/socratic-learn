plugins {
    kotlin("multiplatform")
    kotlin("plugin.serialization")
}

group = "socratic.learn"
version = "0.1.0"

kotlin {
    jvmToolchain(21)
    jvm()
    js(IR) {
        browser()
    }

    sourceSets {
        commonMain.dependencies {
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
        }
    }
}
