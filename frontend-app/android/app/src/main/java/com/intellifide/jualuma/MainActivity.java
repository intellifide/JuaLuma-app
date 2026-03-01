package com.intellifide.jualuma;

import android.os.Bundle;
import com.intellifide.jualuma.observability.NativeObservabilityPlugin;
import com.intellifide.jualuma.plaid.NativePlaidLinkPlugin;
import com.intellifide.jualuma.security.NativeSessionStorePlugin;
import com.intellifide.jualuma.security.SessionSecretStore;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    NativeObservabilityPlugin.installCrashHandler(this);
    registerPlugin(NativeObservabilityPlugin.class);
    registerPlugin(NativeSessionStorePlugin.class);
    registerPlugin(NativePlaidLinkPlugin.class);
    SessionSecretStore store = new SessionSecretStore(this, BuildConfig.MOBILE_SESSION_STORE_MODE);
    if (store.get("__store_initialized") == null) {
      store.put("__store_initialized", "true");
    }
  }
}
