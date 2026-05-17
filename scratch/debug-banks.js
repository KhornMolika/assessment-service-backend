const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { ClientContextService } = require('./dist/common/context/client-context.service');
const { clientStorage } = require('./dist/common/context/client.storage');
const { QuestionBanksService } = require('./dist/modules/question-banks/question-banks.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(QuestionBanksService);

  clientStorage.run({ clientId: 'f0f1cb24-c031-4097-a186-0f23995ac62a' }, async () => {
    try {
      const res = await service.findTopicBanks('7dd57176-aeb4-4ded-90f7-57bc75c9d610', { page: 1, limit: 10 });
      console.log('Success:', res);
    } catch (e) {
      console.error('Error detail:', e);
    } finally {
      await app.close();
    }
  });
}
bootstrap();
