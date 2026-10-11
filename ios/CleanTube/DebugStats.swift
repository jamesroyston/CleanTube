import Foundation
import SwiftUI
import os

let shellLog = Logger(subsystem: Bundle.main.bundleIdentifier ?? "cleantube", category: "Shell")

/// Persistent counters for the background-survival experiment.
@MainActor
final class DebugStats: ObservableObject {
    private enum Key {
        static let coldLaunches = "debug.coldLaunches"
        static let terminations = "debug.webContentTerminations"
        static let lastTerminationAt = "debug.lastTerminationAt"
        static let backgroundedAt = "debug.backgroundedAt"
    }

    private let defaults = UserDefaults.standard

    let launchedAt = Date()
    @Published private(set) var coldLaunches: Int
    @Published private(set) var terminations: Int
    @Published private(set) var lastTerminationAt: Date?
    /// Set when the previous process was killed while backgrounded (or swiped away from the app switcher).
    @Published private(set) var previousSessionBackgroundedAt: Date?
    @Published private(set) var lastBackgroundDuration: TimeInterval?
    @Published private(set) var terminationsDuringLastBackground = 0

    private var backgroundedAt: Date?
    private var terminationsAtBackground = 0

    init() {
        coldLaunches = defaults.integer(forKey: Key.coldLaunches) + 1
        terminations = defaults.integer(forKey: Key.terminations)
        lastTerminationAt = defaults.object(forKey: Key.lastTerminationAt) as? Date
        previousSessionBackgroundedAt = defaults.object(forKey: Key.backgroundedAt) as? Date
        defaults.set(coldLaunches, forKey: Key.coldLaunches)
        defaults.removeObject(forKey: Key.backgroundedAt)

        shellLog.notice("""
            Cold launch #\(self.coldLaunches) at \(Self.format(self.launchedAt), privacy: .public); \
            WebContent terminations so far: \(self.terminations); \
            previous session backgrounded at: \(Self.format(self.previousSessionBackgroundedAt), privacy: .public)
            """)
    }

    func recordTermination() {
        terminations += 1
        lastTerminationAt = Date()
        defaults.set(terminations, forKey: Key.terminations)
        defaults.set(lastTerminationAt, forKey: Key.lastTerminationAt)
        shellLog.error("WebContent process terminated (#\(self.terminations)) at \(Self.format(self.lastTerminationAt), privacy: .public)")
    }

    func didEnterBackground() {
        let now = Date()
        backgroundedAt = now
        terminationsAtBackground = terminations
        defaults.set(now, forKey: Key.backgroundedAt)
        shellLog.notice("Entered background at \(Self.format(now), privacy: .public)")
    }

    func didBecomeActive() {
        defaults.removeObject(forKey: Key.backgroundedAt)
        guard let backgroundedAt else { return }
        self.backgroundedAt = nil
        lastBackgroundDuration = Date().timeIntervalSince(backgroundedAt)
        terminationsDuringLastBackground = terminations - terminationsAtBackground
        shellLog.notice("""
            Became active after \(Self.formatDuration(self.lastBackgroundDuration), privacy: .public) in background; \
            WebContent terminations meanwhile: \(self.terminationsDuringLastBackground)
            """)
    }

    func reset() {
        for key in [Key.coldLaunches, Key.terminations, Key.lastTerminationAt, Key.backgroundedAt] {
            defaults.removeObject(forKey: key)
        }
        coldLaunches = 0
        terminations = 0
        lastTerminationAt = nil
        previousSessionBackgroundedAt = nil
        lastBackgroundDuration = nil
        terminationsDuringLastBackground = 0
    }

    static func format(_ date: Date?) -> String {
        guard let date else { return "—" }
        return date.formatted(date: .abbreviated, time: .standard)
    }

    static func formatDuration(_ interval: TimeInterval?) -> String {
        guard let interval else { return "—" }
        let s = Int(interval)
        return s >= 3600 ? "\(s / 3600)h \(s % 3600 / 60)m" : "\(s / 60)m \(s % 60)s"
    }
}

/// Hidden overlay toggled by a three-finger tap.
struct DebugOverlay: View {
    @ObservedObject var stats: DebugStats
    let currentURL: String
    let onClose: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("CleanTube shell debug").bold()
            Text("Cold launches: \(stats.coldLaunches) (this: \(DebugStats.format(stats.launchedAt)))")
            Text("WebContent terminations: \(stats.terminations) (last: \(DebugStats.format(stats.lastTerminationAt)))")
            Text("Last background: \(DebugStats.formatDuration(stats.lastBackgroundDuration)), terminations during: \(stats.terminationsDuringLastBackground)")
            Text("Prev session killed after backgrounding at: \(DebugStats.format(stats.previousSessionBackgroundedAt))")
            Text("URL: \(currentURL)").lineLimit(2)
            HStack {
                Button("Reset counters") { stats.reset() }
                Spacer()
                Button("Close", action: onClose)
            }
            .padding(.top, 4)
        }
        .font(.system(size: 12, design: .monospaced))
        .foregroundStyle(.white)
        .padding(12)
        .background(.black.opacity(0.85), in: RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal, 12)
    }
}
