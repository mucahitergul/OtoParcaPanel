import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  @MaxLength(255, { message: 'Email adresi 255 karakterden uzun olamaz' })
  email: string;

  @IsString({ message: 'Şifre metin formatında olmalıdır' })
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  @MaxLength(128, { message: 'Şifre 128 karakterden uzun olamaz' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir',
  })
  password: string;

  @IsOptional()
  @IsString({ message: 'Ad metin formatında olmalıdır' })
  @MaxLength(100, { message: 'Ad 100 karakterden uzun olamaz' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Soyad metin formatında olmalıdır' })
  @MaxLength(100, { message: 'Soyad 100 karakterden uzun olamaz' })
  lastName?: string;
}
