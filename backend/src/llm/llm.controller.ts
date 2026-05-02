import { Controller, Get, Query } from '@nestjs/common';
import { LlmService } from './llm.service';
import { Public } from '../auth/decorator/public.decorator';

@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Get('progress')
  @Public()
  getProgress(@Query('taskId') taskId: string) {
    return {
      taskId,
      logs: this.llmService.getProgress(taskId),
    };
  }

  @Get('clear-progress')
  @Public()
  clearProgress(@Query('taskId') taskId: string) {
    this.llmService.clearProgress(taskId);
    return { success: true };
  }
}
