package com.pincodeit.pinai;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.ContentValues;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.ViewGroup;
import android.webkit.WebView;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Isolated API 35 runtime checks against the installed production APK.
 * No real credentials, paid API calls or user-device data are used. */
@android.annotation.TargetApi(35)
public final class RuntimeChecks extends Instrumentation {
    private MainActivity activity;
    private WebView web;
    private final JSONArray outcomes = new JSONArray();
    private int failures;
    private static final String NOTE = "pinai-runtime-note-20261030";
    interface Checked { void run() throws Exception; }
    interface Condition { boolean ready() throws Exception; }

    @Override public void onCreate(Bundle arguments) { super.onCreate(arguments); start(); }
    @Override public void onStart() {
        check("bundled UI launches", () -> launch());
        check("private URL is rejected across Android bridge", () -> {
            JSONObject result = request("900001", "read", new JSONObject().put("url", "http://127.0.0.1/").put("maxBytes", 512));
            require(!result.getBoolean("ok") && result.getString("error").contains("blocked"), "Private destination was not rejected");
        });
        check("missing Grok key makes no API request", () -> {
            new KeyStorePrefs(getTargetContext()).clear();
            JSONObject result = request("900002", "grok", new JSONObject().put("messages", new JSONArray()));
            require(result.getBoolean("ok") && !result.getJSONObject("data").getBoolean("available"), "Keyless fallback missing");
        });
        check("large Unicode responses survive renderer IPC", () -> {
            StringBuilder text = new StringBuilder();
            for (int i = 0; i < 50000; i++) text.append("বাংলা \"\n😀");
            Method reply = MainActivity.class.getDeclaredMethod("reply", String.class, boolean.class, Object.class);
            reply.setAccessible(true);
            reply.invoke(activity, "900003", true, new JSONObject().put("text", text.toString()));
            await(() -> Boolean.TRUE.equals(js("return !!window.__pinaiRuntime['900003'];")), 45000);
            int length = ((Number) js("return window.__pinaiRuntime['900003'].data.text.length;")).intValue();
            require(length == text.length(), "Unicode response was truncated");
        });
        check("API key is encrypted with Android Keystore", () -> {
            KeyStorePrefs prefs = new KeyStorePrefs(getTargetContext());
            String fake = "xai-runtime-fixture-not-a-real-key";
            try {
                prefs.save(fake); require(fake.equals(prefs.read()), "Encrypted key did not round trip");
                String stored = getTargetContext().getSharedPreferences("private-settings", 0).getString("key", "");
                require(!stored.isEmpty() && !stored.contains(fake), "Plain key was persisted");
            } finally { prefs.clear(); }
        });
        check("notes are saved through the React composer", () -> {
            compose("/note " + NOTE);
            await(() -> String.valueOf(js("return document.body.innerText;")).contains("Noted on this device."), 15000);
            require(String.valueOf(js("return localStorage.getItem('ai-terminal-mobile');")).contains(NOTE), "Note was not persisted");
        });
        check("session search filters and resets", () -> {
            js("document.querySelector('button[aria-label=\"Search session\"]').click(); return true;");
            await(() -> Boolean.TRUE.equals(js("return !!document.querySelector('#session-search-input');")), 10000);
            js("var input=document.querySelector('#session-search-input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'no-matching-runtime-message');input.dispatchEvent(new Event('input',{bubbles:true}));return true;");
            await(() -> String.valueOf(js("return document.body.innerText;")).contains("No messages match this search"), 10000);
            js("document.querySelector('button[aria-label=\"Close session search\"]').click();return true;");
            await(() -> String.valueOf(js("return document.body.innerText;")).contains(NOTE), 10000);
        });
        check("Markdown export writes to a system-selected content URI", () -> export());
        check("Back closes an open session sheet", () -> {
            js("document.querySelector('button[aria-label=\"Session\"]').click();return true;");
            await(() -> Boolean.TRUE.equals(js("return !!document.querySelector('[role=dialog]');")), 10000);
            runOnMainSync(() -> activity.onBackPressed());
            await(() -> Boolean.TRUE.equals(js("return !document.querySelector('[role=dialog]');")), 10000);
        });
        check("saved session survives Activity recreation", () -> {
            runOnMainSync(() -> activity.finish());
            launch();
            require(String.valueOf(js("return document.body.innerText;")).contains(NOTE), "Saved note was not restored");
        });
        Bundle result = new Bundle();
        result.putString("stream", "\nPINAI_RUNTIME_CHECKS=" + outcomes.toString() + "\n");
        result.putInt("passed", outcomes.length() - failures); result.putInt("failed", failures);
        finish(failures == 0 ? Activity.RESULT_OK : Activity.RESULT_CANCELED, result);
    }

