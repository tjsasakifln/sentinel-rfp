/**
 * User Module
 *
 * Provides user-organization relationship management.
 * Exports UserService for use in other modules.
 *
 * @module UserModule
 */

import { Module } from '@nestjs/common';

import { UserService } from './user.service';

@Module({
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
