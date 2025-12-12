import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      request_id?: string;
      user?: {
        user_id: number;
        role: string;
        email: string;
        login_at?: number;
        email_verified?: boolean;
        order_notifications_sms?: boolean;
        order_notifications_email?: boolean;
        first_name?: string;
        last_name?: string;
        staff_permissions?: any;
      };
      files?: any;
      token_payload?: any;
    }
  }
}

declare module 'jsonwebtoken' {
  export interface JwtPayload {
    user_id?: number;
    role?: string;
    email?: string;
    login_at?: number;
  }
}

declare module 'socket.io' {
  interface Socket {
    user?: {
      user_id: number;
      role: string;
      email: string;
      first_name?: string;
      last_name?: string;
      staff_permissions?: any;
    };
  }
}

export {};
