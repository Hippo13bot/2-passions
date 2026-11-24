-- Indexes for foreign-key lookups in monitoring and document tables.
create index if not exists source_documents_source_id_idx on public.source_documents(source_id);
create index if not exists source_documents_created_by_idx on public.source_documents(created_by);
create index if not exists watch_sources_created_by_idx on public.watch_sources(created_by);
create index if not exists watch_items_reviewed_by_idx on public.watch_items(reviewed_by);
create index if not exists watch_items_created_source_id_idx on public.watch_items(created_source_id);
