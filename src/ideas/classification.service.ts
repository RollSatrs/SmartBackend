import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import OpenAI from 'openai';

export interface ClassificationCategory {
  slug: string;
  name: string;
}

export interface ClassificationResult {
  categorySlug: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface ParsedIdeaResult {
  title: string;
  description: string;
  categorySlug: string | null;
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

  async parseIdea(
    message: string,
    categories: ClassificationCategory[],
  ): Promise<ParsedIdeaResult> {
    const apiKey = process.env.OPENAI_API;
    if (!apiKey) {
      throw new UnprocessableEntityException(
        'Не удалось выделить заголовок идеи. Уточните описание проблемы.',
      );
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
            content: this.buildParsePrompt(message, categories),
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Пустой ответ от OpenAI');

      const parsed = JSON.parse(content) as {
        title?: unknown;
        description?: unknown;
        categorySlug?: unknown;
      };
      const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
      if (!title) {
        throw new UnprocessableEntityException(
          'Не удалось выделить заголовок идеи. Уточните описание проблемы.',
        );
      }

      const description =
        typeof parsed.description === 'string' && parsed.description.trim()
          ? parsed.description.trim()
          : message;
      const categorySlug = categories.some(
        (category) => category.slug === parsed.categorySlug,
      )
        ? (parsed.categorySlug as string)
        : null;

      return { title, description, categorySlug };
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      this.logger.warn(
        `Не удалось разобрать идею: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnprocessableEntityException(
        'Не удалось выделить заголовок идеи. Уточните описание проблемы.',
      );
    }
  }

  private buildParsePrompt(
    message: string,
    categories: ClassificationCategory[],
  ): string {
    const categorySlugs = categories
      .map((category) => category.slug)
      .join(', ');

    return `Преобразуй сообщение жителя в структурированную идею для Smart City.

Сообщение: ${message}
Допустимые categorySlug: ${categorySlugs || 'нет доступных категорий'}.

Верни строго JSON без markdown: {"title":"краткий заголовок","description":"понятное описание проблемы","categorySlug":"slug из списка или null"}. Не выдумывай факты. Если проблему нельзя понять, верни пустой title.`;
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
