import * as path from 'path';
import * as protoLoader from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';
import * as dotenv from 'dotenv';
import {ChatMessage, ChatRequest} from './types';
import {getToken, GigaChatService} from './services';

dotenv.config();

const certPath = path.resolve(__dirname, process.env.CERT_PATH || 'cert.pem');
process.env.NODE_EXTRA_CA_CERTS = certPath;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env['GRPC_DEFAULT_SSL_ROOTS_FILE_PATH'] = certPath;

const PROTO_PATH = './gigachat.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;

async function main() {
    try {
        const apiHost = process.env.API_HOST;
        const gigaApiKey = process.env.GIGA_API_KEY;
        const rqUid = process.env.RQ_UID;

        if (!apiHost) {
            throw new Error("API_HOST не указан в переменных окружения");
        }
        if (!gigaApiKey) {
            throw new Error("GIGA_API_KEY не указан в переменных окружения");
        }
        if (!rqUid) {
            throw new Error("RQ_UID не указан в переменных окружения");
        }

        const accessToken = await getToken(gigaApiKey, rqUid);
        console.log('Получен токен доступа');

        const gigaChatService = new GigaChatService(apiHost, certPath, accessToken, protoDescriptor);

        try {
            const chatExample = async () => {
                try {
                    const messages: ChatMessage[] = [
                        {
                            role: 'user',
                            content: 'Привет! Расскажи о себе.'
                        }
                    ];

                    const options: Partial<ChatRequest> = {
                        model: 'GigaChat',
                        temperature: 0.5,
                        max_tokens: 1000
                    };

                    const response = await gigaChatService.sendMessage(messages, options);
                    // console.log('Ответ модели:', JSON.stringify(response, null, 2));

                    if (response.alternatives && response.alternatives.length > 0) {
                        console.log('\nТекст ответа:', response.alternatives[0].message.content);
                    }
                } catch (error) {
                    console.error('Ошибка при отправке сообщения:', error);
                }
            };

            // Пример потоковой генерации
            const streamExample = async () => {
                try {
                    const messages: ChatMessage[] = [
                        {
                            role: 'user',
                            content: 'Напиши стихотворение о программировании на 5 строк'
                        }
                    ];

                    const options: Partial<ChatRequest> = {
                        model: 'GigaChat',
                        temperature: 0.8,
                        max_tokens: 200
                    };

                    console.log('\nГенерация ответа в потоковом режиме:');
                    const fullText = await gigaChatService.sendMessageStream(messages, options);
                    console.log('\nПолный ответ сохранен, длина:', fullText.length);
                } catch (error) {
                    console.error('Ошибка при потоковой генерации:', error);
                }
            };

            // Пример с кастомным обработчиком частей потока
            const customStreamExample = async () => {
                try {
                    const messages: ChatMessage[] = [
                        {
                            role: 'user',
                            content: 'Расскажи о протоколе gRPC кратко'
                        }
                    ];

                    console.log('\nПотоковая генерация с кастомным обработчиком:');

                    let parts: string[] = [];

                    const chunkHandler = (chunk: string) => {
                        parts.push(chunk);
                        process.stdout.write(`[ЧАСТЬ: ${parts.length}] ${chunk}`);
                    };

                    await gigaChatService.sendMessageStream(messages, {}, chunkHandler);
                    console.log('\n--- Конец потоковой генерации с кастомным обработчиком ---');
                } catch (error) {
                    console.error('Ошибка при потоковой генерации с кастомным обработчиком:', error);
                }
            };

            // const models = await gigaChatService.getModels();
            // console.log("Доступные модели:", JSON.stringify(models, null, 2));

            await chatExample();
            await streamExample();
            await customStreamExample();

        } catch (error) {
            console.error("Произошла ошибка:", error);
        }

    } catch (error) {
        console.error('Произошла ошибка:', error);
    }
}

main();
