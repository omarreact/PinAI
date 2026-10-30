package com.pincodeit.pinai;
import org.junit.Test;
import static org.junit.Assert.*;
import java.net.InetAddress;
import java.net.URL;

public class PublicUrlGuardTest {
    @Test public void acceptsPublicUrlsAndRemovesFragments() throws Exception {
        assertEquals("https://example.com/", PublicUrlGuard.normalize("example.com").toString());
        assertEquals("https://example.com/path?q=1", PublicUrlGuard.normalize("https://example.com/path?q=1#part").toString());
        assertEquals("https://example.com/a%2Fb?q=one%26two", PublicUrlGuard.normalize("https://example.com/a%2Fb?q=one%26two").toString());
    }
    @Test public void rejectsCredentialsSchemesPrivateNamesAndUnusualPorts() throws Exception {
        for (String url : new String[]{"file:///etc/passwd", "javascript:alert(1)", "https://user:pass@example.com", "http://localhost", "http://metadata.google.internal", "http://router.lan", "http://example.com:8080", "http://2130706433", "http://0x7f000001"}) {
            try { PublicUrlGuard.normalize(url); fail("Accepted " + url); } catch (Exception expected) { /* must reject before networking */ }
        }
    }
    @Test public void blocksPrivateReservedAndMetadataIps() throws Exception {
        for (String ip : new String[]{"127.0.0.1", "10.1.2.3", "192.168.1.1", "172.16.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "198.18.0.1", "192.0.2.1", "::1", "fc00::1", "fe80::1", "2001:db8::1", "64:ff9b::7f00:1"}) assertFalse(ip, PublicUrlGuard.isPublic(InetAddress.getByName(ip)));
    }
    @Test public void permitsPublicIPv4IPv6AndMobileNat64() throws Exception {
        for (String ip : new String[]{"1.1.1.1", "8.8.8.8", "2606:4700:4700::1111", "64:ff9b::808:808"}) assertTrue(ip, PublicUrlGuard.isPublic(InetAddress.getByName(ip)));
    }
    @Test public void rejectsMixedDnsAnswersAndChecksRedirectDestinations() throws Exception {
        try { PublicUrlGuard.checkResolved(new InetAddress[]{InetAddress.getByName("1.1.1.1"), InetAddress.getByName("127.0.0.1")}); fail("Accepted mixed addresses"); } catch (Exception expected) {}
        URL target = PublicUrlGuard.normalize(new URL(new URL("https://example.com/"), "http://127.0.0.1/admin").toString());
        try { PublicUrlGuard.checkResolved(new InetAddress[]{InetAddress.getByName(target.getHost())}); fail("Accepted private redirect"); } catch (Exception expected) {}
    }
}
