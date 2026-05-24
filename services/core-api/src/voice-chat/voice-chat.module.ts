// FIZ: Voice Chat Module
// REASON: Implement PHASE 4 ITEM 1 - Voice chat module definition
// IMPACT: Registers voice chat service and controller
// CORRELATION_ID: PHASE4-ITEM1-VOICE-CHAT-MODULE

import { Module } from '@nestjs/common';
import { VoiceChatService } from './voice-chat.service';
import { VoiceChatController } from './voice-chat.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [VoiceChatController],
  providers: [VoiceChatService, PrismaService],
  exports: [VoiceChatService],
})
export class VoiceChatModule {}
