import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'Asha Rao' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'asha@cafe.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'asha' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
