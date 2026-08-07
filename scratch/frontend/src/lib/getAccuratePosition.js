/**
 * getAccuratePosition
 *
 * Acquires a fresh GPS fix with high accuracy.
 * Rejects if:
 *   - Geolocation is not supported
 *   - The user denies permission
 *   - The fix times out
 *   - The returned accuracy is worse than MAX_ACCURACY_METERS
 *
 * maximumAge: 0  — never use a cached position
 * enableHighAccuracy: true  — request GPS hardware
 * timeout: 15000  — give the device up to 15 seconds
 */

const MAX_ACCURACY_METERS = 30;

export function getAccuratePosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Diagnostic log — always visible in DevTools
        console.log('[GPS] Fresh position acquired:', { latitude, longitude, accuracy });

        if (accuracy > MAX_ACCURACY_METERS) {
          reject(
            new Error(
              `Unable to obtain an accurate GPS location. Please move outdoors and try again. (accuracy: ${Math.round(accuracy)}m)`
            )
          );
          return;
        }

        resolve({ latitude, longitude, accuracy });
      },
      (geoError) => {
        // Map GeolocationPositionError codes to user-friendly messages
        let message;
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            message =
              'Location access was denied. Please allow location permission in your browser settings and try again.';
            break;
          case geoError.POSITION_UNAVAILABLE:
            message =
              'Your location is currently unavailable. Please check your device GPS and try again.';
            break;
          case geoError.TIMEOUT:
            message =
              'GPS timed out. Please move to an open area with better signal and try again.';
            break;
          default:
            message = geoError.message || 'Unable to retrieve your location.';
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,        // never use a cached position
      }
    );
  });
}
