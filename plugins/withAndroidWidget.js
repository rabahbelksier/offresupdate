const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════════
// Kotlin: AppWidgetProvider
// ═══════════════════════════════════════════════════════════════════

const WIDGET_PROVIDER_KT = `package com.offers365.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews
import com.offers365.app.R

class OffersWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_GET_OFFERS = "com.offers365.app.widget.ACTION_GET_OFFERS"
        const val PREFS_NAME        = "OffersWidgetPrefs"
        const val PREF_URL_PREFIX   = "widget_url_"

        data class WidgetStrings(
            val placeholder: String,
            val btnGetOffers: String,
            val btnPaste: String
        )

        fun getStrings(context: Context): WidgetStrings {
            val lang = java.util.Locale.getDefault().language
            return when (lang) {
                "ar" -> WidgetStrings(
                    placeholder  = "\\u0623\\u062f\\u062e\\u0644 \\u0631\\u0627\\u0628\\u0637 AliExpress\u2026",
                    btnGetOffers = "\\u0627\\u0644\\u062d\\u0635\\u0648\\u0644 \\u0639\\u0644\\u0649 \\u0627\\u0644\\u0639\\u0631\\u0648\\u0636",
                    btnPaste     = "\\u0644\\u0635\\u0642"
                )
                "fr" -> WidgetStrings(
                    placeholder  = "Entrez le lien AliExpress\u2026",
                    btnGetOffers = "Obtenir les offres",
                    btnPaste     = "Coller"
                )
                "pt" -> WidgetStrings(
                    placeholder  = "Insira o link AliExpress\u2026",
                    btnGetOffers = "Obter ofertas",
                    btnPaste     = "Colar"
                )
                else -> WidgetStrings(
                    placeholder  = "Enter AliExpress link\u2026",
                    btnGetOffers = "Get Offers",
                    btnPaste     = "Paste"
                )
            }
        }

        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs: SharedPreferences =
                context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val savedUrl = prefs.getString(PREF_URL_PREFIX + appWidgetId, "") ?: ""
            val strings  = getStrings(context)

            val views = RemoteViews(context.packageName, R.layout.widget_offers365)

            if (savedUrl.isNotEmpty()) {
                views.setTextViewText(R.id.widget_url_text, savedUrl)
                views.setTextColor(R.id.widget_url_text, Color.WHITE)
            } else {
                views.setTextViewText(R.id.widget_url_text, strings.placeholder)
                views.setTextColor(R.id.widget_url_text, 0x99FFFFFF.toInt())
            }

            // Localized button text
            views.setTextViewText(R.id.widget_search_btn, strings.btnGetOffers)

            // Tap URL area → open input activity
            val inputIntent = Intent(context, WidgetInputActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val inputPi = PendingIntent.getActivity(
                context,
                appWidgetId * 10 + 1,
                inputIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_url_container, inputPi)

            // Tap search button → broadcast to this provider
            val offersIntent = Intent(context, OffersWidgetProvider::class.java).apply {
                action = ACTION_GET_OFFERS
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            val offersPi = PendingIntent.getBroadcast(
                context,
                appWidgetId * 10 + 2,
                offersIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_search_btn, offersPi)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action != ACTION_GET_OFFERS) return

        val appWidgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        )
        val prefs    = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedUrl = prefs.getString(PREF_URL_PREFIX + appWidgetId, "") ?: ""

        if (savedUrl.isNotEmpty()) {
            val encodedUrl = Uri.encode(savedUrl)
            val deepLink   = Uri.parse("offers365://widget?url=\$encodedUrl")
            val mainIntent = Intent(Intent.ACTION_VIEW, deepLink).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            try { context.startActivity(mainIntent) } catch (e: Exception) { /* no-op */ }
        } else {
            val inputIntent = Intent(context, WidgetInputActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            try { context.startActivity(inputIntent) } catch (e: Exception) { /* no-op */ }
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        val editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
        appWidgetIds.forEach { editor.remove(PREF_URL_PREFIX + it) }
        editor.apply()
    }
}
`;

// ═══════════════════════════════════════════════════════════════════
// Kotlin: WidgetInputActivity (transparent overlay, styled as widget)
// ═══════════════════════════════════════════════════════════════════

