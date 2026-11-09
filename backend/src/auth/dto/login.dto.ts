import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  rfc: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
