import { ApiProperty } from '@nestjs/swagger';

export class LeadResponseDto {
  @ApiProperty({
    description: 'Lead ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Response message',
    example: 'Thank you for your interest! We will contact you soon.',
  })
  message: string;

  constructor(
    id: string,
    message: string = 'Thank you for your interest! We will contact you soon.',
  ) {
    this.id = id;
    this.message = message;
  }
}