const WIDGET_INPUT_ACTIVITY_KT = `package com.offers365.app.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.TextView
import com.offers365.app.R

class WidgetInputActivity : Activity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make the activity window transparent so only the widget-styled card shows
        window.setBackgroundDrawableResource(android.R.color.transparent)
        window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
        window.setDimAmount(0.5f)

        setContentView(R.layout.activity_widget_input)

        appWidgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        )

        val prefs    = getSharedPreferences(OffersWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
        val savedUrl = prefs.getString(OffersWidgetProvider.PREF_URL_PREFIX + appWidgetId, "") ?: ""

        val urlInput  = findViewById<EditText>(R.id.input_url)
        val pasteBtn  = findViewById<TextView>(R.id.btn_paste)
        val closeBtn  = findViewById<View>(R.id.btn_close)
        val searchBtn = findViewById<TextView>(R.id.btn_search)

        // Apply localized strings based on device locale
        val strings = OffersWidgetProvider.getStrings(this)
        urlInput.hint = strings.placeholder
        pasteBtn.text = strings.btnPaste
        searchBtn.text = strings.btnGetOffers

        // Pre-fill with saved URL and place cursor at end
        if (savedUrl.isNotEmpty()) {
            urlInput.setText(savedUrl)
            urlInput.setSelection(urlInput.text.length)
        }

        // Auto-show keyboard focused on the input field
        urlInput.requestFocus()
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE)

        // Close on background dim tap
        findViewById<View>(R.id.root_container).setOnClickListener { finish() }
        // Prevent card clicks from bubbling to background
        findViewById<View>(R.id.widget_card).setOnClickListener { /* consume */ }

        pasteBtn.setOnClickListener {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = clipboard.primaryClip
            if (clip != null && clip.itemCount > 0) {
                val text = clip.getItemAt(0).coerceToText(this).toString()
                urlInput.setText(text)
                urlInput.setSelection(urlInput.text.length)
            }
        }

        closeBtn.setOnClickListener { finish() }

        // IME "Done" action triggers search
        urlInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                performSearch(urlInput, prefs)
                true
            } else false
        }

        searchBtn.setOnClickListener { performSearch(urlInput, prefs) }
    }

    private fun performSearch(urlInput: EditText, prefs: android.content.SharedPreferences) {
        val url = urlInput.text.toString().trim()
        if (url.isEmpty()) return

        // Hide keyboard
        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        imm.hideSoftInputFromWindow(urlInput.windowToken, 0)

        // Open main app via deep link before clearing, so the URL is ready
        val encodedUrl = Uri.encode(url)
        val deepLink   = Uri.parse("offers365://widget?url=\$encodedUrl")
        val mainIntent = Intent(Intent.ACTION_VIEW, deepLink).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        try { startActivity(mainIntent) } catch (e: Exception) { /* no-op */ }

        // Clear saved URL so the field is empty next time the widget is tapped
        prefs.edit()
            .remove(OffersWidgetProvider.PREF_URL_PREFIX + appWidgetId)
            .apply()

        // Refresh widget display to show placeholder (field cleared)
        val appWidgetManager = AppWidgetManager.getInstance(this)
        OffersWidgetProvider.updateWidget(this, appWidgetManager, appWidgetId)

        finish()
    }
}
`;

// ═══════════════════════════════════════════════════════════════════
// Kotlin: PinWidgetActivity (pins the widget directly from the app)
// ═══════════════════════════════════════════════════════════════════

const PIN_WIDGET_ACTIVITY_KT = `package com.offers365.app.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import android.os.Bundle
import android.widget.Toast

class PinWidgetActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val appWidgetManager = AppWidgetManager.getInstance(this)
            val provider = ComponentName(this, OffersWidgetProvider::class.java)
            if (appWidgetManager.isRequestPinAppWidgetSupported) {
                appWidgetManager.requestPinAppWidget(provider, null, null)
            } else {
                Toast.makeText(
                    this,
                    "\\u0644\\u0627 \\u064a\\u062f\\u0639\\u0645\\u0647 \\u0647\\u0630\\u0627 \\u0627\\u0644\\u0644\\u0627\\u0646\\u0634\\u0631",
                    Toast.LENGTH_SHORT
                ).show()
            }
        } else {
            Toast.makeText(
                this,
                "\\u064a\\u062a\\u0637\\u0644\\u0628 Android 8.0 \\u0623\\u0648 \\u0623\\u062d\\u062f\\u062b",
                Toast.LENGTH_SHORT
            ).show()
        }
        finish()
    }
}
`;

// ═══════════════════════════════════════════════════════════════════
// Layout XML: widget home screen layout
// ═══════════════════════════════════════════════════════════════════