    private void launch() throws Exception {
        Intent intent = new Intent(getTargetContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) startActivitySync(intent);
        runOnMainSync(() -> {
            ViewGroup content = activity.findViewById(android.R.id.content);
            web = (WebView) ((ViewGroup) content.getChildAt(0)).getChildAt(0);
        });
        await(() -> String.valueOf(js("return document.body.innerText;")).contains("PinAI"), 45000);
        await(() -> String.valueOf(js("return document.body.innerText;")).contains("What are we shipping next?"), 45000);
        js("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Assistant & page tools')).click();return true;");
        await(() -> Boolean.TRUE.equals(js("return !!document.querySelector('#terminal-input');")), 10000);
        await(() -> Boolean.TRUE.equals(js("return typeof window.__pinaiChunk==='function';")), 45000);
        js("window.__pinaiRuntime={};var original=window.__pinaiChunk;var chunks={};window.__pinaiChunk=function(id,chunk,last){if(id.startsWith('900')){(chunks[id]||(chunks[id]=[])).push(chunk);if(last){window.__pinaiRuntime[id]=JSON.parse(chunks[id].join(''));delete chunks[id];}}else original(id,chunk,last);};return true;");
    }
    private JSONObject request(String id, String action, JSONObject input) throws Exception {
        js("window.PinAIAndroid.request(" + JSONObject.quote(id) + "," + JSONObject.quote(action) + "," + JSONObject.quote(input.toString()) + ");return true;");
        await(() -> Boolean.TRUE.equals(js("return !!window.__pinaiRuntime[" + JSONObject.quote(id) + "];")), 20000);
        Object output = js("return window.__pinaiRuntime[" + JSONObject.quote(id) + "];");
        return (JSONObject) output;
    }
    private void compose(String text) throws Exception {
        js("var input=document.querySelector('#terminal-input');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input," + JSONObject.quote(text) + ");input.dispatchEvent(new Event('input',{bubbles:true}));return true;");
        await(() -> Boolean.TRUE.equals(js("return !document.querySelector('button[aria-label=Send]').disabled;")), 10000);
        js("document.querySelector('form').requestSubmit();return true;");
    }
    private void export() throws Exception {
        ContentValues values = new ContentValues(); values.put(MediaStore.Downloads.DISPLAY_NAME, "pinai-runtime-check.md");
        values.put(MediaStore.Downloads.MIME_TYPE, "text/markdown"); values.put(MediaStore.Downloads.RELATIVE_PATH, "Download/PinAI-tests");
        Uri destination = getTargetContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        require(destination != null, "Could not create test export destination");
        Intent result = new Intent().setData(destination);
        ActivityMonitor monitor = addMonitor(new IntentFilter(Intent.ACTION_CREATE_DOCUMENT), new ActivityResult(Activity.RESULT_OK, result), true);
        try {
            js("document.querySelector('button[aria-label=\"Session\"]').click();return true;");
            await(() -> Boolean.TRUE.equals(js("return !!document.querySelector('[role=dialog]');")), 10000);
            js("Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent.trim()==='Save Markdown').click();return true;");
            await(() -> monitor.getHits() > 0, 15000);
            await(() -> {
                try (InputStream input = getTargetContext().getContentResolver().openInputStream(destination)) {
                    if (input == null) return false;
                    ByteArrayOutputStream output = new ByteArrayOutputStream(); byte[] b = new byte[4096]; int n;
                    while ((n = input.read(b)) != -1) output.write(b, 0, n);
                    String text = output.toString("UTF-8"); return text.contains("# PinAI session") && text.contains(NOTE);
                }
            }, 15000);
            js("document.querySelector('[role=dialog] button[aria-label=Close]').click();return true;");
        } finally { removeMonitor(monitor); getTargetContext().getContentResolver().delete(destination, null, null); }
    }
    private Object js(String body) throws Exception {
        CountDownLatch latch = new CountDownLatch(1); AtomicReference<String> value = new AtomicReference<>();
        String script = "(function(){try{" + body + "}catch(e){return {runtimeError:String(e)};}})()";
        runOnMainSync(() -> web.evaluateJavascript(script, result -> { value.set(result); latch.countDown(); }));
        require(latch.await(15, TimeUnit.SECONDS), "WebView did not answer");
        Object result = new JSONTokener(value.get() == null ? "null" : value.get()).nextValue();
        if (result instanceof JSONObject && ((JSONObject) result).has("runtimeError")) throw new Exception(((JSONObject) result).getString("runtimeError"));
        return result;
    }
    private void await(Condition condition, long timeout) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeout);
        while (System.nanoTime() < deadline) { if (condition.ready()) return; Thread.sleep(200); }
        throw new Exception("Runtime condition timed out");
    }
    private static void require(boolean value, String message) throws Exception { if (!value) throw new Exception(message); }
    private void check(String name, Checked test) {
        try { test.run(); outcomes.put(new JSONObject().put("check", name).put("passed", true)); }
        catch (Exception error) { failures++; try { outcomes.put(new JSONObject().put("check", name).put("passed", false).put("error", error.toString())); } catch (Exception ignored) {} }
    }
}

