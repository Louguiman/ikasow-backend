import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto, RegisterDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { ErrorHandler } from '../common/utils/error-handler';
import { AuthUtils } from '../common/utils/auth-utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      const { email, password, firstName, lastName, role, agencyId } =
        registerDto;

      this.logger.log(
        `User registration attempt`,
        JSON.stringify({ email, role, agencyId, operation: 'register' }),
      );

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        this.logger.warn(
          `Registration failed: User already exists`,
          JSON.stringify({ email, operation: 'register' }),
        );
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(password);

      // Create new user
      const user = this.userRepository.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        agencyId,
      });

      await this.userRepository.save(user);

      this.logger.log(
        `User registered successfully`,
        JSON.stringify({ 
          userId: user.id, 
          email: user.email, 
          role: user.role, 
          agencyId: user.agencyId,
          operation: 'register',
        }),
      );

      // Return user without password
      return AuthUtils.removePassword(user);
    } catch (error) {
      ErrorHandler.handle(error, 'AuthService.register', { email: registerDto.email });
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      this.logger.log(
        `Login attempt`,
        JSON.stringify({ email, operation: 'login' }),
      );

      // Find user by email
      const user = await this.userRepository.findOne({
        where: { email },
      });

      if (!user) {
        this.logger.warn(
          `Login failed: User not found`,
          JSON.stringify({ email, operation: 'login' }),
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Validate password
      const isPasswordValid = await AuthUtils.comparePassword(
        password,
        user.password,
      );

      if (!isPasswordValid) {
        this.logger.warn(
          `Login failed: Invalid password`,
          JSON.stringify({ userId: user.id, email, operation: 'login' }),
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        this.logger.warn(
          `Login failed: User account inactive`,
          JSON.stringify({ userId: user.id, email, operation: 'login' }),
        );
        throw new UnauthorizedException('User account is inactive');
      }

      // Generate JWT token
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId,
      };

      const accessToken = this.jwtService.sign(payload);

      this.logger.log(
        `User logged in successfully`,
        JSON.stringify({ 
          userId: user.id, 
          email: user.email, 
          role: user.role, 
          agencyId: user.agencyId,
          operation: 'login',
        }),
      );

      // Return token and user data without password
      return {
        accessToken,
        user: AuthUtils.removePassword(user),
      };
    } catch (error) {
      ErrorHandler.handle(error, 'AuthService.login', { email: loginDto.email });
    }
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });
  }
}
