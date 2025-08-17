import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class GradeService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAllGrades() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.from('grades').select('*');

    if (error) throw new Error(error.message);
    
    return data.map((grade) => ({
      gradeId: grade.grade_id,
      name: grade.name,
    }));
  }
}
