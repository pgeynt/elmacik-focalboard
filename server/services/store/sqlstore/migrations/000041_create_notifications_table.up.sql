CREATE TABLE IF NOT EXISTS {{.prefix}}notifications (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    from_user VARCHAR(200) NOT NULL,
    create_at BIGINT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(2000),
    board_id VARCHAR(36),
    card_id VARCHAR(36),
    PRIMARY KEY (id)
) {{if .mysql}}DEFAULT CHARACTER SET utf8mb4{{end}};

{{if .plugin}}
    {{if .postgres}}
    CREATE INDEX IF NOT EXISTS idx_{{.prefix}}notifications_user_id ON {{.prefix}}notifications(user_id);
    {{end}}
    {{if .mysql}}
    CREATE INDEX IF NOT EXISTS idx_{{.prefix}}notifications_user_id ON {{.prefix}}notifications(user_id);
    {{end}}
    {{if .sqlite}}
    CREATE INDEX IF NOT EXISTS idx_{{.prefix}}notifications_user_id ON {{.prefix}}notifications(user_id);
    {{end}}
{{else}}
    {{createIndexIfNeeded "notifications" "user_id"}}
{{end}} 