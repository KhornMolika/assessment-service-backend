import { Injectable } from '@nestjs/common';
import { QuestionTypeName } from '@modules/questions/constants/question-types.config';

interface BuildPromptInput {
  questionType: QuestionTypeName;
  questionText: string;
  participantResponse: string;
  modelAnswerReference: string;
  keyPointsExpected: string[];
  points: number;
  maxWords?: number;
}

@Injectable()
export class AIPromptService {
  buildEvaluationPrompt(input: BuildPromptInput): string {
    const useKhmer = this.containsKhmer(
      `${input.participantResponse} ${input.questionText}`,
    );
    const criteria =
      input.questionType === QuestionTypeName.ESSAY
        ? this.essayCriteria(input.points, input.maxWords, useKhmer)
        : this.shortAnswerCriteria(input.points, useKhmer);

    return [
      criteria,
      '',
      'Question:',
      input.questionText,
      '',
      'Model answer reference:',
      input.modelAnswerReference,
      '',
      'Expected key points:',
      JSON.stringify(input.keyPointsExpected, null, 2),
      '',
      'Participant response:',
      input.participantResponse,
    ].join('\n');
  }

  private shortAnswerCriteria(points: number, useKhmer: boolean): string {
    if (useKhmer) {
      return [
        'លក្ខណៈវិនិច្ឆ័យសម្រាប់ការវាយតម្លៃ SHORT_ANSWER:',
        '- ផ្តល់ពិន្ទុតាមសមាមាត្រដោយផ្អែកលើចំនួនចំណុចសំខាន់ៗដែលបានឆ្លើយ',
        '- ទទួលយកចម្លើយដែលត្រឹមត្រូវ ទោះបីជាប្រើប្រាស់ពាក្យពេចន៍ខុសពីចម្លើយគំរូក៏ដោយ',
        '- ទទួលយកចម្លើយដែលត្រឹមត្រូវជាភាសាអង់គ្លេស ឬភាសាខ្មែរ ដោយមិនគិតពីភាសារបស់សំណួរឡើយ',
        '- មិនត្រូវដកពិន្ទុចំពោះកំហុសវេយ្យាករណ៍ ឬអក្ខរាវិរុទ្ធនោះទេ លើកលែងតែវាធ្វើឱ្យអត្ថន័យមិនច្បាស់លាស់',
        '- មិនត្រូវដកពិន្ទុចំពោះការប្រើប្រាស់ភាសាខុសពីសំណួរនោះទេ',
        '- ចម្លើយដែលបានឆ្លើយរាល់ចំណុចសំខាន់ៗទាំងអស់បានត្រឹមត្រូវ គួរទទួលបានពិន្ទុពេញ',
        this.responseFormat(points),
      ].join('\n');
    }

    return [
      'Evaluation criteria for SHORT_ANSWER:',
      '- Award points proportionally based on how many key points are addressed',
      '- Accept correct answers even if worded differently from the model answer',
      '- Accept correct answers in either English or Khmer regardless of what language the question is in',
      '- Do NOT penalize for grammar or spelling unless it makes the meaning unclear',
      '- Do NOT penalize for using a different language than the question',
      '- A response that addresses all key points correctly should receive full marks',
      this.responseFormat(points),
    ].join('\n');
  }

