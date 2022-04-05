package com.reactnativereadium.epub

import android.content.Context
import android.content.SharedPreferences
import android.graphics.Color
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONArray
import org.readium.r2.navigator.R2BasicWebView
import org.readium.r2.navigator.R2WebView
import org.readium.r2.navigator.epub.fxl.R2FXLLayout
import org.readium.r2.navigator.pager.R2ViewPager
import org.readium.r2.shared.*
import com.reactnativereadium.R
import java.io.File

class UserSettings(
  var preferences: SharedPreferences,
  val context: Context,
  private val UIPreset: MutableMap<ReadiumCSSName, Boolean>
) {

    lateinit var resourcePager: R2ViewPager

    private val appearanceValues = listOf("readium-default-on", "readium-sepia-on", "readium-night-on")
    private val fontFamilyValues = listOf("Original", "PT Serif", "Roboto", "Source Sans Pro", "Vollkorn", "OpenDyslexic", "AccessibleDfA", "IA Writer Duospace")
    private val textAlignmentValues = listOf("justify", "start")
    private val columnCountValues = listOf("auto", "1", "2")

    private var fontSize = 100f
    private var fontOverride = false
    private var fontFamily = 0
    private var appearance = 0
    private var verticalScroll = false

    //Advanced settings
    private var publisherDefaults = false
    private var textAlignment = 0
    private var columnCount = 0
    private var wordSpacing = 0f
    private var letterSpacing = 0f
    private var pageMargins = 2f
    private var lineHeight = 1f

    private var userProperties: UserProperties

    init {
        appearance = preferences.getInt(APPEARANCE_REF, appearance)
        verticalScroll = preferences.getBoolean(SCROLL_REF, verticalScroll)
        fontFamily = preferences.getInt(FONT_FAMILY_REF, fontFamily)
        if (fontFamily != 0) {
            fontOverride = true
        }
        publisherDefaults = preferences.getBoolean(PUBLISHER_DEFAULT_REF, publisherDefaults)
        textAlignment = preferences.getInt(TEXT_ALIGNMENT_REF, textAlignment)
        columnCount = preferences.getInt(COLUMN_COUNT_REF, columnCount)


        fontSize = preferences.getFloat(FONT_SIZE_REF, fontSize)
        wordSpacing = preferences.getFloat(WORD_SPACING_REF, wordSpacing)
        letterSpacing = preferences.getFloat(LETTER_SPACING_REF, letterSpacing)
        pageMargins = preferences.getFloat(PAGE_MARGINS_REF, pageMargins)
        lineHeight = preferences.getFloat(LINE_HEIGHT_REF, lineHeight)
        userProperties = getUserSettings()

        //Setting up screen brightness
        val backLightValue = preferences.getInt("reader_brightness", 50).toFloat() / 100
        val layoutParams = (context as AppCompatActivity).window.attributes
        layoutParams.screenBrightness = backLightValue
        context.window.attributes = layoutParams
    }

    fun updateSettingsFromMap(map: Map<String, Any>) {
      userProperties.properties.forEach { property ->
        val key = property.ref
        val value = map[key]

        val isPropertyModified = when (property) {
          is Enumerable -> updateEnumerableFromKeyValue(property, key, value)
          is Incremental -> updateIncrementalFromKeyValue(property, key, value)
          is Switchable -> updateSwitchableFromKeyValue(property, key, value)
        }

        // update the resourcePager background to match the newly selected theme
        if (isPropertyModified && property is Enumerable && property.ref == APPEARANCE_REF) {
          when (property.index) {
            0 -> {
              resourcePager.setBackgroundColor(Color.parseColor("#ffffff"))
            }
            1 -> {
              resourcePager.setBackgroundColor(Color.parseColor("#faf4e8"))
            }
            2 -> {
              resourcePager.setBackgroundColor(Color.parseColor("#000000"))
            }
          }
        }

        // apply the changes to the view
        if (isPropertyModified) {
          updateViewCSS(key)
        }
      }
    }

    private fun updateEnumerableFromKeyValue(property: Enumerable, key: String, value: Any?): Boolean {
        if (value == null) return false
        var update: Int?

        if (value is Int) {
          update = value
        } else if (value is Float) {
          update = value.toInt()
        } else if (value is Double) {
          update = value.toInt()
        } else {
          throw Error("Invalid value type '${value.javaClass.simpleName}' passed for setting: $key = $value")
        }

        property.index = update
        updateEnumerable(property)
        return true
    }

    private fun updateIncrementalFromKeyValue(property: Incremental, key: String, value: Any?): Boolean {
      if (value == null) return false
      var update: Float?

      if (value is Int) {
        update = value.toFloat()
      } else if (value is Float) {
        update = value
      } else if (value is Double) {
        update = value.toFloat()
      } else {
        throw Error("Invalid value type '${value.javaClass.simpleName}' passed for setting: $key = $value")
      }

      property.value = update
      updateIncremental(property)
      return true
    }

    private fun updateSwitchableFromKeyValue(property: Switchable, key: String, value: Any?): Boolean {
      if (value == null) return false
      var update: Boolean?

      if (value is Boolean) {
        update = value
      } else {
        throw Error("Invalid value type '${value.javaClass.simpleName}' passed for setting: $key = $value")
      }

      property.on = update
      updateSwitchable(property)
      return true
    }

    private fun getUserSettings(): UserProperties {

        val userProperties = UserProperties()
        // Publisher default system
        userProperties.addSwitchable("readium-advanced-off", "readium-advanced-on", publisherDefaults, PUBLISHER_DEFAULT_REF, PUBLISHER_DEFAULT_NAME)
        // Font override
        userProperties.addSwitchable("readium-font-on", "readium-font-off", fontOverride, FONT_OVERRIDE_REF, FONT_OVERRIDE_NAME)
        // Column count
        userProperties.addEnumerable(columnCount, columnCountValues, COLUMN_COUNT_REF, COLUMN_COUNT_NAME)
        // Appearance
        userProperties.addEnumerable(appearance, appearanceValues, APPEARANCE_REF, APPEARANCE_NAME)
        // Page margins
        userProperties.addIncremental(pageMargins, 0.5f, 4f, 0.25f, "", PAGE_MARGINS_REF, PAGE_MARGINS_NAME)
        // Text alignment
        userProperties.addEnumerable(textAlignment, textAlignmentValues, TEXT_ALIGNMENT_REF, TEXT_ALIGNMENT_NAME)
        // Font family
        userProperties.addEnumerable(fontFamily, fontFamilyValues, FONT_FAMILY_REF, FONT_FAMILY_NAME)
        // Font size
        userProperties.addIncremental(fontSize, 100f, 300f, 25f, "%", FONT_SIZE_REF, FONT_SIZE_NAME)
        // Line height
        userProperties.addIncremental(lineHeight, 1f, 2f, 0.25f, "", LINE_HEIGHT_REF, LINE_HEIGHT_NAME)
        // Word spacing
        userProperties.addIncremental(wordSpacing, 0f, 0.5f, 0.25f, "rem", WORD_SPACING_REF, WORD_SPACING_NAME)
        // Letter spacing
        userProperties.addIncremental(letterSpacing, 0f, 0.5f, 0.0625f, "em", LETTER_SPACING_REF, LETTER_SPACING_NAME)
        // Scroll
        userProperties.addSwitchable("readium-scroll-on", "readium-scroll-off", verticalScroll, SCROLL_REF, SCROLL_NAME)

        return userProperties
    }

    private fun makeJson(): JSONArray {
        val array = JSONArray()
        for (userProperty in userProperties.properties) {
            array.put(userProperty.getJson())
        }
        return array
    }


    fun saveChanges() {
        val json = makeJson()
        val dir = File(context.filesDir.path + "/" + Injectable.Style.rawValue + "/")
        dir.mkdirs()
        val file = File(dir, "UserProperties.json")
        file.printWriter().use { out ->
            out.println(json)
        }
    }

    private fun updateEnumerable(enumerable: Enumerable) {
        preferences.edit().putInt(enumerable.ref, enumerable.index).apply()
        saveChanges()
    }


    private fun updateSwitchable(switchable: Switchable) {
        preferences.edit().putBoolean(switchable.ref, switchable.on).apply()
        saveChanges()
    }

    private fun updateIncremental(incremental: Incremental) {
        preferences.edit().putFloat(incremental.ref, incremental.value).apply()
        saveChanges()
    }

    fun updateViewCSS(ref: String) {
        for (i in 0 until resourcePager.childCount) {
            val webView = resourcePager.getChildAt(i).findViewById(R.id.webView) as? R2WebView
            webView?.let {
                applyCSS(webView, ref)
            } ?: run {
                val zoomView = resourcePager.getChildAt(i).findViewById(R.id.r2FXLLayout) as R2FXLLayout
                val webView1 = zoomView.findViewById(R.id.firstWebView) as? R2BasicWebView
                val webView2 = zoomView.findViewById(R.id.secondWebView) as? R2BasicWebView
                val webViewSingle = zoomView.findViewById(R.id.webViewSingle) as? R2BasicWebView

                webView1?.let {
                    applyCSS(webView1, ref)
                }
                webView2?.let {
                    applyCSS(webView2, ref)
                }
                webViewSingle?.let {
                    applyCSS(webViewSingle, ref)
                }
            }
        }
    }

    private fun applyCSS(view: R2BasicWebView, ref: String) {
        val userSetting = userProperties.getByRef<UserProperty>(ref)
        view.setProperty(userSetting.name, userSetting.toString())
    }
}
