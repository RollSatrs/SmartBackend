import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { db } from 'src';
import { categoriesTable } from 'src/db/schema';
import { ClassificationService } from 'src/ideas/classification.service';

@Injectable()
export class AiService {
  private openai: OpenAI;
  constructor(private readonly classificationService: ClassificationService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API,
    });
  }
  async chat(message: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'chatgpt-4o-latest',
        messages: [{ role: 'user', content: message }],
      });
      return response.choices[0].message.content!;
    } catch (err) {
      console.log(err);
      return 'error';
    }
  }

  async parseIdea(message: string) {
    const categories = await db
      .select({ slug: categoriesTable.slug, name: categoriesTable.name })
      .from(categoriesTable);

    return this.classificationService.parseIdea(message, categories);
  }
}
