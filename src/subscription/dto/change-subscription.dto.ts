import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeSubscriptionDto {
  @ApiProperty({
    description: 'Plan id, e.g. `basic`, `premium` or `enterprise`',
    example: 'premium',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  planId: string;
}
