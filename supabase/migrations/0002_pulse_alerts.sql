-- Pulse Alerts need a phone number per manager to send the SMS to, and a
-- couple of helpers for fast inbound matching + first-correct awarding.

alter table participants add column if not exists phone text;
create index if not exists participants_phone_idx on participants(phone);

-- Track which alert is currently live on the floor (only one at a time).
alter table pulse_alerts add column if not exists sort_order int not null default 0;

-- A team's response is "first correct" if no earlier correct response exists
-- for that alert. The award amount is set when graded.
create index if not exists alert_responses_alert_idx on alert_responses(alert_id);

grant select, insert, update, delete on participants to anon, authenticated;
