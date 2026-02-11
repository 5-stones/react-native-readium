package com.reactnativereadium

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.reactnativereadium.NitroReadiumOnLoad
import com.margelo.nitro.reactnativereadium.views.HybridReadiumViewManager

class ReadiumPackage : ReactPackage {
    init {
        // Load C++ library early so the Fabric component descriptor is registered
        // before any ReadiumView ShadowNodes are created.
        NitroReadiumOnLoad.initializeNative()
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return emptyList()
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(HybridReadiumViewManager())
    }
}
