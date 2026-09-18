-- =========================================================================
-- Neuer Post-Status "zurueckgestellt" (Kunde stellt Beitrag zurück, wenn
-- keine Änderungsschleifen mehr übrig sind und er noch nicht freigeben will).
-- Muss in einer eigenen Migration laufen: ein neuer enum-Wert kann nicht in
-- derselben Transaktion verwendet werden, in der er angelegt wurde.
-- =========================================================================
alter type public.post_status add value 'zurueckgestellt';
