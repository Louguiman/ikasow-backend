import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { LeadsService } from './leads.service';
import { PublicLeadsController } from './public-leads.controller';
import { LeadsController } from './leads.controller';
import { PropertiesModule } from '../properties/properties.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead]),
    PropertiesModule,
    NotificationsModule,
    UsersModule,
    ClientsModule,
  ],
  controllers: [PublicLeadsController, LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
