import type { APIRoute } from 'astro';
import Database from 'better-sqlite3';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Initialize SQLite database
const dbPath = join(process.cwd(), 'survey_responses.db');
const db = new Database(dbPath);

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS survey_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    interested TEXT NOT NULL,
    players TEXT NOT NULL,
    duration TEXT NOT NULL,
    puzzle_percentage TEXT NOT NULL,
    price TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Prepare insert statement
const insertResponse = db.prepare(`
  INSERT INTO survey_responses (timestamp, interested, players, duration, puzzle_percentage, price)
  VALUES (?, ?, ?, ?, ?, ?)
`);

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['timestamp', 'interested', 'players', 'duration', 'puzzle_percentage', 'price'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Insert into SQLite database
    const result = insertResponse.run(
      data.timestamp,
      data.interested,
      data.players,
      data.duration,
      data.puzzle_percentage,
      data.price
    );

    // Also save to CSV for easy access
    const csvPath = join(process.cwd(), 'survey_responses.csv');
    const csvHeaders = 'ID,Timestamp,Interested,Players,Duration,Puzzle_Percentage,Price,Created_At\n';
    const csvRow = `${result.lastInsertRowid},"${data.timestamp}","${data.interested}","${data.players}","${data.duration}","${data.puzzle_percentage}","${data.price}","${new Date().toISOString()}"\n`;
    
    if (!existsSync(csvPath)) {
      writeFileSync(csvPath, csvHeaders + csvRow);
    } else {
      writeFileSync(csvPath, csvRow, { flag: 'a' });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      id: result.lastInsertRowid,
      message: 'Survey response saved successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error saving survey response:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to save survey response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};