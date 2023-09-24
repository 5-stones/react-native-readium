package com.reactnativereadium.utils.extensions

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.*

suspend fun <P> Flow<P>.stateInFirst(scope: CoroutineScope, sharingStarted: SharingStarted) =
  stateIn(scope, sharingStarted, first())
