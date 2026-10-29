package com.asterlyra.nihongo;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import android.view.ViewGroup;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackupFilesPlugin.class);
        super.onCreate(savedInstanceState);
        // Android 15+ enforces edge-to-edge. Keep the entire web viewport inside
        // system bars / cutouts so fixed study buttons are never underneath them.
        if (bridge == null) return;
        ViewCompat.setOnApplyWindowInsetsListener(bridge.getWebView(), (view, insets) -> {
            androidx.core.graphics.Insets safe = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            ViewGroup.MarginLayoutParams layout = (ViewGroup.MarginLayoutParams) view.getLayoutParams();
            int bottom = Math.max(safe.bottom, insets.getInsets(WindowInsetsCompat.Type.ime()).bottom);
            layout.setMargins(safe.left, safe.top, safe.right, bottom);
            view.setLayoutParams(layout);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(bridge.getWebView());
    }
}
