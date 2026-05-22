pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
    plugins {
        kotlin("jvm") version "2.3.21"
        kotlin("multiplatform") version "2.3.21"
        kotlin("plugin.serialization") version "2.3.21"
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
    }
}

rootProject.name = "socratic-learn-server"

include(":shared")
project(":shared").projectDir = file("../shared")
