// == Gemini Token Counter (v1.0) - tokenizer_worker.js ==
// ... (顶部代码省略)

self.onmessage = async (event) => {
    const message = event.data;
    const TOTAL_STEPS = 5; // 步骤减少，因为不再 Fetch JSON
    
    if (message.type === 'INIT') {
        try {
            // ... (步骤 1-3 保持不变，用于加载 transformers.js 和设置 WASM 路径)
            
            postLoadingStatus(4, TOTAL_STEPS, '正在合并配置并初始化分词器...');

            // 💥 修复 3: 直接使用主线程传递的 JSON 数据对象
            const [tokenizer_json, tokenizer_config, special_tokens] = [
                message.tokenizerJsonData,
                message.tokenizerConfigData,
                message.specialTokensData
            ];
            
            if (!tokenizer_json || !tokenizer_config || !special_tokens) {
                 throw new Error("JSON 数据传递失败，内容为空。");
            }

            // 5. 初始化 GemmaTokenizer (WASM 加载在这里发生)
            const mergedConfig = {
                ...tokenizer_config, 
                ...special_tokens,
                tokenizer: tokenizer_json 
            };
            
            tokenizerInstance = await new self.Xenova.GemmaTokenizer(mergedConfig);
            isInitialized = true;
            
            postLoadingStatus(5, TOTAL_STEPS, '分词器初始化成功！');
            
            self.postMessage({ type: 'WORKER_STATUS', status: 'READY' });

        } catch (e) {
            console.error("Worker 分词器加载失败:", e);
            self.postMessage({ type: 'WORKER_STATUS', status: 'ERROR', error: e.message || "Worker内部发生未捕获的错误" });
        }
    } else if (message.type === 'ENCODE_TEXT') {
        // ... (编码逻辑省略)
    }
};

// ... (预热状态省略)