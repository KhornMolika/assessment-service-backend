import { Injectable, NestMiddleware } from "@nestjs/common";
import { requestContextStorage } from "./request-context";

// extracts x-client-id
@Injectable()
export class ContextMiddleware implements NestMiddleware {
     use(req: any, res: any, next: () => void) {
    const clientId =
      req.headers['x-client-id'] as string;

    requestContextStorage.run(
      { clientId },
      () => next(),
    );
  }
}