import UIKit
import Capacitor
import SharedCore
import LinkKit
import Security

private enum NativeSessionStoreMode: String {
    case local
    case secure

    static var current: NativeSessionStoreMode {
#if DEBUG
        return .local
#else
        return .secure
#endif
    }
}

private final class IOSSessionSecretStore {
    private let mode: NativeSessionStoreMode
    private let defaults: UserDefaults
    private let keychainService = "com.intellifide.jualuma.session.secure"

    init(mode: NativeSessionStoreMode) {
        self.mode = mode
        self.defaults = UserDefaults(suiteName: "com.intellifide.jualuma.local.session") ?? .standard
    }

    func modeValue() -> String {
        return mode.rawValue
    }

    func put(_ key: String, _ value: String) throws {
        switch mode {
        case .local:
            defaults.set(value, forKey: key)
        case .secure:
            guard let data = value.data(using: .utf8) else {
                throw NSError(domain: "NativeSessionStore", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid payload encoding"])
            }
            var query = keychainQuery(for: key)
            SecItemDelete(query as CFDictionary)
            query[kSecValueData as String] = data
            let status = SecItemAdd(query as CFDictionary, nil)
            guard status == errSecSuccess else {
                throw NSError(domain: "NativeSessionStore", code: Int(status), userInfo: [NSLocalizedDescriptionKey: "Unable to write secure session payload (\(status))"])
            }
        }
    }

    func get(_ key: String) throws -> String? {
        switch mode {
        case .local:
            return defaults.string(forKey: key)
        case .secure:
            var query = keychainQuery(for: key)
            query[kSecMatchLimit as String] = kSecMatchLimitOne
            query[kSecReturnData as String] = true
            var item: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &item)
            if status == errSecItemNotFound {
                return nil
            }
            guard status == errSecSuccess else {
                throw NSError(domain: "NativeSessionStore", code: Int(status), userInfo: [NSLocalizedDescriptionKey: "Unable to read secure session payload (\(status))"])
            }
            guard let data = item as? Data else {
                return nil
            }
            return String(data: data, encoding: .utf8)
        }
    }

    func remove(_ key: String) throws {
        switch mode {
        case .local:
            defaults.removeObject(forKey: key)
        case .secure:
            let status = SecItemDelete(keychainQuery(for: key) as CFDictionary)
            if status != errSecSuccess && status != errSecItemNotFound {
                throw NSError(domain: "NativeSessionStore", code: Int(status), userInfo: [NSLocalizedDescriptionKey: "Unable to clear secure session payload (\(status))"])
            }
        }
    }

    private func keychainQuery(for key: String) -> [String: Any] {
        return [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
    }
}

@objc(NativeSessionStorePlugin)
public class NativeSessionStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeSessionStorePlugin"
    public let jsName = "NativeSessionStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSession", returnType: CAPPluginReturnPromise),
    ]

    private let sessionStore = IOSSessionSecretStore(mode: .current)
    private let payloadKey = "session_payload"

    @objc func setSession(_ call: CAPPluginCall) {
        guard let payload = call.getString("payload"), !payload.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("payload is required")
            return
        }
        do {
            try sessionStore.put(payloadKey, payload)
            call.resolve([
                "mode": sessionStore.modeValue(),
            ])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func getSession(_ call: CAPPluginCall) {
        do {
            call.resolve([
                "payload": try sessionStore.get(payloadKey) as Any,
                "mode": sessionStore.modeValue(),
            ])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func clearSession(_ call: CAPPluginCall) {
        do {
            try sessionStore.remove(payloadKey)
            call.resolve([
                "mode": sessionStore.modeValue(),
            ])
        } catch {
            call.reject(error.localizedDescription)
        }
    }
}

@objc(NativePlaidLinkPlugin)
public class NativePlaidLinkPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativePlaidLinkPlugin"
    public let jsName = "NativePlaidLink"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openLink", returnType: CAPPluginReturnPromise),
    ]

    private var plaidHandler: (any Handler)?
    private var pendingCallbackID: String?

    private static weak var sharedInstance: NativePlaidLinkPlugin?

    override public func load() {
        super.load()
        NativePlaidLinkPlugin.sharedInstance = self
    }

    @objc func openLink(_ call: CAPPluginCall) {
        let trimmedToken = call.getString("linkToken")?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !trimmedToken.isEmpty else {
            call.reject("linkToken is required")
            return
        }

        guard pendingCallbackID == nil else {
            call.reject("A Plaid Link session is already in progress.")
            return
        }

        guard let presentingViewController = bridge?.viewController else {
            call.reject("Unable to present Plaid Link.")
            return
        }

        pendingCallbackID = call.callbackId
        bridge?.saveCall(call)

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }

            var configuration = LinkTokenConfiguration(token: trimmedToken) { [weak self] success in
                self?.resolvePendingCall([
                    "status": "success",
                    "publicToken": success.publicToken,
                    "institutionName": success.metadata.institution.name,
                    "selectedAccountIds": success.metadata.accounts.map { $0.id },
                ])
            }

            configuration.onExit = { [weak self] exit in
                var payload: PluginCallResultData = [
                    "status": "exit",
                ]
                if let error = exit.error {
                    payload["errorCode"] = error.errorCode.description
                    payload["errorMessage"] = error.displayMessage ?? error.errorMessage
                }
                self?.resolvePendingCall(payload)
            }

            let creationResult = Plaid.create(configuration)
            switch creationResult {
            case .failure(let error):
                self.rejectPendingCall("Unable to initialize Plaid Link.", error: error)
            case .success(let handler):
                self.plaidHandler = handler
                handler.open(presentUsing: .viewController(presentingViewController))
            }
        }
    }

    private func resolvePendingCall(_ payload: PluginCallResultData) {
        guard let callbackID = pendingCallbackID else {
            clearPendingState()
            return
        }

        guard let savedCall = bridge?.savedCall(withID: callbackID) else {
            clearPendingState()
            return
        }

        savedCall.resolve(payload)
        bridge?.releaseCall(withID: callbackID)
        clearPendingState()
    }

    private func rejectPendingCall(_ message: String, error: Error? = nil) {
        guard let callbackID = pendingCallbackID else {
            clearPendingState()
            return
        }

        guard let savedCall = bridge?.savedCall(withID: callbackID) else {
            clearPendingState()
            return
        }

        savedCall.reject(message, nil, error, nil)
        bridge?.releaseCall(withID: callbackID)
        clearPendingState()
    }

    private func clearPendingState() {
        plaidHandler = nil
        pendingCallbackID = nil
    }

    fileprivate static func resumeAfterTerminationIfNeeded(with url: URL) -> Bool {
        guard url.absoluteString.contains("oauth_state_id="), let plugin = sharedInstance else {
            return false
        }
        plugin.plaidHandler?.resumeAfterTermination(from: url)
        return true
    }
}

