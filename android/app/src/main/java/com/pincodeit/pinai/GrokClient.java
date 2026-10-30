package com.pincodeit.pinai;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

public final class GrokClient implements AutoCloseable {
    private final ScheduledExecutorService deadlines = Executors.newSingleThreadScheduledExecutor();
    public JSONObject ask(String key, JSONObject input) throws Exception {
        if (key.isEmpty()) return new JSONObject().put("available", false).put("content", "");
        JSONArray source = input.getJSONArray("messages"), messages = new JSONArray();
        if (source.length() < 2 || source.length() > 6) throw new Exception("Invalid chat request.");
        for (int i = 0; i < source.length(); i++) {
            JSONObject item = source.getJSONObject(i);
            String role = item.getString("role"), content = item.getString("content");
            if (!(role.equals("user") || role.equals("assistant") || (i == 0 && role.equals("system"))) || content.length() > 6000) throw new Exception("Invalid chat message.");
            messages.put(new JSONObject().put("role", role).put("content", content));
        }
        HttpURLConnection connection = (HttpURLConnection) new URL("https://api.x.ai/v1/chat/completions").openConnection();
        ScheduledFuture<?> cancel = deadlines.schedule(connection::disconnect, 20, TimeUnit.SECONDS);
        try {
            connection.setConnectTimeout(20000); connection.setReadTimeout(20000); connection.setInstanceFollowRedirects(false);
            connection.setRequestMethod("POST"); connection.setDoOutput(true); connection.setUseCaches(false);
            connection.setRequestProperty("Authorization", "Bearer " + key); connection.setRequestProperty("Content-Type", "application/json");
            byte[] body = new JSONObject().put("model", "grok-4.5").put("temperature", 0).put("max_tokens", 220).put("messages", messages).toString().getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(body.length);
            try (java.io.OutputStream out = connection.getOutputStream()) { out.write(body); }
            int status = connection.getResponseCode();
            if (status == 401 || status == 403) throw new Exception("xAI rejected this key or model access. Check Grok key and your xAI account.");
            if (status == 429) throw new Exception("xAI is rate limiting this account. Try again later.");
            if (status < 200 || status >= 300) throw new Exception("Grok did not answer (HTTP " + status + "). Public-page commands still work.");
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (InputStream in = connection.getInputStream()) {
                byte[] buffer = new byte[4096]; int n;
                while ((n = in.read(buffer)) != -1) { if (output.size() + n > 200000) throw new Exception("Grok returned an oversized response."); output.write(buffer, 0, n); }
            }
            String content = new JSONObject(output.toString("UTF-8")).getJSONArray("choices").getJSONObject(0).getJSONObject("message").getString("content");
            return new JSONObject().put("available", true).put("content", content);
        } catch (java.io.IOException e) { throw new Exception("Could not reach Grok. Check your connection or use /scan."); }
        finally { cancel.cancel(false); connection.disconnect(); }
    }
    @Override public void close() { deadlines.shutdownNow(); }
}
