import UIKit
import ReadiumShared
import ReadiumNavigator

/// Hosts a Readium `AudioNavigator` for audiobook publications.
///
/// The navigator itself is headless (no UI). We provide a transparent host view
/// so the RN side can render its own media-control chrome. The navigator state
/// (currentTime, duration, playback state) is exposed via the public
/// `audioNavigator` property for the bridge layer to read.
final class AudioReaderViewController: ReaderViewController {

  /// Called whenever the audio navigator's playback info changes. Set by the
  /// bridge layer to relay state updates to the JS side.
  var onPlaybackChange: ((MediaPlaybackInfo) -> Void)?

  init(
    publication: Publication,
    locator: ReadiumShared.Locator?,
    bookId: String
  ) {
    let navigator = AudioNavigator(
      publication: publication,
      initialLocation: locator
    )

    super.init(
      navigator: navigator,
      publication: publication,
      bookId: bookId
    )

    navigator.delegate = self
  }

  var audioNavigator: AudioNavigator {
    return navigator as! AudioNavigator
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black
  }
}

extension AudioReaderViewController: AudioNavigatorDelegate {
  func navigator(_ navigator: AudioNavigator, playbackDidChange info: MediaPlaybackInfo) {
    onPlaybackChange?(info)
  }
}
