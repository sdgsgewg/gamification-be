export class BaseResponseDto {
  status: number;
  isSuccess: boolean;
  message: string;

  constructor(status: number, isSuccess: boolean, message: string) {
    this.status = status;
    this.isSuccess = isSuccess;
    this.message = message;
  }
}
