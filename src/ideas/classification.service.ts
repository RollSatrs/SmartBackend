import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface ClassificationCategory {
  slug: string;
  name: string;
}

export interface ClassificationResult {
  categorySlug: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const OPENAI_MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 8000;
const CONFIDENCE_VALUES = ['high', 'medium', 'low'] as const;

@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);

  async classify(
    title: string,
    description: string,
    categories: ClassificationCategory[],
  ): Promise<ClassificationResult> {
    const apiKey = process.env.OPENAI_API;
    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API не задан — идея останется без автоматической категории',
      );
      return { categorySlug: null, confidence: 'low' };
    }
    if (!categories.length) {
      return { categorySlug: null, confidence: 'low' };
    }

    const client = new OpenAI({ apiKey, timeout: REQUEST_TIMEOUT_MS });

    try {
      const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: this.buildPrompt(title, description, categories),
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Пустой ответ от OpenAI');

      return this.parseResult(content, categories);
    } catch (error) {
      this.logger.warn(
        `Не удалось классифицировать идею: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { categorySlug: null, confidence: 'low' };
    }
  }

  private buildPrompt(
    title: string,
    description: string,
    categories: ClassificationCategory[],
  ): string {
    const categoryList = categories
      .map((category) => `${category.slug}: ${category.name}`)
      .join('\n');

    return `Ты классифицируешь обращения жителей города Smart City по категориям городских служб.

Категории (slug: название):
${categoryList}

Обращение жителя:
Заголовок: ${title}
Описание: ${description}

Определи одну наиболее подходящую категорию из списка выше по slug. Ответь строго в формате JSON без пояснений и без markdown: {"categorySlug": "<slug из списка или null>", "confidence": "high" | "medium" | "low"}. Если ни одна категория явно не подходит, верни categorySlug: null и confidence: "low".`;
  }

  private parseResult(
    content: string,
    categories: ClassificationCategory[],
  ): ClassificationResult {
    const parsed = JSON.parse(content) as {
      categorySlug?: string | null;
      confidence?: string;
    };

    const categorySlug = categories.some(
      (category) => category.slug === parsed.categorySlug,
    )
      ? (parsed.categorySlug as string)
      : null;

    const confidence = CONFIDENCE_VALUES.includes(
      parsed.confidence as (typeof CONFIDENCE_VALUES)[number],
    )
      ? (parsed.confidence as ClassificationResult['confidence'])
      : 'low';

    return { categorySlug, confidence };
  }
}
