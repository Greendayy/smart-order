import { Pool } from "pg";
export declare const auth: import("better-auth").Auth<{
    secret: string;
    baseURL: string;
    database: Pool;
    emailAndPassword: {
        enabled: true;
    };
}>;
//# sourceMappingURL=auth.d.ts.map