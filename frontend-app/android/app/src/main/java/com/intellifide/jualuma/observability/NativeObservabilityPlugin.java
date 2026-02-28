package com.intellifide.jualuma.observability;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONObject;

@CapacitorPlugin(name = "NativeObservability")
public class NativeObservabilityPlugin extends Plugin {
  private static final String STORE_NAME = "native_observability_store";
  private static final String PENDING_CRASH_KEY = "pending_crash_report";
  private static final String TAG = "JualumaObservability";
  private static final AtomicBoolean CRASH_HANDLER_INSTALLED = new AtomicBoolean(false);

  public static void installCrashHandler(Context context) {
    if (!CRASH_HANDLER_INSTALLED.compareAndSet(false, true)) {
      return;
    }

    final Context appContext = context.getApplicationContext();
    final Thread.UncaughtExceptionHandler previousHandler = Thread.getDefaultUncaughtExceptionHandler();

    Thread.setDefaultUncaughtExceptionHandler(
        (thread, throwable) -> {
          persistCrashReport(appContext, thread, throwable);
          if (previousHandler != null) {
            previousHandler.uncaughtException(thread, throwable);
          }
        });
  }

  @PluginMethod
  public void consumePendingCrashReport(PluginCall call) {
    SharedPreferences prefs = getBridge().getContext().getSharedPreferences(STORE_NAME, Context.MODE_PRIVATE);
    String payload = prefs.getString(PENDING_CRASH_KEY, null);

    JSObject response = new JSObject();
    if (payload == null || payload.trim().isEmpty()) {
      response.put("report", JSONObject.NULL);
      call.resolve(response);
      return;
    }

    prefs.edit().remove(PENDING_CRASH_KEY).apply();

    try {
      response.put("report", new JSObject(payload));
      call.resolve(response);
    } catch (Exception parseError) {
      response.put("report", JSONObject.NULL);
      call.resolve(response);
    }
  }

  @PluginMethod
  public void recordBreadcrumb(PluginCall call) {
    String severity = trimToDefault(call.getString("severity"), "info");
    String category = trimToDefault(call.getString("category"), "app");
    String message = trimToDefault(call.getString("message"), "unknown");
    String attributes = call.getString("attributes");

    String structuredMessage = "[" + category + "] " + message;
    if (attributes != null && !attributes.trim().isEmpty()) {
      structuredMessage = structuredMessage + " attrs=" + attributes;
    }

    Log.println(priorityForSeverity(severity), TAG, structuredMessage);
    call.resolve();
  }

  private static void persistCrashReport(Context context, Thread thread, Throwable throwable) {
    try {
      JSObject payload = new JSObject();
      payload.put("capturedAtMs", System.currentTimeMillis());
      payload.put("platform", "android");
      payload.put("osVersion", Build.VERSION.RELEASE);
      payload.put("threadName", thread != null ? thread.getName() : "unknown");
      payload.put("exceptionType", throwable.getClass().getName());
      payload.put("message", throwable.getMessage() != null ? throwable.getMessage() : "Unhandled native exception");
      payload.put("stackTrace", stackTraceFor(throwable));

      context
          .getSharedPreferences(STORE_NAME, Context.MODE_PRIVATE)
          .edit()
          .putString(PENDING_CRASH_KEY, payload.toString())
          .apply();
    } catch (Exception e) {
      Log.e(TAG, "Failed to persist native crash report", e);
    }
  }

  private static String stackTraceFor(Throwable throwable) {
    StringWriter writer = new StringWriter();
    throwable.printStackTrace(new PrintWriter(writer));
    return writer.toString();
  }

  private static String trimToDefault(String value, String fallback) {
    if (value == null) {
      return fallback;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? fallback : trimmed;
  }

  private static int priorityForSeverity(String severity) {
    switch (severity.toLowerCase()) {
      case "fatal":
      case "error":
        return Log.ERROR;
      case "warn":
        return Log.WARN;
      case "debug":
        return Log.DEBUG;
      default:
        return Log.INFO;
    }
  }
}
