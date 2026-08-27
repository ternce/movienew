import { IsOptional, IsUUID } from 'class-validator';

export class DirectChatReadDto {
  @IsOptional()
  @IsUUID()
  messageId?: string;
}
