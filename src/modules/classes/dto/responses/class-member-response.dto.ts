class Member {
  name: string;
  image?: string;
}

export class ClassMemberResponseDto {
  students: Member[];
  teacher: Member[];
}