private enum NativeObservabilityStore {
    private static let defaults = UserDefaults(suiteName: "com.intellifide.jualuma.local.observability") ?? .standard
    private static let pendingCrashKey = "pending_crash_report"
    private static var crashHandlerInstalled = false

    static func installCrashHandler() {
        guard !crashHandlerInstalled else { return }
        crashHandlerInstalled = true
        NSSetUncaughtExceptionHandler(nativeUncaughtExceptionHandler)
    }

    static func persist(exception: NSException) {
        let payload: [String: Any] = [
            "capturedAt": ISO8601DateFormatter().string(from: Date()),
            "platform": "ios",
            "name": exception.name.rawValue,
            "reason": exception.reason ?? "Unhandled native exception",
            "stackTrace": exception.callStackSymbols.joined(separator: "\n"),
        ]
        defaults.set(payload, forKey: pendingCrashKey)
    }

    static func consumePendingCrashReport() -> [String: Any]? {
        guard let report = defaults.dictionary(forKey: pendingCrashKey) else {
            return nil
        }
        defaults.removeObject(forKey: pendingCrashKey)
        return report
    }
}

private func nativeUncaughtExceptionHandler(_ exception: NSException) {
    NativeObservabilityStore.persist(exception: exception)
}

@objc(NativeObservabilityPlugin)
public class NativeObservabilityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeObservabilityPlugin"
    public let jsName = "NativeObservability"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "consumePendingCrashReport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recordBreadcrumb", returnType: CAPPluginReturnPromise),
    ]

    @objc func consumePendingCrashReport(_ call: CAPPluginCall) {
        if let report = NativeObservabilityStore.consumePendingCrashReport() {
            call.resolve(["report": report])
            return
        }
        call.resolve(["report": NSNull()])
    }

    @objc func recordBreadcrumb(_ call: CAPPluginCall) {
        let severity = call.getString("severity") ?? "info"
        let category = call.getString("category") ?? "app"
        let message = call.getString("message") ?? "unknown"
        let attributes = call.getString("attributes") ?? ""
        NSLog("[NativeObservability][\(severity)][\(category)] \(message) \(attributes)")
        call.resolve()
    }
}

class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeObservabilityPlugin())
        bridge?.registerPluginInstance(NativeSessionStorePlugin())
        bridge?.registerPluginInstance(NativePlaidLinkPlugin())
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        _ = SharedGreeting().message()
        NativeObservabilityStore.installCrashHandler()
        let sessionStore = IOSSessionSecretStore(mode: .current)
        if (try? sessionStore.get("__store_initialized")) == nil {
            try? sessionStore.put("__store_initialized", "true")
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        if NativePlaidLinkPlugin.resumeAfterTerminationIfNeeded(with: url) {
            return true
        }
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        if let incomingURL = userActivity.webpageURL,
           NativePlaidLinkPlugin.resumeAfterTerminationIfNeeded(with: incomingURL) {
            return true
        }
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
