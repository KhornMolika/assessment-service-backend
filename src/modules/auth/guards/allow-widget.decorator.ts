import { SetMetadata } from '@nestjs/common';

export const IS_ALLOW_WIDGET_KEY = 'isAllowWidget';
export const AllowWidget = () => SetMetadata(IS_ALLOW_WIDGET_KEY, true);
