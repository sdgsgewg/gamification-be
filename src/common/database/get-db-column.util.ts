import { DataSource, EntityTarget } from 'typeorm';

let _dataSource: DataSource;

/**
 * Set datasource agar bisa dipakai di helper
 */
export function setDataSource(dataSource: DataSource) {
  _dataSource = dataSource;
}

/**
 * Ambil nama kolom database dari property entity
 * Auto-fallback ke "created_at" kalau property tidak ditemukan
 */
export function getDbColumn<Entity>(
  entity: EntityTarget<Entity>,
  property: keyof Entity,
): string {
  if (!_dataSource) {
    throw new Error('DataSource belum di-set. Panggil setDataSource() dulu.');
  }

  const metadata = _dataSource.getMetadata(entity);
  const columnMeta = metadata.findColumnWithPropertyName(property as string);

  if (!columnMeta) {
    // fallback aman
    const fallback = metadata.findColumnWithPropertyName('createdAt');
    return fallback ? fallback.databaseName : 'created_at';
  }

  return columnMeta.databaseName;
}
