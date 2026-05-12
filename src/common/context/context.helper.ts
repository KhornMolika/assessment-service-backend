import { requestContextStorage } from "./request-context";

// retrieve client id
export class Context {
    static clientId(): string {
        const store = requestContextStorage.getStore();
        if (!store?.clientId) throw new Error('Miss client context');
        
        return store.clientId;
    }
}

