cmake_minimum_required(VERSION 3.9.0)

project(NitroReadium)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

# Create the shared library target with the JNI_OnLoad entry point
add_library(NitroReadium SHARED src/main/cpp/cpp-adapter.cpp)

# Include nitrogen-generated sources, definitions, and linkages
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroReadium+autolinking.cmake)
