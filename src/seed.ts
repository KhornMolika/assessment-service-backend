import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AssessmentsService } from './modules/assessments/services/assessments.service';
import { QuestionsService } from './modules/questions/question.service';
import { TopicsService } from './modules/topics/topics.service';
import { RuntimeService } from './modules/runtime/services/runtime.service';
import { clientStorage } from './common/context/client.storage';
import { QuestionBanksService } from './modules/question-banks/question-banks.service';
import { ClientService } from './modules/clients/client.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const clientService = app.get(ClientService);
  const topicService = app.get(TopicsService);
  const questionsService = app.get(QuestionsService);
  const assessmentsService = app.get(AssessmentsService);
  const runtimeService = app.get(RuntimeService);
  const banksService = app.get(QuestionBanksService);

  console.log('--- SEEDING DATABASE ---');

  // We use a known deterministic client ID that our Postman environment assumes.
  // Actually, wait, schema:drop destroys everything including the client!
  // So we must re-create the client first!
  let seedClient;
  try {
    seedClient = await clientService.create({
      name: 'Seed Local Client',
      slug: 'seed-local-client',
      webhookUrl: 'http://localhost:3000/webhook',
      webhookSecret: 'seed-secret'
    });
    console.log('Created Client:', seedClient.client.id);
  } catch (e) {
    // Maybe client already exists if schema wasn't dropped
    const clients = await clientService.findAll();
    seedClient = { client: clients[0] };
    console.log('Reused existing client:', seedClient.client.id);
  }

  const clientId = seedClient.client.id;

  await clientStorage.run({ clientId }, async () => {
    
    // 1. Create Topics
    console.log('Creating Topics...');
    const topicCS = await topicService.create({ name: 'Computer Science', description: 'Algorithms, Data Structures, and Systems' });
    const topicMath = await topicService.create({ name: 'Mathematics', description: 'Calculus, Algebra, and Geometry' });

    // 2. Create Question Banks
    console.log('Creating Question Banks...');
    const bankCS = await banksService.createTopicBank((topicCS as any).id, { name: 'Data Structures 101', description: 'Basic DS', tags: ['CS', 'Easy'] });
    const bankMath = await banksService.createTopicBank((topicMath as any).id, { name: 'Calculus Fundamentals', description: 'Derivatives and Integrals', tags: ['Math'] });

    // 3. Create Questions for CS Topic
    console.log('Creating Questions...');
    const qSingle = await questionsService.createTopicQuestion((topicCS as any).id, {
      questionText: 'Which data structure uses LIFO?',
      type: 'SINGLE_CHOICE' as any,
      points: 10,
      difficulty: 'EASY' as any,
      options: [
        { id: '1', text: 'Queue' },
        { id: '2', text: 'Stack' },
        { id: '3', text: 'Array' },
      ] as any,
      correctAnswers: { optionId: '2' } as any,
    });

    const qMulti = await questionsService.createTopicQuestion((topicCS as any).id, {
      questionText: 'Which of the following are tree traversals?',
      type: 'MULTIPLE_CHOICE' as any,
      points: 10,
      difficulty: 'MEDIUM' as any,
      options: [
        { id: 'a', text: 'Inorder' },
        { id: 'b', text: 'Postorder' },
        { id: 'c', text: 'Random' },
      ] as any,
      correctAnswers: { optionIds: ['a', 'b'] } as any,
    });

    const qTF = await questionsService.createTopicQuestion((topicCS as any).id, {
      questionText: 'A binary tree can have up to 3 children per node.',
      type: 'TRUE_FALSE' as any,
      points: 5,
      difficulty: 'EASY' as any,
      options: { trueLabel: 'True', falseLabel: 'False' } as any,
      correctAnswers: { value: false } as any,
    });

    const qShort = await questionsService.createTopicQuestion((topicMath as any).id, {
      questionText: 'What is the limit of 1/x as x approaches infinity?',
      type: 'SHORT_ANSWER' as any,
      points: 10,
      difficulty: 'HARD' as any,
      options: { minWords: 0, maxWords: 50 } as any,
      correctAnswers: { modelAnswerReference: '0', keyPointsExpected: ['0', 'zero'] } as any,
    });

    // 4. Assign questions to banks (optional, but good for completeness)
    await banksService.addQuestionsToBank((bankCS as any).id, [(qSingle as any).id, (qMulti as any).id, (qTF as any).id]);
    await banksService.addQuestionsToBank((bankMath as any).id, [(qShort as any).id]);

    // 5. Create Assessment
    console.log('Creating Assessment...');
    const assessment = await assessmentsService.create((topicCS as any).id, {
      name: 'CS Data Structures Midterm',
      type: 'EXAM' as any,
      description: 'Midterm covering stacks, queues, and trees.'
    });

    console.log('Adding Questions to Assessment...');
    await assessmentsService.addQuestion((assessment as any).id, { questionId: (qSingle as any).id, points: 10 });
    await assessmentsService.addQuestion((assessment as any).id, { questionId: (qMulti as any).id, points: 10 });
    await assessmentsService.addQuestion((assessment as any).id, { questionId: (qTF as any).id, points: 5 });

    console.log('Publishing Assessment...');
    await assessmentsService.publish((assessment as any).id);

    // 6. Assign Participant
    console.log('Assigning Participant...');
    const participant = await assessmentsService.assignParticipant((assessment as any).id, {
      name: 'Alice Smith',
      email: 'alice.smith@example.com'
    });

    const pId = (participant as any).participantId;

    // 7. Simulate a Session
    console.log('Simulating a Session...');
    const session = await runtimeService.startSession({
      assessmentId: (assessment as any).id,
      participantId: pId
    });

    // We need the assessmentQuestionIds from the session start
    const aqs = (session as any).questions;
    
    // qSingle is the first one because it was added first
    await runtimeService.saveAnswer((session as any).sessionId, { assessmentQuestionId: aqs[0].assessmentQuestionId, response: { optionId: '2' } } as any);
    // qMulti is the second
    await runtimeService.saveAnswer((session as any).sessionId, { assessmentQuestionId: aqs[1].assessmentQuestionId, response: { optionIds: ['a', 'b'] } } as any);
    // qTF is the third
    await runtimeService.saveAnswer((session as any).sessionId, { assessmentQuestionId: aqs[2].assessmentQuestionId, response: { value: false } } as any);

    console.log('Submitting Session...');
    await runtimeService.submitSession((session as any).sessionId);

    console.log('--- SEED COMPLETE! ---');
    console.log('Use this Client ID for API requests if needed:', clientId);
    console.log('Topic ID:', (topicCS as any).id);
    console.log('Assessment ID:', (assessment as any).id);
  });

  await app.close();
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
