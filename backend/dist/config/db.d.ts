export declare function initDB(): Promise<void>;
export declare function query(text: string, params?: any[]): Promise<{
    rows: any[];
}>;
export declare function getIsSqlite(): boolean;
