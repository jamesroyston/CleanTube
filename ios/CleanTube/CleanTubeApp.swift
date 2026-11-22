import SwiftUI
import UIKit
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
            // UIKit hosts the web view + back-only edge gesture. Built-in
            // allowsBackForwardNavigationGestures cannot disable forward alone.
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

    func makeUIView(context: Context) -> WebContainerUIView {
        WebContainerUIView(webView: webView)
    }

    func updateUIView(_ uiView: WebContainerUIView, context: Context) {}
}

/// Hosts the site web view and a leading-edge pan that only goes back.
/// Forward swipe does not exist — WKWebView's built-in gesture always enables both.
final class WebContainerUIView: UIView, UIGestureRecognizerDelegate {
    private let webView: WKWebView
    private let backEdgePan: UIScreenEdgePanGestureRecognizer

    init(webView: WKWebView) {
        self.webView = webView
        self.backEdgePan = UIScreenEdgePanGestureRecognizer()
        super.init(frame: .zero)
        backgroundColor = AppConfig.backgroundColor

        // Prefer an explicit back-only edge pan over allowsBackForwardNavigationGestures
        // (that API cannot disable swipe-forward).
        webView.allowsBackForwardNavigationGestures = false

        webView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: topAnchor),
            webView.bottomAnchor.constraint(equalTo: bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: trailingAnchor),
        ])

        backEdgePan.edges = .left
        backEdgePan.addTarget(self, action: #selector(handleBackEdgePan(_:)))
        backEdgePan.delegate = self
        addGestureRecognizer(backEdgePan)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    @objc private func handleBackEdgePan(_ gesture: UIScreenEdgePanGestureRecognizer) {
        guard gesture.state == .ended || gesture.state == .cancelled else { return }
        let translation = gesture.translation(in: self)
        let velocity = gesture.velocity(in: self)
        // Require a clear rightward flick/drag before going back.
        let enoughDistance = translation.x > 60
        let enoughVelocity = velocity.x > 500
        guard enoughDistance || enoughVelocity else { return }
        guard webView.canGoBack else { return }
        webView.goBack()
    }

    func gestureRecognizer(
        _ gestureRecognizer: UIGestureRecognizer,
        shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
        true
    }
}
