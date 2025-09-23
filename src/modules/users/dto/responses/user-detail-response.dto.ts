export class UserDetailResponseDto {
  userId: string;
  name: string;
  username: string;
  email: string;
  password: string;
  gender: string;
  phone: string;
  dob: string;
  image: string;
  role: { roleId: string; name: string };
  grade: { gradeId: string; name: string };
  level: number;
  xp: number;
  emailVerifiedAt: string;
  createdAt: string;
}
