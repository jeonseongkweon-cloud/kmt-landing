-- KMT CLASS student photo storage hardening
-- Keep only optimized WebP uploads in the managed student-photo bucket.
-- Client-side CLASS admin already converts selected JPEG/PNG/WebP images
-- to an 800x800-or-smaller WebP before upload.

update storage.buckets
set file_size_limit = 1048576,
    allowed_mime_types = array['image/webp']::text[]
where id = 'kmt-student-photos';
