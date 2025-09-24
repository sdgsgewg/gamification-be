import { Repository } from 'typeorm';
import { slugify } from '../utils/slug.util';

export class SlugHelper {
  /**
   * Cek apakah slug sudah ada di repository tertentu
   */
  static async checkDuplicateSlug<Entity>(
    repo: Repository<Entity>,
    slug: string,
    idColumn: keyof Entity,
    excludeId?: string,
  ): Promise<boolean> {
    const qb = repo.createQueryBuilder('e').where('e.slug = :slug', { slug });

    // Exclude record dengan id 'excludeId'
    if (excludeId) {
      qb.andWhere(`e.${String(idColumn)} != :excludeId`, { excludeId });
    }

    const existing = await qb.getOne();
    return !!existing;
  }

  /**
   * Generate slug unik untuk entity tertentu
   */
  static async generateUniqueSlug<Entity>(
    repo: Repository<Entity>,
    title: string,
  ): Promise<string> {
    const baseSlug = slugify(title);

    const existingSlugs = await repo
      .createQueryBuilder('e')
      .select('e.slug')
      .where('e.slug = :baseSlug', { baseSlug })
      .orWhere('e.slug LIKE :slugPattern', { slugPattern: `${baseSlug}-%` })
      .getMany();

    if (existingSlugs.length === 0) {
      return baseSlug;
    }

    const slugSet = new Set(
      existingSlugs.map((item: any) => (item as any).slug),
    );

    if (!slugSet.has(baseSlug)) {
      return baseSlug;
    }

    let maxSuffix = 0;
    slugSet.forEach((s) => {
      const match = s.match(new RegExp(`^${baseSlug}-(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSuffix) {
          maxSuffix = num;
        }
      }
    });

    return `${baseSlug}-${maxSuffix + 1}`;
  }
}
