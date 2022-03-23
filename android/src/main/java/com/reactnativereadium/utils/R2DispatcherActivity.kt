package com.reactnativereadium.utils

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
//import com.reactnativereadium.MainActivity
import timber.log.Timber

class R2DispatcherActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        dispatchIntent(intent)
        finish()
    }

    private fun dispatchIntent(intent: Intent) {
        val uri = uriFromIntent(intent)
                ?: run {
                    Timber.d("Got an empty intent.")
                    return
                }
//      FIXME: MainActivity
//        val newIntent = Intent(this, MainActivity::class.java).apply {
//            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
//            data = uri
//        }
//        startActivity(newIntent)
    }

    private fun uriFromIntent(intent: Intent): Uri? =
        when (intent.action) {
            Intent.ACTION_SEND -> {
                if ("text/plain" == intent.type) {
                    intent.getStringExtra(Intent.EXTRA_TEXT).let { Uri.parse(it) }
                } else {
                    intent.getParcelableExtra(Intent.EXTRA_STREAM)
                }
            }
            else -> {
                intent.data
            }
        }
}
