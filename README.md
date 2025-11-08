# TOKEN-COUNTER

A world-class, open-source, 100% local-first token counter for Large Language Models. Built for privacy, performance, and precision.

[查看中文版说明 (View Chinese README)](./README.zh.md)

## 🌟 Features

* **100% Local & Private:** Your text, conversations, and data never leave your browser.
* **Precision Engine:** Utilizes `@xenova/transformers.js` to run the official Gemma tokenizer directly in your browser for maximum accuracy.
* **Robust & Resilient (Req 7):** Dynamically fetches DOM configurations to adapt to official UI changes (like Gemini's) without needing a full extension update.
* **Extensible (Req 5):** Architected for the community. Adding support for new models (like GPT-4, Claude) is straightforward.
* **Pure & Fast:** No ads, no tracking, no user accounts. Just a clean, fast, "world-class" (Req 3) tool.

## 🚀 Getting Started (For Developers)

This project is built with Vite, React, TypeScript, and Manifest V3.

### 1. Installation

```bash
# Clone the repository
git clone [https://github.com/yiheng8023/TOKEN-COUNTER.git](https://github.com/yiheng8023/TOKEN-COUNTER.git)

# Navigate into the project directory
cd TOKEN-COUNTER

# Install dependencies
npm install