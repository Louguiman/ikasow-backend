import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  getHello(): string {
    return 'Welcome to IMMOMALI Backend API';
  }

  async getHealth() {
    const isDbConnected = this.dataSource.isInitialized;

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: isDbConnected ? 'connected' : 'disconnected',
      version: '1.0.0',
    };
  }
}
