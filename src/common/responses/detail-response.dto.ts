import { BaseResponseDto } from "./base-response.dto";

export class DetailResponseDto<T> extends BaseResponseDto {
  data?: T;

  constructor(status: number, isSuccess: boolean, message: string, data?: T) {
    super(status, isSuccess, message);
    this.data = data;
  }
}
