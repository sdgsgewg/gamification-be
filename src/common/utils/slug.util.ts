export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // ubah spasi jadi -
    .replace(/[^\w\-]+/g, '') // hapus karakter non-word
    .replace(/\-\-+/g, '-'); // ganti multiple - dengan single -
}
