package com.pincodeit.pinai;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public final class MainActivity extends Activity {
    private static final String START = "https://appassets.androidplatform.net/assets/web/index.html";
    private static final int SAVE_DOCUMENT = 41;
    private WebView web;
    private KeyStorePrefs keys;
    private final PublicPageReader reader = new PublicPageReader();
    private final GrokClient grok = new GrokClient();
    private final ThreadPoolExecutor jobs = new ThreadPoolExecutor(1, 1, 30, TimeUnit.SECONDS, new ArrayBlockingQueue<>(4));
    private byte[] pendingExport;
    private boolean destroyed;

    @Override @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        keys = new KeyStorePrefs(this);
        FrameLayout root = new FrameLayout(this); root.setBackgroundColor(Color.rgb(9, 9, 11));
        web = new WebView(this); web.setBackgroundColor(Color.rgb(9, 9, 11));
        root.addView(web, new FrameLayout.LayoutParams(-1, -1)); setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                android.graphics.Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
                return WindowInsets.CONSUMED;
            });
        }
        WebSettings settings = web.getSettings();
        // Only bundled, origin-isolated assets run JavaScript. Target HTML is
        // parsed as data by React and can never navigate into this WebView.
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false); settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setBlockNetworkLoads(true); settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false); settings.setSafeBrowsingEnabled(true);
        WebView.setWebContentsDebuggingEnabled(false);
        WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse local = assets.shouldInterceptRequest(request.getUrl());
                if (local != null) return local;
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return !("https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost()) && uri.getPath() != null && uri.getPath().startsWith("/assets/web/"));
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, android.net.http.SslError error) { handler.cancel(); }
        });
        web.addJavascriptInterface(new AndroidBridge(), "PinAIAndroid");
        web.loadUrl(START);
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
    }

    @Override @SuppressWarnings("deprecation") public void onBackPressed() { handleBack(); }
    private void handleBack() {
        web.evaluateJavascript("(function(){var dialog=document.querySelector('[role=dialog]');var close=dialog&&dialog.querySelector('button[aria-label=Close]');if(!close)close=document.querySelector('button[aria-label=\"Close session search\"]');if(close){close.click();return true;}return false;})()", result -> {
            if (!"true".equals(result)) new AlertDialog.Builder(this).setTitle("Close PinAI?")
                .setMessage("Your completed session and notes stay on this device.")
                .setNegativeButton("Keep open", null).setPositiveButton("Close", (dialog, which) -> finish()).show();
        });
    }

    public final class AndroidBridge {
        @JavascriptInterface public void request(String id, String action, String payload) {
            if (destroyed || id == null || !id.matches("[0-9]{1,12}")) return;
            if (payload == null || payload.length() > 16000 || !("read".equals(action) || "grok".equals(action))) { reply(id, false, "Invalid Android request."); return; }
            try { jobs.execute(() -> {
                try {
                    JSONObject input = new JSONObject(payload);
                    JSONObject output = "read".equals(action) ? reader.read(input.getString("url"), input.getInt("maxBytes")) : grok.ask(keys.read(), input);
                    reply(id, true, output);
                } catch (Exception error) {
                    // Never serialize stack traces, raw network errors or keys.
                    String message = error.getClass() == Exception.class ? error.getMessage() : "Could not complete that request. Check your connection and try again.";
                    reply(id, false, message == null ? "The request failed." : message);
                }
            }); } catch (java.util.concurrent.RejectedExecutionException error) { reply(id, false, "A request is already running. Try again shortly."); }
        }
        @JavascriptInterface public void configureKey() { runOnUiThread(MainActivity.this::showKeyDialog); }
        @JavascriptInterface public void exportFile(String filename, String content, String mime) {
            if (filename == null || content == null || content.length() > 3_000_000) return;
            String safe = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
            if (safe.length() > 100) safe = safe.substring(0, 100);
            String suggested = safe;
            String type = "application/json".equals(mime) ? "application/json" : "text/markdown".equals(mime) ? "text/markdown" : "text/plain";
            runOnUiThread(() -> {
                if (pendingExport != null) { toast("Finish the current save first."); return; }
                pendingExport = content.getBytes(StandardCharsets.UTF_8);
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(type).putExtra(Intent.EXTRA_TITLE, suggested);
                try { startActivityForResult(intent, SAVE_DOCUMENT); }
                catch (Exception error) { pendingExport = null; toast("No file picker is available on this device."); }
            });
        }
    }

    private void reply(String id, boolean ok, Object data) {
        try {
            String json = new JSONObject().put("ok", ok).put(ok ? "data" : "error", data).toString();
            // Keep each renderer IPC well below Binder's transaction limit.
            for (int offset = 0; offset < json.length(); offset += 24000) {
                String chunk = json.substring(offset, Math.min(offset + 24000, json.length()));
                boolean last = offset + 24000 >= json.length();
                String script = "window.__pinaiChunk&&window.__pinaiChunk(" + JSONObject.quote(id) + "," + JSONObject.quote(chunk) + "," + last + ")";
                runOnUiThread(() -> { if (!destroyed) web.evaluateJavascript(script, null); });
            }
        } catch (Exception ignored) { runOnUiThread(() -> toast("Could not display the Android response. Try again.")); }
    }

    private void showKeyDialog() {
        EditText input = new EditText(this);
        input.setSingleLine(true); input.setHint("xAI API key");
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        input.setImportantForAutofill(android.view.View.IMPORTANT_FOR_AUTOFILL_NO);
        FrameLayout container = new FrameLayout(this); int pad = Math.round(20 * getResources().getDisplayMetrics().density);
        container.setPadding(pad, 0, pad, 0); container.addView(input);
        AlertDialog dialog = new AlertDialog.Builder(this).setTitle("Grok API key")
            .setMessage("Optional. Your key is encrypted on this phone and sent only to xAI. Chat sends your messages to xAI and may use paid API credits. Public-page commands need no key.")
            .setView(container).setNegativeButton("Cancel", null).setNeutralButton("Remove key", (d, w) -> { keys.clear(); toast("Grok key removed."); })
            .setPositiveButton("Save", null).create();
        dialog.setOnShowListener(d -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(view -> {
            String value = input.getText().toString().trim();
            if (value.isEmpty() || value.length() > 1000 || value.matches(".*\\s.*")) { input.setError("Enter a valid xAI API key."); return; }
            try { keys.save(value); input.setText(""); dialog.dismiss(); toast("Grok key saved on this device."); }
            catch (Exception error) { input.setError("Could not save the key securely. Try again."); }
        }));
        dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        dialog.show();
    }

    @Override @SuppressWarnings("deprecation") protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != SAVE_DOCUMENT) return;
        byte[] bytes = pendingExport; pendingExport = null;
        if (result != RESULT_OK || data == null || data.getData() == null || bytes == null) return;
        Uri destination = data.getData();
        try { jobs.execute(() -> {
            try (OutputStream output = getContentResolver().openOutputStream(destination)) {
                if (output == null) throw new Exception("No output stream");
                output.write(bytes); runOnUiThread(() -> toast("File saved."));
            } catch (Exception error) { runOnUiThread(() -> toast("Could not save the file. Try again.")); }
        }); } catch (java.util.concurrent.RejectedExecutionException error) { toast("A request is running. Try saving again shortly."); }
    }
    private void toast(String message) { if (!destroyed) Toast.makeText(this, message, Toast.LENGTH_SHORT).show(); }
    @Override protected void onPause() { web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() {
        destroyed = true; pendingExport = null; jobs.shutdownNow(); reader.close(); grok.close();
        web.removeJavascriptInterface("PinAIAndroid"); web.destroy(); super.onDestroy();
    }
}