  private essayCriteria(
    points: number,
    maxWords: number | undefined,
    useKhmer: boolean,
  ): string {
    const wordLimitRule = maxWords
      ? useKhmer
        ? `- ចម្លើយដែលលើសដែនកំណត់ពាក្យច្រើនពេក (${maxWords} ពាក្យ) អាចនឹងត្រូវកាត់ពិន្ទុបន្តិចបន្តួច`
        : `- Responses significantly over the word limit (${maxWords} words) may receive a small deduction`
      : useKhmer
        ? '- គ្មានការកាត់ពិន្ទុចំពោះដែនកំណត់ពាក្យឡើយ'
        : '- No word limit penalty';

    if (useKhmer) {
      return [
        'លក្ខណៈវិនិច្ឆ័យសម្រាប់ការវាយតម្លៃ ESSAY:',
        '- ភាពត្រឹមត្រូវ និងភាពពាក់ព័ន្ធនៃខ្លឹមសារ (សំខាន់បំផុត)',
        '- ការគ្របដណ្តប់លើចំណុចសំខាន់ៗ',
        '- ភាពច្បាស់លាស់ និងភាពស៊ីសង្វាក់គ្នានៃការបកស្រាយ',
        '- ទទួលយកចម្លើយជាភាសាអង់គ្លេស ឬខ្មែរ — មិនត្រូវដកពិន្ទុចំពោះការជ្រើសរើសភាសាឡើយ',
        '- មិនត្រូវដកពិន្ទុចំពោះកំហុសវេយ្យាករណ៍តូចតាចឡើយ លើកលែងតែវាធ្វើឱ្យបាត់បង់ន័យ',
        '- ជម្រៅនៃការបកស្រាយដែលស៊ីជម្រៅជាងចម្លើយទូទៅ នឹងទទួលបានពិន្ទុកាន់តែខ្ពស់',
        wordLimitRule,
        '',
        'មគ្គុទ្ទេសក៍វាយតម្លៃពិន្ទុ:',
        '- 90-100%: គ្របដណ្តប់រាល់ចំណុចសំខាន់ៗទាំងអស់ ជាមួយនឹងការពន្យល់ច្បាស់លាស់ និងត្រឹមត្រូវ',
        '- 70-89%: គ្របដណ្តប់ចំណុចសំខាន់ៗភាគច្រើន មានការខ្វះខាត ឬភាពមិនច្បាស់លាស់បន្តិចបន្តួច',
        '- 50-69%: គ្របដណ្តប់ចំណុចសំខាន់ៗមួយចំនួន មានការខ្វះខាតគួរឱ្យកត់សម្គាល់',
        '- 30-49%: គ្របដណ្តប់ចំណុចសំខាន់ៗតិចតួច មានការខ្វះខាតធំធេង',
        '- 0-29%: ភាគច្រើនមិនត្រឹមត្រូវ ក្រៅប្រធានបទ ឬមិនអាចយល់បាន',
        this.responseFormat(points),
      ].join('\n');
    }

    return [
      'Evaluation criteria for ESSAY:',
      '- Content accuracy and relevance (most important)',
      '- Coverage of key points',
      '- Clarity and coherence of argument',
      '- Accept responses in English or Khmer; do NOT penalize for language choice',
      '- Do NOT penalize minor grammar issues unless they obscure meaning',
      '- Depth of explanation beyond surface-level answers earns higher marks',
      wordLimitRule,
      '',
      'Scoring guide:',
      '- 90-100%: All key points covered with clear, accurate explanation',
      '- 70-89%: Most key points covered, minor gaps or inaccuracies',
      '- 50-69%: Some key points covered, noticeable gaps',
      '- 30-49%: Few key points covered, significant gaps',
      '- 0-29%: Mostly incorrect, off-topic, or incomprehensible',
      this.responseFormat(points),
    ].join('\n');
  }

  private responseFormat(points: number): string {
    return [
      '',
      'RESPOND WITH ONLY valid JSON in this exact format, no other text:',
      '{',
      `  "suggestedScore": <number between 0 and ${points}>,`,
      `  "maxScore": ${points},`,
      '  "keyPointsAddressed": [<list of key points the participant addressed>],',
      '  "keyPointsMissed": [<list of key points the participant missed>],',
      '  "reasoning": "<brief explanation of score in the same language as the response>",',
      '  "confidence": "<HIGH | MEDIUM | LOW>"',
      '}',
    ].join('\n');
  }

  private containsKhmer(text: string): boolean {
    return /[\u1780-\u17ff]/.test(text);
  }
}
