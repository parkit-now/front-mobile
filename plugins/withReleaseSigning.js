const { withAppBuildGradle } = require('@expo/config-plugins');

// Firma del APK/AAB de release.
//
// `android/` no se versiona: lo genera `expo prebuild`, y la plantilla firma el
// release con la clave debug (pública, igual en todas las máquinas). Este
// plugin agrega un signingConfig `release` que toma el keystore del entorno:
//
//   ANDROID_KEYSTORE_PATH      ruta al .keystore (PKCS12)
//   ANDROID_KEYSTORE_PASSWORD  contraseña del keystore y de la clave
//   ANDROID_KEY_ALIAS          alias de la clave
//
// Sin ANDROID_KEYSTORE_PATH el release se sigue firmando con la clave debug,
// así `make apk` funciona en cualquier máquina sin configurar nada. El keystore
// real vive en los secretos del repo (ver .github/workflows/README.md).

const MARKER = 'ANDROID_KEYSTORE_PATH';

const RELEASE_SIGNING_CONFIG = `
        release {
            if (System.getenv('ANDROID_KEYSTORE_PATH')) {
                storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            }
        }`;

const RELEASE_SIGNING_CHOICE =
  "signingConfig System.getenv('ANDROID_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug";

function applyReleaseSigning(gradle) {
  // Prebuild sin --clean vuelve a pasar por acá con el archivo ya modificado.
  if (gradle.includes(MARKER)) return gradle;

  // Primero el buildType (antes de que exista otro bloque `release {`).
  const buildType =
    /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
  const debugConfig = /(signingConfigs \{\s*debug \{[\s\S]*?\n {8}\})/;
  if (!buildType.test(gradle) || !debugConfig.test(gradle)) {
    // Mejor cortar el build que publicar un APK firmado con la clave debug.
    throw new Error(
      'withReleaseSigning: android/app/build.gradle cambió de forma y no se pudo configurar la firma de release. Revisá plugins/withReleaseSigning.js.',
    );
  }
  return gradle
    .replace(buildType, `$1${RELEASE_SIGNING_CHOICE}`)
    .replace(debugConfig, `$1${RELEASE_SIGNING_CONFIG}`);
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      throw new Error(
        'withReleaseSigning: se esperaba build.gradle en Groovy.',
      );
    }
    gradleConfig.modResults.contents = applyReleaseSigning(
      gradleConfig.modResults.contents,
    );
    return gradleConfig;
  });
};

module.exports.applyReleaseSigning = applyReleaseSigning;
