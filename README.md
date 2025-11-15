# TOKEN-COUNTER

A world-class, open-source, 100% local-first token counter for Large Language Models. Built for privacy, performance, and precision.

[View Chinese README (查看中文版说明)](./README.zh.md)

## ✨ New UI (Zero-Config)

The new interface is designed for simplicity and accessibility. It's **zero-config**, features **dual-language (EN/CN)** labels, and automatically adapts to your browser's Light or Dark theme.

| Light Mode (浅色模式) | Dark Mode (深色模式) |
| :---: | :---: |
| ![Light Mode UI](PATH_TO_image_57c7c3.png) | ![Dark Mode UI](PATH_TO_image_57c7e6.png) |

## 🌟 Features

* **100% Accurate:** No guessing, no local tokenizers. The counter works by intercepting the *exact* `usageMetadata` returned by the model's API. What you see is what you're billed for.
* **Zero Configuration:** "It just works." No settings, no API keys, no language selection.
* **"System Overhead" Transparency:** Our killer feature. We calculate and display the "hidden" tokens (like System Instructions or Tool Definitions) so your sub-totals (`Input + Thinking + Output + Overhead`) perfectly match the official `Total`.
* **Dual-Language UI:** All labels are in both English and Chinese, making it accessible to the widest range of advanced users.
* **Theme Aware:** Automatically adapts to your browser's Light and Dark modes for perfect readability.
* **Future-Proof Architecture:** Built on a "Core vs. Adapter" (V3.0) model, making it easy to add support for other LLMs (like OpenAI) in the future.

## 🚀 Architecture & Contribution (V3.0)

This project has been refactored to a "Core vs. Adapter" model to make it truly universal.

* **`/src/ui` & `/src/utils` (The Core):** This is the generic, model-agnostic "engine." It handles UI (`main.ts`) and state management (`storage_manager.ts`). It's 100% generic.
* **`/src/models/*` (The Adapters):** This is where model-specific logic lives.
    * `/src/models/gemini/`: Contains the specific `interceptor.js` to read Gemini's network requests and the `content.ts` to glue it to the Core.

**Want to add support for OpenAI?**

This architecture makes it simple. You don't need to touch the Core!
1.  Create a new folder: `/src/models/openai/`.
2.  Write a new `interceptor.js` that targets `chat.openai.com`'s API.
3.  Write a new `content.ts` that `imports` your interceptor and the Core `storage_manager.ts`.
4.  Update `package.json` and `manifest.json` to build and inject your new adapter.

This is the best way to contribute!

## 🤝 Collaboration

This project is 100% open-source and built for the community. We welcome all contributions, bug reports, and feature requests.

To collaborate, please contact the project founder at:
**155210638@qq.com**