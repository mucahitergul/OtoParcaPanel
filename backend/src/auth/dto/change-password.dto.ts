import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Mevcut şifre metin formatında olmalıdır' })
  @IsNotEmpty({ message: 'Mevcut şifre gereklidir' })
  currentPassword: string;

  @IsString({ message: 'Yeni şifre metin formatında olmalıdır' })
  @MinLength(6, { message: 'Yeni şifre en az 6 karakter olmalıdır' })
  newPassword: string;
}
