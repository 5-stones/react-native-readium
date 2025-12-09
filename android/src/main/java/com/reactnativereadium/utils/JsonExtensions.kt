package com.reactnativereadium.utils

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject
import org.readium.r2.shared.publication.Link
import org.readium.r2.shared.publication.Locator

internal fun Locator.toWritableMap(): WritableMap =
  toJSON().toWritableMap()

internal fun Link.toWritableMap(): WritableMap =
  toJSON().toWritableMap()

internal fun List<Link>.toWritableArray(): WritableArray =
  Arguments.createArray().apply {
    forEach { pushMap(it.toWritableMap()) }
  }

internal fun JSONObject.toWritableMap(): WritableMap {
  val map = Arguments.createMap()
  val iterator = keys()
  while (iterator.hasNext()) {
    val key = iterator.next()
    when (val value = opt(key)) {
      JSONObject.NULL -> map.putNull(key)
      is JSONObject -> map.putMap(key, value.toWritableMap())
      is JSONArray -> map.putArray(key, value.toWritableArray())
      is String -> map.putString(key, value)
      is Boolean -> map.putBoolean(key, value)
      is Int -> map.putInt(key, value)
      is Long -> map.putDouble(key, value.toDouble())
      is Double -> map.putDouble(key, value)
      is Float -> map.putDouble(key, value.toDouble())
      else -> map.putString(key, value?.toString() ?: "")
    }
  }
  return map
}

internal fun JSONArray.toWritableArray(): WritableArray {
  val array = Arguments.createArray()
  for (index in 0 until length()) {
    when (val value = opt(index)) {
      JSONObject.NULL -> array.pushNull()
      is JSONObject -> array.pushMap(value.toWritableMap())
      is JSONArray -> array.pushArray(value.toWritableArray())
      is String -> array.pushString(value)
      is Boolean -> array.pushBoolean(value)
      is Int -> array.pushInt(value)
      is Long -> array.pushDouble(value.toDouble())
      is Double -> array.pushDouble(value)
      is Float -> array.pushDouble(value.toDouble())
      null -> array.pushNull()
      else -> array.pushString(value.toString())
    }
  }
  return array
}