const WIDGET_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="14dp"
    android:gravity="center_vertical">

    <!-- Header: icon + app name -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layout_marginBottom="10dp">

        <ImageView
            android:layout_width="22dp"
            android:layout_height="22dp"
            android:src="@mipmap/ic_launcher"
            android:layout_marginEnd="8dp" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Offers 365"
            android:textColor="#FFFFFF"
            android:textSize="13sp"
            android:textStyle="bold" />
    </LinearLayout>

    <!-- URL display area (tap to edit) -->
    <FrameLayout
        android:id="@+id/widget_url_container"
        android:layout_width="match_parent"
        android:layout_height="38dp"
        android:background="@drawable/widget_input_bg"
        android:layout_marginBottom="8dp">

        <TextView
            android:id="@+id/widget_url_text"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:gravity="center_vertical"
            android:paddingStart="12dp"
            android:paddingEnd="12dp"
            android:textColor="#99FFFFFF"
            android:textSize="11sp"
            android:maxLines="1"
            android:ellipsize="end" />
    </FrameLayout>

    <!-- Search button -->
    <TextView
        android:id="@+id/widget_search_btn"
        android:layout_width="match_parent"
        android:layout_height="38dp"
        android:text="&#x627;&#x644;&#x62D;&#x635;&#x648;&#x644; &#x639;&#x644;&#x649; &#x627;&#x644;&#x639;&#x631;&#x648;&#x636;"
        android:textColor="#1A1A1A"
        android:textSize="12sp"
        android:textStyle="bold"
        android:gravity="center"
        android:background="@drawable/widget_btn_bg" />

</LinearLayout>
`;

// ═══════════════════════════════════════════════════════════════════
// Layout XML: URL input dialog activity
// ═══════════════════════════════════════════════════════════════════

const WIDGET_INPUT_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<!-- Root: full-screen transparent container; tap outside card = dismiss -->
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/root_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#00000000">

    <!-- Card styled identically to the home-screen widget -->
    <LinearLayout
        android:id="@+id/widget_card"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_gravity="center"
        android:layout_marginStart="28dp"
        android:layout_marginEnd="28dp"
        android:orientation="vertical"
        android:background="@drawable/widget_background"
        android:padding="14dp"
        android:gravity="center_vertical">

        <!-- Header: icon + app name + close button -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:layout_marginBottom="10dp">

            <ImageView
                android:layout_width="22dp"
                android:layout_height="22dp"
                android:src="@mipmap/ic_launcher"
                android:layout_marginEnd="8dp" />

            <TextView
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="Offers 365"
                android:textColor="#FFFFFF"
                android:textSize="13sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/btn_close"
                android:layout_width="24dp"
                android:layout_height="24dp"
                android:text="&#x2715;"
                android:textColor="#CCFFFFFF"
                android:textSize="14sp"
                android:gravity="center"
                android:padding="2dp" />
        </LinearLayout>

        <!-- URL input area styled like the widget URL display -->
        <FrameLayout
            android:layout_width="match_parent"
            android:layout_height="44dp"
            android:background="@drawable/widget_input_bg"
            android:layout_marginBottom="8dp">

            <EditText
                android:id="@+id/input_url"
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:hint="&#x623;&#x62F;&#x62E;&#x644; &#x631;&#x627;&#x628;&#x637; AliExpress&#x2026;"
                android:textColorHint="#99FFFFFF"
                android:textColor="#FFFFFF"
                android:textSize="11sp"
                android:background="@null"
                android:paddingStart="12dp"
                android:paddingEnd="72dp"
                android:singleLine="true"
                android:inputType="textUri"
                android:imeOptions="actionDone"
                android:gravity="center_vertical" />

            <TextView
                android:id="@+id/btn_paste"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_gravity="center_vertical|end"
                android:layout_marginEnd="10dp"
                android:text="&#x644;&#x635;&#x642;"
                android:textColor="#FFD700"
                android:textSize="12sp"
                android:textStyle="bold"
                android:padding="4dp" />
        </FrameLayout>

        <!-- Search button identical to widget button -->
        <TextView
            android:id="@+id/btn_search"
            android:layout_width="match_parent"
            android:layout_height="44dp"
            android:text="&#x627;&#x644;&#x62D;&#x635;&#x648;&#x644; &#x639;&#x644;&#x649; &#x627;&#x644;&#x639;&#x631;&#x648;&#x636;"
            android:textColor="#1A1A1A"
            android:textSize="13sp"
            android:textStyle="bold"
            android:gravity="center"
            android:background="@drawable/widget_btn_bg" />

    </LinearLayout>

</FrameLayout>
`;

// ═══════════════════════════════════════════════════════════════════
// Drawable XMLs
// ═══════════════════════════════════════════════════════════════════

const WIDGET_BACKGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <gradient
        android:startColor="#FF6A00"
        android:endColor="#CC3300"
        android:angle="135" />
    <corners android:radius="20dp" />
</shape>
`;

const WIDGET_INPUT_BG_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#33FFFFFF" />
    <corners android:radius="10dp" />
</shape>
`;

const WIDGET_BTN_BG_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#FFD700" />
    <corners android:radius="10dp" />
</shape>
`;

// ═══════════════════════════════════════════════════════════════════
// AppWidget provider metadata XML
// ═══════════════════════════════════════════════════════════════════

const WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:previewImage="@mipmap/ic_launcher"
    android:initialLayout="@layout/widget_offers365"
    android:widgetCategory="home_screen"
    android:resizeMode="horizontal|vertical">
</appwidget-provider>
`;

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function writeIfChanged(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) return;
  fs.writeFileSync(filePath, content, "utf8");
}

