import Foundation
import UIKit

enum AppConfig {
    /// ⚠️ START URL — the live HTTPS deployment this shell wraps.
    /// Change this if production moves to a custom domain.
    static let startURL = URL(string: "https://cleantubething.vercel.app/")!

    /// Cold launches restore the last same-origin URL only if it was saved within this window.
    static let restoreMaxAge: TimeInterval = 12 * 60 * 60

    /// Hosts (and subdomains) that may load as top-level pages inside the shell.
    static let inAppHostSuffixes = [
        "youtube.com",
        "youtube-nocookie.com",
        "ytimg.com",
        "googlevideo.com",
        "accounts.google.com",
        "supabase.co",
    ]

    /// Hosts that `window.open` / `target=_blank` may load in the shell instead of Safari.
    static let youTubeHostSuffixes = [
        "youtube.com",
        "youtube-nocookie.com",
        "youtu.be",
    ]

    /// #141816 — matches the web app's dark theme so launches don't flash white.
    static let backgroundColor = UIColor(red: 0x14 / 255, green: 0x18 / 255, blue: 0x16 / 255, alpha: 1)
}

extension URL {
    private var normalizedPort: Int? {
        if let port { return port }
        switch scheme?.lowercased() {
        case "https": return 443
        case "http": return 80
        default: return nil
        }
    }

    func isSameOrigin(as other: URL) -> Bool {
        scheme?.lowercased() == other.scheme?.lowercased()
            && host(percentEncoded: false)?.lowercased() == other.host(percentEncoded: false)?.lowercased()
            && normalizedPort == other.normalizedPort
    }

    func hostMatches(_ suffixes: [String]) -> Bool {
        guard let host = host(percentEncoded: false)?.lowercased() else { return false }
        return suffixes.contains { host == $0 || host.hasSuffix("." + $0) }
    }
}
