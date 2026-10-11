import SwiftUI
import WebKit

@main
struct CleanTubeApp: App {
    @StateObject private var store = WebViewStore()

    var body: some Scene {
        WindowGroup {
            ContentView(store: store)
        }
    }
}

struct ContentView: View {
    @ObservedObject var store: WebViewStore
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack(alignment: .top) {
            Color(uiColor: AppConfig.backgroundColor)
                .ignoresSafeArea()
            WebContainerView(webView: store.webView)
                .ignoresSafeArea()
            if store.showDebug {
                DebugOverlay(
                    stats: store.stats,
                    currentURL: store.webView.url?.absoluteString ?? "—",
                    onClose: { store.showDebug = false }
                )
            }
        }
        .preferredColorScheme(.dark)
        .onChange(of: scenePhase) { _, phase in
            store.scenePhaseChanged(phase)
        }
    }
}

struct WebContainerView: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> WKWebView { webView }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
