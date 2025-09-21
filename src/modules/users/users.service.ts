import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/integrations/supabase/supabase.service';

@Injectable()
export class UserService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAllUsers() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw new Error(error.message);
    return data;
  }

  async getUserById(userId: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
      ...data, // semua kolom asli
      userId: data.user_id,
      gradeId: data.grade_id,
      createdAt: data.created_at,
    };
  }
}
