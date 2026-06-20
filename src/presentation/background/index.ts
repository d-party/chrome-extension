/** Background service worker (MV3). Opens the usage page on first install. */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    void chrome.tabs.create({ url: "https://d-party.net/usage" });
  }
});
