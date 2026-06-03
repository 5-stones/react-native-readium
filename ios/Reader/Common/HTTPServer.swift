import Foundation
import ReadiumShared
import ReadiumAdapterGCDWebServer

/// Provides a shared HTTP server backed by GCDWebServer for eReader resources.
enum HTTPServer {
    /// Lazily instantiated HTTP server reused across eReader sessions.
    static let shared: GCDHTTPServer = {
        let httpClient = DefaultHTTPClient()
        let assetRetriever = AssetRetriever(httpClient: httpClient)
        return GCDHTTPServer(assetRetriever: assetRetriever)
    }()
}