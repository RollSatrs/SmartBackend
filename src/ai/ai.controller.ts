import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatAiDto } from './dto/chat-ai.dto';
import { ParseIdeaDto, ParsedIdeaDto } from './dto/parse-idea.dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() dto: ChatAiDto) {
    const answer = await this.aiService.chat(dto.message);
    return { answer };
  }

  @ApiOperation({ summary: 'Извлечь поля идеи из сообщения жителя' })
  @ApiOkResponse({ type: ParsedIdeaDto })
  @ApiUnprocessableEntityResponse({
    description: 'Из сообщения не удалось выделить заголовок идеи',
  })
  @Post('parse-idea')
  parseIdea(@Body() dto: ParseIdeaDto) {
    return this.aiService.parseIdea(dto.message);
  }
}
