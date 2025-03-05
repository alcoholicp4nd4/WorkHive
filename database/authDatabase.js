import * as SQLite from 'expo-sqlite';

// Open database asynchronously
export const initDB = async () => {
  console.log("🔹 Initializing Database...");
  const db = await SQLite.openDatabaseAsync('workhive.db');

  // Create users table
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
  `);
  
  console.log("✅ Users table created successfully");
  return db;
};

// Function to register a new user
export const registerUser = async (username, email, password) => {
  const db = await SQLite.openDatabaseAsync('workhive.db');

  try {
    await db.runAsync(
      `INSERT INTO users (username, email, password) VALUES (?, ?, ?);`,
      [username, email, password]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Function to login a user
export const loginUser = async (username, password) => {
  const db = await SQLite.openDatabaseAsync('workhive.db');

  try {
    const result = await db.getAllAsync(
      `SELECT * FROM users WHERE username = ? AND password = ?;`,
      [username, password]
    );

    if (result.length > 0) {
      return { success: true, user: result[0] };
    } else {
      return { success: false, error: "Invalid credentials" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

//get all users
export const getAllUsers = async () => {
    const db = await SQLite.openDatabaseAsync('workhive.db');
  
    try {
      const result = await db.getAllAsync(`SELECT * FROM users;`);
      console.log("📂 All Users in Database:", result);
    } catch (error) {
      console.error("❌ Error fetching users:", error);
    }
  };
  