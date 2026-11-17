-- Manual messages have no attendance record. Existing attendance triggers and keys still apply.
alter table public.sms_outbox alter column attendance_id drop not null;
