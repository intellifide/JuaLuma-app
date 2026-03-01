package com.intellifide.jualuma.plaid;

import androidx.activity.ComponentActivity;
import androidx.activity.result.ActivityResultLauncher;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.plaid.link.FastOpenPlaidLink;
import com.plaid.link.Plaid;
import com.plaid.link.PlaidHandler;
import com.plaid.link.configuration.LinkTokenConfiguration;
import com.plaid.link.result.LinkAccount;
import com.plaid.link.result.LinkExit;
import com.plaid.link.result.LinkResult;
import com.plaid.link.result.LinkSuccess;
import org.json.JSONArray;

@CapacitorPlugin(name = "NativePlaidLink")
public class NativePlaidLinkPlugin extends Plugin {
  private ActivityResultLauncher<PlaidHandler> linkLauncher;
  private String pendingCallbackId;
  private PlaidHandler plaidHandler;

  @Override
  public void load() {
    super.load();
    if (!(getActivity() instanceof ComponentActivity)) {
      return;
    }
    ComponentActivity activity = (ComponentActivity) getActivity();
    linkLauncher = activity.registerForActivityResult(
        new FastOpenPlaidLink(),
        this::handleLinkResult);
  }

  @PluginMethod
  public void openLink(PluginCall call) {
    String linkToken = call.getString("linkToken");
    if (linkToken == null || linkToken.trim().isEmpty()) {
      call.reject("linkToken is required");
      return;
    }

    if (pendingCallbackId != null) {
      call.reject("A Plaid Link session is already in progress.");
      return;
    }

    if (linkLauncher == null || getActivity() == null) {
      call.reject("Unable to launch native Plaid Link.");
      return;
    }

    try {
      LinkTokenConfiguration configuration = new LinkTokenConfiguration.Builder()
          .token(linkToken.trim())
          .build();
      plaidHandler = Plaid.create(getActivity().getApplication(), configuration);
    } catch (Exception error) {
      call.reject("Unable to initialize native Plaid Link.", error);
      clearPendingState();
      return;
    }

    pendingCallbackId = call.getCallbackId();
    bridge.saveCall(call);
    linkLauncher.launch(plaidHandler);
  }

  private void handleLinkResult(LinkResult result) {
    if (result instanceof LinkSuccess) {
      resolveSuccess((LinkSuccess) result);
      return;
    }
    if (result instanceof LinkExit) {
      resolveExit((LinkExit) result);
      return;
    }
    rejectPendingCall("Native Plaid Link returned an invalid result.");
  }

  private void resolveSuccess(LinkSuccess success) {
    JSObject payload = new JSObject();
    payload.put("status", "success");
    payload.put("publicToken", success.getPublicToken());

    if (success.getMetadata() != null && success.getMetadata().getInstitution() != null) {
      payload.put("institutionName", success.getMetadata().getInstitution().getName());
    }

    JSONArray selectedAccountIds = new JSONArray();
    if (success.getMetadata() != null && success.getMetadata().getAccounts() != null) {
      for (LinkAccount account : success.getMetadata().getAccounts()) {
        if (account != null && account.getId() != null && !account.getId().trim().isEmpty()) {
          selectedAccountIds.put(account.getId());
        }
      }
    }
    payload.put("selectedAccountIds", selectedAccountIds);
    resolvePendingCall(payload);
  }

  private void resolveExit(LinkExit exit) {
    JSObject payload = new JSObject();
    payload.put("status", "exit");

    if (exit.getError() != null) {
      payload.put("errorCode", String.valueOf(exit.getError().getErrorCode()));
      String errorMessage = exit.getError().getDisplayMessage();
      if (errorMessage == null || errorMessage.trim().isEmpty()) {
        errorMessage = exit.getError().getErrorMessage();
      }
      if (errorMessage != null && !errorMessage.trim().isEmpty()) {
        payload.put("errorMessage", errorMessage);
      }
    }

    resolvePendingCall(payload);
  }

  private void resolvePendingCall(JSObject payload) {
    if (pendingCallbackId == null) {
      clearPendingState();
      return;
    }
    PluginCall savedCall = bridge.getSavedCall(pendingCallbackId);
    if (savedCall != null) {
      savedCall.resolve(payload);
      bridge.releaseCall(savedCall);
    }
    clearPendingState();
  }

  private void rejectPendingCall(String message) {
    if (pendingCallbackId == null) {
      clearPendingState();
      return;
    }
    PluginCall savedCall = bridge.getSavedCall(pendingCallbackId);
    if (savedCall != null) {
      savedCall.reject(message);
      bridge.releaseCall(savedCall);
    }
    clearPendingState();
  }

  private void clearPendingState() {
    pendingCallbackId = null;
    plaidHandler = null;
  }
}
