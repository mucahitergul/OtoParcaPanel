import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  @MaxLength(255, { message: 'Email adresi 255 karakterden uzun olamaz' })
  @IsNotEmpty({ message: 'Email adresi gereklidir' })
  email: string;

  @IsString({ message: 'Şifre metin formatında olmalıdır' })
  @MinLength(1, { message: 'Şifre gereklidir' })
  @MaxLength(128, { message: 'Şifre 128 karakterden uzun olamaz' })
  @IsNotEmpty({ message: 'Şifre gereklidir' })
  password: string;
}
