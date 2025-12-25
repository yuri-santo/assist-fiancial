-- Tabela de notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('alerta', 'lembrete', 'conquista', 'dica')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notificacoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notificacoes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notificacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notificacoes FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_notificacoes_user_id ON notificacoes(user_id);
CREATE INDEX idx_notificacoes_lida ON notificacoes(user_id, lida);
