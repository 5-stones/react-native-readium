#include <jni.h>
#include "NitroReadiumLCPOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::readiumlcp::initialize(vm);
}
