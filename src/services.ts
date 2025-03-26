import * as grpc from '@grpc/grpc-js';
import * as fs from 'fs';
import {ChatMessage, ChatRequest, ChatResponse} from './types';

/**
 * Получение OAuth токена для доступа к API
 * @param apiKey API ключ в формате Base64
 * @param rqUid Идентификатор запроса
 * @param scope Область действия токена
 * @returns Промис с токеном доступа
 */
export const getToken = async (apiKey: string, rqUid: string, scope: string = 'GIGACHAT_API_PERS'): Promise<string> => {
    const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
        method: 'POST',
        headers: {
            'RqUID': rqUid,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'Authorization': `Basic ${apiKey}`,
        },
        body: `scope=${scope}`,
    });
    const data = await response.json();
    return data.access_token;
};

/**
 * Класс для работы с API GigaChat
 */
export class GigaChatService {
    private apiHost: string;
    private sslCreds: grpc.ChannelCredentials;
    private metadata: grpc.Metadata;
    private gigachat: any;

    /**
     * Создание экземпляра сервиса GigaChat
     * @param apiHost Хост API
     * @param certPath Путь к сертификату
     * @param accessToken Токен доступа
     * @param protoDescriptor Загруженное описание proto файла
     */
    constructor(apiHost: string, certPath: string, accessToken: string, protoDescriptor: any) {
        this.apiHost = apiHost;
        this.sslCreds = grpc.credentials.createSsl(fs.readFileSync(certPath));
        this.metadata = new grpc.Metadata();
        this.metadata.add('authorization', `Bearer ${accessToken}`);
        this.gigachat = protoDescriptor.gigachat.v1;
    }

    /**
     * Получение списка доступных моделей
     * @returns Промис с моделями
     */
    getModels(): Promise<any> {
        return new Promise((resolve, reject) => {
            const modelsClient = new this.gigachat.ModelsService(
                this.apiHost,
                this.sslCreds,
            );

            modelsClient.ListModels({}, this.metadata, (err: grpc.ServiceError | null, response: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Отправка сообщения и получение ответа
     * @param messages Массив сообщений
     * @param options Опции запроса
     * @returns Промис с ответом
     */
    sendMessage(messages: ChatMessage[], options: Partial<ChatRequest> = {}): Promise<ChatResponse> {
        return new Promise((resolve, reject) => {
            const chatClient = new this.gigachat.ChatService(
                this.apiHost,
                this.sslCreds,
            );

            const request: ChatRequest = {
                model: options.model || 'GigaChat',
                messages: messages,
                temperature: options.temperature,
                top_p: options.top_p,
                max_tokens: options.max_tokens,
                repetition_penalty: options.repetition_penalty,
                stream: options.stream || false
            };

            chatClient.Chat(request, this.metadata, (err: grpc.ServiceError | null, response: ChatResponse) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Отправка сообщения и получение ответа в потоковом режиме
     * @param messages Массив сообщений
     * @param options Опции запроса
     * @param onChunk Коллбэк для обработки частей ответа
     * @returns Промис с полным текстом ответа
     */
    sendMessageStream(
        messages: ChatMessage[],
        options: Partial<ChatRequest> = {},
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const chatClient = new this.gigachat.ChatService(
                this.apiHost,
                this.sslCreds,
            );

            const request: ChatRequest = {
                model: options.model || 'GigaChat',
                messages: messages,
                temperature: options.temperature,
                top_p: options.top_p,
                max_tokens: options.max_tokens,
                repetition_penalty: options.repetition_penalty,
                stream: true
            };

            let fullResponse = '';
            const call = chatClient.ChatStream(request, this.metadata);

            call.on('data', (response: any) => {
                if (response.alternatives && response.alternatives.length > 0) {
                    const chunk = response.alternatives[0].message.content;

                    if (onChunk) {
                        onChunk(chunk);
                    } else {
                        process.stdout.write(chunk);
                    }

                    fullResponse += chunk;
                }
            });

            call.on('end', () => {
                if (!onChunk) {
                    console.log('\n--- Поток завершен ---');
                }
                resolve(fullResponse);
            });

            call.on('error', (error: any) => {
                if (!onChunk) {
                    console.error('\nОшибка в потоке:', error);
                }
                reject(error);
            });
        });
    }
} 