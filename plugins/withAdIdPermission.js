const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withAdIdPermission(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const mainApplication = manifest.manifest;

    if (!mainApplication["uses-permission"]) {
      mainApplication["uses-permission"] = [];
    }

    const AD_ID_PERMISSION = "com.google.android.gms.permission.AD_ID";

    const alreadyExists = mainApplication["uses-permission"].some(
      (p) => p.$?.["android:name"] === AD_ID_PERMISSION
    );

    if (!alreadyExists) {
      mainApplication["uses-permission"].push({
        $: { "android:name": AD_ID_PERMISSION },
      });
    } else {
      mainApplication["uses-permission"] = mainApplication[
        "uses-permission"
      ].map((p) => {
        if (p.$?.["android:name"] === AD_ID_PERMISSION) {
          const cleaned = { $: { "android:name": AD_ID_PERMISSION } };
          return cleaned;
        }
        return p;
      });
    }

    return config;
  });
};
