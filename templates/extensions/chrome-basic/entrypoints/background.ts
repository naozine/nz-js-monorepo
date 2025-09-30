export default defineBackground(() => {
    console.log('Background script started');

    // サイドパネルを有効化
    if (chrome.sidePanel) {
        chrome.sidePanel
            .setPanelBehavior({ openPanelOnActionClick: true })
            .catch((error: unknown) => {
                console.error('Failed to set panel behavior:', error);
            });
    } else {
        console.warn('Side panel API is not available in this Chrome version');
    }

    // 拡張機能アイコンクリック時の処理
    chrome.action?.onClicked.addListener(async (tab) => {
        if (chrome.sidePanel && tab.windowId) {
            try {
                await chrome.sidePanel.open({ windowId: tab.windowId });
            } catch (error) {
                console.error('Failed to open side panel:', error);
            }
        }
    });
});
