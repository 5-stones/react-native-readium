package com.example.reactnativereadium;

// https://github.com/software-mansion/react-native-screens/tree/6ad2f401061a7706af0f77186a466cb33241d680#android
import android.os.Bundle;
import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {

  /**
   * Per: https://github.com/software-mansion/react-native-screens/tree/6ad2f401061a7706af0f77186a466cb33241d680#android
   */
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(null);
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "ReadiumExample";
  }
}
