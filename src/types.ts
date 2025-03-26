/**
 * Интерфейсы для работы с GigaChat API
 */

// Сообщение чата
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    unprocessed_content?: string;
}

// Параметры запроса к API чата
export interface ChatRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    repetition_penalty?: number;
    stream?: boolean;
}

// Альтернативный ответ в результате запроса
export interface ChatResponseAlternative {
    message: ChatMessage;
    finish_reason: string;
    index: number;
}

// Структура ответа от API чата
export interface ChatResponse {
    alternatives: ChatResponseAlternative[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    model_info: {
        name: string;
        version: string;
    };
    timestamp: string;
}

// Параметры для аутентификации
export interface AuthOptions {
    apiKey: string;
    rqUid: string;
    scope?: string;
}

// Конфигурация клиента
export interface ClientConfig {
    apiHost: string;
    certPath: string;
} 