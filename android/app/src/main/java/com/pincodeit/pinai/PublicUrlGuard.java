package com.pincodeit.pinai;

import java.net.IDN;
import java.net.InetAddress;
import java.net.URI;
import java.net.URL;
import java.util.Locale;

/** Public pages only. Kept free of Android APIs for JVM regression tests. */
public final class PublicUrlGuard {
    private PublicUrlGuard() {}

    public static URL normalize(String raw) throws Exception {
        if (raw == null || raw.trim().isEmpty() || raw.length() > 2000) throw new Exception("Send a public web address.");
        String text = raw.trim();
        if (!text.matches("(?i)^[a-z][a-z0-9+.-]*:.*")) text = "https://" + text;
        URI uri = new URI(text);
        String scheme = uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("https") && !scheme.equals("http")) throw new Exception("Only public HTTP and HTTPS pages can be read.");
        if (uri.getRawUserInfo() != null) throw new Exception("Addresses containing a username or password are blocked.");
        if (uri.getPort() != -1 && uri.getPort() != 80 && uri.getPort() != 443) throw new Exception("Only public pages on port 80 or 443 can be read.");
        String host = uri.getHost();
        if (host == null || host.isEmpty()) throw new Exception("That address is not valid.");
        host = host.toLowerCase(Locale.ROOT).replaceAll("\\.$", "");
        String bare = host.replace("[", "").replace("]", "");
        if (bare.contains("%") || bare.equals("localhost") || bare.equals("localhost.localdomain") || bare.equals("metadata") || bare.equals("metadata.google.internal") || bare.equals("metadata.google") || bare.equals("kubernetes.default") || bare.equals("host.docker.internal") || bare.equals("host.containers.internal")) throw new Exception("Private and local addresses are blocked.");
        for (String suffix : new String[]{".localhost", ".local", ".internal", ".home.arpa", ".localdomain", ".lan"}) if (bare.endsWith(suffix)) throw new Exception("Private and local addresses are blocked.");
        if (!bare.contains(":")) {
            IDN.toASCII(bare, IDN.USE_STD3_ASCII_RULES);
            if (bare.matches("[0-9.]+") && !bare.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}")) throw new Exception("That address is blocked.");
            if (bare.matches("(?i).*0x[0-9a-f]+.*")) throw new Exception("That address is blocked.");
        }
        String path = uri.getRawPath();
        return new URL(scheme + "://" + host + (uri.getPort() == -1 ? "" : ":" + uri.getPort())
            + (path == null || path.isEmpty() ? "/" : path) + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery()));
    }

    public static void checkResolved(InetAddress[] addresses) throws Exception {
        if (addresses.length == 0) throw new Exception("Could not resolve that host.");
        for (InetAddress address : addresses) if (!isPublic(address)) throw new Exception("Private and local addresses are blocked.");
    }

    public static boolean isPublic(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress() || address.isSiteLocalAddress() || address.isMulticastAddress()) return false;
        byte[] b = address.getAddress();
        if (b.length == 4) return publicV4(b);
        if (b.length != 16) return false;
        // NAT64 is common on mobile networks. Check its embedded IPv4 address.
        boolean nat64 = (b[0] & 255) == 0 && (b[1] & 255) == 100 && (b[2] & 255) == 255 && (b[3] & 255) == 155;
        for (int i = 4; i < 12; i++) nat64 &= b[i] == 0;
        if (nat64) return publicV4(new byte[]{b[12], b[13], b[14], b[15]});
        if ((b[0] & 0xe0) != 0x20) return false;
        // Documentation, Teredo and 6to4 ranges are not direct public hosts.
        if ((b[0] & 255) == 0x20 && (b[1] & 255) == 0x02) return false;
        return !((b[0] & 255) == 0x20 && (b[1] & 255) == 0x01 && ((b[2] == 0 && b[3] == 0) || ((b[2] & 255) == 0x0d && (b[3] & 255) == 0xb8)));
    }

    private static boolean publicV4(byte[] b) {
        int a = b[0] & 255, c = b[1] & 255, d = b[2] & 255;
        return !(a == 0 || a == 10 || a == 127 || a >= 224 || (a == 169 && c == 254) || (a == 172 && c >= 16 && c <= 31) || (a == 192 && c == 168) || (a == 100 && c >= 64 && c <= 127) || (a == 192 && c == 0 && (d == 0 || d == 2)) || (a == 198 && (c == 18 || c == 19 || (c == 51 && d == 100))) || (a == 203 && c == 0 && d == 113));
    }
}
