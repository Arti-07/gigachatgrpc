# GigaChat gRPC Client

Клиент для взаимодействия с API GigaChat через gRPC протокол.

## Настройка

1. Установите зависимости:
   ```bash
   npm install
   ```

2. Создайте файл `.env` на основе `.env.example` и заполните следующие переменные:
   ```
   API_HOST=gigachat.devices.sberbank.ru
   GIGA_API_KEY=YOUR_API_KEY_HERE
   SCOPE=GIGACHAT_API_PERS
   CERT_PATH=cert.pem
   RQ_UID=YOUR_RQUID_HERE
   ```

   **Примечание**: Значение `GIGA_API_KEY` должно быть закодировано в Base64.

3. Для получения `GIGA_API_KEY`:
    - Кодируйте строку `client_id:client_secret` в Base64 формат
    - Полученное значение вставьте в переменную `GIGA_API_KEY`

4. Настройка SSL-сертификатов:
    - Скачайте сертификаты с портала Госуслуг:
        - Russian Trusted Root CA
        - Russian Trusted Sub CA
    - Конвертируйте их в формат PEM с помощью OpenSSL:
      ```bash
      openssl x509 -inform DER -in "Russian Trusted Root CA.cer" -out "Russian Trusted Root CA.pem"
      openssl x509 -inform DER -in "Russian Trusted Sub CA.cer" -out "Russian Trusted Sub CA.pem"
      ```
    - Объедините сертификаты в один файл:
      ```bash
      cat "Russian Trusted Root CA.pem" "Russian Trusted Sub CA.pem" > cert.pem
      ```
    - Убедитесь, что путь к сертификату указан в переменной `CERT_PATH` в файле `.env`

## Использование

Запустите клиент:

```bash
npx ts-node client.ts
```