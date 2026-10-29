package com.asterlyra.nihongo;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** User-selected documents only. No broad storage permission or cloud data service. */
@CapacitorPlugin(name = "BackupFiles")
public class BackupFilesPlugin extends Plugin {
    private static final int MAX_BYTES = 30 * 1024 * 1024;

    @PluginMethod
    public void save(PluginCall call) {
        String content = call.getString("content");
        String filename = call.getString("filename");
        if (content == null || filename == null) {
            call.reject("备份内容不完整。");
            return;
        }
        if (content.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            call.reject("备份超过 30 MB，暂时无法保存。学习数据没有改变。");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        try { startActivityForResult(call, intent, "saved"); }
        catch (Exception e) { call.reject("无法打开文件保存窗口，请重试。", e); }
    }

    @ActivityCallback
    private void saved(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = selectedUri(result);
        if (uri == null) { cancelled(call); return; }
        new Thread(() -> {
            try (OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (out == null) throw new java.io.IOException("No output stream");
                out.write(call.getString("content", "").getBytes(StandardCharsets.UTF_8));
                out.flush();
            } catch (Exception e) {
                call.reject("备份没有保存成功，请换一个位置重试。学习数据没有改变。", e);
                return;
            }
            JSObject response = new JSObject(); response.put("cancelled", false);
            call.resolve(response);
        }, "backup-save").start();
    }

    @PluginMethod
    public void open(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        // Some file providers label JSON as text/plain or octet-stream.
        intent.setType("*/*");
        try { startActivityForResult(call, intent, "opened"); }
        catch (Exception e) { call.reject("无法打开文件选择窗口，请重试。", e); }
    }

    @ActivityCallback
    private void opened(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = selectedUri(result);
        if (uri == null) { cancelled(call); return; }
        new Thread(() -> {
            try (InputStream in = getContext().getContentResolver().openInputStream(uri);
                 ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                if (in == null) throw new java.io.IOException("No input stream");
                byte[] buffer = new byte[8192];
                int length;
                while ((length = in.read(buffer)) != -1) {
                    if (bytes.size() + length > MAX_BYTES) {
                        call.reject("文件过大，请选择 30 MB 以内的备份。");
                        return;
                    }
                    bytes.write(buffer, 0, length);
                }
                JSObject response = new JSObject(); response.put("cancelled", false);
                response.put("content", new String(bytes.toByteArray(), StandardCharsets.UTF_8));
                call.resolve(response);
            } catch (Exception e) { call.reject("无法读取备份文件，请重试。原数据没有改变。", e); }
        }, "backup-open").start();
    }

    private Uri selectedUri(ActivityResult result) {
        Intent data = result.getData();
        return result.getResultCode() == Activity.RESULT_OK && data != null ? data.getData() : null;
    }

    private void cancelled(PluginCall call) {
        JSObject response = new JSObject(); response.put("cancelled", true); call.resolve(response);
    }
}
