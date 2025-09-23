import { UserDetailResponseDto } from "src/modules/users/dto/responses/user-detail-response.dto";

export class LoginDetailResponseDto {
  accessToken: string;
  refreshToken?: string;
  user: UserDetailResponseDto;
}
