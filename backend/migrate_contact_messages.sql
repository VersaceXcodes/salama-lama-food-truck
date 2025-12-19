-- Migration: Add contact_messages table for contact form submissions
-- Run this migration to enable contact form functionality

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    message_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    read_at TEXT,
    archived_at TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created ON contact_messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
