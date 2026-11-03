-- All-Nighter: Supabase PostgreSQL Schema & Realtime Setup
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Rooms table (stores room sessions, host, title, status, dawn target)
create table if not exists public.rooms (
    id uuid primary key default uuid_generate_v4(),
    slug text unique not null,
    title text not null,
    host_id text not null,
    host_name text not null,
    status text not null default 'active' check (status in ('active', 'archived', 'closed')),
    dawn_target text not null default '06:00',
    created_at timestamptz not null default now(),
    closed_at timestamptz,
    playback_state jsonb not null default '{
        "playing": false,
        "track": null,
        "positionSec": 0,
        "updatedAt": 0,
        "director": "Nobody"
    }'::jsonb
);

-- Index for fast lookup by slug
create index if not exists idx_rooms_slug on public.rooms(slug);
create index if not exists idx_rooms_status on public.rooms(status);

-- 3. Messages table (persistent chat history)
create table if not exists public.messages (
    id uuid primary key default uuid_generate_v4(),
    room_slug text not null references public.rooms(slug) on delete cascade,
    sender_id text not null,
    sender_name text not null,
    text text not null,
    kind text not null default 'chat' check (kind in ('chat', 'system', 'track', 'presence', 'note')),
    created_at timestamptz not null default now()
);

create index if not exists idx_messages_room on public.messages(room_slug, created_at asc);

-- 4. Queue Items table (collaborative music playlist stored in DB)
create table if not exists public.queue_items (
    id uuid primary key default uuid_generate_v4(),
    room_slug text not null references public.rooms(slug) on delete cascade,
    video_id text not null,
    source text not null default 'youtube',
    title text not null,
    channel text,
    added_by text not null,
    position integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_queue_room on public.queue_items(room_slug, position asc);

-- 5. Session Archives table (automatic recording of completed nights at dawn)
create table if not exists public.session_archives (
    id uuid primary key default uuid_generate_v4(),
    slug text unique not null,
    title text not null,
    started_at timestamptz not null,
    ended_at timestamptz not null default now(),
    attendees jsonb not null default '[]'::jsonb,
    playlist jsonb not null default '[]'::jsonb,
    moments jsonb not null default '[]'::jsonb,
    summary text
);

-- 6. Enable Row Level Security (RLS) & Public Policies for Realtime Collaboration
alter table public.rooms enable row level security;
alter table public.messages enable row level security;
alter table public.queue_items enable row level security;
alter table public.session_archives enable row level security;

-- Rooms policies: public can read, create, and update room sessions
create policy "Public can read rooms" on public.rooms for select using (true);
create policy "Public can create rooms" on public.rooms for insert with check (true);
create policy "Public can update rooms" on public.rooms for update using (true);

-- Messages policies: anyone in room can read and write chat messages
create policy "Public can read messages" on public.messages for select using (true);
create policy "Public can insert messages" on public.messages for insert with check (true);

-- Queue items policies: anyone in room can read, add, and manage queue
create policy "Public can read queue" on public.queue_items for select using (true);
create policy "Public can insert queue" on public.queue_items for insert with check (true);
create policy "Public can update queue" on public.queue_items for update using (true);
create policy "Public can delete queue" on public.queue_items for delete using (true);

-- Archives policies: anyone can read archives, sessions can write
create policy "Public can read archives" on public.session_archives for select using (true);
create policy "Public can insert archives" on public.session_archives for insert with check (true);

-- 7. Enable Realtime Replication on rooms, messages, and queue_items
begin;
  -- Add tables to supabase_realtime publication
  alter publication supabase_realtime add table public.rooms;
  alter publication supabase_realtime add table public.messages;
  alter publication supabase_realtime add table public.queue_items;
commit;
