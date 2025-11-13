export class TeacherClassTaskResponseDto {
  title: string;
  slug: string;
  image?: string;
  type: string;
  subject: string;
  questionCount: number;
  totalStudents: number; // Jumlah total siswa di kelas
  submissionCount: number; // Jumlah siswa yang sudah submit
  gradedCount: number; // Jumlah submission yang sudah dinilai
  deadline?: string; // Tenggat waktu tugas
}
