-- Add image size columns to property_images table
ALTER TABLE property_images ADD COLUMN IF NOT EXISTS thumbnail_url varchar;
ALTER TABLE property_images ADD COLUMN IF NOT EXISTS medium_url varchar;
ALTER TABLE property_images ADD COLUMN IF NOT EXISTS large_url varchar;

-- Insert migration record
INSERT INTO migrations (timestamp, name) 
VALUES (1764366041352, 'AddImageSizesToPropertyImages1764366041352')
ON CONFLICT DO NOTHING;
