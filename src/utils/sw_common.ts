// C:\Projects\TOKEN-COUNTER\src\utils\sw_common.ts
// 仅供 Service Worker 使用，100% 安全，无 DOM 依赖。

export enum MessageType {
    UI_REQUEST_INITIAL_STATE = 'UI_REQUEST_INITIAL_STATE',
    SW_SEND_STATE = 'SW_SEND_STATE',
    CS_UPDATE_MODEL_NAME = 'CS_UPDATE_MODEL_NAME', 
    CS_SEND_TOKEN_DATA = 'CS_SEND_TOKEN_DATA',
    SW_SEND_LOG = 'SW_SEND_LOG',
    CS_SEND_LOG = 'CS_SEND_LOG',
}