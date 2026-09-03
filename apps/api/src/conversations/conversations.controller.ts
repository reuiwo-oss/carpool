import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConversationsService } from './conversations.service';

class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private conversations: ConversationsService) {}

  /** Lista wątków zalogowanego użytkownika (pasażera i kierowcy) */
  @Get()
  list(@Req() req: any) {
    return this.conversations.list(req.user.id);
  }

  /**
   * Licznik do kulki przy ikonce. Musi stać przed @Get(':id'),
   * inaczej "unread" trafi w parametr id.
   */
  @Get('unread')
  unread(@Req() req: any) {
    return this.conversations.unreadCount(req.user.id);
  }

  /** Wątek z wiadomościami — otwarcie oznacza je jako przeczytane */
  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.conversations.get(req.user.id, id);
  }

  @Post(':id/messages')
  send(@Req() req: any, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.conversations.send(req.user.id, id, dto.body);
  }
}
