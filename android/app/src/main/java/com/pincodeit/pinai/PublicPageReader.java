package com.pincodeit.pinai;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;

public final class PublicPageReader implements AutoCloseable {
    private final ExecutorService dns = Executors.newFixedThreadPool(2);
    private final ScheduledExecutorService deadlines = Executors.newSingleThreadScheduledExecutor();
    public JSONObject read(String raw, int limit) throws Exception {
        if (limit < 1 || limit > 1_200_000) throw new Exception("Invalid response size limit.");
        long start = System.nanoTime();
        long deadline = start + TimeUnit.SECONDS.toNanos(12);
        AtomicReference<HttpURLConnection> active = new AtomicReference<>();
        ScheduledFuture<?> cancel = deadlines.schedule(() -> { HttpURLConnection connection = active.get(); if (connection != null) connection.disconnect(); }, 12, TimeUnit.SECONDS);
        try {
            URL current = PublicUrlGuard.normalize(raw);
            String requested = current.toExternalForm();
            Set<String> seen = new HashSet<>();
            JSONArray redirects = new JSONArray();
            long headersMs = 0;
            for (int hop = 0; hop < 5; hop++) {
                if (!seen.add(current.toExternalForm())) throw new Exception("The redirects looped.");
                final String hostname = current.getHost().replace("[", "").replace("]", "");
                Future<InetAddress[]> lookup = dns.submit(() -> InetAddress.getAllByName(hostname));
                try { PublicUrlGuard.checkResolved(lookup.get(remaining(deadline), TimeUnit.MILLISECONDS)); }
                finally { lookup.cancel(true); }
                HttpURLConnection connection = (HttpURLConnection) current.openConnection();
                active.set(connection);
                connection.setConnectTimeout(remaining(deadline)); connection.setReadTimeout(remaining(deadline));
                connection.setInstanceFollowRedirects(false); connection.setUseCaches(false); connection.setRequestMethod("GET");
                connection.setRequestProperty("User-Agent", "PinAI/1.1 (public page reader)");
                connection.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8");
                connection.setRequestProperty("Accept-Language", "en");
                long headerStart = System.nanoTime();
                int status = connection.getResponseCode();
                long hopMs = msSince(headerStart); headersMs += hopMs;
                redirects.put(new JSONObject().put("url", current.toExternalForm()).put("status", status).put("ms", hopMs));
                if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
                    String location = connection.getHeaderField("Location");
                    connection.disconnect(); active.set(null);
                    if (location == null || location.isEmpty()) throw new Exception("The host returned a redirect without a destination.");
                    current = PublicUrlGuard.normalize(new URL(current, location).toExternalForm());
                    continue;
                }
                String contentType = connection.getContentType();
                String kind = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
                boolean textual = kind.isEmpty() || kind.contains("text/") || kind.contains("json") || kind.contains("xml") || kind.contains("javascript") || kind.contains("svg") || kind.contains("urlencoded");
                JSONArray headers = new JSONArray();
                for (Map.Entry<String, List<String>> h : connection.getHeaderFields().entrySet()) {
                    if (h.getKey() != null && h.getValue() != null) headers.put(new JSONObject().put("name", h.getKey().toLowerCase(Locale.ROOT)).put("value", String.join(", ", h.getValue())));
                }
                long bodyStart = System.nanoTime(), bytes = 0;
                String text = ""; boolean truncated = false;
                if (textual) {
                    InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                    ByteArrayOutputStream body = new ByteArrayOutputStream();
                    if (stream != null) try (InputStream in = stream) {
                        byte[] buffer = new byte[8192];
                        while (true) {
                            connection.setReadTimeout(remaining(deadline));
                            int count = in.read(buffer, 0, Math.min(buffer.length, limit - body.size() + 1));
                            if (count < 0) break;
                            int room = limit - body.size(); body.write(buffer, 0, Math.min(room, count));
                            if (count > room) { truncated = true; break; }
                        }
                    }
                    bytes = body.size(); text = new String(body.toByteArray(), StandardCharsets.UTF_8);
                } else bytes = Math.max(0, connection.getContentLengthLong());
                long bodyMs = msSince(bodyStart), totalMs = msSince(start);
                return new JSONObject().put("requestedUrl", requested).put("finalUrl", current.toExternalForm()).put("status", status)
                    .put("ms", totalMs).put("contentType", contentType == null ? JSONObject.NULL : contentType).put("redirects", redirects)
                    .put("headers", headers).put("text", text).put("bytes", bytes).put("truncated", truncated).put("textual", textual)
                    .put("timings", new JSONObject().put("headersMs", headersMs).put("bodyMs", bodyMs).put("totalMs", totalMs));
            }
            throw new Exception("Too many redirects.");
        } catch (TimeoutException | SocketTimeoutException e) { throw new Exception("The page took too long. Try again."); }
        catch (java.io.IOException e) { throw new Exception(System.nanoTime() >= deadline ? "The page took too long. Try again." : "Could not reach that host. Check your connection."); }
        finally { cancel.cancel(false); HttpURLConnection connection = active.getAndSet(null); if (connection != null) connection.disconnect(); }
    }
    private static int remaining(long deadline) throws SocketTimeoutException {
        long ms = TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime());
        if (ms <= 0) throw new SocketTimeoutException();
        return (int) Math.min(ms, Integer.MAX_VALUE);
    }
    private static long msSince(long start) { return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start); }
    @Override public void close() { dns.shutdownNow(); deadlines.shutdownNow(); }
}
