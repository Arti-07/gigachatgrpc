import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const certPath = path.resolve(__dirname, process.env.CERT_PATH || 'cert.pem');
process.env.NODE_EXTRA_CA_CERTS = certPath;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env['GRPC_DEFAULT_SSL_ROOTS_FILE_PATH'] = certPath;

console.log('Используем сертификаты из:', certPath);

const PROTO_PATH = './gigachat.proto';
const gigaApiKey = process.env.GIGA_API_KEY;
const rqUid = process.env.RQ_UID;

const getToken = async () => {
    const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
        method: 'POST',
        headers: {
            'RqUID': `${rqUid}`,
            'Content-Type': "application/x-www-form-urlencoded",
            'Accept': "application/json",
            'Authorization': `Basic ${gigaApiKey}`,
        },
        body: "scope=GIGACHAT_API_PERS",
    });
    const data = await response.json();
    return data.access_token;
};

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const gigachat = protoDescriptor.gigachat.v1;

async function main() {
    try {
        const accessToken = await getToken();
        console.log('Получен токен доступа');

        const metadata = new grpc.Metadata();
        metadata.add('authorization', `Bearer ${accessToken}`);

        const apiHost = process.env.API_HOST;
        if (!apiHost) {
            throw new Error("API_HOST не указан в переменных окружения");
        }

        try {
            const getModels = () => {
                return new Promise((resolve, reject) => {
                    const fs = require('fs');
                    const sslCreds = grpc.credentials.createSsl(
                        fs.readFileSync(certPath)
                    );

                    const modelsClient = new gigachat.ModelsService(
                        apiHost,
                        sslCreds,
                    );

                    modelsClient.ListModels({}, metadata, (err: grpc.ServiceError | null, response: any) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(response);
                        }
                    });
                });
            };

            const models = await getModels();
            console.log("Доступные модели:", JSON.stringify(models, null, 2));
        } catch (modelsError) {
            console.error("Ошибка при получении списка моделей:", modelsError);
        }

    } catch (error) {
        console.error('Произошла ошибка:', error);
    }
}

main();
