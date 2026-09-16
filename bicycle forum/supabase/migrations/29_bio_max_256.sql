-- Tighten the bio length cap from 500 to 256 chars (product call - it's a
-- short blurb, not another post).
alter table public.profiles drop constraint profiles_bio_check;
alter table public.profiles add constraint profiles_bio_check check (bio is null or char_length(bio) <= 256);
