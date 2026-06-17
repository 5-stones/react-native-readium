import Foundation
import ReadiumShared
import ReadiumAdapterGCDWebServer

/// Provides a shared HTTP server backed by GCDWebServer for PDF resources.
enum PDFHTTPServer {
    /// Lazily instantiated HTTP server reused across PDF reader sessions.
    static let shared: GCDHTTPServer = {
        let httpClient = DefaultHTTPClient()
        let assetRetriever = AssetRetriever(httpClient: httpClient)
        return GCDHTTPServer(assetRetriever: assetRetriever)
    }()
}
