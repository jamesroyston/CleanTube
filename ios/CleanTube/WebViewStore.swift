import SwiftUI
import UIKit
import WebKit

@MainActor
final class WebViewStore: NSObject, ObservableObject {
    private enum Key {
        static let lastURL = "shell.lastURL"
        static let lastURLSavedAt = "shell.lastURLSavedAt"
    }

    let webView: WKWebView
    let stats = DebugStats()
    @Published var showDebug = false

    private let defaults = UserDefaults.standard
    private var urlObservation: NSKeyValueObservation?

    override init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsPictureInPictureMediaPlayback = true

        webView = WKWebView(frame: .zero, configuration: config)
        super.init()

        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isInspectable = true
        webView.allowsBackForwardNavigationGestures = true

        webView.isOpaque = false
        webView.backgroundColor = AppConfig.backgroundColor
        webView.underPageBackgroundColor = AppConfig.backgroundColor
        webView.scrollView.backgroundColor = AppConfig.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false

        // Client-side (pushState) navigations don't trigger didFinish, so persist on every URL change.
        urlObservation = webView.observe(\.url, options: [.new]) { [weak self] _, _ in
            MainActor.assumeIsolated { self?.saveCurrentURL() }
        }

        let tap = UITapGestureRecognizer(target: self, action: #selector(toggleDebug))
        tap.numberOfTouchesRequired = 3
        tap.cancelsTouchesInView = false
        tap.delegate = self
        webView.addGestureRecognizer(tap)

        webView.load(URLRequest(url: savedURL(maxAge: AppConfig.restoreMaxAge) ?? AppConfig.startURL))
    }

    // MARK: - Persistence

    func saveCurrentURL() {
        guard let url = webView.url, url.isSameOrigin(as: AppConfig.startURL) else { return }
        defaults.set(url.absoluteString, forKey: Key.lastURL)
        defaults.set(Date(), forKey: Key.lastURLSavedAt)
    }

    private func savedURL(maxAge: TimeInterval?) -> URL? {
        guard let string = defaults.string(forKey: Key.lastURL),
              let url = URL(string: string),
              url.isSameOrigin(as: AppConfig.startURL)
        else { return nil }
        if let maxAge {
            guard let savedAt = defaults.object(forKey: Key.lastURLSavedAt) as? Date,
                  Date().timeIntervalSince(savedAt) < maxAge
            else { return nil }
        }
        return url
    }

    private func reloadLastURL() {
        webView.load(URLRequest(url: savedURL(maxAge: nil) ?? AppConfig.startURL))
    }

    func scenePhaseChanged(_ phase: ScenePhase) {
        switch phase {
        case .background:
            saveCurrentURL()
            stats.didEnterBackground()
        case .inactive:
            saveCurrentURL()
        case .active:
            stats.didBecomeActive()
            // A WebContent process killed while suspended can leave a blank view without a delegate callback.
            if webView.url == nil {
                shellLog.error("Web view has no URL on activation; reloading last URL")
                reloadLastURL()
            }
        @unknown default:
            break
        }
    }

    @objc private func toggleDebug() {
        showDebug.toggle()
    }

    // MARK: - Link routing

    private func openExternally(_ url: URL) {
        UIApplication.shared.open(url)
    }

    private func handleNewWindow(_ url: URL) {
        if url.isSameOrigin(as: AppConfig.startURL) || url.hostMatches(AppConfig.youTubeHostSuffixes) {
            webView.load(URLRequest(url: url))
        } else {
            openExternally(url)
        }
    }

    private func presentAlert(_ alert: UIAlertController) {
        var presenter = webView.window?.rootViewController
        while let presented = presenter?.presentedViewController {
            presenter = presented
        }
        presenter?.present(alert, animated: true)
    }
}

extension WebViewStore: WKNavigationDelegate {
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
        guard let url = navigationAction.request.url, let scheme = url.scheme?.lowercased() else {
            return .allow
        }

        guard scheme == "http" || scheme == "https" else {
            if ["about", "blob", "data", "javascript"].contains(scheme) { return .allow }
            // tel:, mailto:, app links, etc. Never hand these off on behalf of subframes (e.g. YouTube iframes).
            if navigationAction.targetFrame?.isMainFrame != false { openExternally(url) }
            return .cancel
        }

        guard let targetFrame = navigationAction.targetFrame else {
            handleNewWindow(url)
            return .cancel
        }

        if !targetFrame.isMainFrame { return .allow }

        if url.isSameOrigin(as: AppConfig.startURL) || url.hostMatches(AppConfig.inAppHostSuffixes) {
            return .allow
        }
        openExternally(url)
        return .cancel
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        saveCurrentURL()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        shellLog.error("Provisional navigation failed: \(error.localizedDescription, privacy: .public)")
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        stats.recordTermination()
        reloadLastURL()
    }
}

extension WebViewStore: WKUIDelegate {
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url { handleNewWindow(url) }
        return nil
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo) async {
        await withCheckedContinuation { continuation in
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in continuation.resume() })
            presentAlert(alert)
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo) async -> Bool {
        await withCheckedContinuation { continuation in
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in continuation.resume(returning: false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in continuation.resume(returning: true) })
            presentAlert(alert)
        }
    }
}

extension WebViewStore: UIGestureRecognizerDelegate {
    func gestureRecognizer(
        _ gestureRecognizer: UIGestureRecognizer,
        shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
        true
    }
}
