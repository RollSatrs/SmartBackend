const createMock = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: createMock } },
  }));
});

import { ClassificationService } from './classification.service';

const categories = [
  { slug: 'roads', name: 'Дороги' },
  { slug: 'utilities', name: 'ЖКХ' },
  { slug: 'other', name: 'Другое' },
];

describe('ClassificationService', () => {
  const originalApiKey = process.env.OPENAI_API;

  afterEach(() => {
    createMock.mockReset();
    process.env.OPENAI_API = originalApiKey;
  });

  it('возвращает категорию без AI, если OPENAI_API не задан', async () => {
    delete process.env.OPENAI_API;
    const service = new ClassificationService();

    await expect(
      service.classify('Яма на дороге', 'Глубокая яма у школы', categories),
    ).resolves.toEqual({
      categorySlug: null,
      confidence: 'low',
      photoFlag: 'uncertain',
      photoFlagReason: null,
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('парсит валидный JSON-ответ OpenAI и возвращает известный slug', async () => {
    process.env.OPENAI_API = 'test-key';
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              categorySlug: 'roads',
              confidence: 'high',
              photoFlag: 'consistent',
              photoFlagReason: null,
            }),
          },
        },
      ],
    });
    const service = new ClassificationService();

    await expect(
      service.classify('Яма на дороге', 'Глубокая яма у школы', categories),
    ).resolves.toEqual({
      categorySlug: 'roads',
      confidence: 'high',
      photoFlag: 'consistent',
      photoFlagReason: null,
    });
  });

  it('отбрасывает slug, которого нет в списке категорий', async () => {
    process.env.OPENAI_API = 'test-key';
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              categorySlug: 'unknown-category',
              confidence: 'high',
              photoFlag: 'uncertain',
            }),
          },
        },
      ],
    });
    const service = new ClassificationService();

    await expect(
      service.classify('Что-то странное', 'Описание', categories),
    ).resolves.toEqual({
      categorySlug: null,
      confidence: 'high',
      photoFlag: 'uncertain',
      photoFlagReason: null,
    });
  });

  it('передаёт photoUrl в запрос и распознаёт несоответствие фото описанию', async () => {
    process.env.OPENAI_API = 'test-key';
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              categorySlug: 'roads',
              confidence: 'medium',
              photoFlag: 'inconsistent',
              photoFlagReason: 'На фото кот, а не дорога',
            }),
          },
        },
      ],
    });
    const service = new ClassificationService();

    await expect(
      service.classify(
        'Яма на дороге',
        'Глубокая яма у школы',
        categories,
        'https://example.com/photo.jpg',
      ),
    ).resolves.toEqual({
      categorySlug: 'roads',
      confidence: 'medium',
      photoFlag: 'inconsistent',
      photoFlagReason: 'На фото кот, а не дорога',
    });

    const [firstCallArgs] = createMock.mock.calls[0] as unknown[];
    const callArgs = firstCallArgs as { messages: { content: unknown }[] };
    const content = callArgs.messages[0].content as unknown[];
    expect(Array.isArray(content)).toBe(true);
    expect(content[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'https://example.com/photo.jpg' },
    });
  });

  it('не блокирует создание идеи при ошибке или таймауте OpenAI', async () => {
    process.env.OPENAI_API = 'test-key';
    createMock.mockRejectedValue(new Error('timeout'));
    const service = new ClassificationService();

    await expect(
      service.classify('Яма на дороге', 'Глубокая яма у школы', categories),
    ).resolves.toEqual({
      categorySlug: null,
      confidence: 'low',
      photoFlag: 'uncertain',
      photoFlagReason: null,
    });
  });

  it('возвращает null категорию, если ответ модели не парсится как JSON', async () => {
    process.env.OPENAI_API = 'test-key';
    createMock.mockResolvedValue({
      choices: [{ message: { content: 'не json' } }],
    });
    const service = new ClassificationService();

    await expect(
      service.classify('Яма на дороге', 'Глубокая яма у школы', categories),
    ).resolves.toEqual({
      categorySlug: null,
      confidence: 'low',
      photoFlag: 'uncertain',
      photoFlagReason: null,
    });
  });

  it('не вызывает OpenAI, если список категорий пуст', async () => {
    process.env.OPENAI_API = 'test-key';
    const service = new ClassificationService();

    await expect(
      service.classify('Яма на дороге', 'Глубокая яма у школы', []),
    ).resolves.toEqual({
      categorySlug: null,
      confidence: 'low',
      photoFlag: 'uncertain',
      photoFlagReason: null,
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('извлекает структурированные поля идеи из сообщения', async () => {
    process.env.OPENAI_API = 'test-key';
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: 'Яма возле школы',
              description: 'Машины объезжают глубокую яму возле школы.',
              categorySlug: 'roads',
            }),
          },
        },
      ],
    });
    const service = new ClassificationService();

    await expect(
      service.parseIdea('Тут яма возле школы, машины объезжают', categories),
    ).resolves.toEqual({
      title: 'Яма возле школы',
      description: 'Машины объезжают глубокую яму возле школы.',
      categorySlug: 'roads',
    });
  });

  it('возвращает 422, если модель не выделила заголовок', async () => {
    process.env.OPENAI_API = 'test-key';
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: '   ',
              description: 'Недостаточно данных',
              categorySlug: null,
            }),
          },
        },
      ],
    });
    const service = new ClassificationService();

    await expect(
      service.parseIdea('Что-то не так', categories),
    ).rejects.toThrow('Не удалось выделить заголовок идеи');
  });
});
