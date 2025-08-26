-- Create session_comments table for multiple comments per session
CREATE TABLE session_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT UNSIGNED NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    type ENUM('note', 'comment', 'warning', 'important') DEFAULT 'note',
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES schedule_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_session_comments_session (session_id),
    INDEX idx_session_comments_user (user_id),
    INDEX idx_session_comments_type (type),
    INDEX idx_session_comments_created (created_at)
);
