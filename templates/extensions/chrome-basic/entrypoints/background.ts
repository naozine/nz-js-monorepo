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

    // DevTools からの要素情報を受信
    chrome.runtime.onMessage.addListener((message, sender) => {
        if (message && message.type === 'ELEMENT_INFO') {
            (async () => {
                try {
                    const info = message.payload;
                    await chrome.storage?.session?.set?.({ lastElementInfo: info });
                } catch (e) {
                    console.warn('Failed to store element info in session storage:', e);
                }

                // サイドパネルを開く
                try {
                    const tabId = message.tabId as number | undefined;
                    if (chrome.sidePanel && tabId != null) {
                        // windowId を取得して開く（または tabId を指定）
                        try {
                            const tab = await chrome.tabs.get(tabId);
                            if (tab?.windowId != null) {
                                await chrome.sidePanel.open({ windowId: tab.windowId });
                            } else {
                                // フォールバック：tabId が使える場合
                                // @ts-expect-error: 型定義差異の可能性に備え
                                await chrome.sidePanel.open({ tabId });
                            }
                        } catch (e) {
                            console.warn('tabs.get or sidePanel.open failed:', e);
                        }
                    }
                } catch (e) {
                    console.warn('Failed to open side panel:', e);
                }

                // サイドパネルへブロードキャスト（拡張内ページへ）
                try {
                    await chrome.runtime.sendMessage({ type: 'ELEMENT_INFO', payload: message.payload });
                } catch (e) {
                    // 受け手がいない場合などは無視
                }
            })();
        }
        // return false; // 非同期で sendResponse は使わない
    });
});
