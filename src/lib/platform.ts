/** Best-effort device/browser detection used only to tailor install instructions — never for gating functionality. */
export function detectPlatform() {
  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isMac = /macintosh|mac os x/i.test(ua) && !isIos;
  const isWindows = /windows/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|crios|edg|opr|samsungbrowser/i.test(ua);
  return { isIos, isAndroid, isMac, isWindows, isFirefox, isSafari };
}
