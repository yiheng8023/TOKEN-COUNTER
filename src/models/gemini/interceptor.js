// C:\Projects\TOKEN-COUNTER\src\injected\interceptor.js
// V3 (修复了计算逻辑)

(function() {
    const TARGET_API_PATH = 'batched_gen_service'; 
    const EVENT_TOKEN_DATA = 'token-counter-token-data';
    const EVENT_MODEL_NAME = 'token-counter-model-name';
    
    /**
     * @description 解码 Base64 字符串为普通文本。
     */
    function base64Decode(encodedText) {
        const cleaned = encodedText.replace(/[^A-Za-z0-9+/=]/g, '');
        return atob(cleaned);
    }

    /**
     * @description (升级版) 提取数据，处理复杂的响应体
     */
    function extractData(responseText) {
        // [!! 关键修改 1 !!] 增加 totalTokens 字段
        let tokenData = { 
            inputTokens: 0, 
            outputTokens: 0, 
            thinkingTokens: 0, 
            totalTokens: 0 // <-- 新增
        }; 
        let modelName = null;

        const b64Regex = /\\\"([A-Za-z0-9+/=]{100,})\\\"/g; 
        let match;

        try {
            while ((match = b64Regex.exec(responseText)) !== null) {
                const b64Payload = match[1];
                
                try {
                    const decodedText = base64Decode(b64Payload);

                    if (decodedText.includes("usageMetadata") && decodedText.includes("promptTokenCount")) {
                        
                        const decodedData = JSON.parse(decodedText); 
                        
                        const usage = decodedData?.metadata?.usageMetadata;
                        if (usage) {
                            // 提取明细
                            tokenData.inputTokens = usage.promptTokenCount || 0;
                            tokenData.outputTokens = usage.candidatesTokenCount || 0;
                            tokenData.thinkingTokens = usage.thoughtsTokenCount || 0; 
                            
                            // [!! 关键修改 2 !!] 提取官方的精确总数
                            tokenData.totalTokens = usage.totalTokenCount || 0;
                        }

                        // 提取模型名称
                        const model = decodedData?.model?.model;
                        const version = decodedData?.model?.version;

                        if (model && version) {
                            modelName = `${model} ${version}`.trim();
                        } else if (model) {
                             modelName = model;
                        }
                        
                        break; 
                    }
                    
                } catch (e) {
                    // 忽略解码或解析错误，继续查找下一个 B64 块
                }
            }
        } catch (e) {
            console.error("[INJECT-FATAL] Regex matching failed:", e);
        }
        
        return { tokenData, modelName };
    }

    /**
     * @description 分发数据到 Content Script (Stage 3).
     */
    function dispatchData(tokenData, modelName) {
        // [!! 关键修改 3 !!] 使用 totalTokens 作为触发条件
        if (tokenData.totalTokens > 0) {
            window.dispatchEvent(new CustomEvent(EVENT_TOKEN_DATA, { detail: tokenData }));
        }
        
        if (modelName) {
            window.dispatchEvent(new CustomEvent(EVENT_MODEL_NAME, { detail: { modelName: modelName } }));
        }
    }


    // =======================================================
    // 核心拦截逻辑 (Fetch + XHR) - (保持不变)
    // =======================================================

    const TARGET_API_PATH_MATCH = 'batchexecute';

    // A. Fetch 拦截
    if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = function (...args) {
            const url = args[0] instanceof Request ? args[0].url : args[0].toString();
            const method = args[1]?.method || 'GET';
            
            if (url.includes(TARGET_API_PATH_MATCH) && method === 'POST') {
                
                return originalFetch.apply(this, args).then(response => {
                    if (response.status !== 200) { return response; }
                    
                    const clonedResponse = response.clone();
                    clonedResponse.text().then(responseText => {
                        const { tokenData, modelName } = extractData(responseText);
                        dispatchData(tokenData, modelName); // Stage 3
                    }).catch(e => console.error("[INJECT-ERR] Fetch Stage 1: Failed to read response text.", e));
                    
                    return response;
                });
            }
            return originalFetch.apply(this, args);
        }
    } 

    // B. XHR 拦截
    if (window.XMLHttpRequest) {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        
        let currentUrl = '';
        let currentMethod = '';

        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            currentUrl = url.toString();
            currentMethod = method;
            this._method = method; 
            originalOpen.apply(this, [method, url, ...args]);
        };

        XMLHttpRequest.prototype.send = function(...args) {
            if (currentUrl.includes(TARGET_API_PATH_MATCH) && currentMethod === 'POST') {
                
                this.addEventListener('loadend', function() {
                    if (this.status === 200) {
                        try {
                            const responseText = this.responseText;
                            const { tokenData, modelName } = extractData(responseText);
                            dispatchData(tokenData, modelName); // Stage 3
                        } catch(e) {
                            console.error("[INJECT-ERR] XHR Stage 1: Failed to process response.", e);
                        }
                    }
                });
            }
            originalSend.apply(this, args);
        };
    }
    
    if (!window.fetch && !window.XMLHttpRequest) {
         console.warn("[INJECT-WARN] No Fetch or XHR available for interception.");
    }
})();