// FIZ: Voice Chat Controller
// REASON: Implement PHASE 4 ITEM 1 - Voice chat endpoints
// IMPACT: Exposes API endpoints for voice chat with wallet management
// CORRELATION_ID: PHASE4-ITEM1-VOICE-CHAT-CONTROLLER

import { Controller, Post, Get, Param, Body, BadRequestException, Logger } from '@nestjs/common';
import { VoiceChatService, SendVoiceMessageRequest } from './voice-chat.service';

class SendVoiceMessageDto {
  userId: string;
  twinId: string;
  sessionId: string;
  transcript: string;
  audioUrl?: string;
}

@Controller('voice-chat')
export class VoiceChatController {
  private readonly logger = new Logger(VoiceChatController.name);

  constructor(private readonly voiceChatService: VoiceChatService) {}

  /**
   * Send a voice message in chat (with DreamCoins deduction)
   */
  @Post('send-message')
  async sendVoiceMessage(@Body() body: SendVoiceMessageDto) {
    if (!body.userId || !body.twinId || !body.sessionId || !body.transcript) {
      throw new BadRequestException('Missing required fields');
    }

    const idempotencyKey = `voice-${Date.now()}-${body.userId.slice(0, 8)}`;

    const request: SendVoiceMessageRequest = {
      userId: body.userId,
      twinId: body.twinId,
      sessionId: body.sessionId,
      transcript: body.transcript,
      audioUrl: body.audioUrl,
      idempotencyKey,
    };

    return await this.voiceChatService.sendVoiceMessage(request);
  }

  /**
   * Get wallet balance for a user
   */
  @Get('balance/:userId')
  async getBalance(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const balance = await this.voiceChatService.getWalletBalance(userId);

    return {
      userId,
      balance,
    };
  }
}
