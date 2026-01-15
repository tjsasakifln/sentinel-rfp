# Authentication Module

JWT-based authentication using RS256 asymmetric signing and Argon2id password hashing.

## Features

- **RS256 JWT Signing**: Asymmetric key pairs for enhanced security
- **Argon2id Password Hashing**: Memory-hard algorithm resistant to GPU attacks
- **Passport.js Integration**: Standard authentication middleware
- **Type-Safe Decorators**: `@CurrentUser()` for accessing authenticated user
- **Public Route Support**: `@Public()` decorator to bypass authentication

## Setup

### 1. Generate RSA Keys

```bash
bash scripts/generate-jwt-keys.sh
```

This creates a private/public key pair in `.keys/` directory and outputs base64-encoded values.

### 2. Configure Environment Variables

Add the generated keys to your `.env` file:

```env
JWT_PRIVATE_KEY=LS0tLS1CRUdJTi... (base64-encoded)
JWT_PUBLIC_KEY=LS0tLS1CRUdJTi... (base64-encoded)
```

**Security Notes:**

- Never commit `.keys/` directory to version control
- Add `.keys/` to `.gitignore`
- Rotate keys periodically in production
- Use different keys for each environment

### 3. Import AuthModule

```typescript
import { AuthModule } from './identity/auth';

@Module({
  imports: [
    // ... other modules
    AuthModule,
  ],
})
export class AppModule {}
```

## Usage

### Protect Routes

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@/identity/auth';

@Controller('users')
@UseGuards(JwtAuthGuard) // Protect all routes in controller
export class UsersController {
  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
    };
  }
}
```

### Public Routes

```typescript
import { Public } from '@/identity/auth';

@Controller('auth')
export class AuthController {
  @Public() // Skip authentication
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    // Login logic
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    // Registration logic
  }
}
```

### Password Hashing

```typescript
import { hashPassword, verifyPassword } from '@/identity/auth';

// Hash password during registration
const hashedPassword = await hashPassword(plainPassword);

// Verify password during login
const isValid = await verifyPassword(storedHash, inputPassword);
```

### Generate JWT Token

```typescript
import { JwtService } from '@nestjs/jwt';

constructor(private jwtService: JwtService) {}

async generateToken(user: User) {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role,
  };

  return {
    accessToken: this.jwtService.sign(payload),
  };
}
```

## JWT Token Structure

### Access Token

- **Algorithm**: RS256 (RSA + SHA-256)
- **Expiration**: 15 minutes
- **Issuer**: sentinel-rfp
- **Audience**: sentinel-rfp-api

### Payload

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "organizationId": "org-uuid",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234568790
}
```

## Security Configuration

### Argon2id Parameters

- **Type**: Argon2id (hybrid mode)
- **Memory Cost**: 64 MB (65536 KiB)
- **Time Cost**: 3 iterations
- **Parallelism**: 4 threads

These parameters provide a good balance between security and performance.

### Password Requirements

Enforce these requirements in your DTOs:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Testing

Run unit tests:

```bash
npm test -- password.util.spec.ts
```

Expected coverage:

- ✅ Hashing different passwords
- ✅ Verifying correct/incorrect passwords
- ✅ Invalid hash handling
- ✅ Performance benchmarks
- ✅ Security parameter validation

## Error Handling

The module throws standard NestJS exceptions:

- **UnauthorizedException**: Invalid/expired token
- **Error**: Password hashing failures

Example:

```typescript
try {
  const hash = await hashPassword(password);
} catch (error) {
  // Handle error
}
```

## Refresh Tokens

This module provides only access token functionality. Refresh tokens will be implemented in issue #112.

## Rate Limiting

Rate limiting for authentication endpoints will be configured in issue #114.

## Next Steps

See parent issue #21 for the complete authentication roadmap:

- [ ] #110: Register endpoint
- [ ] #111: Login endpoint
- [ ] #112: Refresh token flow
- [ ] #113: Logout with blacklisting
- [ ] #114: Rate limiting
- [ ] #115: E2E tests

## References

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [Passport.js JWT Strategy](http://www.passportjs.org/packages/passport-jwt/)
- [Argon2 Specification](https://github.com/P-H-C/phc-winner-argon2)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
