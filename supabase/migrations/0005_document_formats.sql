-- 2 PASSIONS — formats bureautiques ouverts supplémentaires
update storage.buckets
set allowed_mime_types = array[
  'application/pdf','image/jpeg','image/png','image/webp','image/tiff',
  'text/plain','text/markdown','text/csv','text/html','application/rtf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation'
]
where id = 'source-documents';
