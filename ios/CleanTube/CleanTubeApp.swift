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
            // UIKit hosts the web view + trailing-edge hit shield. A SwiftUI
            // Color.clear overlay does not reliably steal WKWebView edge swipes.
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

/// Full-screen host for the site web view with a trailing-edge touch shield that
/// blocks swipe-forward while leaving leading-edge swipe-back intact.
final class WebContainerUIView: UIView {
    private let webView: WKWebView
    private let forwardShield = UIView()

    /// Wide enough to catch the system edge-pan before WKWebView does.
    private let shieldWidth: CGFloat = 28

    init(webView: WKWebView) {
        self.webView = webView
        super.init(frame: .zero)
        backgroundColor = AppConfig.backgroundColor

        webView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(webView)

        forwardShield.translatesAutoresizingMaskIntoConstraints = false
        forwardShield.backgroundColor = .clear
        forwardShield.isAccessibilityElement = false
        forwardShield.isUserInteractionEnabled = true
        addSubview(forwardShield)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: topAnchor),
            webView.bottomAnchor.constraint(equalTo: bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: trailingAnchor),

            forwardShield.topAnchor.constraint(equalTo: topAnchor),
            forwardShield.bottomAnchor.constraint(equalTo: bottomAnchor),
            forwardShield.trailingAnchor.constraint(equalTo: trailingAnchor),
            forwardShield.widthAnchor.constraint(equalToConstant: shieldWidth),
        ])
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        // Keep the shield above the web view after any subview reorder.
        bringSubviewToFront(forwardShield)
    }
}
