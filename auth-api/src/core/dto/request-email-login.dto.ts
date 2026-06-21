import { IsEmail } from 'class-validator';

export class RequestEmailLoginDto {
  @IsEmail()
  email!: string;
}
