/**
 * Sentinel RFP - Database Seed Script
 * Populates database with test data for development
 *
 * Run: npm run db:seed
 */

import { PrismaClient, Plan, OrgStatus, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * Generate mock vector embedding (1536 dimensions for OpenAI ada-002)
 */
function generateMockEmbedding(): number[] {
  return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
}

/**
 * Clear all data (idempotent seed)
 */
async function clearDatabase() {
  console.log('🗑️  Clearing database...');

  // Delete in order of dependencies (child → parent)
  await prisma.response.deleteMany();
  await prisma.question.deleteMany();
  await prisma.proposalSection.deleteMany();
  await prisma.proposal.deleteMany();

  await prisma.documentChunk.deleteMany();
  await prisma.document.deleteMany();

  await prisma.libraryEntry.deleteMany();

  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log('✅ Database cleared');
}

/**
 * Seed organizations
 */
async function seedOrganizations() {
  console.log('🏢 Seeding organizations...');

  const orgs = await prisma.$transaction([
    prisma.organization.create({
      data: {
        name: 'Acme Corp',
        slug: 'acme-corp',
        plan: Plan.PROFESSIONAL,
        status: OrgStatus.ACTIVE,
        maxUsersPerMonth: 50,
        maxProposalsPerYear: 100,
        maxStorageGb: 50,
        settings: {
          theme: 'light',
          timezone: 'America/New_York',
          notifications: {
            email: true,
            slack: false
          }
        }
      }
    }),
    prisma.organization.create({
      data: {
        name: 'TechStart Solutions',
        slug: 'techstart',
        plan: Plan.ENTERPRISE,
        status: OrgStatus.ACTIVE,
        maxUsersPerMonth: 200,
        maxProposalsPerYear: 500,
        maxStorageGb: 200,
        settings: {
          theme: 'dark',
          timezone: 'America/Los_Angeles',
          notifications: {
            email: true,
            slack: true,
            slackWebhook: 'https://hooks.slack.com/services/EXAMPLE'
          }
        }
      }
    })
  ]);

  console.log(`✅ Created ${orgs.length} organizations`);
  return orgs;
}

/**
 * Seed users
 */
async function seedUsers(organizations: any[]) {
  console.log('👤 Seeding users...');

  const password = await argon2.hash('password123', {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4
  });

  const users = await prisma.$transaction([
    // Acme Corp users
    prisma.user.create({
      data: {
        organizationId: organizations[0].id,
        email: 'admin@acme.com',
        passwordHash: password,
        name: 'Alice Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        timezone: 'America/New_York',
        preferences: {
          language: 'en',
          emailNotifications: true
        }
      }
    }),
    prisma.user.create({
      data: {
        organizationId: organizations[0].id,
        email: 'member@acme.com',
        passwordHash: password,
        name: 'Bob Member',
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        timezone: 'America/New_York',
        preferences: {
          language: 'en',
          emailNotifications: false
        }
      }
    }),

    // TechStart users
    prisma.user.create({
      data: {
        organizationId: organizations[1].id,
        email: 'owner@techstart.com',
        passwordHash: password,
        name: 'Charlie Owner',
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        timezone: 'America/Los_Angeles',
        mfaEnabled: true,
        preferences: {
          language: 'en',
          emailNotifications: true,
          slackNotifications: true
        }
      }
    }),
    prisma.user.create({
      data: {
        organizationId: organizations[1].id,
        email: 'viewer@techstart.com',
        passwordHash: password,
        name: 'Dana Viewer',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        timezone: 'America/Los_Angeles',
        preferences: {
          language: 'en',
          emailNotifications: false
        }
      }
    })
  ]);

  console.log(`✅ Created ${users.length} users (password: password123)`);
  return users;
}

/**
 * Seed proposals with sections, questions, and responses
 */
async function seedProposals(organizations: any[]) {
  console.log('📝 Seeding proposals...');

  const proposals = [];

  // Proposal 1: Acme Corp
  const proposal1 = await prisma.proposal.create({
    data: {
      organizationId: organizations[0].id,
      title: 'Department of Defense - Cloud Migration RFP',
      rfpNumber: 'DOD-2026-CM-001',
      status: 'in_progress',
      sections: {
        create: [
          {
            title: 'Technical Approach',
            order: 1,
            questions: {
              create: [
                {
                  text: 'Describe your cloud migration methodology and timeline.',
                  order: 1,
                  responses: {
                    create: {
                      content: 'Our proven cloud migration methodology follows a phased approach: Assessment → Planning → Migration → Optimization. We leverage automated tooling and experienced migration architects to ensure minimal downtime.',
                      trustScore: 0.87,
                      status: 'approved'
                    }
                  }
                },
                {
                  text: 'What security measures will you implement during and after migration?',
                  order: 2,
                  responses: {
                    create: {
                      content: 'Security is paramount in our migration process. We implement end-to-end encryption, multi-factor authentication, continuous security monitoring, and compliance with FedRAMP standards.',
                      trustScore: 0.92,
                      status: 'approved'
                    }
                  }
                }
              ]
            }
          },
          {
            title: 'Past Performance',
            order: 2,
            questions: {
              create: [
                {
                  text: 'Provide 3 examples of similar cloud migration projects.',
                  order: 1,
                  responses: {
                    create: {
                      content: 'We have successfully completed 15+ cloud migrations for government agencies, including: 1) Department of Energy (500+ servers), 2) Veterans Affairs (2PB data migration), 3) National Science Foundation (hybrid cloud).',
                      trustScore: 0.95,
                      status: 'approved'
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  });
  proposals.push(proposal1);

  // Proposal 2: TechStart
  const proposal2 = await prisma.proposal.create({
    data: {
      organizationId: organizations[1].id,
      title: 'GSA Schedule 70 - IT Professional Services',
      rfpNumber: 'GSA-2026-IT-042',
      status: 'draft',
      sections: {
        create: [
          {
            title: 'Corporate Experience',
            order: 1,
            questions: {
              create: [
                {
                  text: 'Describe your company background and core competencies.',
                  order: 1,
                  responses: {
                    create: {
                      content: 'TechStart Solutions is a veteran-owned small business with 12 years of IT consulting experience. Our core competencies include cloud architecture, cybersecurity, and agile software development.',
                      trustScore: 0.78,
                      status: 'draft'
                    }
                  }
                },
                {
                  text: 'What is your NAICS code and business size standard?',
                  order: 2,
                  responses: {
                    create: {
                      content: 'Primary NAICS: 541512 (Computer Systems Design Services). We are a certified small business under SBA size standards with average annual revenue of $8M.',
                      trustScore: 0.85,
                      status: 'draft'
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  });
  proposals.push(proposal2);

  console.log(`✅ Created ${proposals.length} proposals with sections, questions, and responses`);
  return proposals;
}

/**
 * Seed documents with chunks and embeddings
 */
async function seedDocuments(organizations: any[]) {
  console.log('📄 Seeding documents...');

  const documents = await prisma.$transaction([
    // Acme Corp documents
    prisma.document.create({
      data: {
        organizationId: organizations[0].id,
        filename: 'company-capabilities-statement-2026.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024000,
        storageKey: 'acme-corp/docs/capabilities-2026.pdf',
        chunks: {
          create: [
            {
              content: 'Acme Corp provides comprehensive cloud migration services with proven methodologies and certified architects.',
              embedding: `[${generateMockEmbedding().join(',')}]`,
              metadata: { page: 1, section: 'Overview' }
            },
            {
              content: 'Our security practices include FedRAMP compliance, NIST 800-53 controls, and continuous monitoring with SIEM integration.',
              embedding: `[${generateMockEmbedding().join(',')}]`,
              metadata: { page: 3, section: 'Security' }
            }
          ]
        }
      }
    }),

    prisma.document.create({
      data: {
        organizationId: organizations[0].id,
        filename: 'past-performance-dod-2024.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: 512000,
        storageKey: 'acme-corp/docs/past-perf-dod-2024.docx',
        chunks: {
          create: [
            {
              content: 'Department of Defense Cloud Migration - Successfully migrated 500+ servers to AWS GovCloud with zero downtime. Contract value: $12M.',
              embedding: `[${generateMockEmbedding().join(',')}]`,
              metadata: { page: 1, project: 'DOD-CM-2024' }
            }
          ]
        }
      }
    }),

    // TechStart documents
    prisma.document.create({
      data: {
        organizationId: organizations[1].id,
        filename: 'techstart-corporate-profile.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 768000,
        storageKey: 'techstart/docs/corporate-profile.pdf',
        chunks: {
          create: [
            {
              content: 'TechStart Solutions is a veteran-owned small business specializing in cloud architecture and cybersecurity for federal agencies.',
              embedding: `[${generateMockEmbedding().join(',')}]`,
              metadata: { page: 1, section: 'About' }
            },
            {
              content: 'Our certifications include AWS Advanced Consulting Partner, CMMC Level 2, and ISO 27001.',
              embedding: `[${generateMockEmbedding().join(',')}]`,
              metadata: { page: 2, section: 'Certifications' }
            }
          ]
        }
      }
    }),

    prisma.document.create({
      data: {
        organizationId: organizations[1].id,
        filename: 'gsa-pricing-2026.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sizeBytes: 128000,
        storageKey: 'techstart/docs/gsa-pricing-2026.xlsx',
        chunks: {
          create: [
            {
              content: 'Labor Category: Cloud Architect - GSA Rate: $185/hr. Labor Category: Cybersecurity Analyst - GSA Rate: $165/hr.',
              embedding: `[${generateMockEmbedding().join(',')}]`,
              metadata: { sheet: 'Labor Categories', row: 5 }
            }
          ]
        }
      }
    }),

    prisma.document.create({
      data: {
        organizationId: organizations[1].id,
        filename: 'sba-8a-certification.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 256000,
        storageKey: 'techstart/docs/sba-8a-cert.pdf',
        chunks: {
          create: [
            {
              content: 'TechStart Solutions is certified under the SBA 8(a) Business Development Program, valid through December 2027.',
              embedding: `[${generateMockEmbedding().join(',')}]`,
              metadata: { page: 1, type: 'certification' }
            }
          ]
        }
      }
    })
  ]);

  console.log(`✅ Created ${documents.length} documents with ${documents.reduce((sum, doc) => sum + (doc.chunks?.length || 0), 0)} chunks`);
  return documents;
}

/**
 * Seed library entries
 */
async function seedLibraryEntries(organizations: any[]) {
  console.log('📚 Seeding library entries...');

  const entries = await prisma.$transaction([
    // Acme Corp library
    prisma.libraryEntry.create({
      data: {
        organizationId: organizations[0].id,
        title: 'Standard Cloud Migration Approach',
        content: 'Our cloud migration methodology follows industry best practices: Discovery → Assessment → Planning → Migration → Optimization. We use automated tools for workload analysis and prioritization.',
        category: 'Technical Approach',
        tags: ['cloud', 'migration', 'methodology'],
        embedding: `[${generateMockEmbedding().join(',')}]`
      }
    }),

    prisma.libraryEntry.create({
      data: {
        organizationId: organizations[0].id,
        title: 'FedRAMP Compliance Statement',
        content: 'Our cloud solutions are FedRAMP authorized at the Moderate impact level. We maintain continuous monitoring and comply with all NIST 800-53 controls.',
        category: 'Compliance',
        tags: ['fedramp', 'compliance', 'security'],
        embedding: `[${generateMockEmbedding().join(',')}]`,
        expiresAt: new Date('2027-12-31')
      }
    }),

    prisma.libraryEntry.create({
      data: {
        organizationId: organizations[0].id,
        title: 'Past Performance Summary',
        content: 'Acme Corp has 15+ years of federal IT experience with contracts totaling $150M. Notable clients include DOD, VA, DOE, and GSA.',
        category: 'Past Performance',
        tags: ['experience', 'federal', 'contracts'],
        embedding: `[${generateMockEmbedding().join(',')}]`
      }
    }),

    prisma.libraryEntry.create({
      data: {
        organizationId: organizations[0].id,
        title: 'Security Monitoring Capabilities',
        content: 'We provide 24/7 security monitoring using SIEM tools (Splunk, Sentinel), threat intelligence feeds, and automated incident response playbooks.',
        category: 'Security',
        tags: ['security', 'monitoring', 'siem'],
        embedding: `[${generateMockEmbedding().join(',')}]`
      }
    }),

    prisma.libraryEntry.create({
      data: {
        organizationId: organizations[0].id,
        title: 'Agile Development Process',
        content: 'Our agile development follows Scrum framework with 2-week sprints, daily standups, and continuous integration/deployment pipelines.',
        category: 'Development',
        tags: ['agile', 'scrum', 'development'],
        embedding: `[${generateMockEmbedding().join(',')}]`
      }
    }),

    // TechStart library
    prisma.libraryEntry.create({
      data: {
        organizationId: organizations[1].id,
        title: 'Veteran-Owned Small Business Status',
        content: 'TechStart Solutions is a certified Service-Disabled Veteran-Owned Small Business (SDVOSB) and maintains 8(a) certification.',
        category: 'Company Profile',
        tags: ['sdvosb', '8a', 'small-business'],
        embedding: `[${generateMockEmbedding().join(',')}]`,
        expiresAt: new Date('2027-06-30')
      }
    }),

    prisma.libraryEntry.create({
      data: {
        organizationId: organizations[1].id,
        title: 'AWS Partnership',
        content: 'TechStart is an AWS Advanced Consulting Partner with competencies in Migration, Security, and Government.',
        category: 'Certifications',
        tags: ['aws', 'partner', 'cloud'],
        embedding: `[${generateMockEmbedding().join(',')}]`
      }
    }),

    prisma.libraryEntry.create({
      data: {
        organizationId: organizations[1].id,
        title: 'CMMC Compliance',
        content: 'TechStart maintains CMMC Level 2 certification and assists clients with DFARS 252.204-7012 compliance.',
        category: 'Compliance',
        tags: ['cmmc', 'dfars', 'cybersecurity'],
        embedding: `[${generateMockEmbedding().join(',')}]`,
        expiresAt: new Date('2026-09-30')
      }
    }),

    prisma.libraryEntry.create({
      data: {
        organizationId: organizations[1].id,
        title: 'Labor Rates GSA Schedule 70',
        content: 'Standard labor rates under GSA Schedule 70: Cloud Architect ($185/hr), Senior Developer ($155/hr), Security Analyst ($165/hr), Project Manager ($145/hr).',
        category: 'Pricing',
        tags: ['gsa', 'rates', 'labor'],
        embedding: `[${generateMockEmbedding().join(',')}]`,
        expiresAt: new Date('2026-12-31')
      }
    }),

    prisma.libraryEntry.create({
      data: {
        organizationId: organizations[1].id,
        title: 'Key Personnel Qualifications',
        content: 'Our key personnel average 15+ years of federal IT experience with active security clearances and relevant certifications (CISSP, CISM, AWS Solutions Architect).',
        category: 'Personnel',
        tags: ['personnel', 'qualifications', 'clearances'],
        embedding: `[${generateMockEmbedding().join(',')}]`
      }
    })
  ]);

  console.log(`✅ Created ${entries.length} library entries`);
  return entries;
}

/**
 * Main seed function
 */
async function main() {
  try {
    console.log('🌱 Starting database seed...\n');

    // Clear existing data
    await clearDatabase();
    console.log();

    // Seed in order
    const organizations = await seedOrganizations();
    console.log();

    const users = await seedUsers(organizations);
    console.log();

    const proposals = await seedProposals(organizations);
    console.log();

    const documents = await seedDocuments(organizations);
    console.log();

    const libraryEntries = await seedLibraryEntries(organizations);
    console.log();

    console.log('✅ Database seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Organizations: ${organizations.length}`);
    console.log(`   - Users: ${users.length} (password: password123)`);
    console.log(`   - Proposals: ${proposals.length}`);
    console.log(`   - Documents: ${documents.length}`);
    console.log(`   - Library Entries: ${libraryEntries.length}`);
    console.log('\n🔗 Test credentials:');
    console.log('   Acme Corp Admin: admin@acme.com / password123');
    console.log('   Acme Corp Member: member@acme.com / password123');
    console.log('   TechStart Owner: owner@techstart.com / password123');
    console.log('   TechStart Viewer: viewer@techstart.com / password123');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

// Execute seed
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
