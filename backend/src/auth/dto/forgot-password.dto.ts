import { IsEmail, MaxLength, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  @MaxLength(255, { message: 'Email adresi 255 karakterden uzun olamaz' })
  @IsNotEmpty({ message: 'Email adresi gereklidir' })
  email: string;
}
