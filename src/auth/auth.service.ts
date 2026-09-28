import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Agency } from '../agencies/entities/agency.entity';
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
    @InjectRepository(Agency)
    private agencyRepository: Repository<Agency>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      const { email, password, firstName, lastName, agencyId } = registerDto;

      this.logger.log(
        `User registration attempt`,
        JSON.stringify({ email, agencyId, operation: 'register' }),
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

      // A supplied agency must be real and active, otherwise the account is created
      // in a state where AgencyScopeGuard rejects every request it makes.
      if (agencyId) {
        const agency = await this.agencyRepository.findOne({
          where: { id: agencyId, isActive: true },
        });

        if (!agency) {
          this.logger.warn(
            `Registration failed: unknown or inactive agency`,
            JSON.stringify({ email, agencyId, operation: 'register' }),
          );
          throw new BadRequestException('Unknown or inactive agency');
        }
      } else {
        this.logger.warn(
          `Registration without an agency - the account will have no tenant context ` +
            `until the public portal resolves one from the subdomain`,
          JSON.stringify({ email, operation: 'register' }),
        );
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(password);

      // Create new user. The role is never taken from the request body: this
      // endpoint is public, so a caller-supplied role would be a self-service
      // promotion to platform-admin.
      const user = this.userRepository.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: UserRole.TENANT,
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

      // Return the same shape as login so the client can store the token and go
      // straight to the app instead of bouncing through the login form.
      return {
        access_token: this.buildAccessToken(user),
        user: AuthUtils.removePassword(user),
      };
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
      const accessToken = this.buildAccessToken(user);

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

      // Return token and user data without password. The field is snake_case
      // because that is what the client stores in localStorage under `access_token`
      // and what it reads back on every request (src/store/api/authApi.ts).
      return {
        access_token: accessToken,
        user: AuthUtils.removePassword(user),
      };
    } catch (error) {
      ErrorHandler.handle(error, 'AuthService.login', { email: loginDto.email });
    }
  }

  private buildAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
    };

    return this.jwtService.sign(payload);
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });
  }
}
