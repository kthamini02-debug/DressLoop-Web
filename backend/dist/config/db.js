"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = initDB;
exports.query = query;
exports.getIsSqlite = getIsSqlite;
const pg_1 = require("pg");
const sqlite3_1 = __importDefault(require("sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
const forceSqlite = process.env.FORCE_SQLITE === 'true';
let pgPool = null;
let sqliteDb = null;
let isSqlite = false;
async function initDB() {
    // Determine if we should use SQLite
    if (forceSqlite || !databaseUrl) {
        console.log('🔄 Forced or missing DATABASE_URL. Initializing SQLite...');
        await initSqlite();
        return;
    }
    try {
        console.log('⚡ Attempting connection to PostgreSQL...');
        pgPool = new pg_1.Pool({
            connectionString: databaseUrl,
            // Add connection timeout so it fails fast if server is offline
            connectionTimeoutMillis: 5000,
        });
        // Test connection
        const client = await pgPool.connect();
        console.log('✅ Connected to PostgreSQL successfully!');
        client.release();
        // Initialize Schema on PostgreSQL
        await executeSchemaPG();
    }
    catch (error) {
        console.error('❌ Failed to connect to PostgreSQL:', error.message);
        if (!isProduction) {
            console.log('🔄 Development environment: Falling back to SQLite...');
            pgPool = null;
            await initSqlite();
        }
        else {
            console.error('💥 Production mode: Cannot fall back to SQLite. Exiting...');
            throw error;
        }
    }
}
async function initSqlite() {
    isSqlite = true;
    const dbPath = path_1.default.resolve(__dirname, '../../dress.db');
    console.log(`📦 SQLite Database File: ${dbPath}`);
    return new Promise((resolve, reject) => {
        sqliteDb = new sqlite3_1.default.Database(dbPath, async (err) => {
            if (err) {
                console.error('❌ Failed to create SQLite database:', err.message);
                reject(err);
            }
            else {
                console.log('✅ SQLite Database initialized.');
                try {
                    await executeSchemaSqlite();
                    resolve();
                }
                catch (schemaErr) {
                    reject(schemaErr);
                }
            }
        });
    });
}
// Read schema.sql
function readSchemaFile() {
    const schemaPath = path_1.default.resolve(__dirname, '../../schema.sql');
    if (!fs_1.default.existsSync(schemaPath)) {
        throw new Error(`schema.sql not found at ${schemaPath}`);
    }
    return fs_1.default.readFileSync(schemaPath, 'utf8');
}
// Initialize PostgreSQL Schema
async function executeSchemaPG() {
    if (!pgPool)
        return;
    const ddl = readSchemaFile();
    try {
        await pgPool.query(ddl);
        console.log('✅ PostgreSQL Schema tables initialized/verified.');
    }
    catch (error) {
        console.error('❌ Error executing schema on PostgreSQL:', error);
        throw error;
    }
}
// Initialize SQLite Schema
async function executeSchemaSqlite() {
    if (!sqliteDb)
        return;
    const ddl = readSchemaFile();
    // Convert PostgreSQL DDL to SQLite compatible DDL
    let sqliteDdl = ddl
        .replace(/gen_random_uuid\(\)/g, 'NULL') // We will generate UUIDs in Node code
        .replace(/UUID PRIMARY KEY/g, 'TEXT PRIMARY KEY')
        .replace(/UUID/g, 'TEXT')
        .replace(/TEXT\[\]/g, 'TEXT') // SQLite does not support native arrays, use JSON strings
        .replace(/BOOLEAN DEFAULT FALSE/g, 'INTEGER DEFAULT 0') // SQLite boolean representation
        .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '');
    // Split SQL commands by semicolon and execute them one by one
    const statements = sqliteDdl
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    return new Promise((resolve, reject) => {
        sqliteDb.serialize(() => {
            // Enable foreign key support in SQLite
            sqliteDb.run('PRAGMA foreign_keys = ON;', (err) => {
                if (err)
                    console.error('Failed to enable foreign keys:', err);
            });
            let completed = 0;
            if (statements.length === 0)
                resolve();
            for (const statement of statements) {
                sqliteDb.run(statement, (err) => {
                    if (err) {
                        console.error(`❌ SQLite Schema Error in statement:\n${statement}\nError:`, err.message);
                        reject(err);
                        return;
                    }
                    completed++;
                    if (completed === statements.length) {
                        console.log('✅ SQLite Schema tables initialized/verified.');
                        resolve();
                    }
                });
            }
        });
    });
}
// Formats returned rows for consistency (e.g. parsing JSON arrays from SQLite)
function formatRow(row) {
    if (!row)
        return row;
    // Create a shallow copy to modify
    const formatted = { ...row };
    // Parse images if it's stored as a JSON string (SQLite fallback)
    if (typeof formatted.images === 'string') {
        try {
            formatted.images = JSON.parse(formatted.images);
        }
        catch (e) {
            formatted.images = [];
        }
    }
    // Convert read_status integer to boolean for SQLite
    if (formatted.read_status !== undefined) {
        formatted.read_status = formatted.read_status === 1 || formatted.read_status === true;
    }
    return formatted;
}
// Unified Query Function
async function query(text, params = []) {
    // If PostgreSQL is active
    if (pgPool && !isSqlite) {
        const res = await pgPool.query(text, params);
        return { rows: res.rows };
    }
    // If SQLite fallback is active
    if (sqliteDb && isSqlite) {
        // Dynamically match and reconstruct parameter array to support repeated placeholders
        const placeholderRegex = /\$(\d+)/g;
        const matches = [];
        let match;
        const cleanText = text.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)--.*$/gm, ''); // strip comments to prevent matching placeholders in them
        while ((match = placeholderRegex.exec(cleanText)) !== null) {
            matches.push(parseInt(match[1], 10));
        }
        let sqliteParams = [];
        if (matches.length > 0) {
            sqliteParams = matches.map(index => {
                const val = params[index - 1];
                if (Array.isArray(val)) {
                    return JSON.stringify(val);
                }
                if (typeof val === 'boolean') {
                    return val ? 1 : 0;
                }
                return val;
            });
        }
        else {
            sqliteParams = params.map(p => {
                if (Array.isArray(p)) {
                    return JSON.stringify(p);
                }
                if (typeof p === 'boolean') {
                    return p ? 1 : 0;
                }
                return p;
            });
        }
        const sqliteText = text.replace(/\$\d+/g, '?').replace(/ILIKE/gi, 'LIKE');
        return new Promise((resolve, reject) => {
            sqliteDb.all(sqliteText, sqliteParams, (err, rows) => {
                if (err) {
                    console.error(`❌ SQLite Query Error:\nSQL: ${sqliteText}\nParams: ${JSON.stringify(sqliteParams)}\nError:`, err.message);
                    reject(err);
                }
                else {
                    const formattedRows = rows.map(formatRow);
                    resolve({ rows: formattedRows });
                }
            });
        });
    }
    throw new Error('Database not initialized. Call initDB() first.');
}
function getIsSqlite() {
    return isSqlite;
}
