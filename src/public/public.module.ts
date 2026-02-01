import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PropertiesModule } from '../properties/properties.module';
import { AgenciesModule } from '../agencies/agencies.module';
import { UsersModule } from '../users/users.module';
import { LeadsModule } from '../leads/leads.module';
import { Property } from '../properties/entities/property.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Property]),
        AuthModule,
        PropertiesModule,
        AgenciesModule,
        UsersModule,
        LeadsModule,
        NotificationsModule,
    ],
    controllers: [PublicController],
    providers: [PublicService],
    exports: [PublicService],
})
export class PublicModule { }
