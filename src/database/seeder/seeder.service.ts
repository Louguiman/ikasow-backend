import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agency } from '../../agencies/entities/agency.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import {
  Property,
  PropertyStatus,
  PropertyOperation,
  PropertyType,
} from '../../properties/entities/property.entity';
import { SubscriptionPlan } from '../../subscription/entities/subscription-plan.entity';
import { AuthUtils } from '../../common/utils/auth-utils';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(Agency)
    private agencyRepository: Repository<Agency>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
  ) {}

  async seed() {
    // Plans are needed whether or not the agencies table is empty, so they
    // are seeded under their own guard. The plan ids are the stable keys
    // (`basic`/`premium`/`enterprise`) the Subscription page already uses.
    await this.seedPlans();

    if ((await this.agencyRepository.count()) > 0) {
      this.logger.log('Database already seeded. Skipping...');
      return;
    }

    this.logger.log('Seeding database...');

    // 1. Create Demo Agency
    const demoAgency = this.agencyRepository.create({
      name: 'Ikasow Demo Agency',
      email: 'contact@demo.ikasow.com',
      subdomain: 'demo',
      phone: '+223 70 00 00 00',
      address: 'ACI 2000',
      city: 'Bamako',
      postalCode: '10000',
      website: 'https://demo.ikasow.com',
      primaryColor: '#1a2b4b',
      secondaryColor: '#c5a059',
      isActive: true,
    });

    const savedAgency = await this.agencyRepository.save(demoAgency);
    this.logger.log(
      `Created Demo Agency: ${savedAgency.name} (${savedAgency.id})`,
    );

    // 2. Create Admin User
    const hashedPassword = await AuthUtils.hashPassword('password123');
    const adminUser = this.userRepository.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      agencyId: savedAgency.id,
      isActive: true,
    });

    await this.userRepository.save(adminUser);
    this.logger.log(`Created Admin User: admin@demo.com / password123`);

    // 3. Create Sample Properties
    const propertyTypes = [
      PropertyType.APARTMENT,
      PropertyType.HOUSE,
      PropertyType.LAND,
      PropertyType.OFFICE,
    ];
    const operations = [PropertyOperation.SALE, PropertyOperation.RENT];
    const cities = ['Bamako', 'Ségou', 'Sikasso', 'Kayes'];
    const neighborhoods = [
      'ACI 2000',
      'Badalabougou',
      'Baco Djicoroni',
      'Faladié',
    ];

    const properties = [];

    for (let i = 1; i <= 20; i++) {
      const operation = operations[i % operations.length];
      // Price is stored as numeric(10,2), whose maximum is 99,999,999.99. The
      // previous range (15,000,000 + random(100,000,000)) could reach 115
      // million, so roughly every other seeded sale property aborted the whole
      // boot with "A field with precision 10, scale 2 must round to an
      // absolute value less than 10^8" — and the seeder runs in
      // onApplicationBootstrap, so the API never came up.
      const price =
        operation === PropertyOperation.SALE
          ? 15_000_000 + Math.random() * 80_000_000
          : 100_000 + Math.random() * 500_000;

      const city = cities[Math.floor(Math.random() * cities.length)];
      const neighborhood =
        neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
      const type =
        propertyTypes[Math.floor(Math.random() * propertyTypes.length)];

      properties.push(
        this.propertyRepository.create({
          title: `${type} in ${city} - ${operation === PropertyOperation.SALE ? 'For Sale' : 'For Rent'}`,
          description: `Beautiful ${type.toLowerCase()} located in the heart of ${city}. Features modern amenities and spacious rooms. Great opportunity!`,
          price: Math.floor(price),
          type: type,
          status: PropertyStatus.PUBLISHED,
          operationType: operation,
          size: 100 + Math.floor(Math.random() * 500),
          rooms: 3 + Math.floor(Math.random() * 5),
          bedrooms: 2 + Math.floor(Math.random() * 4),
          bathrooms: 1 + Math.floor(Math.random() * 3),
          address: neighborhood,
          city: city,
          postalCode: '10000',
          agencyId: savedAgency.id,
          slug: `property-${i}-${Date.now()}`,
          publishedAt: new Date(),
          seoTitle: `${type} for ${operation} in ${city}`,
          seoDescription: `Find your dream ${type} in ${city}.`,
          seoKeywords: ['real estate', city, type, operation],
          images: [],
        }),
      );
    }

    await this.propertyRepository.save(properties);
    this.logger.log(`Created ${properties.length} sample properties.`);
  }

  private async seedPlans() {
    if ((await this.planRepository.count()) > 0) {
      return;
    }

    const plans = [
      {
        id: 'basic',
        name: 'Basique',
        description: 'Pour les petites agences qui débutent.',
        price: 19.99,
        currency: 'EUR',
        features: ['Jusqu\u2019à 20 biens', '3 agents', 'Support par email'],
        limitations: [
          'Pas de site vitrine personnalisé',
          'Pas de rapport avancé',
        ],
      },
      {
        id: 'premium',
        name: 'Premium',
        description: 'Le meilleur équilibre pour une agence en croissance.',
        price: 49.99,
        currency: 'EUR',
        features: [
          'Biens illimités',
          'Agents illimités',
          'Site vitrine personnalisé',
          'Rapports avancés',
          'Support prioritaire',
        ],
        limitations: ['Accès API limité'],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description:
          'Pour les réseaux d\u2019agences et les besoins sur mesure.',
        price: 99.99,
        currency: 'EUR',
        features: [
          'Tout Premium',
          'Accès API complet',
          'Multi-agences',
          'Accompagnement dédié',
          'SLA',
        ],
        limitations: [],
      },
    ];

    await this.planRepository.save(
      plans.map((plan, index) =>
        this.planRepository.create({ ...plan, sortOrder: index }),
      ),
    );
    this.logger.log('Seeded 3 subscription plans.');
  }
}
