CREATE DATABASE IF NOT EXISTS phising
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE phising;

CREATE TABLE IF NOT EXISTS audit (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    participant_code VARCHAR(50) NOT NULL,
    event_type ENUM(
        'email_sent',
        'link_clicked',
        'form_submitted'
    ) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_audit_participant_event (
        participant_code,
        event_type
    )
);

CREATE TABLE IF NOT EXISTS submissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    participant_code VARCHAR(50) NOT NULL,
    cpf_masked VARCHAR(20) NOT NULL,
    password_masked VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_submission_participant (participant_code)
);

