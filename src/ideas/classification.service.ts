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
  photoFlag: 'consistent' | 'inconsistent' | 'uncertain';
  photoFlagReason: string | null;
}

export interface ParsedIdeaResult {
  title: string;
  description: string;
  categorySlug: string | null;
}

const OPENAI_MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 8000;
const CONFIDENCE_VALUES = ['high', 'medium', 'low'] as const;
const PHOTO_FLAG_VALUES = ['consistent', 'inconsistent', 'uncertain'] as const;

@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);

  async classify(
    title: string,
    description: string,
    categories: ClassificationCategory[],
    photoUrl?: string,
  ): Promise<ClassificationResult> {
    const fallback: ClassificationResult = {
      categorySlug: null,
      confidence: 'low',
      photoFlag: 'uncertain',
      photoFlagReason: null,
    };

    const apiKey = process.env.OPENAI_API;
    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API не задан — идея останется без автоматической категории',
      );
      return fallback;
    }
    if (!categories.length) {
      return fallback;
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
            content: photoUrl
              ? [
                  {
                    type: 'text',
                    text: this.buildPrompt(title, description, categories),
                  },
                  { type: 'image_url', image_url: { url: photoUrl } },
                ]
              : this.buildPrompt(title, description, categories),
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
      return fallback;
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

    return `Ты классифицируешь обращения жителей города Smart City по категориям городских служб и проверяешь приложенное фото.

Категории (slug: название):
${categoryList}

Обращение жителя:
Заголовок: ${title}
Описание: ${description}

Задачи:
1. Определи одну наиболее подходящую категорию из списка выше по slug.
2. Посмотри на приложенное фото (если оно есть) и оцени, правдоподобно ли оно показывает именно ту проблему, которая описана в заголовке/описании. Если фото явно не относится к описанию (например, случайное фото, скриншот, человек, интерьер, еда — не имеет отношения к заявленной городской проблеме) — отметь как "inconsistent". Если фото похоже на описанную проблему — "consistent". Если фото не приложено или по нему нельзя судить уверенно — "uncertain".

Ответь строго в формате JSON без пояснений и без markdown:
{"categorySlug": "<slug из списка или null>", "confidence": "high" | "medium" | "low", "photoFlag": "consistent" | "inconsistent" | "uncertain", "photoFlagReason": "<короткое объяснение на русском или null>"}

Если ни одна категория явно не подходит, верни categorySlug: null и confidence: "low". Не выдумывай факты про фото, если не уверен — используй "uncertain".`;
  }

  private parseResult(
    content: string,
    categories: ClassificationCategory[],
  ): ClassificationResult {
    const parsed = JSON.parse(content) as {
      categorySlug?: string | null;
      confidence?: string;
      photoFlag?: string;
      photoFlagReason?: string | null;
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

    const photoFlag = PHOTO_FLAG_VALUES.includes(
      parsed.photoFlag as (typeof PHOTO_FLAG_VALUES)[number],
    )
      ? (parsed.photoFlag as ClassificationResult['photoFlag'])
      : 'uncertain';

    const photoFlagReason =
      typeof parsed.photoFlagReason === 'string' &&
      parsed.photoFlagReason.trim()
        ? parsed.photoFlagReason.trim()
        : null;

    return { categorySlug, confidence, photoFlag, photoFlagReason };
  }
}
