import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { FilterSubjectDto } from './dto/filter-subject.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { slugify } from '../common/utils/slugify';

@Injectable()
export class SubjectService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.getClient();
  }

  async findAllSubjects(filterDto: FilterSubjectDto) {
    let query = this.supabase.from('subjects').select('*');

    if (filterDto.searchText) {
      query = query.ilike('name', `%${filterDto.searchText}%`);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return data.map((subject) => ({
      subjectId: subject.subject_id,
      name: subject.name,
      slug: subject.slug,
      description: subject.description,
      image: subject.image,
      createdAt: subject.created_at,
      createdBy: subject.created_by,
      updatedAt: subject.updated_at,
      updatedBy: subject.updated_by,
    }));
  }

  async findSubjectBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from('subjects')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw new Error(error.message);
    if (!data)
      throw new NotFoundException(`Subject with slug ${slug} not found`);

    return {
      ...data,
      subjectId: data.subject_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async createSubject(dto: CreateSubjectDto) {
    const slug = slugify(dto.name);

    const { data, error } = await this.supabase
      .from('subjects')
      .insert([
        {
          name: dto.name,
          slug: slug,
          description: dto.description,
          image: dto.image,
          created_at: new Date().toISOString(),
          created_by: dto.createdBy ?? null, // optional
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  private async findSubjectOrThrow(id: string) {
    const { data, error } = await this.supabase
      .from('subjects')
      .select('*')
      .eq('subject_id', id)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException(`Subject with id ${id} not found`);

    return data;
  }

  async updateSubject(id: string, dto: UpdateSubjectDto) {
    // cek subject dulu
    await this.findSubjectOrThrow(id);

    const slug = slugify(dto.name);

    const { data, error } = await this.supabase
      .from('subjects')
      .update({
        name: dto.name,
        slug,
        description: dto.description,
        image: dto.image,
        updated_by: dto.updatedBy ?? null,
      })
      .eq('subject_id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteSubject(id: string): Promise<void> {
    // cek subject dulu
    await this.findSubjectOrThrow(id);

    const { error } = await this.supabase
      .from('subjects')
      .delete()
      .eq('subject_id', id);

    if (error) throw new Error(error.message);
  }
}
