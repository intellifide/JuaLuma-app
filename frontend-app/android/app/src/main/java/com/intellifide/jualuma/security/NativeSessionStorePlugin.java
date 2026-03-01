package com.intellifide.jualuma.security;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.intellifide.jualuma.BuildConfig;

@CapacitorPlugin(name = "NativeSessionStore")
public class NativeSessionStorePlugin extends Plugin {
  private static final String SESSION_PAYLOAD_KEY = "session_payload";
  private SessionSecretStore store;

  @Override
  public void load() {
    super.load();
    store = new SessionSecretStore(getContext(), BuildConfig.MOBILE_SESSION_STORE_MODE);
  }

  @PluginMethod
  public void setSession(PluginCall call) {
    String payload = call.getString("payload");
    if (payload == null || payload.trim().isEmpty()) {
      call.reject("payload is required");
      return;
    }
    store.put(SESSION_PAYLOAD_KEY, payload);
    JSObject response = new JSObject();
    response.put("mode", store.mode());
    call.resolve(response);
  }

  @PluginMethod
  public void getSession(PluginCall call) {
    JSObject response = new JSObject();
    response.put("payload", store.get(SESSION_PAYLOAD_KEY));
    response.put("mode", store.mode());
    call.resolve(response);
  }

  @PluginMethod
  public void clearSession(PluginCall call) {
    store.remove(SESSION_PAYLOAD_KEY);
    JSObject response = new JSObject();
    response.put("mode", store.mode());
    call.resolve(response);
  }
}
