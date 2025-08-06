-- Supabase SQL Schema for CRM Application
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table to extend auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email)
);

-- Create boards table
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create columns table
CREATE TABLE IF NOT EXISTS public.columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    position INTEGER NOT NULL DEFAULT 0,
    board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, position)
);

-- Create cards table
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    estimated_value DECIMAL(12,2) DEFAULT 0.00,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    assigned_to VARCHAR(255),
    tags JSONB DEFAULT '[]'::jsonb,
    position INTEGER NOT NULL DEFAULT 0,
    column_id UUID REFERENCES public.columns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    UNIQUE(column_id, position)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON public.boards(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_created_at ON public.boards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON public.columns(board_id);
CREATE INDEX IF NOT EXISTS idx_columns_position ON public.columns(board_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_column_id ON public.cards(column_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_position ON public.cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_priority ON public.cards(priority);
CREATE INDEX IF NOT EXISTS idx_cards_due_date ON public.cards(due_date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles policies
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Boards policies
CREATE POLICY "Users can view own boards" 
ON public.boards FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own boards" 
ON public.boards FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own boards" 
ON public.boards FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own boards" 
ON public.boards FOR DELETE 
USING (auth.uid() = user_id);

-- Columns policies
CREATE POLICY "Users can view columns of own boards" 
ON public.columns FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.boards 
    WHERE boards.id = columns.board_id 
    AND boards.user_id = auth.uid()
));

CREATE POLICY "Users can insert columns in own boards" 
ON public.columns FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.boards 
    WHERE boards.id = columns.board_id 
    AND boards.user_id = auth.uid()
));

CREATE POLICY "Users can update columns in own boards" 
ON public.columns FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.boards 
    WHERE boards.id = columns.board_id 
    AND boards.user_id = auth.uid()
));

CREATE POLICY "Users can delete columns in own boards" 
ON public.columns FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.boards 
    WHERE boards.id = columns.board_id 
    AND boards.user_id = auth.uid()
));

-- Cards policies  
CREATE POLICY "Users can view cards in own boards" 
ON public.cards FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.columns 
    JOIN public.boards ON boards.id = columns.board_id 
    WHERE columns.id = cards.column_id 
    AND boards.user_id = auth.uid()
));

CREATE POLICY "Users can insert cards in own boards" 
ON public.cards FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.columns 
    JOIN public.boards ON boards.id = columns.board_id 
    WHERE columns.id = cards.column_id 
    AND boards.user_id = auth.uid()
));

CREATE POLICY "Users can update cards in own boards" 
ON public.cards FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.columns 
    JOIN public.boards ON boards.id = columns.board_id 
    WHERE columns.id = cards.column_id 
    AND boards.user_id = auth.uid()
));

CREATE POLICY "Users can delete cards in own boards" 
ON public.cards FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.columns 
    JOIN public.boards ON boards.id = columns.board_id 
    WHERE columns.id = cards.column_id 
    AND boards.user_id = auth.uid()
));

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_boards_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_columns_updated_at
  BEFORE UPDATE ON public.columns
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Sample data (optional)
-- You can run this after setting up the schema and authentication

-- Note: This will only work after you have actual authenticated users
-- INSERT INTO public.boards (title, description, user_id) 
-- VALUES ('Pipeline de Vendas', 'Quadro principal do CRM', auth.uid());

-- Get the board_id from the above insert and use it below
-- INSERT INTO public.columns (title, color, position, board_id) VALUES
-- ('Prospects 🎯', '#EF4444', 0, 'your-board-id'),
-- ('Contact Made 📞', '#F59E0B', 1, 'your-board-id'),
-- ('Proposal Sent 📄', '#3B82F6', 2, 'your-board-id'),
-- ('Closed Won 🎉', '#10B981', 3, 'your-board-id');