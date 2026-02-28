package com.intellifide.jualuma.security;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import com.intellifide.jualuma.BuildConfig;

/**
 * Session store policy:
 * - debug/dev: app-local SharedPreferences (no macOS keychain interaction in local dev workflow)
 * - release/prod: Android Keystore-backed EncryptedSharedPreferences
 */
public final class SessionSecretStore {
  private static final String PREFS_NAME_LOCAL = "jualuma_local_session_store";
  private static final String PREFS_NAME_SECURE = "jualuma_secure_session_store";
  private static final String MODE_LOCAL = "local";
  private static final String MODE_SECURE = "secure";

  private final SharedPreferences preferences;
  private final String mode;

  public SessionSecretStore(Context context) {
    this(context, BuildConfig.MOBILE_SESSION_STORE_MODE);
  }

  public SessionSecretStore(Context context, String mode) {
    String requested = normalizeMode(mode);
    this.mode = requested;
    this.preferences = createPreferences(context.getApplicationContext(), requested);
  }

  public String mode() {
    return mode;
  }

  public void put(String key, String value) {
    preferences.edit().putString(key, value).apply();
  }

  public String get(String key) {
    return preferences.getString(key, null);
  }

  public void remove(String key) {
    preferences.edit().remove(key).apply();
  }

  public void clear() {
    preferences.edit().clear().apply();
  }

  private static String normalizeMode(String mode) {
    if (MODE_SECURE.equalsIgnoreCase(mode)) {
      return MODE_SECURE;
    }
    return MODE_LOCAL;
  }

  private static SharedPreferences createPreferences(Context context, String mode) {
    if (MODE_SECURE.equals(mode)) {
      return createSecurePreferences(context);
    }
    return context.getSharedPreferences(PREFS_NAME_LOCAL, Context.MODE_PRIVATE);
  }

  private static SharedPreferences createSecurePreferences(Context context) {
    try {
      MasterKey masterKey = new MasterKey.Builder(context)
          .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
          .build();
      return EncryptedSharedPreferences.create(
          context,
          PREFS_NAME_SECURE,
          masterKey,
          EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
          EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
      );
    } catch (Exception exception) {
      throw new IllegalStateException("Failed to initialize secure session store", exception);
    }
  }
}
