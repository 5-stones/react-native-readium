package com.example.reactnativereadium

// https://github.com/software-mansion/react-native-screens/tree/6ad2f401061a7706af0f77186a466cb33241d680#android
import android.os.Bundle;
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "ReadiumExample"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        // Tells JS which LCP client is in use, to show it in the LCP tab.
        override fun getLaunchOptions(): Bundle = Bundle().apply {
          putString("lcpClient", lcpClient())
        }
      }

  /** EDRLab's liblcp, the debug basic-profile test client, or neither. */
  private fun lcpClient(): String = when {
    BuildConfig.LIBLCP -> "liblcp"
    BuildConfig.DEBUG && System.getProperty("readium.lcp.testClient") != "false" -> "basic-profile"
    else -> "none"
  }

  /**
   * Per: https://github.com/software-mansion/react-native-screens/tree/6ad2f401061a7706af0f77186a466cb33241d680#android
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    // `ReadiumLCPTestClient=false` turns off the debug basic-profile LCP client, to see the app
    // without LCP. Read by that client, which only exists in debug builds without liblcp.
    intent.extras?.let { extras ->
      if (extras.containsKey("ReadiumLCPTestClient")) {
        @Suppress("DEPRECATION")
        System.setProperty("readium.lcp.testClient", extras.get("ReadiumLCPTestClient").toString())
      }
    }
    super.onCreate(null)
  }
}
