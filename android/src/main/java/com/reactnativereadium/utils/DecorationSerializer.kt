package com.reactnativereadium.utils

import android.graphics.Color
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject
import org.readium.r2.navigator.Decoration
import org.readium.r2.shared.publication.Locator
import java.util.UUID

object DecorationSerializer {
  /**
   * Deserialize JSON string to a map of decoration groups
   */
  fun deserialize(json: String?): Map<String, List<Decoration>> {
    if (json == null) return emptyMap()

    try {
      val jsonObject = JSONObject(json)
      val groups = mutableMapOf<String, List<Decoration>>()

      jsonObject.keys().forEach { groupName ->
        val decorationsArray = jsonObject.getJSONArray(groupName)
        val decorations = mutableListOf<Decoration>()

        for (i in 0 until decorationsArray.length()) {
          val decorationJson = decorationsArray.getJSONObject(i)
          deserializeDecoration(decorationJson)?.let { decorations.add(it) }
        }

        groups[groupName] = decorations
      }

      return groups
    } catch (e: Exception) {
      android.util.Log.e("DecorationSerializer", "Failed to deserialize decorations: ${e.message}", e)
      return emptyMap()
    }
  }

  /**
   * Deserialize a single decoration from JSON
   */
  private fun deserializeDecoration(json: JSONObject): Decoration? {
    try {
      val id = json.getString("id")
      val locatorJson = json.getJSONObject("locator")
      val styleJson = json.getJSONObject("style")
      val extrasJson = if (json.has("extras")) json.getJSONObject("extras") else null
      val locator = Locator.fromJSON(locatorJson) ?: return null
      val style = deserializeStyle(styleJson) ?: return null

      val extras = mutableMapOf<String, Any>()
      extrasJson?.keys()?.forEach { key ->
        extras[key] = extrasJson.get(key)
      }

      return Decoration(
        id = id,
        locator = locator,
        style = style,
        extras = extras
      )
    } catch (e: Exception) {
      android.util.Log.e("DecorationSerializer", "Failed to deserialize decoration: ${e.message}", e)
      return null
    }
  }

  /**
   * Deserialize a decoration style from JSON
   */
  private fun deserializeStyle(json: JSONObject): Decoration.Style? {
    return when (json.getString("type")) {
      "highlight" -> {
        val tint = parseColor(json.getString("tint"))
        val isActive = json.optBoolean("isActive", false)
        Decoration.Style.Highlight(tint = tint, isActive = isActive)
      }
      "underline" -> {
        val tint = parseColor(json.getString("tint"))
        val isActive = json.optBoolean("isActive", false)
        Decoration.Style.Underline(tint = tint, isActive = isActive)
      }
      // TODO: Add support for custom styles
      else -> null
    }
  }

  /**
   * Parse a CSS color string to Android Color int
   * Supports: hex (#RRGGBB, #AARRGGBB), rgb(r,g,b), rgba(r,g,b,a), named colors
   */
  private fun parseColor(colorString: String): Int {
    return try {
      when {
        colorString.startsWith("#") -> Color.parseColor(colorString)
        colorString.startsWith("rgb(") -> {
          val values = colorString.substringAfter("(").substringBefore(")").split(",")
          val r = values[0].trim().toInt()
          val g = values[1].trim().toInt()
          val b = values[2].trim().toInt()
          Color.rgb(r, g, b)
        }
        colorString.startsWith("rgba(") -> {
          val values = colorString.substringAfter("(").substringBefore(")").split(",")
          val r = values[0].trim().toInt()
          val g = values[1].trim().toInt()
          val b = values[2].trim().toInt()
          val a = (values[3].trim().toFloat() * 255).toInt()
          Color.argb(a, r, g, b)
        }
        else -> Color.parseColor(colorString) // Try named color
      }
    } catch (e: Exception) {
      android.util.Log.w("DecorationSerializer", "Failed to parse color '$colorString', using default", e)
      Color.YELLOW // Default color
    }
  }
}

/**
 * Extension function to convert Decoration to WritableMap for React Native
 */
fun Decoration.toWritableMap(): WritableMap {
  return Arguments.createMap().apply {
    putString("id", this@toWritableMap.id)
    putMap("locator", this@toWritableMap.locator.toWritableMap())
    putMap("style", styleToWritableMap(this@toWritableMap.style))

    if (this@toWritableMap.extras.isNotEmpty()) {
      val extrasMap = Arguments.createMap()
      this@toWritableMap.extras.forEach { (key, value) ->
        when (value) {
          is String -> extrasMap.putString(key, value)
          is Int -> extrasMap.putInt(key, value)
          is Double -> extrasMap.putDouble(key, value)
          is Boolean -> extrasMap.putBoolean(key, value)
          else -> extrasMap.putString(key, value.toString())
        }
      }
      putMap("extras", extrasMap)
    }
  }
}

/**
 * Convert Decoration.Style to WritableMap
 */
private fun styleToWritableMap(style: Decoration.Style): WritableMap {
  return Arguments.createMap().apply {
    when (style) {
      is Decoration.Style.Highlight -> {
        putString("type", "highlight")
        putString("tint", colorToHex(style.tint))
        putBoolean("isActive", style.isActive)
      }
      is Decoration.Style.Underline -> {
        putString("type", "underline")
        putString("tint", colorToHex(style.tint))
        putBoolean("isActive", style.isActive)
      }
      else -> {
        putString("type", "custom")
      }
    }
  }
}

/**
 * Convert Android Color int to hex string
 */
private fun colorToHex(color: Int): String {
  return String.format("#%08X", color)
}
