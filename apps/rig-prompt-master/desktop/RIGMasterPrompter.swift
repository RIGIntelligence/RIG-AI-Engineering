import Cocoa
import Foundation
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    private var window: NSWindow?
    private var webView: WKWebView?
    private var serverProcess: Process?
    private var launchedServer = false

    private let host: String
    private let port: String
    private let remoteURL: URL?
    private let appDirectory: URL
    private let repoRoot: URL

    override init() {
        let env = ProcessInfo.processInfo.environment
        host = env["RIG_MASTER_PROMPTER_HOST"] ?? env["RIG_PROMPT_MASTER_HOST"] ?? "127.0.0.1"
        port = env["RIG_MASTER_PROMPTER_PORT"] ?? env["RIG_PROMPT_MASTER_PORT"] ?? "8767"
        remoteURL = (env["RIG_MASTER_PROMPTER_URL"] ?? env["RIG_PROMPT_MASTER_URL"]).flatMap(URL.init(string:))
        appDirectory = AppDelegate.resolveAppDirectory()
        repoRoot = appDirectory.deletingLastPathComponent().deletingLastPathComponent()
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        configureMenu()
        createWindow()
        loadStartingScreen()

        DispatchQueue.global(qos: .userInitiated).async {
            let targetURL = self.remoteURL ?? URL(string: "http://\(self.host):\(self.port)")!
            if self.remoteURL == nil {
                self.ensureLocalServer()
            }

            DispatchQueue.main.async {
                self.webView?.load(URLRequest(url: targetURL))
                self.window?.makeKeyAndOrderFront(nil)
                NSApp.activate(ignoringOtherApps: true)
            }
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        if launchedServer {
            serverProcess?.terminate()
        }
    }

    func windowWillClose(_ notification: Notification) {
        NSApp.terminate(nil)
    }

    private static func resolveAppDirectory() -> URL {
        let env = ProcessInfo.processInfo.environment
        let fm = FileManager.default
        let envPath = env["RIG_MASTER_PROMPTER_APP_DIR"] ?? env["RIG_PROMPT_MASTER_APP_DIR"]
        var candidates: [URL] = []

        if let envPath, !envPath.isEmpty {
            candidates.append(URL(fileURLWithPath: envPath).standardizedFileURL)
        }

        let bundleParent = Bundle.main.bundleURL.deletingLastPathComponent().standardizedFileURL
        candidates.append(bundleParent)

        if let executableURL = Bundle.main.executableURL {
            let bundleURL = executableURL
                .deletingLastPathComponent()
                .deletingLastPathComponent()
                .deletingLastPathComponent()
                .standardizedFileURL
            candidates.append(bundleURL.deletingLastPathComponent())
            candidates.append(bundleURL.resolvingSymlinksInPath().deletingLastPathComponent())
        }

        candidates.append(URL(fileURLWithPath: "\(NSHomeDirectory())/RIG-AI-Engineering/apps/rig-prompt-master"))
        candidates.append(URL(fileURLWithPath: "\(NSHomeDirectory())/Desktop/RIG-AI-Engineering/apps/rig-prompt-master"))

        for candidate in candidates {
            if fm.fileExists(atPath: candidate.appendingPathComponent("package.json").path) {
                return candidate
            }
        }

        return bundleParent
    }

    private func configureMenu() {
        let mainMenu = NSMenu()
        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Reload", action: #selector(reloadWebView), keyEquivalent: "r")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Quit RIG Master Prompter", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)
        NSApp.mainMenu = mainMenu
    }

    @objc private func reloadWebView() {
        webView?.reload()
    }

    private func createWindow() {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.allowsBackForwardNavigationGestures = true
        self.webView = webView

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1440, height: 960),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "RIG Master Prompter"
        window.center()
        window.contentView = webView
        window.delegate = self
        window.titlebarAppearsTransparent = true
        window.isReleasedWhenClosed = false
        self.window = window
    }

    private func loadStartingScreen() {
        let html = """
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body {
                margin: 0;
                height: 100vh;
                display: grid;
                place-items: center;
                background: #f7f0df;
                color: #1b1714;
                font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
              }
              main {
                width: min(680px, calc(100vw - 80px));
                border: 1px solid #d9caa9;
                background: #fffaf0;
                padding: 44px;
                box-shadow: 0 20px 60px rgba(26, 21, 15, 0.12);
              }
              .label {
                color: #9b7a35;
                font-size: 11px;
                letter-spacing: 0.28em;
                text-transform: uppercase;
              }
              h1 {
                margin: 14px 0 12px;
                font-family: Georgia, serif;
                font-size: 46px;
                font-weight: 400;
              }
              p {
                margin: 0;
                line-height: 1.6;
                color: #5e5547;
              }
            </style>
          </head>
          <body>
            <main>
              <div class="label">RIG v15 desktop control plane</div>
              <h1>RIG Master Prompter</h1>
              <p>Starting the local full-stack app and connecting the frontend workbench to the backend API.</p>
            </main>
          </body>
        </html>
        """
        webView?.loadHTMLString(html, baseURL: nil)
    }

    private func ensureLocalServer() {
        if healthCheck() {
            return
        }

        do {
            try launchServer()
        } catch {
            NSLog("RIG Master Prompter failed to launch backend: \(error.localizedDescription)")
            return
        }

        for _ in 0..<120 {
            if healthCheck() {
                return
            }
            Thread.sleep(forTimeInterval: 0.25)
        }
    }

    private func healthCheck() -> Bool {
        guard let url = URL(string: "http://\(host):\(port)/api/health") else {
            return false
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 1.5
        let semaphore = DispatchSemaphore(value: 0)
        var ok = false
        let task = URLSession.shared.dataTask(with: request) { _, response, _ in
            if let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) {
                ok = true
            }
            semaphore.signal()
        }
        task.resume()
        _ = semaphore.wait(timeout: .now() + 2.0)
        task.cancel()
        return ok
    }

    private func launchServer() throws {
        let fm = FileManager.default
        let nextBuild = appDirectory.appendingPathComponent(".next/BUILD_ID").path
        let nodeModules = appDirectory.appendingPathComponent("node_modules").path
        let pythonBridge = repoRoot.appendingPathComponent("python/rig/rig_app_server.py").path

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")

        if fm.fileExists(atPath: nodeModules), fm.fileExists(atPath: nextBuild) {
            process.currentDirectoryURL = appDirectory
            process.arguments = ["npm", "run", "start", "--", "-H", host, "-p", port]
        } else if fm.fileExists(atPath: nodeModules) {
            process.currentDirectoryURL = appDirectory
            process.arguments = ["npm", "run", "dev", "--", "-H", host, "-p", port]
        } else {
            process.currentDirectoryURL = repoRoot
            process.arguments = ["python3", pythonBridge, "--host", host, "--port", port]
        }

        var environment = ProcessInfo.processInfo.environment
        environment["RIG_DEV_ALLOW_ANON"] = environment["RIG_DEV_ALLOW_ANON"] ?? "1"
        environment["RIG_MASTER_PROMPTER_DESKTOP"] = "1"
        environment["RIG_PROMPT_MASTER_DESKTOP"] = "1"
        process.environment = environment

        if let logHandle = openLogHandle() {
            process.standardOutput = logHandle
            process.standardError = logHandle
        }

        try process.run()
        launchedServer = true
        serverProcess = process
    }

    private func openLogHandle() -> FileHandle? {
        let dataDir = appDirectory.appendingPathComponent(".data")
        try? FileManager.default.createDirectory(at: dataDir, withIntermediateDirectories: true)
        let logURL = dataDir.appendingPathComponent("rig-master-prompter-desktop.log")
        if !FileManager.default.fileExists(atPath: logURL.path) {
            FileManager.default.createFile(atPath: logURL.path, contents: nil)
        }
        let handle = try? FileHandle(forWritingTo: logURL)
        if let handle {
            do {
                try handle.seekToEnd()
            } catch {
                return nil
            }
        }
        return handle
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
