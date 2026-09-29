import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateIdeaStatusDto } from './update-idea-status.dto';

describe('UpdateIdeaStatusDto', () => {
  it('требует комментарий при отклонении', async () => {
    const dto = plainToInstance(UpdateIdeaStatusDto, { status: 'rejected' });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('требует комментарий при запросе уточнения', async () => {
    const dto = plainToInstance(UpdateIdeaStatusDto, {
      status: 'needs_clarification',
      comment: '   ',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('разрешает рабочий статус без комментария', async () => {
    const dto = plainToInstance(UpdateIdeaStatusDto, {
      status: 'in_progress',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
