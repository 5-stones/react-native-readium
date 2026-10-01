package com.reactnativereadiumlcp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.reactnativereadiumlcp.NitroReadiumLCPOnLoad

class ReadiumLCPPackage : ReactPackage {
  init {
    // Load the C++ library early so the ReadiumLCP hybrid object is registered.
    NitroReadiumLCPOnLoad.initializeNative()
  }

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    emptyList()

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
