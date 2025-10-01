import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TaskQuestionOption } from './entities/task-question-option.entity';
import { UpdateTaskQuestionOptionDto } from '../tasks/dto/requests/update-task.dto';
import { CreateTaskQuestionOptionDto } from '../tasks/dto/requests/create-task.dto';

@Injectable()
export class TaskQuestionOptionService {
  constructor(
    @InjectRepository(TaskQuestionOption)
    private readonly taskQuestionOptionRepository: Repository<TaskQuestionOption>,
  ) {}

  async createTaskQuestionOptions(
    dto: CreateTaskQuestionOptionDto[],
    updatedBy: string,
    questionId: string,
  ): Promise<void> {
    const newOptions = dto.map((o, idx) => {
      const index = idx + 1;
      return this.taskQuestionOptionRepository.create({
        text: o.text,
        is_correct: o.isCorrect,
        order: index,
        created_at: new Date(),
        created_by: updatedBy ?? null,
        question_id: questionId,
      });
    });
    await this.taskQuestionOptionRepository.save(newOptions);
  }

  async syncTaskQuestionOptions(
    questionId: string,
    optionsDto: UpdateTaskQuestionOptionDto[],
    updatedBy?: string,
  ) {
    const existingOptions = await this.taskQuestionOptionRepository.find({
      where: { question_id: questionId },
    });

    const existingOptionIds = existingOptions.map(
      (o) => o.task_question_option_id,
    );
    const incomingOptionIds =
      optionsDto?.filter((o) => !!o.optionId).map((o) => o.optionId) || [];

    // Hapus yang tidak ada di DTO
    const toDelete = existingOptions.filter(
      (o) => !incomingOptionIds.includes(o.task_question_option_id),
    );
    if (toDelete.length > 0) {
      await this.taskQuestionOptionRepository.remove(toDelete);
    }

    // Insert / Update
    for (const [idx, oDto] of (optionsDto || []).entries()) {
      const index = idx + 1;
      if (oDto.optionId && existingOptionIds.includes(oDto.optionId)) {
        // Update
        const option = existingOptions.find(
          (o) => o.task_question_option_id === oDto.optionId,
        );
        option.text = oDto.text;
        option.is_correct = oDto.isCorrect;
        option.order = index;
        option.updated_at = new Date();
        option.updated_by = updatedBy ?? null;
        await this.taskQuestionOptionRepository.save(option);
      } else {
        // Insert baru
        const newOption = this.taskQuestionOptionRepository.create({
          text: oDto.text,
          is_correct: oDto.isCorrect,
          order: index,
          created_at: new Date(),
          created_by: updatedBy ?? null,
          question_id: questionId,
        });
        await this.taskQuestionOptionRepository.save(newOption);
      }
    }
  }

  async deleteTaskQuestionOption(idsToDelete: string[]): Promise<void> {
    await this.taskQuestionOptionRepository.delete({
      question_id: In(idsToDelete),
    });
  }
}