// ═══════════════════════════════════════════════════════════════════
// Plugin entry point
// ═══════════════════════════════════════════════════════════════════

module.exports = function withAndroidWidget(config) {
  // ── Step 1: write native files into the android directory ──────
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const androidSrc = path.join(
        cfg.modRequest.projectRoot,
        "android",
        "app",
        "src",
        "main"
      );

      // Kotlin classes
      const ktDir = path.join(
        androidSrc,
        "java",
        "com",
        "offers365",
        "app",
        "widget"
      );
      writeIfChanged(
        path.join(ktDir, "OffersWidgetProvider.kt"),
        WIDGET_PROVIDER_KT
      );
      writeIfChanged(
        path.join(ktDir, "WidgetInputActivity.kt"),
        WIDGET_INPUT_ACTIVITY_KT
      );
      writeIfChanged(
        path.join(ktDir, "PinWidgetActivity.kt"),
        PIN_WIDGET_ACTIVITY_KT
      );

      // Layouts
      const layoutDir = path.join(androidSrc, "res", "layout");
      writeIfChanged(
        path.join(layoutDir, "widget_offers365.xml"),
        WIDGET_LAYOUT_XML
      );
      writeIfChanged(
        path.join(layoutDir, "activity_widget_input.xml"),
        WIDGET_INPUT_LAYOUT_XML
      );

      // Drawables
      const drawableDir = path.join(androidSrc, "res", "drawable");
      writeIfChanged(
        path.join(drawableDir, "widget_background.xml"),
        WIDGET_BACKGROUND_XML
      );
      writeIfChanged(
        path.join(drawableDir, "widget_input_bg.xml"),
        WIDGET_INPUT_BG_XML
      );
      writeIfChanged(
        path.join(drawableDir, "widget_btn_bg.xml"),
        WIDGET_BTN_BG_XML
      );

      // AppWidget provider metadata
      const xmlDir = path.join(androidSrc, "res", "xml");
      writeIfChanged(path.join(xmlDir, "widget_info.xml"), WIDGET_INFO_XML);

      return cfg;
    },
  ]);

  // ── Step 2: register receiver + activity in AndroidManifest ───
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    if (!app.receiver) app.receiver = [];
    if (!app.activity) app.activity = [];

    // AppWidgetProvider receiver
    const receiverName = ".widget.OffersWidgetProvider";
    const receiverExists = app.receiver.some(
      (r) =>
        r.$?.["android:name"] === receiverName ||
        r.$?.["android:name"] === "com.offers365.app.widget.OffersWidgetProvider"
    );
    if (!receiverExists) {
      app.receiver.push({
        $: {
          "android:name": receiverName,
          "android:exported": "true",
          "android:label": "Offers 365",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name":
                    "android.appwidget.action.APPWIDGET_UPDATE",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/widget_info",
            },
          },
        ],
      });
    }

    // WidgetInputActivity
    const activityName = ".widget.WidgetInputActivity";
    const activityExists = app.activity.some(
      (a) =>
        a.$?.["android:name"] === activityName ||
        a.$?.["android:name"] ===
          "com.offers365.app.widget.WidgetInputActivity"
    );
    if (!activityExists) {
      app.activity.push({
        $: {
          "android:name": activityName,
          "android:exported": "false",
          "android:theme": "@android:style/Theme.Translucent.NoTitleBar",
          "android:taskAffinity": "",
          "android:excludeFromRecents": "true",
          "android:windowSoftInputMode": "stateVisible|adjustResize",
        },
      });
    }

    // PinWidgetActivity — launched via offers365pin:// deep link
    const pinActivityName = ".widget.PinWidgetActivity";
    const pinActivityExists = app.activity.some(
      (a) =>
        a.$?.["android:name"] === pinActivityName ||
        a.$?.["android:name"] ===
          "com.offers365.app.widget.PinWidgetActivity"
    );
    if (!pinActivityExists) {
      app.activity.push({
        $: {
          "android:name": pinActivityName,
          "android:exported": "true",
          "android:theme": "@android:style/Theme.Translucent.NoTitleBar",
          "android:taskAffinity": "",
          "android:excludeFromRecents": "true",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.intent.action.VIEW" } },
            ],
            category: [
              {
                $: {
                  "android:name": "android.intent.category.DEFAULT",
                },
              },
              {
                $: {
                  "android:name": "android.intent.category.BROWSABLE",
                },
              },
            ],
            data: [{ $: { "android:scheme": "offers365pin" } }],
          },
        ],
      });
    }

    return cfg;
  });

  return config;
};
