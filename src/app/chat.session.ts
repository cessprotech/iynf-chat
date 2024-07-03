import { Injectable } from "@nestjs/common";
import { AuthenticatedSocket } from "@app/common/interfaces";

export interface IGatewaySessionManager {
    getUserSocket(id: string): AuthenticatedSocket | undefined;
    setUserSocket(id: string, socket: AuthenticatedSocket): void;
    removeUserSocket(id: string): void;
    getSockets(): Map<string, AuthenticatedSocket>;
}

// @Injectable()
export class GatewaySessionManager implements IGatewaySessionManager {
    private readonly sessions: Map<string, AuthenticatedSocket> = new Map();

    getUserSocket(userId: string) {
        return this.sessions.get(userId);
    }

    setUserSocket(userId: string, socket: AuthenticatedSocket) {
        this.sessions.set(userId, socket);        
    }

    removeUserSocket(userId: string) {
        this.sessions.delete(userId);
    }

    getSockets(): Map<string, AuthenticatedSocket> {
        return this.sessions;
    }
}