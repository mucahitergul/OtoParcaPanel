import {
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Token metin formatında olmalıdır' })
  @IsNotEmpty({ message: 'Token gereklidir' })
  @MaxLength(255, { message: 'Token 255 karakterden uzun olamaz' })
  token: string;

  @IsString({ message: 'Yeni şifre metin formatında olmalıdır' })
  @MinLength(6, { message: 'Yeni şifre en az 6 karakter olmalıdır' })
  @MaxLength(128, { message: 'Yeni şifre 128 karakterden uzun olamaz' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir',
  })
  @IsNotEmpty({ message: 'Yeni şifre gereklidir' })
  newPassword: string;
}
