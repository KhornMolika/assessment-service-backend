import { applyDecorators, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';
import { Public } from './public.decorator';

// Marks endpoint as:
//   - exempt from JWT ClientAuthGuard (@Public)
//   - protected by SuperAdminGuard instead
export const SuperAdmin = () => applyDecorators(
  Public(),
  UseGuards(SuperAdminGuard),
);
