package com.pincodeit.pinai;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public final class KeyStorePrefs {
    private static final String ALIAS = "pinai-xai-v1";
    private final SharedPreferences preferences;
    public KeyStorePrefs(Context context) { preferences = context.getSharedPreferences("private-settings", Context.MODE_PRIVATE); }
    private SecretKey encryptionKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (!store.containsAlias(ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            generator.generateKey();
        }
        return (SecretKey) store.getKey(ALIAS, null);
    }
    public void save(String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, encryptionKey());
        String iv = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP);
        String body = Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
        if (!preferences.edit().putString("iv", iv).putString("key", body).commit()) throw new Exception("Key could not be saved.");
    }
    public String read() throws Exception {
        String body = preferences.getString("key", ""), iv = preferences.getString("iv", "");
        if (body.isEmpty() || iv.isEmpty()) return "";
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, encryptionKey(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(body, Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }
    public void clear() { preferences.edit().clear().apply(); }
}
